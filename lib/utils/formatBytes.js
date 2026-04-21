/**
 * Format bytes to a human-readable string.
 * @param {number} bytes
 * @param {number} decimals
 */
export function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Format transfer speed.
 * @param {number} bytesPerSecond
 */
export function formatSpeed(bytesPerSecond) {
  return `${formatBytes(bytesPerSecond)}/s`;
}

/**
 * Estimate time remaining.
 * @param {number} totalBytes
 * @param {number} transferredBytes
 * @param {number} speed bytes/s
 */
export function estimateTimeRemaining(totalBytes, transferredBytes, speed) {
  if (speed <= 0) return '∞';
  const remaining = totalBytes - transferredBytes;
  const seconds = remaining / speed;
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs}s`;
}
