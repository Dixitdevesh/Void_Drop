/**
 * VoidDrop — File Sender
 * Handles chunking, optional AES encryption, and DataChannel sending.
 */

import { encryptChunk } from './encryption';

const CHUNK_SIZE = 64 * 1024; // 64 KB

/**
 * Send file metadata first (name, size, type, total chunks, encrypted flag).
 */
export function sendMetadata(channel, file, totalChunks, encrypted) {
  channel.send(JSON.stringify({
    __type: 'metadata',
    name: file.name,
    size: file.size,
    mimeType: file.type,
    totalChunks,
    encrypted,
  }));
}

/**
 * Main sender function.
 * @param {RTCDataChannel} channel
 * @param {File} file
 * @param {string|null} sessionCode — null means no encryption
 * @param {(progress: number, speed: number, transferred: number) => void} onProgress
 */
export async function sendFile(channel, file, sessionCode, onProgress) {
  const encrypted = !!sessionCode;
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

  // Wait for channel to be open
  if (channel.readyState !== 'open') {
    await new Promise((resolve) => {
      channel.onopen = resolve;
    });
  }

  // Set binary type
  channel.binaryType = 'arraybuffer';

  // Send metadata header
  sendMetadata(channel, file, totalChunks, encrypted);

  let offset = 0;
  let chunkIndex = 0;
  const startTime = Date.now();

  while (offset < file.size) {
    // Backpressure handling — wait if buffer is getting full
    while (channel.bufferedAmount > CHUNK_SIZE * 8) {
      await new Promise((r) => setTimeout(r, 50));
    }

    const slice = file.slice(offset, offset + CHUNK_SIZE);
    const arrayBuffer = await slice.arrayBuffer();

    if (encrypted) {
      // Send as encrypted JSON string
      const payload = encryptChunk(arrayBuffer, sessionCode);
      channel.send(payload);
    } else {
      // Send raw binary
      channel.send(arrayBuffer);
    }

    offset += arrayBuffer.byteLength;
    chunkIndex++;

    const elapsed = (Date.now() - startTime) / 1000;
    const speed = offset / elapsed; // bytes/s
    const progress = Math.round((chunkIndex / totalChunks) * 100);

    onProgress?.(progress, speed, offset);

    // Yield to browser event loop every 10 chunks
    if (chunkIndex % 10 === 0) {
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  // Signal transfer complete
  channel.send(JSON.stringify({ __type: 'transfer_complete' }));
}
