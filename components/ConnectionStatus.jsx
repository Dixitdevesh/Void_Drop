'use client';
import { motion, AnimatePresence } from 'framer-motion';

const STATUS_CONFIG = {
  connecting: {
    label: 'Connecting…',
    color: '#ffcc00',
    bg: 'rgba(255,204,0,0.08)',
    border: 'rgba(255,204,0,0.3)',
  },
  connected: {
    label: 'Connected',
    color: '#00ff87',
    bg: 'rgba(0,255,135,0.08)',
    border: 'rgba(0,255,135,0.3)',
  },
  disconnected: {
    label: 'Disconnected',
    color: '#ff4040',
    bg: 'rgba(255,64,64,0.08)',
    border: 'rgba(255,64,64,0.3)',
  },
  waiting: {
    label: 'Waiting for peer…',
    color: '#9b30ff',
    bg: 'rgba(155,48,255,0.08)',
    border: 'rgba(155,48,255,0.3)',
  },
  transferring: {
    label: 'Transferring',
    color: '#00e5ff',
    bg: 'rgba(0,229,255,0.08)',
    border: 'rgba(0,229,255,0.3)',
  },
};

export default function ConnectionStatus({ status = 'waiting' }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.waiting;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={status}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.3 }}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
        style={{
          background: config.bg,
          border: `1px solid ${config.border}`,
          color: config.color,
          fontFamily: 'var(--font-mono)',
        }}
      >
        {/* Animated dot */}
        <span className="relative flex h-2 w-2">
          <span
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
            style={{ background: config.color }}
          />
          <span
            className="relative inline-flex rounded-full h-2 w-2"
            style={{ background: config.color }}
          />
        </span>
        {config.label}
      </motion.div>
    </AnimatePresence>
  );
}
