/**
 * Magic-byte content-type sniffing.
 *
 * Detects a container from the leading bytes of a buffer, independent of any
 * filename extension or caller-declared MIME type. Used to (a) auto-correct the
 * ContentType on R2 uploads and (b) reject audio the mobile app cannot play.
 *
 * Why this exists: some Task audio was uploaded by an external tool as `.m4a`
 * but was actually WebM/Opus, which iOS AVFoundation (expo-audio) cannot decode.
 * The URL loaded fine (HTTP 200) but the "Listen" button did nothing. Trusting
 * the extension or the caller's Content-Type is exactly how that slipped through.
 */

export type SniffedType =
  | 'image/png'
  | 'image/jpeg'
  | 'audio/wav'
  | 'audio/mp4'
  | 'audio/mpeg'
  | 'audio/webm'
  | 'audio/ogg';

/** Containers iOS AVFoundation / expo-audio can decode. WebM/Ogg(Opus) cannot. */
export const IOS_PLAYABLE_AUDIO: readonly SniffedType[] = [
  'audio/wav',
  'audio/mp4',
  'audio/mpeg',
];

/** Preferred file extension for each sniffed type (no leading dot). */
export const EXT_FOR_TYPE: Record<SniffedType, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'audio/wav': 'wav',
  'audio/mp4': 'm4a',
  'audio/mpeg': 'mp3',
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
};

function has(buf: Buffer, offset: number, bytes: number[]): boolean {
  if (buf.length < offset + bytes.length) return false;
  for (let i = 0; i < bytes.length; i++) {
    if (buf[offset + i] !== bytes[i]) return false;
  }
  return true;
}

/**
 * Return the content-type detected from `buf`'s magic bytes, or `null` when the
 * bytes match none of the known signatures. Only inspects the header, so a small
 * ranged read (≥16 bytes) is enough.
 */
export function sniffContentType(buf: Buffer): SniffedType | null {
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (has(buf, 0, [0x89, 0x50, 0x4e, 0x47])) return 'image/png';

  // JPEG: FF D8 FF
  if (has(buf, 0, [0xff, 0xd8, 0xff])) return 'image/jpeg';

  // RIFF....WAVE  →  WAV (offset 0 "RIFF", offset 8 "WAVE")
  if (has(buf, 0, [0x52, 0x49, 0x46, 0x46]) && has(buf, 8, [0x57, 0x41, 0x56, 0x45])) {
    return 'audio/wav';
  }

  // OggS  →  Ogg container (typically Opus/Vorbis audio)
  if (has(buf, 0, [0x4f, 0x67, 0x67, 0x53])) return 'audio/ogg';

  // EBML header 1A 45 DF A3  →  Matroska/WebM
  if (has(buf, 0, [0x1a, 0x45, 0xdf, 0xa3])) return 'audio/webm';

  // ISO-BMFF: bytes 4..7 == "ftyp"  →  MP4/M4A (AAC)
  if (has(buf, 4, [0x66, 0x74, 0x79, 0x70])) return 'audio/mp4';

  // MP3: "ID3" tag, or an MPEG audio frame sync (FF Ex / FF Fx).
  if (has(buf, 0, [0x49, 0x44, 0x33])) return 'audio/mpeg';
  if (buf.length >= 2 && buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0) return 'audio/mpeg';

  return null;
}

/** True when the sniffed audio container is decodable by the iOS mobile app. */
export function isIosPlayableAudio(type: SniffedType | null): boolean {
  return type !== null && (IOS_PLAYABLE_AUDIO as readonly string[]).includes(type);
}
