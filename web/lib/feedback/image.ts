/**
 * The one optional screenshot a feedback submission may carry. Pure, so the
 * widget shares the limits; the route is the one that enforces them.
 */
// Vercel's request body limit is 4.5 MB, so the image has to leave room under it.
export const FEEDBACK_IMAGE_MAX_BYTES = 3 * 1024 * 1024;
// The whole multipart body: the image, the JSON part and the multipart framing.
export const FEEDBACK_MULTIPART_MAX_BYTES = FEEDBACK_IMAGE_MAX_BYTES + 128_000;

export type FeedbackImage = { bytes: Uint8Array; contentType: string; extension: string };

const TYPES = [
  { contentType: "image/png", extension: "png", magic: [0x89, 0x50, 0x4e, 0x47] },
  { contentType: "image/jpeg", extension: "jpg", magic: [0xff, 0xd8, 0xff] },
  { contentType: "image/gif", extension: "gif", magic: [0x47, 0x49, 0x46, 0x38] },
  // "RIFF" … "WEBP": the four bytes between are the size.
  { contentType: "image/webp", extension: "webp", magic: [0x52, 0x49, 0x46, 0x46] },
] as const;

/** The accepted types as an <input accept> value. SVG is left out: it can carry script. */
export const FEEDBACK_IMAGE_ACCEPT = TYPES.map((t) => t.contentType).join(",");

/**
 * Identifies the image by its first bytes, not by the name or type the browser
 * claims, so the stored object's Content-Type is one we chose. `null` when it
 * isn't one of the accepted types.
 */
export function sniffImage(bytes: Uint8Array): FeedbackImage | null {
  const type = TYPES.find(({ magic }) => magic.every((byte, i) => bytes[i] === byte));
  if (!type) return null;
  if (type.contentType === "image/webp" && String.fromCharCode(...bytes.slice(8, 12)) !== "WEBP") return null;
  return { bytes, contentType: type.contentType, extension: type.extension };
}
