import Image from "next/image";
import { landingHero } from "@/lib/content";

// Union's (1360:8712) own tight layout box, in Figma px. Everything below is
// positioned in this coordinate space, then converted to percentages so the
// whole illustration scales fluidly with its container.
const UNION_WIDTH = 503.172;
const UNION_HEIGHT = 356.962;

const pctX = (px: number) => `${(px / UNION_WIDTH) * 100}%`;
const pctY = (px: number) => `${(px / UNION_HEIGHT) * 100}%`;

// Characters (1360:8738) is a separate overlay on top of the Hero Card, not a
// child of the cloud, and no frame exposes it and Union in one coordinate
// space. This offset maps its layer coordinates into Union's box: measured by
// pixel-matching both character PNGs (at 1/3 scale) against Figma's own render
// of the page (1360:8561), and confirmed by ORto's body circle and Нархан's
// symmetric export bleed landing exactly. Re-measure if either PNG is
// re-exported.
const CHARACTERS_OFFSET = { x: -796.33, y: -242.349 };
const fromCharacters = (x: number, y: number) => ({ x: x + CHARACTERS_OFFSET.x, y: y + CHARACTERS_OFFSET.y });

// Both character PNGs are 3x exports, so each one's box is its pixel size / 3
// — never a free width/height pair, which would stretch the artwork.
const EXPORT_SCALE = 3;
const png3x = (pixelWidth: number, pixelHeight: number) => ({
  width: pixelWidth / EXPORT_SCALE,
  height: pixelHeight / EXPORT_SCALE,
});

interface ArtLayer {
  src: string;
  /** Top-left corner and size in Union's box, Figma px. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Figma's own rotate/skew, applied around `transformOrigin` (default: centre). */
  transform?: string;
  transformOrigin?: string;
}

// Every layer in Figma's paint order.
//
// Glows and ORto's ground shadow are Figma's own exported vectors, not part of
// the character PNGs: the PNG exports bake an opaque page background into
// their soft, semi-transparent edges, and no pixel clean-up recovers pale
// glows faithfully once they're sitting on the cloud instead — see
// docs/adr/0002-character-glows-as-figma-vectors.md. Each SVG canvas includes
// its blur bleed, so x/y/size are that canvas (node box grown by Figma's
// exported insets), not the node's own box.
//
// The character PNGs (Нархан 1360:8739; ORto with the book, both characters'
// feet and the one AI-generated photo, 1360:8797) are 3x exports taken over a
// flat rgb(250,252,254) background, then cleaned up in steps that must be
// repeated on re-export:
//   1. Flood-fill the background to alpha 0 from the image border (RGB kept),
//      so eyes/teeth enclosed by the body stay intact.
//   2. That fill leaks into the book's near-white pages: make the warm
//      (R - B >= 4) pixels in the book's top edge opaque again.
//   3. Cut away each PNG's baked glow so only the vector glow underneath
//      shows: ORto at his body circle (1360:8800); Нархан inside her
//      unblurred body outline (Ellipse 12, 1360:8742, with its rotate/skew),
//      far enough in to clear the background baked into her blurred edge.
//      Dark ink (hair, hands) and the pink bow outside those outlines stay.
// `unoptimized`: Next's image optimizer garbled these PNGs (colours came out
// wrong after resizing) — serving the cleaned originals directly avoids that.
const ART_LAYERS: ArtLayer[] = [
  // The cloud (1360:8712 "Union") is a boolean union of 4 overlapping ellipses
  // with a soft mint-to-periwinkle gradient, drop shadow and inner highlight —
  // an illustration, not simple geometry, so it's the exported SVG rather than
  // CloudShape.tsx's flat-colour blur blob (docs/adr/0001). Its canvas bleeds
  // 28px / 16px past Union's box for the shadow.
  { src: "/images/landing/hero-cloud.svg", x: -28, y: -16, width: 559.172, height: 412.962 },
  // Нархан's blurred body fill (Ellipse 13, 1360:8743) — her soft edge and top haze.
  {
    src: "/images/landing/hero-narhan-glow.svg",
    ...fromCharacters(1000.99, 347.297),
    width: 208.455,
    height: 194.254,
    transform: "rotate(14.56deg) skewX(-3.33deg)",
  },
  { src: "/images/landing/hero-narhan.png", x: 198, y: 101.981, ...png3x(665, 601) },
  // ORto's ground shadow (Ellipse 40, 1360:8799).
  { src: "/images/landing/hero-orto-shadow.svg", ...fromCharacters(898.326, 492.169), width: 158.101, height: 69.8305 },
  // ORto's pink/lavender halo (bg_glow, 1435:8876), rotated 1° around its node box's centre.
  {
    src: "/images/landing/hero-orto-glow.svg",
    ...fromCharacters(849.399, 333.356),
    width: 242.058,
    height: 247.914,
    transform: "rotate(1deg)",
    transformOrigin: "50.1% 50.13%",
  },
  { src: "/images/landing/hero-orto.png", x: 53, y: 90.981, ...png3x(878, 744) },
];

