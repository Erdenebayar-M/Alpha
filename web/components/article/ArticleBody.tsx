import type { CSSProperties } from "react";
import Image from "next/image";
import { cn } from "@/lib/cn";
import { InlineContent } from "./InlineContent";
import { colorCss, tintCss } from "./colors";
import type {
  ArticleBlock,
  ArticleBody as ArticleBodyBlocks,
  CalloutBlock,
  ColorValue,
  HeadingBlock,
  ImageBlock,
  LinkCardBlock,
  ListBlock,
  ParagraphBlock,
  QuoteBlock,
  VideoBlock,
} from "./types";

// A Block `background` always renders as a tinted, padded surface — the
// padding is what makes the tint read as a surface rather than a stray
// rectangle behind text that already had its own margin. Shared by every
// text Block kind so the padding/radius treatment can't drift between them.
function backgroundClass(background: ColorValue | undefined): string | undefined {
  return background ? "rounded-2xl px-5 py-4" : undefined;
}

function backgroundStyle(background: ColorValue | undefined): CSSProperties | undefined {
  return background ? { backgroundColor: tintCss(background) } : undefined;
}

// The article reading page is Figma frame 1422:6961 (app/articles/[slug]),
// which doesn't specify Body typography of its own, so these are plain,
// generic tokens already used elsewhere on the site for the same job
// (Header/Button's default UI ink, the card family's heading ink) rather
// than anything designed specifically for this component.
const BODY_TEXT_CLASS = "text-base leading-relaxed text-text-nav-strong";
const HEADING_TEXT_CLASS = "font-extrabold text-text-navy";

function Paragraph({ block }: { block: ParagraphBlock }) {
  return (
    <p className={cn(BODY_TEXT_CLASS, backgroundClass(block.background))} style={backgroundStyle(block.background)}>
      <InlineContent spans={block.content} />
    </p>
  );
}

function Heading({ block }: { block: HeadingBlock }) {
  const Tag = block.level === 2 ? "h2" : "h3";
  const style: CSSProperties = {
    ...(block.color ? { color: colorCss(block.color) } : undefined),
    ...backgroundStyle(block.background),
  };
  return (
    <Tag
      className={cn(
        HEADING_TEXT_CLASS,
        block.level === 2 ? "text-2xl" : "text-xl",
        backgroundClass(block.background)
      )}
      style={style}
    >
      {block.text}
    </Tag>
  );
}

// A List's Marker (ADR 0005) is rendered by us, not the browser's native
// `::marker` — its glyph/number is always computed from position, never
// stored, so it can never drift out of sync with the list's own items. This
// also fixes alignment: as ordinary inline content ahead of the item's text
// (not a `::marker` box), it moves with `text-align` like any other run.
function markerGlyph(style: ListBlock["style"], index: number, startsAt: number | undefined): string {
  return style === "bullet" ? "•" : `${(startsAt ?? 1) + index}.`;
}

function alignmentClass(alignment: ListBlock["alignment"]): string | undefined {
  if (alignment === "center") return "text-center";
  if (alignment === "right") return "text-right";
  return undefined;
}

function List({ block }: { block: ListBlock }) {
  const Tag = block.style === "ordered" ? "ol" : "ul";
  return (
    <Tag
      start={block.startsAt}
      className={cn(
        BODY_TEXT_CLASS,
        "flex flex-col gap-2 pl-6 list-none",
        alignmentClass(block.alignment),
        backgroundClass(block.background)
      )}
      style={backgroundStyle(block.background)}
    >
      {block.items.map((item, index) => (
        <li key={index}>
          <span
            className="mr-2 select-none"
            style={item.markerColor ? { color: colorCss(item.markerColor) } : undefined}
          >
            {markerGlyph(block.style, index, block.startsAt)}
          </span>
          <InlineContent spans={item.spans} />
        </li>
      ))}
    </Tag>
  );
}

// The pull-quote's quotation marks are drawn here, never typed by the author
// (web/CONTEXT.md **Quote**). Real glyphs rather than CSS pseudo-elements so
// they survive copy/paste; hidden from assistive tech, which announces the
// blockquote itself.
function Quote({ block }: { block: QuoteBlock }) {
  return (
    <blockquote
      className={cn(
        "text-2xl italic leading-snug text-text-navy",
        alignmentClass(block.alignment),
        backgroundClass(block.background)
      )}
      style={backgroundStyle(block.background)}
    >
      <p>
        <span aria-hidden="true">“</span>
        <InlineContent spans={block.content} />
        <span aria-hidden="true">”</span>
      </p>
      {block.attribution && (
        <footer className="mt-2 text-sm not-italic text-text-nav">— {block.attribution}</footer>
      )}
    </blockquote>
  );
}

function Callout({ block }: { block: CalloutBlock }) {
  return (
    <div
      role="note"
      className={cn(BODY_TEXT_CLASS, "rounded-2xl border border-border-soft bg-surface-page px-5 py-4")}
      style={backgroundStyle(block.background)}
    >
      <InlineContent spans={block.content} />
    </div>
  );
}

