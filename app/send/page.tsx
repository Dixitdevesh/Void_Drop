'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import QRDisplay from '@/components/QRDisplay';
import { generateSessionCode } from '@/lib/utils/sessionCode';
import { formatBytes } from '@/lib/utils/formatBytes';
import { SignalingClient } from '@/lib/webrtc/signaling';
import { createPeerConnection, createDataChannel, createOffer, handleAnswer, addIceCandidate } from '@/lib/webrtc/peer';
import { sendFile } from '@/lib/webrtc/sender';

const S = {
  glass: { background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '1px solid rgba(155,48,255,0.2)', borderRadius: '20px', padding: '1.5rem' },
  mono: { fontFamily: "'JetBrains Mono', monospace" },
  muted: { color: '#7a7898' },
};

function Toggle({ value, onChange, color = '#9b30ff' }: { value: boolean; onChange: () => void; color?: string }) {
  return (
    <div onClick={onChange} style={{ position: 'relative', width: 44, height: 24, borderRadius: 12, background: value ? color : 'rgba(255,255,255,0.12)', cursor: 'pointer', transition: 'background 0.3s', flexShrink: 0 }}>
      <motion.div animate={{ x: value ? 22 : 2 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }} style={{ position: 'absolute', top: 2, width: 20, height: 20, borderRadius: '50%', background: '#fff' }} />
    </div>
  );
}

// Visible debug log panel
function DebugLog({ logs }: { logs: string[] }) {
  if (logs.length === 0) return null;
  return (
    <div style={{ ...S.glass, border: '1px solid rgba(0,229,255,0.2)', padding: '1rem' }}>
      <p style={{ margin: '0 0 0.5rem', fontSize: '0.7rem', color: '#00e5ff', ...S.mono, letterSpacing: '0.1em' }}>CONNECTION LOG</p>
      {logs.slice(-6).map((l, i) => (
        <p key={i} style={{ margin: '0.15rem 0', fontSize: '0.72rem', ...S.mono, color: l.includes('❌') ? '#f87171' : l.includes('✅') ? '#34d399' : '#94a3b8' }}>{l}</p>
      ))}
    </div>
  );
}

