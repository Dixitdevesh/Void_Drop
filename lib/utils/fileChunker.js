/**
 * VoidDrop — file chunker utility
 * Splits a File or ArrayBuffer into 64KB chunks.
 */

export const CHUNK_SIZE = 64 * 1024; // 64 KB

/**
 * Returns total number of chunks for a given file size.
 */
export function getTotalChunks(fileSize) {
  return Math.ceil(fileSize / CHUNK_SIZE);
}

/**
 * Async generator — yields ArrayBuffer chunks from a File.
 * @param {File} file
 */
export async function* fileChunkGenerator(file) {
  let offset = 0;
  while (offset < file.size) {
    const slice = file.slice(offset, offset + CHUNK_SIZE);
    const buffer = await slice.arrayBuffer();
    yield buffer;
    offset += buffer.byteLength;
  }
}
