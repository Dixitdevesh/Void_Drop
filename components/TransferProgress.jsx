'use client';
import { motion } from 'framer-motion';
import { formatBytes, formatSpeed, estimateTimeRemaining } from '@/lib/utils/formatBytes';

const SIZE = 200;
const STROKE = 8;
const R = (SIZE / 2) - (STROKE / 2);
const CIRCUMFERENCE = 2 * Math.PI * R;

export default function TransferProgress({
  progress = 0,       // 0-100
  speed = 0,          // bytes/s
  transferred = 0,    // bytes
  totalSize = 0,      // bytes
  filename = '',
  status = 'transferring',
}) {
  const offset = CIRCUMFERENCE - (progress / 100) * CIRCUMFERENCE;

  const isComplete = progress >= 100;

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Circular progress */}
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        {/* Outer glow */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(ellipse at center, rgba(155,48,255,${progress / 300}) 0%, transparent 70%)`,
            filter: 'blur(20px)',
            transition: 'background 0.3s ease',
          }}
        />

        <svg
          width={SIZE}
          height={SIZE}
          className="progress-circle relative z-10"
        >
          {/* Background track */}
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            stroke="rgba(155,48,255,0.1)"
            strokeWidth={STROKE}
          />
          {/* Animated progress arc */}
          <motion.circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            stroke={isComplete ? '#00ff87' : 'url(#progressGrad)'}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />

          {/* Gradient definition */}
          <defs>
            <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#9b30ff" />
              <stop offset="100%" stopColor="#00e5ff" />
            </linearGradient>
          </defs>
        </svg>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            key={Math.floor(progress / 5)}
            initial={{ scale: 0.8, opacity: 0.5 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-4xl font-bold font-display"
            style={{
              color: isComplete ? '#00ff87' : '#fff',
              textShadow: isComplete
                ? '0 0 20px rgba(0,255,135,0.6)'
                : '0 0 20px rgba(255,255,255,0.3)',
            }}
          >
            {isComplete ? '✓' : `${progress}%`}
          </motion.span>
          {!isComplete && (
            <span className="text-xs mt-1" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {status}
            </span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 w-full max-w-sm">
        {[
          { label: 'Speed', value: formatSpeed(speed) },
          { label: 'Transferred', value: formatBytes(transferred) },
          { label: 'Remaining', value: estimateTimeRemaining(totalSize, transferred, speed) },
        ].map(({ label, value }) => (
          <div key={label} className="glass p-3 text-center rounded-xl">
            <p className="text-xs mb-1" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {label}
            </p>
            <p className="text-sm font-semibold" style={{ color: '#c084fc', fontFamily: 'var(--font-mono)' }}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Filename */}
      {filename && (
        <p className="text-sm text-center max-w-[240px] truncate" style={{ color: 'var(--text-muted)' }}>
          📁 {filename}
        </p>
      )}
    </div>
  );
}
