'use client';
import { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { formatBytes } from '@/lib/utils/formatBytes';
import { SignalingClient } from '@/lib/webrtc/signaling';
import { createPeerConnection, createAnswer, addIceCandidate } from '@/lib/webrtc/peer';
import { receiveFile, downloadBlob } from '@/lib/webrtc/receiver';

const QRScanner = dynamic(() => import('@/components/QRScanner'), { ssr: false });

// Read code from hash OR query param, then clean URL
function getCodeFromUrl(): string {
  if (typeof window === 'undefined') return '';
  // Try hash first: /receive#XXXXX
  const hash = window.location.hash.slice(1).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
  if (hash.length === 5) return hash;
  // Fallback: /receive?code=XXXXX
  const params = new URLSearchParams(window.location.search);
  const q = (params.get('code') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
  return q;
}

/* ── Shared styles ────────────────────────────────────────────────── */
const S = {
  glass: {
    background: 'rgba(255,255,255,0.05)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: '1px solid rgba(0,229,255,0.18)',
    borderRadius: '20px',
    padding: '1.5rem',
  },
  mono: { fontFamily: "'JetBrains Mono', monospace" },
  muted: { color: '#7a7898' },
  label: { margin: 0, fontSize: '0.72rem', color: '#7a7898', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em', textTransform: 'uppercase' as const },
};

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; label: string }> = {
    connecting:  { color: '#f59e0b', label: '🔄 Connecting…' },
    waiting:     { color: '#8b5cf6', label: '⏳ Waiting for sender…' },
    connected:   { color: '#10b981', label: '🔗 Connected' },
    transferring:{ color: '#06b6d4', label: '⚡ Receiving…' },
  };
  const { color, label } = map[status] || { color: '#6b7280', label: '⭕ Idle' };
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0.4rem 1rem', borderRadius: 9999, background: `${color}18`, border: `1px solid ${color}55` }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}` }} />
      <span style={{ fontSize: '0.8rem', color, ...S.mono }}>{label}</span>
    </div>
  );
}

