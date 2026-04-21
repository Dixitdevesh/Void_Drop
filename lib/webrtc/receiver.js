/**
 * VoidDrop — File Receiver
 * Reassembles chunks from DataChannel into a downloadable file.
 */

import { decryptChunk } from './encryption';

/**
 * @param {RTCDataChannel} channel
 * @param {string|null} sessionCode — null = no decryption
 * @param {(meta: object) => void} onMetadata
 * @param {(progress: number, speed: number, received: number) => void} onProgress
 * @param {(blob: Blob, filename: string) => void} onComplete
 */
export function receiveFile(channel, sessionCode, onMetadata, onProgress, onComplete) {
  let metadata = null;
  let chunks = [];
  let receivedBytes = 0;
  let startTime = null;

  channel.binaryType = 'arraybuffer';

  // Helper: report progress after receiving any chunk
  function reportProgress(bytesJustReceived) {
    receivedBytes += bytesJustReceived;
    if (metadata && startTime) {
      const elapsed = (Date.now() - startTime) / 1000 || 0.001;
      const speed = receivedBytes / elapsed;
      const progress = metadata.size > 0
        ? Math.min(100, Math.round((receivedBytes / metadata.size) * 100))
        : 0;
      onProgress?.(progress, speed, receivedBytes);
    }
  }

  channel.onmessage = (event) => {
    const { data } = event;

    // ── String messages ──────────────────────────────────────────
    if (typeof data === 'string') {
      let msg;
      try {
        msg = JSON.parse(data);
      } catch {
        return; // Not valid JSON — ignore
      }

      // Metadata header
      if (msg.__type === 'metadata') {
        metadata = msg;
        startTime = Date.now();
        receivedBytes = 0;
        chunks = [];
        onMetadata?.(metadata);
        return;
      }

      // Transfer complete signal
      if (msg.__type === 'transfer_complete') {
        if (!metadata) return;
        const blob = new Blob(chunks, { type: metadata.mimeType || 'application/octet-stream' });
        onComplete?.(blob, metadata.name);
        // Reset state
        chunks = [];
        metadata = null;
        return;
      }

      // Encrypted chunk — JSON string payload {iv, salt, data}
      if (msg.iv && msg.salt && msg.data && sessionCode) {
        try {
          const decrypted = decryptChunk(data, sessionCode);
          chunks.push(decrypted);
          reportProgress(decrypted.byteLength); // ✅ progress reported for encrypted chunks
        } catch (e) {
          console.error('[Receiver] Decryption failed:', e);
        }
        return;
      }

      return; // Unknown string message — ignore
    }

    // ── Binary ArrayBuffer chunk (unencrypted) ───────────────────
    if (data instanceof ArrayBuffer) {
      chunks.push(data);
      reportProgress(data.byteLength); // ✅ progress reported for unencrypted chunks
    }
  };

  channel.onerror = (err) => {
    console.error('[Receiver] DataChannel error:', err);
  };
}

/**
 * Trigger browser download of received file.
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
