/**
 * Tests for POST /api/admin/articles/images (issue #82).
 *
 * The type is sniffed from the uploaded bytes (never the filename or declared
 * type), width/height are read from the real image header, and the file is
 * stored to R2 under an `articles/` key. The sniffer and header reader run for
 * real, on hand-made byte buffers; R2 and Prisma are mocked.
 */

jest.mock('../../config/env', () => ({
  env: {
    ADMIN_SECRET: 'test-admin-secret-that-is-32chars-ok',
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://localhost/test',
    JWT_SECRET: 'x'.repeat(64),
    CORS_ORIGIN: 'http://localhost:3000',
    RATE_LIMIT_DISABLED: 'true',
    R2_PUBLIC_URL: 'https://cdn.example.dev',
  },
}));

jest.mock('../../lib/db/client', () => ({
  prisma: {
    article: { create: jest.fn(), findUnique: jest.fn(), updateMany: jest.fn() },
  },
}));

jest.mock('../../lib/r2', () => ({
  r2Enabled: jest.fn(() => true),
  r2Upload: jest.fn((key: string) => Promise.resolve(`https://cdn.example.dev/${key}`)),
  r2Move: jest.fn(),
}));

import { r2Enabled, r2Upload } from '../../lib/r2';
import adminArticles from '../adminArticles';

const mockR2Enabled = r2Enabled as jest.MockedFunction<any>;
const mockR2Upload = r2Upload as jest.MockedFunction<any>;

const BEARER = 'Bearer test-admin-secret-that-is-32chars-ok';
const body = (res: Response): Promise<any> => res.json() as Promise<any>;

function upload(fileBytes?: Buffer, filename = 'image.bin', headers: Record<string, string> = { Authorization: BEARER }) {
  const fd = new FormData();
  if (fileBytes) fd.append('file', new Blob([new Uint8Array(fileBytes)]), filename);
  return adminArticles.request('/images', { method: 'POST', headers, body: fd });
}

function pad(bytes: number[], len: number): Buffer {
  const b = Buffer.alloc(len);
  Buffer.from(bytes).copy(b, 0);
  return b;
}
const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0));

// PNG: signature + IHDR chunk with width=300, height=200.
const PNG_BYTES = (() => {
  const buf = Buffer.alloc(24);
  buf.write('\x89PNG\r\n\x1a\n', 0, 'binary');
  buf.writeUInt32BE(13, 8);
  buf.write('IHDR', 12, 'binary');
  buf.writeUInt32BE(300, 16);
  buf.writeUInt32BE(200, 20);
  return buf;
})();

// JPEG: SOI, an APP0 segment to skip over, then SOF0 with height=100, width=200.
const JPEG_BYTES = Buffer.from([
  0xff, 0xd8,
  0xff, 0xe0, 0x00, 0x10,
  ...new Array(14).fill(0x00),
  0xff, 0xc0,
  0x00, 0x0b,
  0x08,
  0x00, 0x64,
  0x00, 0xc8,
  0x03, 0x01, 0x11, 0x00,
]);

// WebP (VP8X, extended): canvas width 400, height 300.
const WEBP_BYTES = (() => {
  const buf = Buffer.alloc(30);
  buf.write('RIFF', 0, 'binary');
  buf.writeUInt32LE(22, 4);
  buf.write('WEBP', 8, 'binary');
  buf.write('VP8X', 12, 'binary');
  buf.writeUInt32LE(10, 16);
  buf[20] = 0x10;
  buf[24] = 399 & 0xff;
  buf[25] = (399 >> 8) & 0xff;
  buf[26] = (399 >> 16) & 0xff;
  buf[27] = 299 & 0xff;
  buf[28] = (299 >> 8) & 0xff;
  buf[29] = (299 >> 16) & 0xff;
  return buf;
})();

// GIF: Logical Screen Descriptor with width=150, height=90.
const GIF_BYTES = (() => {
  const buf = Buffer.alloc(10);
  buf.write('GIF89a', 0, 'binary');
  buf.writeUInt16LE(150, 6);
  buf.writeUInt16LE(90, 8);
  return buf;
})();

const SVG_BYTES = pad(ascii('<svg xmlns="http://www.w3.org/2000/svg"></svg>'), 64);
const MP3_BYTES = pad([...ascii('ID3'), 0x03, 0x00], 64);
const JUNK_BYTES = pad([0x00, 0x01, 0x02, 0x03], 64);

