'use client';
import { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatBytes } from '@/lib/utils/formatBytes';

const ICON_MAP = {
  'image/': '🖼️',
  'video/': '🎬',
  'audio/': '🎵',
  'application/pdf': '📄',
  'application/zip': '📦',
  'text/': '📝',
};

function getFileIcon(mimeType) {
  for (const [prefix, icon] of Object.entries(ICON_MAP)) {
    if (mimeType?.startsWith(prefix)) return icon;
  }
  return '📁';
}

export default function FileDropZone({ onFileSelected, disabled = false }) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState(null);

  const handleFile = useCallback((selectedFile) => {
    if (selectedFile) {
      setFile(selectedFile);
      onFileSelected?.(selectedFile);
    }
  }, [onFileSelected]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFile(dropped);
  }, [handleFile]);

  const onDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = () => setIsDragging(false);

  const onInputChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) handleFile(selected);
  };

  return (
    <div className="w-full">
      <motion.label
        htmlFor="file-input"
        className={`dropzone flex flex-col items-center justify-center p-12 cursor-pointer w-full min-h-[240px] relative overflow-hidden ${isDragging ? 'active' : ''}`}
        animate={{
          scale: isDragging ? 1.02 : 1,
          borderColor: isDragging ? 'rgba(155,48,255,0.8)' : 'rgba(155,48,255,0.3)',
        }}
        transition={{ duration: 0.2 }}
        onDrop={!disabled ? onDrop : undefined}
        onDragOver={!disabled ? onDragOver : undefined}
        onDragLeave={!disabled ? onDragLeave : undefined}
      >
        {/* Background pulse when dragging */}
        <AnimatePresence>
          {isDragging && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 rounded-[18px]"
              style={{ background: 'radial-gradient(ellipse at center, rgba(155,48,255,0.12) 0%, transparent 70%)' }}
            />
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {!file ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center gap-4 text-center relative z-10"
            >
              {/* Upload icon */}
              <motion.div
                animate={{ y: isDragging ? -8 : 0 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
                  <circle cx="28" cy="28" r="27" stroke="rgba(155,48,255,0.4)" strokeWidth="1.5"/>
                  <path d="M28 36V20M28 20L22 26M28 20L34 26" stroke="#9b30ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M18 36h20" stroke="rgba(155,48,255,0.5)" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </motion.div>
              <div>
                <p className="text-white font-semibold text-lg mb-1">
                  {isDragging ? 'Drop to void…' : 'Drag & drop your file'}
                </p>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  or <span style={{ color: 'var(--void-purple)' }}>click to browse</span>
                </p>
              </div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Any file type · No size limit
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="file"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-3 relative z-10"
            >
              <span className="text-5xl">{getFileIcon(file.type)}</span>
              <div className="text-center">
                <p className="text-white font-semibold text-base mb-1 max-w-[200px] truncate">
                  {file.name}
                </p>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {formatBytes(file.size)}
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); setFile(null); onFileSelected?.(null); }}
                className="text-xs px-3 py-1 rounded-full border transition-all"
                style={{
                  borderColor: 'rgba(255,64,64,0.3)',
                  color: '#ff6060',
                  background: 'rgba(255,64,64,0.05)',
                }}
              >
                Remove
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <input
          id="file-input"
          type="file"
          className="hidden"
          onChange={onInputChange}
          disabled={disabled}
        />
      </motion.label>
    </div>
  );
}
