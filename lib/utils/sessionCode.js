/**
 * Generate a cryptographically random 5-character uppercase alphanumeric session code.
 */
export function generateSessionCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no O/0/I/1 to avoid confusion
  const arr = new Uint8Array(5);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((n) => chars[n % chars.length]).join('');
}

/**
 * Validate a session code: must be 5 uppercase alphanumeric characters.
 */
export function validateSessionCode(code) {
  return /^[A-Z0-9]{5}$/.test(code?.toUpperCase() ?? '');
}

/**
 * Normalize user input to uppercase.
 */
export function normalizeCode(input) {
  return input?.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5) ?? '';
}
