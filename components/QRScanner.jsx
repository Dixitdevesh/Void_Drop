'use client';
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

export default function QRScanner({ onResult, onError }) {
  const scannerRef = useRef(null);
  const [status, setStatus] = useState('init'); // init | scanning | denied | error

  useEffect(() => {
    let html5QrCode;
    let stopped = false;

    const startScanner = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');

        // Ensure the container div exists
        const container = document.getElementById('qr-reader-container');
        if (!container) return;

        html5QrCode = new Html5Qrcode('qr-reader-container');
        scannerRef.current = html5QrCode;
        setStatus('scanning');

        await html5QrCode.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 200, height: 200 } },
          (decodedText) => {
            if (stopped) return;
            stopped = true;

            // Extract 5-char alphanumeric code from URL or raw value
            // Handles: "ABC12", "https://...?code=ABC12", "https://.../receive?code=ABC12"
            let code = '';
            const paramMatch = decodedText.match(/[?&]code=([A-Z0-9]{5})/i);
            if (paramMatch) {
              code = paramMatch[1].toUpperCase();
            } else {
              // Last 5 alphanumeric characters
              const raw = decodedText.replace(/[^A-Z0-9]/gi, '');
              code = raw.slice(-5).toUpperCase();
            }

            if (code.length === 5) {
              html5QrCode.stop().catch(() => {});
              setStatus('done');
              onResult?.(code);
            }
          },
          () => {} // ignore scan errors (just frame decode failures)
        );
      } catch (err) {
        if (stopped) return;
        const msg = String(err);
        if (msg.includes('NotAllowedError') || msg.includes('permission') || msg.includes('Permission')) {
          setStatus('denied');
        } else {
          setStatus('error');
        }
        onError?.(err);
      }
    };

    startScanner();

    return () => {
      stopped = true;
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
      {status === 'denied' && (
        <div style={{ textAlign: 'center', padding: '1.5rem' }}>
          <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📷</p>
          <p style={{ color: '#fff', fontWeight: 600, marginBottom: '0.25rem', fontSize: '0.9rem' }}>Camera Access Denied</p>
          <p style={{ color: '#7a7898', fontSize: '0.8rem' }}>Allow camera in browser settings, or enter the code manually.</p>
        </div>
      )}

      {status === 'error' && (
        <div style={{ textAlign: 'center', padding: '1.5rem' }}>
          <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚠️</p>
          <p style={{ color: '#f87171', fontWeight: 600, fontSize: '0.9rem' }}>Camera unavailable</p>
          <p style={{ color: '#7a7898', fontSize: '0.8rem' }}>Enter the code manually instead.</p>
        </div>
      )}

      {(status === 'init' || status === 'scanning') && (
        <div style={{ position: 'relative', width: 280, overflow: 'hidden', borderRadius: 16,
          border: '1px solid rgba(155,48,255,0.3)', background: 'rgba(0,0,0,0.7)' }}>
          {/* Scan line */}
          {status === 'scanning' && (
            <motion.div
              style={{ position: 'absolute', left: 0, right: 0, height: 2, zIndex: 10,
                background: 'linear-gradient(90deg, transparent, #9b30ff, #00e5ff, #9b30ff, transparent)' }}
              animate={{ top: ['15%', '85%', '15%'] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
          {/* Corner brackets */}
          {[
            { top: 8, left: 8, borderTop: '2px solid #9b30ff', borderLeft: '2px solid #9b30ff' },
            { top: 8, right: 8, borderTop: '2px solid #9b30ff', borderRight: '2px solid #9b30ff' },
            { bottom: 8, left: 8, borderBottom: '2px solid #9b30ff', borderLeft: '2px solid #9b30ff' },
            { bottom: 8, right: 8, borderBottom: '2px solid #9b30ff', borderRight: '2px solid #9b30ff' },
          ].map((s, i) => (
            <div key={i} style={{ position: 'absolute', width: 20, height: 20, borderRadius: 3, zIndex: 10, ...s }} />
          ))}
          {/* The actual scanner renders here */}
          <div id="qr-reader-container" style={{ width: '100%', minHeight: 260 }} />
        </div>
      )}

      <p style={{ fontSize: '0.78rem', color: '#7a7898', fontFamily: "'JetBrains Mono', monospace", margin: 0 }}>
        {status === 'init' && 'Initializing camera…'}
        {status === 'scanning' && 'Point camera at QR code'}
        {status === 'done' && '✅ Code scanned!'}
        {status === 'denied' && 'Camera access required'}
        {status === 'error' && 'Camera unavailable'}
      </p>
    </div>
  );
}