beforeEach(() => {
  jest.clearAllMocks();
  mockR2Enabled.mockReturnValue(true);
  mockR2Upload.mockImplementation((key: string) => Promise.resolve(`https://cdn.example.dev/${key}`));
});

describe('POST /images', () => {
  it('accepts a JPEG and returns its real dimensions', async () => {
    const res = await upload(JPEG_BYTES, 'photo.jpg');
    expect(res.status).toBe(201);
    const json = await body(res);
    expect(json.data).toMatchObject({ width: 200, height: 100, content_type: 'image/jpeg' });
    expect(json.data.url).toMatch(/^https:\/\/cdn\.example\.dev\/articles\/[0-9a-f-]+\.jpg$/);
  });

  it('accepts a PNG and returns its real dimensions', async () => {
    const res = await upload(PNG_BYTES, 'photo.png');
    expect(res.status).toBe(201);
    const json = await body(res);
    expect(json.data).toMatchObject({ width: 300, height: 200, content_type: 'image/png' });
  });

  it('accepts a WebP and returns its real dimensions', async () => {
    const res = await upload(WEBP_BYTES, 'photo.webp');
    expect(res.status).toBe(201);
    const json = await body(res);
    expect(json.data).toMatchObject({ width: 400, height: 300, content_type: 'image/webp' });
  });

  it('accepts a GIF and returns its real dimensions', async () => {
    const res = await upload(GIF_BYTES, 'photo.gif');
    expect(res.status).toBe(201);
    const json = await body(res);
    expect(json.data).toMatchObject({ width: 150, height: 90, content_type: 'image/gif' });
  });

  it('stores the file under an articles/ key with the detected content type', async () => {
    const res = await upload(PNG_BYTES, 'photo.png');
    expect(res.status).toBe(201);
    expect(mockR2Upload).toHaveBeenCalledWith(
      expect.stringMatching(/^articles\/[0-9a-f-]+\.png$/),
      expect.any(Buffer),
      'image/png',
    );
  });

  it('detects the type from the bytes, ignoring a mismatched filename', async () => {
    const res = await upload(PNG_BYTES, 'photo.jpg');
    expect(res.status).toBe(201);
    const json = await body(res);
    expect(json.data.content_type).toBe('image/png');
  });

  it('rejects an SVG even when it looks like an image', async () => {
    const res = await upload(SVG_BYTES, 'icon.svg');
    expect(res.status).toBe(400);
    const json = await body(res);
    expect(json.error.code).toBe('VALIDATION_ERROR');
    expect(mockR2Upload).not.toHaveBeenCalled();
  });

  it('rejects an audio file, even labelled as an image', async () => {
    const res = await upload(MP3_BYTES, 'photo.png');
    expect(res.status).toBe(400);
    const json = await body(res);
    expect(json.error.code).toBe('VALIDATION_ERROR');
    expect(mockR2Upload).not.toHaveBeenCalled();
  });

  it('rejects bytes of an unknown type', async () => {
    const res = await upload(JUNK_BYTES, 'photo.png');
    expect(res.status).toBe(400);
    expect((await body(res)).error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects an empty file', async () => {
    const res = await upload(Buffer.alloc(0), 'photo.png');
    expect(res.status).toBe(400);
    expect((await body(res)).error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a request with no file field', async () => {
    const res = await upload();
    expect(res.status).toBe(400);
    expect((await body(res)).error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a file over the 5 MB limit', async () => {
    const big = Buffer.concat([PNG_BYTES, Buffer.alloc(5 * 1024 * 1024)]);
    const res = await upload(big, 'photo.png');
    expect(res.status).toBe(400);
    expect((await body(res)).error.code).toBe('VALIDATION_ERROR');
    expect(mockR2Upload).not.toHaveBeenCalled();
  });

  it('returns SERVICE_UNAVAILABLE when R2 is not configured', async () => {
    mockR2Enabled.mockReturnValue(false);
    const res = await upload(PNG_BYTES, 'photo.png');
    expect(res.status).toBe(503);
    const json = await body(res);
    expect(json.error.code).toBe('SERVICE_UNAVAILABLE');
    expect(mockR2Upload).not.toHaveBeenCalled();
  });

  it('rejects requests without the admin secret', async () => {
    const res = await upload(PNG_BYTES, 'photo.png', {});
    expect(res.status).toBe(401);
    expect(mockR2Upload).not.toHaveBeenCalled();
  });
});