function Divider() {
  return <hr className="border-border-card" />;
}

// `source: 'link'` urls can be any host, but `next/image`'s `remotePatterns`
// (next.config.ts) only allows the R2 CDN origin — widening it to `*` would
// turn this server into an open image-optimizing proxy for arbitrary urls.
// A plain `<img>` sidesteps that: no optimization for externally-linked
// images, but we don't control that asset's lifecycle anyway.
function LinkImage({ block }: { block: ImageBlock }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={block.url}
      alt={block.alt}
      width={block.width}
      height={block.height}
      className="h-auto w-full rounded-2xl object-cover"
    />
  );
}

function UploadImage({ block }: { block: ImageBlock }) {
  return block.width && block.height ? (
    <Image
      src={block.url}
      alt={block.alt}
      width={block.width}
      height={block.height}
      className="h-auto w-full rounded-2xl object-cover"
    />
  ) : (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl">
      <Image src={block.url} alt={block.alt} fill className="object-cover" />
    </div>
  );
}

function ImageBlockView({ block }: { block: ImageBlock }) {
  return (
    <figure className="flex flex-col gap-2">
      {block.source === "link" ? <LinkImage block={block} /> : <UploadImage block={block} />}
      {block.caption && <figcaption className="text-sm text-text-nav">{block.caption}</figcaption>}
    </figure>
  );
}

const VIDEO_EMBED_SRC: Record<VideoBlock["provider"], (id: string) => string> = {
  youtube: (id) => `https://www.youtube-nocookie.com/embed/${id}`,
  vimeo: (id) => `https://player.vimeo.com/video/${id}`,
};

function VideoBlockView({ block }: { block: VideoBlock }) {
  return (
    <div className="aspect-video w-full overflow-hidden rounded-2xl">
      <iframe
        src={VIDEO_EMBED_SRC[block.provider](block.video_id)}
        title="Embedded video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="h-full w-full"
      />
    </div>
  );
}

function LinkCardView({ block }: { block: LinkCardBlock }) {
  return (
    <a
      href={block.url}
      className="flex gap-4 rounded-2xl border border-border-card p-4 transition-colors hover:bg-surface-page"
    >
      {block.image && (
        <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-xl">
          <Image src={block.image.url} alt={block.image.alt} fill className="object-cover" />
        </div>
      )}
      <div className="flex flex-col gap-1">
        <p className="font-bold text-article-title">{block.title}</p>
        {block.description && <p className="text-sm text-text-nav">{block.description}</p>}
        <p className="text-xs text-text-nav">{block.url}</p>
      </div>
    </a>
  );
}

function BlockView({ block }: { block: ArticleBlock }) {
  switch (block.type) {
    case "paragraph":
      return <Paragraph block={block} />;
    case "heading":
      return <Heading block={block} />;
    case "list":
      return <List block={block} />;
    case "quote":
      return <Quote block={block} />;
    case "callout":
      return <Callout block={block} />;
    case "divider":
      return <Divider />;
    case "image":
      return <ImageBlockView block={block} />;
    case "video":
      return <VideoBlockView block={block} />;
    case "link_card":
      return <LinkCardView block={block} />;
    default: {
      const exhaustive: never = block;
      return exhaustive;
    }
  }
}

// Reading layout (issue #115, Figma frame 1422:6961) — a site rule authors
// can't change, unrelated to Text alignment. Measured at the 1440px frame:
// the reading column is ≈775px, centered in the card; subheadings and Quotes
// instead start ≈60px in from the card's inner edge, hanging left of the
// column while sharing its right edge. Below `lg` the card and column just
// shrink and the hang collapses to zero.
const READING_COLUMN_CLASS = "mx-auto w-full max-w-[775px]";
const HANGING_CLASS = "w-full lg:pl-[60px] lg:pr-[calc((100%-775px)/2)]";

function layoutClass(block: ArticleBlock): string {
  return block.type === "heading" || block.type === "quote" ? HANGING_CLASS : READING_COLUMN_CLASS;
}

/**
 * Renders a validated Article Body (shared/src/validators/article.ts) —
 * every Block kind, plain semantic typography per-kind, with author Colours
 * applied (issue #108, shared/docs/adr/0003): a span's `color`/`highlight`,
 * a heading's `color`, and any text Block's `background` as a tinted padded
 * surface. Blocks sit on the reading layout above. Mounted by the reading
 * page at /articles/[slug] (Figma frame 1422:6961).
 */
export function ArticleBody({ blocks }: { blocks: ArticleBodyBlocks }) {
  return (
    <div className="flex flex-col gap-6">
      {blocks.map((block) => (
        <div key={block.id} className={layoutClass(block)}>
          <BlockView block={block} />
        </div>
      ))}
    </div>
  );
}
