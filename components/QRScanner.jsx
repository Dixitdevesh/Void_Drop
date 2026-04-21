'use client';
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

export default function QRScanner({ onResult, onError }) {
  const containerRef = useRef(null);
  const scannerRef = useRef(null);
  const [scanning, setScanning] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  useEffect(() => {
    let html5QrCode;

    const startScanner = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        html5QrCode = new Html5Qrcode('qr-reader');
        scannerRef.current = html5QrCode;
        setScanning(true);

        await html5QrCode.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decodedText) => {
            // Extract session code from URL or use raw value
            const match = decodedText.match(/[A-Z0-9]{5}$/);
            const code = match ? match[0] : decodedText.trim().toUpperCase().slice(-5);
            onResult?.(code);
            html5QrCode.stop().catch(() => {});
            setScanning(false);
          },
          undefined
        );
      } catch (err) {
        if (err?.name === 'NotAllowedError' || String(err).includes('permission')) {
          setPermissionDenied(true);
        }
        onError?.(err);
        setScanning(false);
      }
    };

    startScanner();

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  if (permissionDenied) {
    return (
      <div className="glass p-6 rounded-2xl text-center max-w-xs mx-auto">
        <p className="text-2xl mb-2">📷</p>
        <p className="text-sm font-semibold text-white mb-1">Camera Access Denied</p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Please allow camera access or enter the code manually.
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Scanner container */}
      <div className="relative overflow-hidden rounded-2xl" style={{
        border: '1px solid rgba(155,48,255,0.3)',
        background: 'rgba(0,0,0,0.6)',
        maxWidth: 300,
        margin: '0 auto',
      }}>
        {/* Scanning animation overlay */}
        {scanning && (
          <motion.div
            className="absolute left-0 right-0 h-0.5 z-10"
            style={{ background: 'linear-gradient(90deg, transparent, #9b30ff, transparent)' }}
            animate={{ top: ['10%', '90%', '10%'] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}

        {/* Corner brackets */}
        {['top-2 left-2 border-t-2 border-l-2', 'top-2 right-2 border-t-2 border-r-2',
          'bottom-2 left-2 border-b-2 border-l-2', 'bottom-2 right-2 border-b-2 border-r-2'].map((cls, i) => (
          <div key={i} className={`absolute w-5 h-5 ${cls} rounded-sm z-10`}
            style={{ borderColor: '#9b30ff' }} />
        ))}

        <div id="qr-reader" ref={containerRef} style={{ width: '100%', minHeight: 260 }} />
      </div>

      <p className="text-center text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
        {scanning ? 'Point camera at QR code…' : 'Initializing camera…'}
      </p>
    </div>
  );
}
