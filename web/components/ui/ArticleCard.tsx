import Image from "next/image";
import type { CSSProperties } from "react";
import { type Box, boxStyle } from "@/lib/box";
import type { ArticleCardCopy } from "@/lib/content";
import { cn } from "@/lib/cn";

// The illustration panel's own tight box (node 1401:20821 "Rectangle 56"),
// 321x255 — everything in the panel is positioned in this coordinate space.
const PANEL_WIDTH = 321;
const PANEL_HEIGHT = 255;

// Figma's own fill for "Rectangle 56" (identical on all three cards) is a
// "diamond" gradient — mint nearly everywhere, lilac concentrated tightly
// in one corner — which a plain CSS linear/radial gradient can't reproduce
// (tried twice: a diagonal 2-stop and a vertical 2-stop both spread the
// lilac far past where Figma actually shows it, since neither can express
// a gradient that's concentrated toward one corner rather than ramping
// across the whole box). This is Figma's own generated `background-image`
// for that fill, copied verbatim from `get_design_context`'s output for
// node 1401:20821 (get_variable_defs finds no bound variable, so there's no
// token to point at instead) — a 255x321 SVG rotated 90deg to fill the
// panel's 321x255 box, exactly reproducing Figma's own export hack for a
// gradient CSS alone can't express. Ugly, but pixel-exact; a plain
// 2-stop approximation is one component away in `art-panel-bg`
// (globals.css) for panels this exact asset doesn't fit (FeaturedArticle's
// own 389x303 one).
const PANEL_GRADIENT_URL =
  "url(\"data:image/svg+xml;utf8,<svg viewBox='0 0 255 321' xmlns='http://www.w3.org/2000/svg' preserveAspectRatio='none'><g transform='matrix(-26.762 33.177 -22.247 -47.875 245.3 -0.000031602)' opacity='1'><rect height='80.407' width='54.64' fill='url(%23grad)' id='quad' shape-rendering='crispEdges'/><use href='%23quad' transform='scale(1 -1)'/><use href='%23quad' transform='scale(-1 1)'/><use href='%23quad' transform='scale(-1 -1)'/></g><defs><linearGradient id='grad' gradientUnits='userSpaceOnUse' x2='5' y2='5'><stop stop-color='rgba(227,228,242,1)' offset='0.10882'/><stop stop-color='rgba(234,251,244,1)' offset='0.67116'/><stop stop-color='rgba(234,251,245,1)' offset='0.99178'/></linearGradient></defs></svg>\")";

// The panel scales with the viewport (`w-full aspect-[321/255]`), so the
// pre-rotation box can't be sized in fixed pixels — it needs to track the
// panel's own rendered size with its width/height swapped (since rotating
// 90deg swaps which axis is which). Container query units do that: `cqw`/
// `cqh` resolve against the nearest `container-type` ancestor exactly the
// way `%` would, but same-named units resolve against the perpendicular
// axis in this bracket-value form too, so `100cqh` in the *width* slot below
// reads the panel's rendered *height*, and vice versa. (This is the exact
// technique Figma's own generated code uses elsewhere for the same rotated-
// square problem, e.g. Khishigee's own body/limb transforms.)
const panelGradientContainerStyle: CSSProperties = { containerType: "size" };
const panelGradientRotatedStyle: CSSProperties = {
  transform: "rotate(90deg)",
  backgroundImage: PANEL_GRADIENT_URL,
};

// The grass-hill silhouette's own height, shared by all three cards' scene
// exports — Figma's alpha `<mask>` inside each "Mask group" node is
// declared at exactly this height regardless of the export's own canvas
// size. Cards 2/3's canvases are already cropped tight to it (their own
// `scene.height` is 185), but card 1's export canvas is 321x196 — the extra
// 11px is a tiny decorative dot trailing below the hill, not more hill — so
// this constant, not `scene.height`, is what has to land flush with the
// panel's bottom edge.
const GRASS_HEIGHT = 185;

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
 * flex/padding/alignment. The panel background is Figma's own exact
 * gradient asset (`PANEL_GRADIENT_URL`, see its own comment) rather than a
 * CSS approximation — two rounds of approximating it as a plain gradient
 * both put the lilac in visibly the wrong place.
 *
 * The grass-hill + character illustration (`art.scene`) is a flattened,
 * exported SVG per card — Figma ships card 1's Khishigee instance fully
 * "editable" (individually animatable body/eye/mouth layers meant for the
 * interactive mascot elsewhere in the app) but cards 2/3 as already-
 * flattened single assets; exporting all three the same way (rather than
 * hand-porting Khishigee's animated rig for a static decorative card) keeps
 * the three cards on equal footing, matches "no animation added" (the owner
 * is doing motion separately), and is what the ticket's "exported SVG"
 * phrasing calls for. Figma places the grass-hill silhouette flush with the
 * panel's own left/right/bottom edges — local `(0, 255 - GRASS_HEIGHT)` —
 * regardless of an export's own canvas height (see `GRASS_HEIGHT`'s own
 * comment for why that's a shared constant rather than `scene.height`).
 *
 * The character art is a generic decorative mascot with no informational
 * content of its own (unlike the Featured article's хойн/хонь
 * demonstration), so it's `aria-hidden`; the card's accessible name comes
 * from its own visible label/title text since the whole card is one link.
 */
export default function ArticleCard({ card, art }: ArticleCardProps) {
  const sceneBox: Box = {
    x: 0,
    y: PANEL_HEIGHT - GRASS_HEIGHT,
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
      <div className="relative flex aspect-[321/255] w-full items-center justify-center overflow-hidden rounded-t-[32px]">
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          style={panelGradientContainerStyle}
          aria-hidden="true"
        >
          <div className="h-[100cqw] w-[100cqh]" style={panelGradientRotatedStyle} />
        </div>

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
