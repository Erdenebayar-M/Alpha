/**
 * Unit tests for the magic-byte sniffer that guards audio uploads.
 * These are pure functions — no env, DB, or network needed.
 */
import {
  sniffContentType,
  isIosPlayableAudio,
  EXT_FOR_TYPE,
} from '../media-type';

/** Build a header buffer padded to `len` bytes so offset checks have room. */
function header(bytes: number[], len = 64): Buffer {
  const b = Buffer.alloc(len);
  Buffer.from(bytes).copy(b, 0);
  return b;
}

function ascii(str: string): number[] {
  return [...str].map((ch) => ch.charCodeAt(0));
}

describe('sniffContentType', () => {
  it('detects PNG', () => {
    expect(sniffContentType(header([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe('image/png');
  });

  it('detects JPEG', () => {
    expect(sniffContentType(header([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg');
  });

  it('detects WAV (RIFF....WAVE)', () => {
    const buf = header([...ascii('RIFF'), 0x24, 0x08, 0x00, 0x00, ...ascii('WAVE')]);
    expect(sniffContentType(buf)).toBe('audio/wav');
  });

  it('does NOT treat a RIFF container without WAVE as WAV', () => {
    const buf = header([...ascii('RIFF'), 0, 0, 0, 0, ...ascii('AVI ')]);
    expect(sniffContentType(buf)).not.toBe('audio/wav');
  });

  it('detects MP4/M4A (ftyp at offset 4)', () => {
    const buf = header([0x00, 0x00, 0x00, 0x18, ...ascii('ftypM4A ')]);
    expect(sniffContentType(buf)).toBe('audio/mp4');
  });

  it('detects WebM/Matroska (EBML header)', () => {
    expect(sniffContentType(header([0x1a, 0x45, 0xdf, 0xa3]))).toBe('audio/webm');
  });

  it('detects Ogg/Opus (OggS)', () => {
    expect(sniffContentType(header(ascii('OggS')))).toBe('audio/ogg');
  });

  it('detects MP3 via ID3 tag', () => {
    expect(sniffContentType(header([...ascii('ID3'), 0x03, 0x00]))).toBe('audio/mpeg');
  });

  it('detects MP3 via frame sync (FF Fx)', () => {
    expect(sniffContentType(header([0xff, 0xfb, 0x90, 0x00]))).toBe('audio/mpeg');
  });

  it('returns null for unrecognized bytes', () => {
    expect(sniffContentType(header([0x00, 0x01, 0x02, 0x03]))).toBeNull();
  });

  it('returns null for an empty buffer', () => {
    expect(sniffContentType(Buffer.alloc(0))).toBeNull();
  });
});

describe('isIosPlayableAudio', () => {
  it('accepts WAV, MP4, and MP3', () => {
    expect(isIosPlayableAudio('audio/wav')).toBe(true);
    expect(isIosPlayableAudio('audio/mp4')).toBe(true);
    expect(isIosPlayableAudio('audio/mpeg')).toBe(true);
  });

  it('rejects WebM and Ogg (the broken formats)', () => {
    expect(isIosPlayableAudio('audio/webm')).toBe(false);
    expect(isIosPlayableAudio('audio/ogg')).toBe(false);
  });

  it('rejects null', () => {
    expect(isIosPlayableAudio(null)).toBe(false);
  });
});

describe('EXT_FOR_TYPE', () => {
  it('maps iOS-playable audio types to extensions', () => {
    expect(EXT_FOR_TYPE['audio/mp4']).toBe('m4a');
    expect(EXT_FOR_TYPE['audio/wav']).toBe('wav');
    expect(EXT_FOR_TYPE['audio/mpeg']).toBe('mp3');
  });
});
