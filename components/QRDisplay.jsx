'use client';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';

export default function QRDisplay({ sessionCode, sessionUrl }) {
  const value = sessionUrl || sessionCode || '';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
      className="flex flex-col items-center gap-6"
    >
      {/* Holographic frame */}
      <div className="relative">
        {/* Outer glow ring */}
        <div className="absolute -inset-4 rounded-2xl" style={{
          background: 'radial-gradient(ellipse at center, rgba(155,48,255,0.2) 0%, transparent 70%)',
          filter: 'blur(12px)',
        }} />

        {/* Spinning ring decorations */}
        <div className="absolute -inset-3 rounded-xl border border-dashed border-purple-700/40 spin-slow" />
        <div className="absolute -inset-5 rounded-2xl border border-dashed border-purple-900/20 spin-slow-reverse" />

        {/* QR Code glass container */}
        <div className="relative glass-strong p-4 rounded-2xl">
          {/* Corner accents */}
          {[
            'top-0 left-0 border-t-2 border-l-2 rounded-tl-lg',
            'top-0 right-0 border-t-2 border-r-2 rounded-tr-lg',
            'bottom-0 left-0 border-b-2 border-l-2 rounded-bl-lg',
            'bottom-0 right-0 border-b-2 border-r-2 rounded-br-lg',
          ].map((cls, i) => (
            <div
              key={i}
              className={`absolute w-5 h-5 ${cls}`}
              style={{ borderColor: 'var(--void-purple)' }}
            />
          ))}

          <QRCodeSVG
            value={value || ' '}
            size={200}
            bgColor="transparent"
            fgColor="#c084fc"
            level="H"
            style={{ display: 'block' }}
          />
        </div>
      </div>

      {/* Session code display */}
      <div className="text-center">
        <p className="text-xs mb-2" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          SESSION CODE
        </p>
        <div className="flex gap-2 justify-center">
          {sessionCode?.split('').map((char, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.07 }}
              className="w-10 h-12 flex items-center justify-center rounded-lg text-xl font-bold"
              style={{
                fontFamily: 'var(--font-mono)',
                background: 'rgba(155,48,255,0.1)',
                border: '1px solid rgba(155,48,255,0.3)',
                color: '#c084fc',
                boxShadow: '0 0 10px rgba(155,48,255,0.15)',
              }}
            >
              {char}
            </motion.span>
          ))}
        </div>
      </div>

      <p className="text-xs text-center max-w-[200px]" style={{ color: 'var(--text-muted)' }}>
        Scan QR or share code with receiver
      </p>
    </motion.div>
  );
}
