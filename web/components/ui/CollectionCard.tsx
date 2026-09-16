import Image from "next/image";
import { type Box, boxStyle } from "@/lib/box";
import type { CollectionCardCopy } from "@/lib/content";
import { cn } from "@/lib/cn";

// The card's own fixed canvas (Figma node 1409:6946 and its four siblings),
// 244x262 — everything below is positioned in this coordinate space via
// `boxStyle`. Unlike the fluid cards elsewhere on the page, this one stays
// literal-pixel at every width: the row scrolls instead of squeezing cards
// to fit (see CollectionsRow's own comment).
const CARD_WIDTH = 244;
const CARD_HEIGHT = 262;

// The green "hill" every card paints its scattered decoration onto (Figma's
// "Ellipse 83", identical position/size on all five cards) — bleeds past
// the card's left/right/bottom edges; the card's own `overflow-hidden` +
// rounded corner does the clipping, the same flush-to-the-footer technique
// ArticleCard's grass-hill scenes use.
const HILL_BOX: Box = { x: -9, y: 212.5, width: 260, height: 84 };
const HILL_SRC = "/images/landing/collection-hill.svg";

function styleFor(box: Box) {
  return boxStyle(box, CARD_WIDTH, CARD_HEIGHT);
}

export interface CollectionCardArt {
  readonly icon: { readonly src: string; readonly width: number; readonly height: number };
  /** Petals/flowers/grass scattered over the hill (Figma nodes under each
   *  card's own "Mask group") — a different combination per card, so it's
   *  data rather than markup, rendered with one `.map()`. Figma exports
   *  these unrotated; `transform` (present only where Figma's own layer is
   *  rotated/skewed/flipped) is the same CSS its own codegen applies,
   *  around the box's own centre — kept as a raw string since the
   *  combinations don't repeat cleanly enough to model as separate props. */
  readonly decorations: readonly { readonly src: string; readonly box: Box; readonly transform?: string }[];
}

interface CollectionCardProps {
  card: CollectionCardCopy;
  art: CollectionCardArt;
}

/**
 * One card of /landing-new's Collections row (Figma node 1401:22290, "Frame
 * 94" and its four siblings): a 244x262 white card — icon, title and a
 * subtitle-plus-chevron row in normal flow, with the green hill and its
 * scattered decoration absolutely positioned behind the card's bottom edge.
 * Rendered five times by CollectionsRow from one data array (copy) + one art
 * config per card (icon + decoration pieces), per the root "don't
 * hand-write the same structure twice" rule.
 *
 * The whole card is the link, matching ArticleCard's pattern — its
 * accessible name comes from the visible title + subtitle text, so no
 * separate `aria-label` is needed. The icon, chevron and every decorative
 * layer are `aria-hidden`.
 */
export default function CollectionCard({ card, art }: CollectionCardProps) {
  return (
    <a
      href={card.href}
      className={cn(
        "focus-ring snap-start relative flex h-[262px] w-[244px] shrink-0 flex-col gap-3 overflow-hidden rounded-[32px] bg-white p-5",
        "transition-[filter] duration-150 hover:brightness-95"
      )}
    >
      <div className="flex h-[104px] w-20 items-center">
        {/* `shrink-0`: card 1's icon (90px) is wider than this 80px-wide
            slot — Figma's own layer overflows it on purpose rather than
            scaling down, so the flex item must not shrink to fit either. */}
        <div className="relative shrink-0" style={{ width: art.icon.width, height: art.icon.height }}>
          <Image src={art.icon.src} alt="" aria-hidden="true" fill />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-[20px] leading-normal font-extrabold text-collection-title">{card.title}</p>
        <div className="flex items-center justify-between pt-2">
          <p className="text-[15px] whitespace-nowrap text-collection-meta">{card.subtitle}</p>
          <span
            aria-hidden="true"
            className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-green"
          >
            <Image src="/images/landing/collection-chevron.svg" alt="" width={14} height={14} />
          </span>
        </div>
      </div>

      <div className="pointer-events-none absolute" style={styleFor(HILL_BOX)} aria-hidden="true">
        <Image src={HILL_SRC} alt="" fill />
      </div>
      {art.decorations.map((decoration, index) => (
        <div
          key={index}
          className="pointer-events-none absolute"
          style={{ ...styleFor(decoration.box), transform: decoration.transform }}
          aria-hidden="true"
        >
          <Image src={decoration.src} alt="" fill />
        </div>
      ))}
    </a>
  );
}
