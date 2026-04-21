/**
 * VoidDrop — AES-256-CBC Encryption
 * Client-side only. Keys never leave the browser during transfer.
 */

import CryptoJS from 'crypto-js';

const KEY_SIZE = 256 / 32; // 256-bit key
const ITERATIONS = 1000;

/**
 * Derive a 256-bit key from session code + salt.
 */
export function deriveKey(sessionCode, salt) {
  return CryptoJS.PBKDF2(sessionCode, salt, {
    keySize: KEY_SIZE,
    iterations: ITERATIONS,
    hasher: CryptoJS.algo.SHA256,
  });
}

/**
 * Encrypt an ArrayBuffer chunk. Returns { iv, salt, data } as base64 strings.
 */
export function encryptChunk(arrayBuffer, sessionCode) {
  const wordArray = CryptoJS.lib.WordArray.create(arrayBuffer);
  const salt = CryptoJS.lib.WordArray.random(128 / 8);
  const iv = CryptoJS.lib.WordArray.random(128 / 8);
  const key = deriveKey(sessionCode, salt);

  const encrypted = CryptoJS.AES.encrypt(wordArray, key, {
    iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  return JSON.stringify({
    iv: iv.toString(CryptoJS.enc.Base64),
    salt: salt.toString(CryptoJS.enc.Base64),
    data: encrypted.toString(),
  });
}

/**
 * Decrypt a chunk payload string back to ArrayBuffer.
 */
export function decryptChunk(payload, sessionCode) {
  const { iv, salt, data } = JSON.parse(payload);

  const saltWA = CryptoJS.enc.Base64.parse(salt);
  const ivWA = CryptoJS.enc.Base64.parse(iv);
  const key = deriveKey(sessionCode, saltWA);

  const decrypted = CryptoJS.AES.decrypt(data, key, {
    iv: ivWA,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  // WordArray to ArrayBuffer
  const words = decrypted.words;
  const sigBytes = decrypted.sigBytes;
  const buffer = new ArrayBuffer(sigBytes);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < sigBytes; i++) {
    view[i] = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
  }
  return buffer;
}
