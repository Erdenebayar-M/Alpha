/**
 * Unit tests for the image header reader used by the Article image upload
 * endpoint. Buffers are hand-built per format's real container layout.
 */
import { readImageDimensions } from '../image-size';

describe('readImageDimensions', () => {
  it('reads PNG width/height from the IHDR chunk', () => {
    const buf = Buffer.alloc(24);
    buf.write('\x89PNG\r\n\x1a\n', 0, 'binary');
    buf.writeUInt32BE(13, 8); // chunk length
    buf.write('IHDR', 12, 'binary');
    buf.writeUInt32BE(300, 16); // width
    buf.writeUInt32BE(200, 20); // height
    expect(readImageDimensions(buf, 'image/png')).toEqual({ width: 300, height: 200 });
  });

  it('reads JPEG width/height from an SOF0 segment', () => {
    // SOI, then an APP0 (JFIF) segment to skip over, then SOF0 (C0) with
    // precision/height/width, then the rest of the stream is irrelevant.
    const bytes = [
      0xff, 0xd8, // SOI
      0xff, 0xe0, 0x00, 0x10, // APP0, length 16 (14 bytes of payload follow)
      ...new Array(14).fill(0x00),
      0xff, 0xc0, // SOF0
      0x00, 0x0b, // length = 11
      0x08, // precision
      0x00, 0x64, // height = 100
      0x00, 0xc8, // width = 200
      0x03, 0x01, 0x11, 0x00, // rest of SOF payload (component data)
    ];
    const buf = Buffer.from(bytes);
    expect(readImageDimensions(buf, 'image/jpeg')).toEqual({ width: 200, height: 100 });
  });

  it('reads GIF width/height from the Logical Screen Descriptor', () => {
    const buf = Buffer.alloc(10);
    buf.write('GIF89a', 0, 'binary');
    buf.writeUInt16LE(150, 6); // width
    buf.writeUInt16LE(90, 8); // height
    expect(readImageDimensions(buf, 'image/gif')).toEqual({ width: 150, height: 90 });
  });

  it('reads WebP (extended, VP8X) width/height', () => {
    const buf = Buffer.alloc(30);
    buf.write('RIFF', 0, 'binary');
    buf.writeUInt32LE(22, 4);
    buf.write('WEBP', 8, 'binary');
    buf.write('VP8X', 12, 'binary');
    buf.writeUInt32LE(10, 16); // chunk size
    buf[20] = 0x10; // flags
    // Canvas Width Minus One = 399 → width 400; Height Minus One = 299 → height 300.
    buf[24] = 399 & 0xff;
    buf[25] = (399 >> 8) & 0xff;
    buf[26] = (399 >> 16) & 0xff;
    buf[27] = 299 & 0xff;
    buf[28] = (299 >> 8) & 0xff;
    buf[29] = (299 >> 16) & 0xff;
    expect(readImageDimensions(buf, 'image/webp')).toEqual({ width: 400, height: 300 });
  });

  it('reads WebP (lossless, VP8L) width/height', () => {
    const buf = Buffer.alloc(30);
    buf.write('RIFF', 0, 'binary');
    buf.writeUInt32LE(20, 4);
    buf.write('WEBP', 8, 'binary');
    buf.write('VP8L', 12, 'binary');
    buf.writeUInt32LE(10, 16);
    buf[20] = 0x2f; // signature
    const width = 100; // width-1 = 99
    const height = 50; // height-1 = 49
    const bits = ((width - 1) & 0x3fff) | (((height - 1) & 0x3fff) << 14);
    buf.writeUInt32LE(bits, 21);
    expect(readImageDimensions(buf, 'image/webp')).toEqual({ width: 100, height: 50 });
  });

  it('reads WebP (lossy, VP8 ) width/height', () => {
    const buf = Buffer.alloc(30);
    buf.write('RIFF', 0, 'binary');
    buf.writeUInt32LE(20, 4);
    buf.write('WEBP', 8, 'binary');
    buf.write('VP8 ', 12, 'binary');
    buf.writeUInt32LE(10, 16);
    // 3-byte frame tag, then the sync code.
    buf[20] = 0x00;
    buf[21] = 0x00;
    buf[22] = 0x00;
    buf[23] = 0x9d;
    buf[24] = 0x01;
    buf[25] = 0x2a;
    buf.writeUInt16LE(640, 26); // width
    buf.writeUInt16LE(480, 28); // height
    expect(readImageDimensions(buf, 'image/webp')).toEqual({ width: 640, height: 480 });
  });

  it('returns null for a truncated buffer', () => {
    expect(readImageDimensions(Buffer.alloc(4), 'image/png')).toBeNull();
    expect(readImageDimensions(Buffer.alloc(4), 'image/gif')).toBeNull();
    expect(readImageDimensions(Buffer.alloc(4), 'image/webp')).toBeNull();
  });

  it('returns null for a JPEG with no SOF segment', () => {
    const buf = Buffer.from([0xff, 0xd8, 0xff, 0xd9]); // SOI then EOI only
    expect(readImageDimensions(buf, 'image/jpeg')).toBeNull();
  });
});
