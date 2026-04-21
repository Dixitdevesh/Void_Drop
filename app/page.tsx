'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';

const VortexScene = dynamic(() => import('@/components/VortexScene'), {
  ssr: false,
  loading: () => null,
});

const FEATURES = ['⚡ WebRTC P2P', '🔐 AES-256', '📡 QR Connect', '🔥 Burn After Send', '📦 Any File Size'];

export default function LandingPage() {
  const router = useRouter();
  const [entering, setEntering] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  const handleEnter = () => {
    setEntering(true);
    setTimeout(() => setShowOptions(true), 700);
  };

  return (
    <main style={{
      position: 'relative',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    }}>
      {/* Three.js Vortex */}
      <VortexScene zoomIn={entering} />

      {/* Dark vignette overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse 70% 60% at 50% 50%, transparent 20%, rgba(0,0,0,0.75) 100%)',
        pointerEvents: 'none',
      }} />

      {/* Page content */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        padding: '0 1.5rem',
        width: '100%',
        maxWidth: '900px',
        margin: '0 auto',
      }}>
        <AnimatePresence mode="wait">
          {!showOptions ? (
            /* ── Hero ─────────────────────────────────────────────── */
            <motion.div
              key="hero"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.5 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem' }}
            >
              {/* Status badge */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.4rem 1.2rem',
                  borderRadius: '9999px',
                  background: 'rgba(155,48,255,0.1)',
                  border: '1px solid rgba(155,48,255,0.3)',
                  color: '#c084fc',
                  fontSize: '0.7rem',
                  fontFamily: "'JetBrains Mono', monospace",
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                }}
              >
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#a855f7', display: 'inline-block', animation: 'pulse 2s infinite' }} />
                Zero-trace · Encrypted · P2P
              </motion.div>

              {/* VOIDDROP Title */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
              >
                <h1 style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 'clamp(4rem, 10vw, 8rem)',
                  fontWeight: 800,
                  lineHeight: 0.9,
                  letterSpacing: '-0.04em',
                  margin: 0,
                }}>
                  <span style={{
                    background: 'linear-gradient(135deg, #ffffff 0%, #d8b4fe 40%, #a855f7 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}>VOID</span>
                  <span style={{ color: '#ffffff' }}>DROP</span>
                </h1>
                <p style={{
                  marginTop: '1.2rem',
                  fontSize: '1.15rem',
                  fontWeight: 300,
                  color: '#b8bcd8',
                  letterSpacing: '0.02em',
                }}>
                  Drop files into the void.
                </p>
                <p style={{
                  marginTop: '0.4rem',
                  fontSize: '0.75rem',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: '#5a5875',
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  No accounts &nbsp;·&nbsp; No servers &nbsp;·&nbsp; No traces
                </p>
              </motion.div>

              {/* Feature pills */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.55 }}
                style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.5rem' }}
              >
                {FEATURES.map((tag) => (
                  <span key={tag} style={{
                    padding: '0.35rem 0.9rem',
                    borderRadius: '9999px',
                    fontSize: '0.78rem',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#94a3b8',
                  }}>
                    {tag}
                  </span>
                ))}
              </motion.div>

              {/* CTA button */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
              >
                <motion.button
                  onClick={handleEnter}
                  whileHover={{ scale: 1.05, boxShadow: '0 0 60px rgba(155,48,255,0.7), 0 0 120px rgba(155,48,255,0.3)' }}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    position: 'relative',
                    overflow: 'hidden',
                    padding: '1rem 2.8rem',
                    fontSize: '1.05rem',
                    fontWeight: 600,
                    fontFamily: "'Space Grotesk', sans-serif",
                    letterSpacing: '0.02em',
                    color: '#fff',
                    background: 'linear-gradient(135deg, #9b30ff, #5f0fff)',
                    border: '1px solid rgba(155,48,255,0.6)',
                    borderRadius: '14px',
                    cursor: 'pointer',
                    boxShadow: '0 0 30px rgba(155,48,255,0.4), 0 4px 20px rgba(0,0,0,0.5)',
                  }}
                >
                  <motion.span
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.18) 50%, transparent 70%)',
                    }}
                    animate={{ x: ['-150%', '150%'] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
                  />
                  <span style={{ position: 'relative' }}>Enter the Void →</span>
                </motion.button>
              </motion.div>

              {/* Footer note */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.1 }}
                style={{
                  fontSize: '0.72rem',
                  color: '#3d3a52',
                  fontFamily: "'JetBrains Mono', monospace",
                  margin: 0,
                }}
              >
                Powered by WebRTC · Signaling only, no file storage
              </motion.p>
            </motion.div>
          ) : (
            /* ── Mode Selection ────────────────────────────────────── */
            <motion.div
              key="options"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem', width: '100%' }}
            >
              <motion.h2
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 'clamp(1.5rem, 4vw, 2rem)',
                  fontWeight: 700,
                  color: '#fff',
                  margin: 0,
                }}
              >
                What do you want to do?
              </motion.h2>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', width: '100%', maxWidth: '520px' }}>
                {/* Send Card */}
                <motion.div
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.08 }}
                  onClick={() => router.push('/send')}
                  whileHover={{ scale: 1.03, boxShadow: '0 0 40px rgba(155,48,255,0.25)' }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    padding: '2rem 1.5rem',
                    borderRadius: '20px',
                    background: 'rgba(255,255,255,0.05)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(155,48,255,0.25)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.75rem',
                  }}
                >
                  <span style={{ fontSize: '3rem', lineHeight: 1 }}>📤</span>
                  <h3 style={{ margin: 0, fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>Send</h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#7a7898', lineHeight: 1.4 }}>Share a file — get a code & QR</p>
                  <span style={{ fontSize: '0.75rem', fontFamily: "'JetBrains Mono', monospace", color: '#9b30ff' }}>Generate session →</span>
                </motion.div>

                {/* Receive Card */}
                <motion.div
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 }}
                  onClick={() => router.push('/receive')}
                  whileHover={{ scale: 1.03, boxShadow: '0 0 40px rgba(0,229,255,0.2)' }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    padding: '2rem 1.5rem',
                    borderRadius: '20px',
                    background: 'rgba(255,255,255,0.05)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(0,229,255,0.2)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.75rem',
                  }}
                >
                  <span style={{ fontSize: '3rem', lineHeight: 1 }}>📥</span>
                  <h3 style={{ margin: 0, fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>Receive</h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#7a7898', lineHeight: 1.4 }}>Enter code or scan QR to download</p>
                  <span style={{ fontSize: '0.75rem', fontFamily: "'JetBrains Mono', monospace", color: '#00e5ff' }}>Join session →</span>
                </motion.div>
              </div>

              {/* Back button */}
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                onClick={() => { setShowOptions(false); setEntering(false); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#5a5875',
                  fontSize: '0.8rem',
                  fontFamily: "'JetBrains Mono', monospace",
                  cursor: 'pointer',
                  padding: '0.5rem 1rem',
                }}
              >
                ← Back to void
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
