import Hills from "@/components/decor/Hills";
import Clouds from "@/components/decor/Clouds";
import { PairFlower, YellowFlower, WhiteTrioFlower, LilacPetal, SmallYellowPetal } from "@/components/decor/Flower";
import Tree from "@/components/decor/Tree";
import { SKY_GRADIENT } from "@/components/decor/sky";

/**
 * The decorative hero backdrop. Everything here is aria-hidden and
 * pointer-events-none — it never affects layout or the a11y tree. The
 * mascot is rendered separately by Hero.tsx, outside this wrapper, since it
 * carries its own meaningful label.
 *
 * In Figma the sky/hill artwork (node 1195:6160) is 1440x927 and starts at
 * the very top of the page, *behind* the transparent header — the header's
 * own 80px sits inside that 927, with the hero content (769px) filling the
 * rest and 78px of hills still showing below the hero content before the
 * next section begins. Reproduced here by bleeding this background upward
 * by exactly the header's height (`-top-20`) off Hero's own `relative`
 * box, and giving it a fixed height (927px) rather than `inset-0`, so it
 * lands correctly regardless of how tall the hero content ends up being.
 * Header keeps `z-10` so it paints above this bleed. Hero itself carries no
 * `overflow` at all — CSS forces a box's other axis to `auto` (a real,
 * clipping scroll container) the moment one axis is non-`visible`, so any
 * overflow-x guard on Hero would silently turn it into a scroll container
 * and clip this exact upward bleed. The horizontal-scroll guard lives on
 * `html` instead (globals.css), a level where that coupling is harmless.
 *
 * Two tiers, confirmed with the user: below `lg` this is just the sky
 * gradient (matching Figma's own mobile frame, which has no clouds, hills,
 * flowers or trees — the weakest hardware paints the fewest elements). At
 * `lg` and up it's the full scene, ported 1:1 from node 1195:6160: one
 * inline SVG for the 13 hill layers (Hills), CSS radial-gradient blobs for
 * the 9 clouds (Clouds — no SVG filters), and the exact flower/tree geometry
 * positioned by percentage of the 1440x927 artwork. `contain: paint` keeps
 * this subtree's paint from ever invalidating the hero text above it.
 */
export default function HeroScene() {
  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-20 bottom-0 overflow-hidden lg:hidden"
        style={{ background: SKY_GRADIENT }}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-20 hidden overflow-hidden lg:block lg:h-[927px]"
        style={{ background: SKY_GRADIENT, contain: "paint" }}
      >
        <Clouds />
        <Hills />

        <Tree className="h-auto" style={{ left: "88.889%", top: "49.083%", width: "7.271%" }} />
        <Tree className="h-auto" style={{ left: "93.681%", top: "54.153%", width: "6.018%" }} />

        <PairFlower className="h-auto" style={{ left: "66.736%", top: "75.297%", width: "8.606%" }} />
        <YellowFlower className="h-auto" style={{ left: "75.208%", top: "69.4%", width: "6.399%" }} />
        <WhiteTrioFlower className="h-auto" style={{ left: "59.431%", top: "86.408%", width: "5.555%" }} />
        <LilacPetal className="h-auto" style={{ left: "51.042%", top: "58.36%", width: "2.809%" }} />
        <LilacPetal className="h-auto" style={{ left: "88.333%", top: "58.145%", width: "2.518%" }} />
        <LilacPetal className="h-auto" style={{ left: "12.297%", top: "88.026%", width: "4.957%" }} />
        <LilacPetal className="h-auto" style={{ left: "44.037%", top: "69.707%", width: "4.732%" }} />
        <SmallYellowPetal className="h-auto" style={{ left: "79.224%", top: "73.139%", width: "1.595%" }} />
      </div>
    </>
  );
}