function ReceivePageInner() {
  const router = useRouter();
  const [mode, setMode] = useState<'input' | 'scan'>('input');
  const [codeInput, setCodeInput] = useState('');
  const [status, setStatus] = useState('idle');
  const [initializing, setInitializing] = useState(false); // shows loading when URL has code
  const [meta, setMeta] = useState<any>(null);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [transferred, setTransferred] = useState(0);
  const [downloadedFile, setDownloadedFile] = useState<Blob | null>(null);
  const [downloadedName, setDownloadedName] = useState('');
  const [error, setError] = useState('');

  const signalingRef = useRef<any>(null);
  const pcRef = useRef<any>(null);
  const statusRef = useRef('idle');

  const cleanup = useCallback(() => {
    signalingRef.current?.close();
    pcRef.current?.close();
    signalingRef.current = null;
    pcRef.current = null;
  }, []);

  const updateStatus = useCallback((s: string) => {
    statusRef.current = s;
    setStatus(s);
  }, []);

  const joinSession = useCallback((code: string) => {
    const c = code.toUpperCase().trim();
    if (c.length !== 5) { setError('Code must be exactly 5 characters.'); return; }
    setError('');
    updateStatus('connecting');

    const pc = createPeerConnection(
      (candidate: any) => signalingRef.current?.send({ type: 'candidate', candidate }),
      (channel: any) => {
        updateStatus('connected');
        receiveFile(channel, c,
          (m: any) => { setMeta(m); updateStatus('transferring'); },
          (prog: number, spd: number, tx: number) => { setProgress(prog); setSpeed(spd); setTransferred(tx); },
          (blob: Blob, filename: string) => {
            setDownloadedFile(blob); setDownloadedName(filename);
            updateStatus('done');
            downloadBlob(blob, filename);
          }
        );
      },
      (state: string) => {
        if (state === 'failed') { setError('Connection failed.'); updateStatus('error'); }
        if (state === 'disconnected' && statusRef.current !== 'done') updateStatus('error');
      }
    );
    pcRef.current = pc;

    const signaling = new SignalingClient(c, async (msg: any) => {
      if (msg.type === 'role' && msg.role === 'receiver') updateStatus('waiting');
      if (msg.type === 'error') { setError(msg.message); updateStatus('error'); }
      if (msg.type === 'peer_joined') updateStatus('connected');
      if (msg.type === 'offer') { const answer = await createAnswer(pc, msg.offer); signaling.send({ type: 'answer', answer }); }
      if (msg.type === 'candidate') await addIceCandidate(pc, msg.candidate);
      if (msg.type === 'peer_disconnected' && statusRef.current !== 'done') {
        setError('Sender disconnected before transfer completed.'); updateStatus('error');
      }
    }, () => updateStatus('waiting'),
    () => { if (statusRef.current !== 'done') setError('Lost connection to signaling server.'); });

    signalingRef.current = signaling;
    signaling.connect();
  }, [cleanup, updateStatus]);

  useEffect(() => {
    const c = getCodeFromUrl();
    if (c.length === 5) {
      // Clean the URL immediately — remove hash/query so it's not visible
      window.history.replaceState({}, '', '/receive');
      setCodeInput(c);
      setInitializing(true);
      setTimeout(() => {
        setInitializing(false);
        joinSession(c);
      }, 400);
    }
    return () => cleanup();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '5rem 1.5rem 2rem' }}>
      {/* Back */}
      <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => { cleanup(); router.push('/'); }}
        style={{ position: 'fixed', top: '1.5rem', left: '1.5rem', background: 'none', border: 'none', color: '#5a5875', cursor: 'pointer', fontSize: '0.85rem', ...S.mono }}>
        ← Back
      </motion.button>

      <div style={{ width: '100%', maxWidth: 520, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center' }}>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 800, margin: 0,
            background: 'linear-gradient(135deg, #00e5ff, #9b30ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            Receive File
          </h1>
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', ...S.muted, ...S.mono }}>
            Enter the 5-character code or scan QR
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {/* ── Initializing (QR URL opened) ──────────────────────── */}
          {initializing && (
            <motion.div key="init" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', padding: '2rem' }}>
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid rgba(155,48,255,0.2)', borderTop: '3px solid #9b30ff' }} />
              <div style={{ textAlign: 'center' }}>
                <p style={{ margin: 0, color: '#fff', fontWeight: 600 }}>Opening session…</p>
                <p style={{ margin: '0.4rem 0 0', fontSize: '0.8rem', ...S.muted, ...S.mono }}>Code: {codeInput}</p>
              </div>
            </motion.div>
          )}
          {/* ── Idle: code entry ─────────────────────────────────── */}
          {status === 'idle' && !initializing && (

            <motion.div key="idle" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Mode tabs */}
              <div style={{ display: 'flex', gap: 6, padding: 4, borderRadius: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                {(['input', 'scan'] as const).map((m) => (
                  <button key={m} onClick={() => setMode(m)} style={{
                    flex: 1, padding: '0.6rem', borderRadius: 10, fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer', transition: 'all 0.25s',
                    background: mode === m ? 'rgba(155,48,255,0.2)' : 'transparent',
                    border: mode === m ? '1px solid rgba(155,48,255,0.4)' : '1px solid transparent',
                    color: mode === m ? '#c084fc' : '#7a7898',
                  }}>
                    {m === 'input' ? '⌨️  Enter Code' : '📷  Scan QR'}
                  </button>
                ))}
              </div>

              <div style={{ ...S.glass, minHeight: 220, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.25rem' }}>
                {mode === 'input' ? (
                  <>
                    <p style={S.label}>Session Code</p>
                    <input
                      value={codeInput}
                      onChange={(e) => setCodeInput(e.target.value.toUpperCase().slice(0, 5))}
                      onKeyDown={(e) => e.key === 'Enter' && codeInput.length === 5 && joinSession(codeInput)}
                      placeholder="XXXXX"
                      maxLength={5}
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: '2.5rem',
                        fontWeight: 700,
                        letterSpacing: '0.5em',
                        textAlign: 'center',
                        padding: '0.75rem 1rem 0.75rem 1.5rem',
                        width: '100%',
                        maxWidth: 280,
                        background: 'rgba(155,48,255,0.07)',
                        border: '2px solid rgba(155,48,255,0.3)',
                        borderRadius: 14,
                        color: '#fff',
                        outline: 'none',
                        transition: 'all 0.3s',
                      }}
                      onFocus={(e) => { e.target.style.borderColor = 'rgba(155,48,255,0.7)'; e.target.style.boxShadow = '0 0 30px rgba(155,48,255,0.2)'; }}
                      onBlur={(e) => { e.target.style.borderColor = 'rgba(155,48,255,0.3)'; e.target.style.boxShadow = 'none'; }}
                    />
                    <motion.button
                      onClick={() => joinSession(codeInput)}
                      disabled={codeInput.length !== 5}
                      whileHover={codeInput.length === 5 ? { scale: 1.03 } : {}}
                      whileTap={codeInput.length === 5 ? { scale: 0.97 } : {}}
                      style={{
                        padding: '0.75rem 2rem', borderRadius: 12, fontSize: '0.95rem', fontWeight: 700, cursor: codeInput.length === 5 ? 'pointer' : 'not-allowed',
                        background: codeInput.length === 5 ? 'linear-gradient(135deg, #00e5ff22, #9b30ff33)' : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${codeInput.length === 5 ? 'rgba(0,229,255,0.5)' : 'rgba(255,255,255,0.1)'}`,
                        color: codeInput.length === 5 ? '#00e5ff' : '#5a5875',
                        fontFamily: "'Space Grotesk', sans-serif", transition: 'all 0.3s',
                      }}>
                      Join Session →
                    </motion.button>
                  </>
                ) : (
                  <QRScanner
                    onResult={(code: string) => { setMode('input'); joinSession(code); }}
                    onError={() => setMode('input')}
                  />
                )}
              </div>

              {error && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', color: '#f87171', fontSize: '0.85rem', ...S.mono, margin: 0 }}>
                  {error}
                </motion.p>
              )}
            </motion.div>
          )}

          {/* ── Connecting / Waiting ─────────────────────────────── */}
          {(status === 'connecting' || status === 'waiting' || status === 'connected') && (
            <motion.div key="waiting" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
              <StatusBadge status={status} />
              <div style={{ ...S.glass, width: '100%', textAlign: 'center', padding: '2.5rem 1.5rem' }}>
                {/* Animated beam */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', marginBottom: '1.5rem' }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>📥</div>
                  <div style={{ display: 'flex', gap: 5 }}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <motion.div key={i} style={{ width: 8, height: 3, borderRadius: 2, background: '#9b30ff' }}
                        animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 0.8, delay: i * 0.15, repeat: Infinity }} />
                    ))}
                  </div>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(155,48,255,0.1)', border: '1px solid rgba(155,48,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>📤</div>
                </div>
                <p style={{ margin: 0, color: '#fff', fontWeight: 500, fontSize: '0.95rem' }}>
                  {status === 'connecting' ? 'Connecting to signaling server…' : 'Waiting for sender to begin transfer…'}
                </p>
                <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', ...S.muted, ...S.mono }}>P2P channel establishes automatically</p>
              </div>
              <button onClick={() => { cleanup(); updateStatus('idle'); setError(''); }}
                style={{ background: 'none', border: '1px solid rgba(155,48,255,0.3)', color: '#c084fc', padding: '0.6rem 1.5rem', borderRadius: 10, cursor: 'pointer', fontSize: '0.85rem', ...S.mono }}>
                Cancel
              </button>
            </motion.div>
          )}

          {/* ── Receiving ─────────────────────────────────────────── */}
          {status === 'transferring' && (
            <motion.div key="rx" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
              <StatusBadge status="transferring" />
              <div style={{ ...S.glass, width: '100%', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={S.label}>Receiving</p>
                    <p style={{ margin: '0.25rem 0 0', color: '#fff', fontWeight: 600, fontSize: '0.95rem', wordBreak: 'break-all' }}>{meta?.name || '…'}</p>
                  </div>
                  <span style={{ fontSize: '0.75rem', ...S.mono, padding: '0.3rem 0.7rem', borderRadius: 8, background: meta?.encrypted ? 'rgba(155,48,255,0.15)' : 'rgba(255,255,255,0.06)', color: meta?.encrypted ? '#c084fc' : '#7a7898' }}>
                    {meta?.encrypted ? '🔐 Encrypted' : '📦 Plain'}
                  </span>
                </div>
                {/* Progress */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <span style={{ fontSize: '0.75rem', ...S.muted, ...S.mono }}>{formatBytes(transferred)} / {formatBytes(meta?.size || 0)}</span>
                    <span style={{ fontSize: '0.9rem', color: '#00e5ff', fontWeight: 700, ...S.mono }}>{progress}%</span>
                  </div>
                  <div style={{ height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' }}>
                    <motion.div style={{ height: '100%', borderRadius: 4, background: 'linear-gradient(90deg, #00e5ff, #9b30ff)' }}
                      animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.4rem' }}>
                    <span style={{ fontSize: '0.75rem', ...S.muted, ...S.mono }}>{formatBytes(speed)}/s</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Done ─────────────────────────────────────────────── */}
          {status === 'done' && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
              <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.5 }} style={{ fontSize: '5rem', lineHeight: 1 }}>📥</motion.div>
              <h2 style={{ margin: 0, fontFamily: "'Space Grotesk', sans-serif", fontSize: '2rem', fontWeight: 800, color: '#00e5ff', textShadow: '0 0 30px rgba(0,229,255,0.5)' }}>File Received!</h2>
              <div style={{ ...S.glass, textAlign: 'center', width: '100%' }}>
                <p style={{ margin: 0, color: '#fff', fontWeight: 600, wordBreak: 'break-all' }}>{downloadedName}</p>
                <p style={{ margin: '0.4rem 0 0', ...S.muted, fontSize: '0.8rem', ...S.mono }}>Download started automatically</p>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                {downloadedFile && (
                  <button onClick={() => downloadBlob(downloadedFile, downloadedName)}
                    style={{ padding: '0.75rem 1.5rem', borderRadius: 12, background: 'linear-gradient(135deg, #00e5ff22, #9b30ff33)', border: '1px solid rgba(0,229,255,0.4)', color: '#00e5ff', cursor: 'pointer', fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif" }}>
                    ⬇️ Download Again
                  </button>
                )}
                <button onClick={() => router.push('/')}
                  style={{ padding: '0.75rem 1.5rem', borderRadius: 12, background: 'none', border: '1px solid rgba(155,48,255,0.4)', color: '#c084fc', cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif" }}>
                  Return to Void
                </button>
              </div>
            </motion.div>
          )}

          {/* ── Error ─────────────────────────────────────────────── */}
          {status === 'error' && (
            <motion.div key="err" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <span style={{ fontSize: '4rem', lineHeight: 1 }}>⚠️</span>
              <p style={{ color: '#fff', fontWeight: 600, textAlign: 'center', margin: 0 }}>{error || 'An error occurred.'}</p>
              <button onClick={() => { updateStatus('idle'); setError(''); setCodeInput(''); }}
                style={{ padding: '0.75rem 1.5rem', borderRadius: 12, background: 'linear-gradient(135deg, #9b30ff, #5f0fff)', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif" }}>
                Try Again
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}

export default function ReceivePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c084fc', fontFamily: "'JetBrains Mono', monospace" }}>Loading…</div>}>
      <ReceivePageInner />
    </Suspense>
  );
}
