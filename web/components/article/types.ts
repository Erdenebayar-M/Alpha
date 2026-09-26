/**
 * Hand-mirrored copy of the Article Body / Block / Colour contract
 * (shared/src/validators/article.ts). web/ isn't an npm workspace member
 * (web/AGENTS.md) so it can't import @app/shared directly — same
 * mirror-and-catch-drift approach as web/lib/api/types.ts. See
 * web/scripts/check-shared-drift.mjs, which reads shared/src/validators/
 * article.ts as text and asserts every name below still exists there.
 *
 * These Blocks arrive already validated (the backend never stores an
 * invalid one), so this file only types the shape — it doesn't re-check the
 * href allowlist, the hex pattern, or any of the Colour cross-field rules
 * the Zod schema enforces server-side.
 */

export const PALETTE_COLORS = [
  "brand-blue",
  "brand-indigo",
  "brand-green",
  "brand-navy",
  "brand-violet",
  "gray",
  "brown",
  "orange",
  "yellow",
  "purple",
  "pink",
  "red",
] as const;
export type PaletteColor = (typeof PALETTE_COLORS)[number];

/** A Palette name or a custom `#rrggbb` hex string. */
export type ColorValue = PaletteColor | string;

export interface InlineSpan {
  text: string;
  bold?: boolean;
  italic?: boolean;
  href?: string;
  color?: ColorValue;
  highlight?: ColorValue;
}

/** A whole text Block's horizontal alignment (ADR 0004). Left is the default and is never stored. */
export type TextAlignment = "center" | "right";

export interface ParagraphBlock {
  id: string;
  type: "paragraph";
  content: InlineSpan[];
  background?: ColorValue;
  alignment?: TextAlignment;
}

export interface HeadingBlock {
  id: string;
  type: "heading";
  level: 2 | 3;
  text: string;
  color?: ColorValue;
  background?: ColorValue;
  alignment?: TextAlignment;
}

/** One List item's text, and an optional colour on its Marker (ADR 0005) — independent of any Colour on the text itself. */
export interface ListItem {
  spans: InlineSpan[];
  markerColor?: ColorValue;
}

export interface ListBlock {
  id: string;
  type: "list";
  style: "bullet" | "ordered";
  items: ListItem[];
  /** Set only when this List continues an ordered List split apart by an inserted Block (ADR 0005); absent means "starts at 1". */
  startsAt?: number;
  background?: ColorValue;
  alignment?: TextAlignment;
}

export interface QuoteBlock {
  id: string;
  type: "quote";
  content: InlineSpan[];
  attribution?: string;
  background?: ColorValue;
  alignment?: TextAlignment;
}

export interface CalloutBlock {
  id: string;
  type: "callout";
  content: InlineSpan[];
  background?: ColorValue;
  alignment?: TextAlignment;
}

export interface DividerBlock {
  id: string;
  type: "divider";
}

export interface ImageBlock {
  id: string;
  type: "image";
  source: "upload" | "link";
  url: string;
  alt: string;
  caption?: string;
  width?: number;
  height?: number;
}

export interface VideoBlock {
  id: string;
  type: "video";
  provider: "youtube" | "vimeo";
  video_id: string;
}

export interface LinkCardBlock {
  id: string;
  type: "link_card";
  url: string;
  title: string;
  description?: string;
  image?: { url: string; alt: string; width?: number; height?: number };
}

export type ArticleBlock =
  | ParagraphBlock
  | HeadingBlock
  | ListBlock
  | QuoteBlock
  | CalloutBlock
  | DividerBlock
  | ImageBlock
  | VideoBlock
  | LinkCardBlock;

export type ArticleBody = ArticleBlock[];
