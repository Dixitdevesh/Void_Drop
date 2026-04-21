'use client';
import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { normalizeCode, validateSessionCode } from '@/lib/utils/sessionCode';

export default function CodeInput({ onSubmit, disabled = false }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const handleChange = (e) => {
    const val = normalizeCode(e.target.value);
    setCode(val);
    if (error) setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateSessionCode(code)) {
      setError('Code must be 5 characters (letters & numbers)');
      return;
    }
    onSubmit?.(code);
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = normalizeCode(e.clipboardData.getData('text'));
    setCode(pasted);
    if (pasted.length === 5) onSubmit?.(pasted);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col items-center gap-4 w-full">
      <div className="relative w-full max-w-xs">
        <input
          ref={inputRef}
          type="text"
          value={code}
          onChange={handleChange}
          onPaste={handlePaste}
          placeholder="ENTER CODE"
          maxLength={5}
          disabled={disabled}
          className="code-input w-full px-4 py-4"
          style={{ textTransform: 'uppercase' }}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />

        {/* Character underline indicators */}
        <div className="flex justify-center gap-2 mt-2 px-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <motion.div
              key={i}
              className="h-0.5 flex-1 rounded-full"
              animate={{
                background: code[i]
                  ? 'rgba(155,48,255,0.9)'
                  : 'rgba(155,48,255,0.2)',
                scaleX: code[i] ? 1 : 0.6,
              }}
              transition={{ duration: 0.2 }}
            />
          ))}
        </div>
      </div>

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-sm text-center"
            style={{ color: '#ff6060', fontFamily: 'var(--font-mono)' }}
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      <motion.button
        type="submit"
        disabled={disabled || code.length < 5}
        className="btn-glow w-full max-w-xs py-3"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        animate={{
          opacity: code.length === 5 ? 1 : 0.5,
        }}
      >
        Join Session
      </motion.button>
    </form>
  );
}
