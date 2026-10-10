/**
 * What the feedback widget sends and the rules the route holds it to. Pure, so
 * the widget can share the limits; the route is the one that enforces them.
 */
export const FEEDBACK_TEXT_MAX = 5000;
const URL_MAX = 2000;
const VIEWPORT_MAX = 10_000;
// The JSON body as a whole: room for a full-length text of three-byte
// characters (…, —, “ ”), its JSON escapes and both links, so anything the
// form allows fits and anything far bigger is refused unread.
export const FEEDBACK_BODY_MAX_BYTES = 32_000;

export type FeedbackInput = {
  text: string;
  figmaUrl: string | null;
  /** Origin and path only: a query or hash can hold a live token (/reset-password?token=…). */
  pageUrl: string;
  viewport: { width: number; height: number };
};

export type FeedbackParse = { ok: true; input: FeedbackInput } | { ok: false; error: "VALIDATION_ERROR" | "INVALID_FIGMA_URL" };

const invalid = { ok: false, error: "VALIDATION_ERROR" } as const;

export function parseFeedback(body: unknown): FeedbackParse {
  if (typeof body !== "object" || body === null) return invalid;
  const { text, figmaUrl, pageUrl, viewport } = body as Record<string, unknown>;

  if (typeof text !== "string" || text.trim() === "" || text.length > FEEDBACK_TEXT_MAX) return invalid;
  if (typeof pageUrl !== "string" || pageUrl.length > URL_MAX || !hasProtocol(pageUrl, ["http:", "https:"])) return invalid;
  if (typeof viewport !== "object" || viewport === null) return invalid;
  const { width, height } = viewport as Record<string, unknown>;
  if (!isViewportSide(width) || !isViewportSide(height)) return invalid;

  let figma: string | null = null;
  if (figmaUrl !== undefined && figmaUrl !== null && figmaUrl !== "") {
    if (typeof figmaUrl !== "string" || figmaUrl.length > URL_MAX || !isFigmaUrl(figmaUrl)) {
      return { ok: false, error: "INVALID_FIGMA_URL" };
    }
    figma = figmaUrl;
  }

  const { origin, pathname } = new URL(pageUrl);
  return { ok: true, input: { text: text.trim(), figmaUrl: figma, pageUrl: origin + pathname, viewport: { width, height } } };
}

function isViewportSide(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) > 0 && (value as number) <= VIEWPORT_MAX;
}

function hasProtocol(value: string, protocols: string[]): boolean {
  return URL.canParse(value) && protocols.includes(new URL(value).protocol);
}

function isFigmaUrl(value: string): boolean {
  if (!hasProtocol(value, ["https:"])) return false;
  const { hostname } = new URL(value);
  return hostname === "figma.com" || hostname.endsWith(".figma.com");
}
