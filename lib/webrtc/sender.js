/**
 * VoidDrop — File Sender
 * Handles chunking, optional AES encryption, and DataChannel sending.
 */

import { encryptChunk } from './encryption';

const CHUNK_SIZE = 64 * 1024; // 64 KB
const MAX_BUFFERED = CHUNK_SIZE * 16; // 1 MB back-pressure limit

/**
 * Send file metadata header.
 */
export function sendMetadata(channel, file, totalChunks, encrypted) {
  channel.send(JSON.stringify({
    __type: 'metadata',
    name: file.name,
    size: file.size,
    mimeType: file.type || 'application/octet-stream',
    totalChunks,
    encrypted,
  }));
}

/**
 * Wait for the DataChannel to be open.
 * Safe to call even if already open.
 */
function waitForOpen(channel) {
  if (channel.readyState === 'open') return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('DataChannel open timeout')), 30000);
    channel.addEventListener('open', () => { clearTimeout(timeout); resolve(); }, { once: true });
    channel.addEventListener('error', () => { clearTimeout(timeout); reject(new Error('DataChannel error')); }, { once: true });
  });
}

/**
 * Wait for bufferedAmount to drain below threshold (back-pressure).
 */
function waitForDrain(channel, limit) {
  if (channel.bufferedAmount <= limit) return Promise.resolve();
  return new Promise((resolve) => {
    const check = () => {
      if (channel.bufferedAmount <= limit) { resolve(); }
      else { setTimeout(check, 50); }
    };
    setTimeout(check, 50);
  });
}

/**
 * Main sender function.
 * @param {RTCDataChannel} channel
 * @param {File} file
 * @param {string|null} sessionCode — null = no encryption
 * @param {(progress: number, speed: number, transferred: number) => void} onProgress
 */
export async function sendFile(channel, file, sessionCode, onProgress) {
  const encrypted = !!sessionCode;
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

  // ── Wait for channel to open (even if already open) ────────────
  await waitForOpen(channel);

  channel.binaryType = 'arraybuffer';

  // ── Send metadata header ────────────────────────────────────────
  sendMetadata(channel, file, totalChunks, encrypted);

  let offset = 0;
  let chunkIndex = 0;
  const startTime = Date.now();

  // ── Stream chunks ───────────────────────────────────────────────
  while (offset < file.size) {
    // Back-pressure: wait if buffer is too full
    await waitForDrain(channel, MAX_BUFFERED);

    const slice = file.slice(offset, offset + CHUNK_SIZE);
    const arrayBuffer = await slice.arrayBuffer();

    if (channel.readyState !== 'open') {
      throw new Error('DataChannel closed mid-transfer');
    }

    if (encrypted) {
      channel.send(encryptChunk(arrayBuffer, sessionCode));
    } else {
      channel.send(arrayBuffer);
    }

    offset += arrayBuffer.byteLength;
    chunkIndex++;

    const elapsed = (Date.now() - startTime) / 1000 || 0.001;
    onProgress?.(
      Math.min(100, Math.round((chunkIndex / totalChunks) * 100)),
      offset / elapsed,
      offset
    );

    // Yield to browser event loop every 8 chunks
    if (chunkIndex % 8 === 0) {
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  // ── Signal completion ───────────────────────────────────────────
  channel.send(JSON.stringify({ __type: 'transfer_complete' }));
}
