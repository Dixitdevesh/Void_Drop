'use client';
import { motion } from 'framer-motion';

export default function GlassCard({
  children,
  className = '',
  glowOnHover = true,
  animate = true,
  delay = 0,
  onClick,
}) {
  return (
    <motion.div
      initial={animate ? { opacity: 0, y: 24 } : false}
      animate={animate ? { opacity: 1, y: 0 } : false}
      transition={{ duration: 0.6, delay, ease: [0.23, 1, 0.32, 1] }}
      onClick={onClick}
      className={`glass p-6 ${glowOnHover ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </motion.div>
  );
}
