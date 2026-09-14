import Image from "next/image";
import { landingHero } from "@/lib/content";

interface RasterPiece {
  src: string;
  left: string;
  top: string;
  width: string;
  height: string;
}

// Нархан (1360:8739) and ORto with the book he's holding (1360:8797 — the
// one AI-generated photo among these pieces lives inside this export), in
// Figma's paint order. Positioned as a percentage of the cloud's own tight
// layout box below (not a box sized to fit them) — like Figma itself, where
// Characters is a separate overlay sitting on top of the Hero Card rather
// than a flex-sized sibling of the cloud, they overflow past its right and
// bottom edges (percentages over 100%).
//
// These are raster PNGs, not SVG: the export pipeline for this file bakes
// an opaque page background into every vector export of these two nodes
// (their glow/highlight effects need backdrop context to render), so each
// was exported as a PNG at 3x and had that background flood-filled back out
// to transparent (matched pixels connected to the image's own border, so
// eyes/teeth stay intact). `unoptimized`: Next's image optimizer garbled
// these two specific files (colours came out wrong after resizing) —
// serving the flood-filled originals directly avoids that. Each box is
// centred on the piece's own Figma layout box, since the export's shadow
// bleed isn't even per side.
const RASTER_PIECES: RasterPiece[] = [
  { src: "/images/landing/hero-narhan.png", left: "71.282%", top: "85.391%", width: "44.054%", height: "56.122%" },
  { src: "/images/landing/hero-orto.png", left: "46.126%", top: "83.337%", width: "58.164%", height: "69.475%" },
];

// The cloud (node 1360:8712 "Union") is a boolean union of 4 overlapping
// ellipses with a soft mint-to-periwinkle gradient and heavy blur — the same
// export problem hits it (and unlike the characters, its own fill is too
// close to the baked backdrop color to flood-fill back out). Reproduced as
// CSS instead, following CloudShape.tsx's pattern (flat-colour blurred
// blobs, not a gradient fill, so the blur doesn't double up on a fade): two
// mint lobes (1a/1b) and two periwinkle lobes (1c), sampled from the design,
// positioned as a percentage of Union's own 503.172x356.962 layout box.
const CLOUD_LOBES = [
  { left: "0%", top: "26.883%", width: "59.423%", height: "73.117%", color: "#d8f1ef" },
  { left: "14.905%", top: "0%", width: "47.101%", height: "59.670%", color: "#dcf4ee" },
  { left: "41.934%", top: "40.184%", width: "58.066%", height: "59.673%", color: "#d3defb" },
  { left: "55.172%", top: "6.161%", width: "43.502%", height: "73.173%", color: "#d3defb" },
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
 * renders above the fold, so both raster pieces load with `priority`.
 */
export default function LandingHeroArt({ className }: LandingHeroArtProps) {
  return (
    <div role="img" aria-label={landingHero.artLabel} className={className}>
      <div className="relative aspect-[503.172/356.962] size-full">
        {CLOUD_LOBES.map((lobe, i) => (
          <div
            key={i}
            aria-hidden="true"
            className="absolute rounded-full"
            style={{ left: lobe.left, top: lobe.top, width: lobe.width, height: lobe.height, backgroundColor: lobe.color, filter: "blur(22px)" }}
          />
        ))}

        {RASTER_PIECES.map((piece) => (
          <div key={piece.src} className="absolute" style={{ left: piece.left, top: piece.top, width: piece.width, height: piece.height }}>
            <Image src={piece.src} alt="" aria-hidden="true" fill unoptimized priority />
          </div>
        ))}
      </div>
    </div>
  );
}