// Excitement lines above each head (2 by ORto, 3 by Нархан). Their source
// node isn't reachable through this file's Figma access, so each stroke's
// endpoints, width and colour were measured from Figma's render of the page
// (1360:8561) — Union-box coordinates, Figma px, drawn with round caps.
const EXCITEMENT_LINE_COLOR = "#f7bb19";
const EXCITEMENT_LINE_WIDTH = 3.4;

interface ExcitementLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const EXCITEMENT_LINES: ExcitementLine[] = [
  // ORto
  { x1: 64.4, y1: 123.8, x2: 78.6, y2: 138.2 },
  { x1: 55.9, y1: 142.1, x2: 71.9, y2: 148.4 },
  // Нархан
  { x1: 389.2, y1: 108, x2: 388, y2: 119 },
  { x1: 404, y1: 117.1, x2: 395.9, y2: 123.9 },
  { x1: 411, y1: 129.9, x2: 400.8, y2: 132 },
];

interface LandingHeroArtProps {
  className?: string;
}

/**
 * The hero's cloud with Нархан and ORto reading a book (Figma nodes
 * 1360:8712 and 1360:8738). The outer box is sized to Union's own tight
 * 503.172x356.962 layout box (an `aspect-*` ratio so it scales fluidly);
 * the characters overflow past it, same as in Figma. `role="img"` gives
 * assistive tech one accessible name for the whole illustration; every
 * layered piece inside is decorative. This is the hero's largest image and
 * renders above the fold, so every layer loads with `priority`.
 */
export default function LandingHeroArt({ className }: LandingHeroArtProps) {
  return (
    <div role="img" aria-label={landingHero.artLabel} className={className}>
      <div className="pointer-events-none relative aspect-[503.172/356.962] size-full">
        {ART_LAYERS.map((layer) => (
          <div
            key={layer.src}
            className="absolute"
            style={{
              left: pctX(layer.x),
              top: pctY(layer.y),
              width: pctX(layer.width),
              height: pctY(layer.height),
              transform: layer.transform,
              transformOrigin: layer.transformOrigin,
            }}
          >
            <Image src={layer.src} alt="" aria-hidden="true" fill unoptimized priority />
          </div>
        ))}

        <svg
          aria-hidden="true"
          className="absolute inset-0 size-full overflow-visible"
          viewBox={`0 0 ${UNION_WIDTH} ${UNION_HEIGHT}`}
          fill="none"
          stroke={EXCITEMENT_LINE_COLOR}
          strokeWidth={EXCITEMENT_LINE_WIDTH}
          strokeLinecap="round"
        >
          {EXCITEMENT_LINES.map((line) => (
            <line key={`${line.x1},${line.y1}`} {...line} />
          ))}
        </svg>
      </div>
    </div>
  );
}