export default function SendPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [sessionCode, setSessionCode] = useState('');
  const [status, setStatus] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [transferred, setTransferred] = useState(0);
  const [encryptEnabled, setEncryptEnabled] = useState(true);
  const [burnMode, setBurnMode] = useState(true);
  const [error, setError] = useState('');
  const [logs, setLogs] = useState<string[]>([]);

  const signalingRef = useRef<any>(null);
  const pcRef = useRef<any>(null);
  const statusRef = useRef('idle');
  const barHeights = useRef(Array.from({ length: 12 }, () => 16 + Math.floor(Math.random() * 14)));
  const fileInputRef = useRef<HTMLInputElement>(null);

  const log = (msg: string) => {
    console.log(msg);
    setLogs(prev => [...prev.slice(-20), `${new Date().toLocaleTimeString()} ${msg}`]);
  };

  const cleanup = useCallback(() => {
    signalingRef.current?.close();
    pcRef.current?.close();
    signalingRef.current = null;
    pcRef.current = null;
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const startSession = useCallback(async () => {
    if (!file) return;
    setError('');
    setLogs([]);
    const code = generateSessionCode();
    setSessionCode(code);
    statusRef.current = 'waiting';
    setStatus('waiting');
    log(`🔑 Session code: ${code}`);

    const pc = createPeerConnection(
      (candidate: any) => {
        signalingRef.current?.send({ type: 'candidate', candidate });
        log('📡 ICE candidate sent');
      },
      null,
      (state: string) => {
        log(`🔗 Connection state: ${state}`);
        if (state === 'connected') { statusRef.current = 'connected'; setStatus('connected'); }
        if (state === 'failed') { log('❌ Connection failed — ICE negotiation failed'); setError('Connection failed. Try again.'); statusRef.current = 'idle'; setStatus('idle'); }
        if (state === 'disconnected') { statusRef.current = 'idle'; setStatus('idle'); }
      }
    );
    pcRef.current = pc;

    const channel = createDataChannel(pc);

    channel.onopen = async () => {
      log('✅ DataChannel opened — starting transfer');
      statusRef.current = 'transferring';
      setStatus('transferring');
      await new Promise(r => setTimeout(r, 300));
      try {
        await sendFile(channel, file, encryptEnabled ? code : null, (prog: number, spd: number, tx: number) => {
          setProgress(prog); setSpeed(spd); setTransferred(tx);
        });
        log('✅ All chunks sent — waiting for buffer to drain…');
        // Wait for DataChannel send buffer to fully empty before burning
        while (channel.bufferedAmount > 0) {
          await new Promise(r => setTimeout(r, 100));
        }
        log('✅ Buffer drained — transfer complete!');
        statusRef.current = 'done'; setStatus('done');
        if (burnMode) {
          // Only close signaling — do NOT close pc so DataChannel can finish delivering
          signalingRef.current?.send({ type: 'burn' });
          setTimeout(() => signalingRef.current?.close(), 3000);
        }
      } catch (e: any) {
        log(`❌ Transfer failed: ${e?.message}`);
        setError(`Transfer failed: ${e?.message}`);
        statusRef.current = 'idle'; setStatus('idle');
      }
    };
    channel.onerror = (e: any) => { log(`❌ DataChannel error: ${e?.message}`); setError('DataChannel error. Try again.'); };

    const signaling = new SignalingClient(code, async (msg: any) => {
      log(`📨 Signal received: ${msg.type}`);
      if (msg.type === 'peer_joined') {
        statusRef.current = 'connected'; setStatus('connected');
        log('👥 Receiver joined — creating offer…');
        try {
          const offer = await createOffer(pc);
          signaling.send({ type: 'offer', offer });
          log('📤 Offer sent');
        } catch (e: any) { log(`❌ Offer failed: ${e?.message}`); }
      }
      if (msg.type === 'answer') { log('📥 Answer received — setting remote desc'); await handleAnswer(pc, msg.answer); }
      if (msg.type === 'candidate') { await addIceCandidate(pc, msg.candidate); }
      if (msg.type === 'peer_disconnected' && statusRef.current !== 'done') {
        log('⚠️ Receiver disconnected'); setError('Receiver disconnected.'); statusRef.current = 'waiting'; setStatus('waiting');
      }
    }, () => log('✅ Connected to signaling server — waiting for receiver…'),
    () => { log('❌ Signaling server disconnected'); if (statusRef.current !== 'done') setError('Signaling server disconnected.'); });

    signalingRef.current = signaling;
    signaling.connect();
  }, [file, encryptEnabled, burnMode, cleanup]);

  const onDrop = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) setFile(f); };
  const sessionUrl = typeof window !== 'undefined' && sessionCode ? `${window.location.origin}/receive/${sessionCode}` : '';

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '5rem 1.5rem 2rem' }}>
      <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => { cleanup(); router.push('/'); }}
        style={{ position: 'fixed', top: '1.5rem', left: '1.5rem', background: 'none', border: 'none', color: '#5a5875', cursor: 'pointer', fontSize: '0.85rem', ...S.mono }}>← Back</motion.button>

      <div style={{ width: '100%', maxWidth: 600, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center' }}>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 'clamp(1.8rem,4vw,2.5rem)', fontWeight: 800, margin: 0, background: 'linear-gradient(135deg,#fff 0%,#c084fc 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Send File</h1>
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', ...S.muted, ...S.mono }}>Select a file → share the code → transfer begins automatically</p>
        </motion.div>

        <AnimatePresence mode="wait">
          {status === 'idle' && (
            <motion.div key="idle" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div onDragOver={e => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={onDrop} onClick={() => fileInputRef.current?.click()}
                style={{ ...S.glass, border: isDragging ? '2px solid rgba(155,48,255,0.8)' : file ? '2px solid rgba(155,48,255,0.5)' : '2px dashed rgba(155,48,255,0.25)', background: isDragging ? 'rgba(155,48,255,0.08)' : 'rgba(255,255,255,0.03)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', minHeight: 160, transition: 'all 0.3s' }}>
                <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && setFile(e.target.files[0])} />
                {file ? (<><span style={{ fontSize: '2.5rem' }}>📄</span><div style={{ textAlign: 'center' }}><p style={{ margin: 0, color: '#fff', fontWeight: 600 }}>{file.name}</p><p style={{ margin: '0.25rem 0 0', ...S.muted, fontSize: '0.8rem', ...S.mono }}>{formatBytes(file.size)}</p></div><p style={{ margin: 0, fontSize: '0.75rem', color: '#5a5875', ...S.mono }}>Click to change</p></>) : (<><span style={{ fontSize: '3rem' }}>📂</span><div style={{ textAlign: 'center' }}><p style={{ margin: 0, color: '#c084fc', fontWeight: 500 }}>Drop file here</p><p style={{ margin: '0.25rem 0 0', ...S.muted, fontSize: '0.8rem' }}>or click to browse · any file · any size</p></div></>)}
              </div>
              <div style={{ ...S.glass }}>
                <p style={{ margin: '0 0 1rem', fontSize: '0.72rem', color: '#7a7898', ...S.mono, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Transfer Options</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {[{ label: '🔐 AES-256 Encryption', desc: 'Encrypt before sending', val: encryptEnabled, set: () => setEncryptEnabled(!encryptEnabled), color: '#9b30ff' },
                    { label: '🔥 Burn After Send', desc: 'Auto-delete on complete', val: burnMode, set: () => setBurnMode(!burnMode), color: '#f97316' }].map(({ label, desc, val, set, color }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                      <div><p style={{ margin: 0, color: '#fff', fontSize: '0.9rem', fontWeight: 500 }}>{label}</p><p style={{ margin: '0.2rem 0 0', ...S.muted, fontSize: '0.75rem' }}>{desc}</p></div>
                      <Toggle value={val} onChange={set} color={color} />
                    </div>
                  ))}
                </div>
              </div>
              {error && <p style={{ textAlign: 'center', color: '#f87171', fontSize: '0.85rem', ...S.mono, margin: 0 }}>{error}</p>}
              <motion.button onClick={startSession} disabled={!file} whileHover={file ? { scale: 1.02 } : {}} whileTap={file ? { scale: 0.98 } : {}}
                style={{ padding: '1rem', width: '100%', borderRadius: 14, background: file ? 'linear-gradient(135deg,#9b30ff,#5f0fff)' : 'rgba(255,255,255,0.06)', border: `1px solid ${file ? 'rgba(155,48,255,0.6)' : 'rgba(255,255,255,0.1)'}`, color: file ? '#fff' : '#5a5875', fontSize: '1rem', fontWeight: 700, fontFamily: "'Space Grotesk',sans-serif", cursor: file ? 'pointer' : 'not-allowed', transition: 'all 0.3s' }}>
                ⚡ Generate Session Code
              </motion.button>
            </motion.div>
          )}

          {(status === 'waiting' || status === 'connected') && (
            <motion.div key="waiting" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0.4rem 1rem', borderRadius: 9999, background: status === 'connected' ? '#10b98118' : '#f59e0b18', border: `1px solid ${status === 'connected' ? '#10b98155' : '#f59e0b55'}` }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: status === 'connected' ? '#10b981' : '#f59e0b', boxShadow: `0 0 8px ${status === 'connected' ? '#10b981' : '#f59e0b'}` }} />
                <span style={{ fontSize: '0.8rem', color: status === 'connected' ? '#10b981' : '#f59e0b', ...S.mono }}>{status === 'connected' ? '🔗 Peer connected — negotiating…' : '⏳ Waiting for receiver…'}</span>
              </div>
              <div style={{ ...S.glass, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
                <QRDisplay sessionCode={sessionCode} sessionUrl={sessionUrl} />
                {/* Share — copy link without showing the URL */}
                <div style={{ width: '100%', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                  <button
                    onClick={() => { navigator.clipboard.writeText(sessionUrl); }}
                    style={{ padding: '0.7rem 1.5rem', borderRadius: 12, background: 'rgba(155,48,255,0.15)', border: '1px solid rgba(155,48,255,0.4)', color: '#c084fc', cursor: 'pointer', fontSize: '0.85rem', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    📋 Copy Receive Link
                  </button>
                </div>
              </div>
              <div style={{ ...S.glass, width: '100%', textAlign: 'center' }}>
                <p style={{ margin: 0, color: '#fff', fontWeight: 600, wordBreak: 'break-all' }}>{file?.name}</p>
                <p style={{ margin: '0.4rem 0 0', ...S.muted, fontSize: '0.8rem', ...S.mono }}>{formatBytes(file?.size || 0)} · {encryptEnabled ? '🔐 Encrypted' : '📁 Plain'} {burnMode ? '· 🔥 Burn' : ''}</p>
              </div>
              <DebugLog logs={logs} />
              <button onClick={() => { cleanup(); setStatus('idle'); setSessionCode(''); setProgress(0); setLogs([]); }}
                style={{ background: 'none', border: '1px solid rgba(155,48,255,0.3)', color: '#c084fc', padding: '0.6rem 1.5rem', borderRadius: 10, cursor: 'pointer', fontSize: '0.85rem', ...S.mono }}>Cancel Session</button>
            </motion.div>
          )}

          {status === 'transferring' && (
            <motion.div key="tx" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{ ...S.glass, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center', height: 40 }}>
                  {barHeights.current.map((h, i) => (
                    <motion.div key={i} style={{ width: 5, borderRadius: 3, background: `hsl(${270 + i * 8},80%,70%)` }} animate={{ height: [4, h, 4] }} transition={{ duration: 0.6, delay: i * 0.06, repeat: Infinity, ease: 'easeInOut' }} />
                  ))}
                </div>
                <div style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <span style={{ fontSize: '0.75rem', ...S.muted, ...S.mono }}>{formatBytes(transferred)} sent</span>
                    <span style={{ fontSize: '0.9rem', color: '#c084fc', fontWeight: 700, ...S.mono }}>{progress}%</span>
                  </div>
                  <div style={{ height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' }}>
                    <motion.div style={{ height: '100%', borderRadius: 4, background: 'linear-gradient(90deg,#9b30ff,#00e5ff)' }} animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.4rem' }}>
                    <span style={{ fontSize: '0.75rem', ...S.muted, ...S.mono }}>{formatBytes(speed)}/s</span>
                  </div>
                </div>
              </div>
              <DebugLog logs={logs} />
            </motion.div>
          )}

          {status === 'done' && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
              <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.5 }} style={{ fontSize: '5rem', lineHeight: 1 }}>✅</motion.div>
              <h2 style={{ margin: 0, fontFamily: "'Space Grotesk',sans-serif", fontSize: '2rem', fontWeight: 800, color: '#00ff87', textShadow: '0 0 30px rgba(0,255,135,0.5)' }}>File Sent!</h2>
              <p style={{ margin: 0, ...S.muted, fontSize: '0.85rem', ...S.mono }}>Session burned. No traces remain.</p>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button onClick={() => { setStatus('idle'); setFile(null); setProgress(0); setSessionCode(''); setLogs([]); }}
                  style={{ padding: '0.75rem 1.5rem', borderRadius: 12, background: 'linear-gradient(135deg,#9b30ff,#5f0fff)', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: "'Space Grotesk',sans-serif" }}>Send Another</button>
                <button onClick={() => router.push('/')}
                  style={{ padding: '0.75rem 1.5rem', borderRadius: 12, background: 'none', border: '1px solid rgba(155,48,255,0.4)', color: '#c084fc', cursor: 'pointer', fontFamily: "'Space Grotesk',sans-serif" }}>Return to Void</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
