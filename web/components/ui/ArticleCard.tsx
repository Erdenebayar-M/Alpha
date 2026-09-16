import Image from "next/image";
import { type Box, boxStyle } from "@/lib/box";
import type { ArticleCardCopy } from "@/lib/content";
import { cn } from "@/lib/cn";

// The illustration panel's own tight box (node 1401:20821 "Rectangle 56"),
// 321x255 — everything in the panel is positioned in this coordinate space.
const PANEL_WIDTH = 321;
const PANEL_HEIGHT = 255;

export interface ArticleCardArt {
  /** The exported grass-hill + character illustration (Figma's own "Mask
   *  group" node under each card). Bottom-aligned and full-width inside the
   *  panel regardless of its own height — see the component doc below. */
  readonly scene: { src: string; width: number; height: number };
  /** Card 1's two flower pairs, painted outside its exported scene (Figma
   *  nodes 1401:20845/1401:20857) — cards 2/3 bake their own equivalent
   *  decoration into their single flattened export, so this is omitted for
   *  them. */
  readonly flowers?: readonly { src: string; box: Box }[];
}

interface ArticleCardProps {
  card: ArticleCardCopy;
  art: ArticleCardArt;
}

/**
 * One card of /landing-new's Articles-for-parents grid (Figma node
 * 1401:20820 "Frame 96" and its two siblings, 1401:20869 / 1401:20947):
 * a gradient frame around a 321x255 illustration panel, with a white
 * footer showing the card's label and title. Rendered three times by
 * ArticlesGrid from one data array (copy) + one art config per card (asset
 * paths and geometry) — this file only knows how to draw *a* card.
 *
 * The frame reuses `card-frame` (globals.css) — the gradient/radius half of
 * `card-surface` split out on its own, since this card's flex layout
 * (footer stacked below the panel) doesn't fit `card-surface`'s own
 * flex/padding/alignment. The panel background reuses `art-panel-bg`, the
 * Featured article illustration panel's own diagonal gradient:
 * get_variable_defs on this grid resolves no bound variable, and the
 * panel's raw diamond-gradient fill is (sampled the same way as that panel)
 * the identical swatch, so it's reused rather than re-deriving Figma's own
 * rotate/data-URI export hack for it.
 *
 * The grass-hill + character illustration (`art.scene`) is a flattened,
 * exported SVG per card — Figma ships card 1's Khishigee instance fully
 * "editable" (individually animatable body/eye/mouth layers meant for the
 * interactive mascot elsewhere in the app) but cards 2/3 as already-
 * flattened single assets; exporting all three the same way (rather than
 * hand-porting Khishigee's animated rig for a static decorative card) keeps
 * the three cards on equal footing, matches "no animation added" (the owner
 * is doing motion separately), and is what the ticket's "exported SVG"
 * phrasing calls for. Figma places the scene flush with the panel's own
 * left/right/bottom edges regardless of its height (card 1's taller export
 * vs. cards 2/3's shorter one) — local `(0, 255 - scene.height)`.
 *
 * The character art is a generic decorative mascot with no informational
 * content of its own (unlike the Featured article's хойн/хонь
 * demonstration), so it's `aria-hidden`; the card's accessible name comes
 * from its own visible label/title text since the whole card is one link.
 */
export default function ArticleCard({ card, art }: ArticleCardProps) {
  const sceneBox: Box = {
    x: 0,
    y: PANEL_HEIGHT - art.scene.height,
    width: PANEL_WIDTH,
    height: art.scene.height,
  };

  return (
    <a
      href={card.href}
      className={cn(
        "card-frame focus-ring flex w-full flex-col p-5",
        "transition-[filter] duration-150 hover:brightness-95"
      )}
    >
      <div className="art-panel-bg relative aspect-[321/255] w-full overflow-hidden rounded-t-[32px]">
        <div className="pointer-events-none absolute" style={boxStyle(sceneBox, PANEL_WIDTH, PANEL_HEIGHT)}>
          <Image src={art.scene.src} alt="" aria-hidden="true" fill />
        </div>
        {art.flowers?.map((flower) => (
          <div
            key={flower.src}
            className="pointer-events-none absolute"
            style={boxStyle(flower.box, PANEL_WIDTH, PANEL_HEIGHT)}
          >
            <Image src={flower.src} alt="" aria-hidden="true" fill />
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-4 rounded-b-[32px] bg-white p-7 drop-shadow-[0_20px_20px_rgba(31,46,82,0.04)]">
        <p className="text-base font-extrabold text-text-navy">{card.label}</p>
        <p className="text-[22px] leading-[1.3] font-extrabold text-article-title">{card.title}</p>
      </div>
    </a>
  );
}
