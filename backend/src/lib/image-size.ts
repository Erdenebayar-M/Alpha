/**
 * Image header reader: returns pixel width/height for PNG, JPEG, WebP and
 * GIF without decoding the image or pulling in a dependency. Used by the
 * Article image upload endpoint, which must return dimensions from the
 * file's real bytes — never a client-supplied value.
 */

import type { SniffedType } from './media-type';

export interface ImageDimensions {
  width: number;
  height: number;
}

export function readImageDimensions(buf: Buffer, type: SniffedType): ImageDimensions | null {
  switch (type) {
    case 'image/png':
      return readPng(buf);
    case 'image/jpeg':
      return readJpeg(buf);
    case 'image/webp':
      return readWebp(buf);
    case 'image/gif':
      return readGif(buf);
    default:
      return null;
  }
}

// IHDR is always the first chunk: 8-byte signature, 4-byte length, 4-byte
// "IHDR", then 4-byte width and 4-byte height (big-endian).
function readPng(buf: Buffer): ImageDimensions | null {
  if (buf.length < 24) return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

// Scan markers after the SOI (FF D8) for a Start-Of-Frame segment (C0-CF,
// excluding the non-frame DHT/JPG/DAC markers C4/C8/CC). Its payload is
// precision(1) + height(2) + width(2), big-endian.
function readJpeg(buf: Buffer): ImageDimensions | null {
  let offset = 2;
  while (offset + 1 < buf.length) {
    if (buf[offset] !== 0xff) {
      offset++;
      continue;
    }
    const marker = buf[offset + 1];
    if (marker === 0xff) {
      offset++;
      continue;
    }
    // Standalone markers with no length/payload: TEM, RST0-7, SOI, EOI.
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
      offset += 2;
      continue;
    }
    if (offset + 9 > buf.length) return null;
    const length = buf.readUInt16BE(offset + 2);
    const isSOF = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isSOF) {
      return { height: buf.readUInt16BE(offset + 5), width: buf.readUInt16BE(offset + 7) };
    }
    offset += 2 + length;
  }
  return null;
}

// RIFF(4) size(4) "WEBP"(4) chunk-fourcc(4) chunk-size(4), chunk data at
// offset 20. The three sub-formats each encode dimensions differently.
function readWebp(buf: Buffer): ImageDimensions | null {
  if (buf.length < 30) return null;
  const fourCC = buf.toString('ascii', 12, 16);

  if (fourCC === 'VP8X') {
    // Canvas Width/Height Minus One: 3-byte little-endian fields.
    const width = (buf[24] | (buf[25] << 8) | (buf[26] << 16)) + 1;
    const height = (buf[27] | (buf[28] << 8) | (buf[29] << 16)) + 1;
    return { width, height };
  }

  if (fourCC === 'VP8L') {
    if (buf[20] !== 0x2f) return null;
    const bits = buf[21] | (buf[22] << 8) | (buf[23] << 16) | (buf[24] << 24);
    const width = (bits & 0x3fff) + 1;
    const height = ((bits >>> 14) & 0x3fff) + 1;
    return { width, height };
  }

  if (fourCC === 'VP8 ') {
    // 3-byte frame tag, then the sync code 9D 01 2A, then width/height.
    if (buf[23] !== 0x9d || buf[24] !== 0x01 || buf[25] !== 0x2a) return null;
    const width = buf.readUInt16LE(26) & 0x3fff;
    const height = buf.readUInt16LE(28) & 0x3fff;
    return { width, height };
  }

  return null;
}

// Logical Screen Descriptor follows the 6-byte "GIF87a"/"GIF89a" signature:
// 2-byte width, 2-byte height, both little-endian.
function readGif(buf: Buffer): ImageDimensions | null {
  if (buf.length < 10) return null;
  return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
}
