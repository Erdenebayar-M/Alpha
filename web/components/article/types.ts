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

export interface ParagraphBlock {
  id: string;
  type: "paragraph";
  content: InlineSpan[];
  background?: ColorValue;
}

export interface HeadingBlock {
  id: string;
  type: "heading";
  level: 2 | 3;
  text: string;
  color?: ColorValue;
  background?: ColorValue;
}

export interface ListBlock {
  id: string;
  type: "list";
  style: "bullet" | "ordered";
  items: InlineSpan[][];
  background?: ColorValue;
}

export interface QuoteBlock {
  id: string;
  type: "quote";
  content: InlineSpan[];
  attribution?: string;
  background?: ColorValue;
}

export interface CalloutBlock {
  id: string;
  type: "callout";
  content: InlineSpan[];
  background?: ColorValue;
}

export interface DividerBlock {
  id: string;
  type: "divider";
}

export interface ImageBlock {
  id: string;
  type: "image";
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
