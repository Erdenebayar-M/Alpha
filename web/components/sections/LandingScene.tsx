import RegisterHills from "@/components/decor/RegisterHills";
import RegisterClouds from "@/components/decor/RegisterClouds";
import {
  ARTWORK_FLOWERS,
  ARTWORK_TREES,
  ArtworkGlint,
  DecorItems,
  type DecorPlacement,
} from "@/components/decor/ArtworkDecor";
import { LilacPetal, PairFlower, WhiteFlower, YellowFlower } from "@/components/decor/Flower";
import { LeftGrassCluster, RightGrassCluster } from "@/components/decor/GrassCluster";
import { SoftCloud, type SoftCloudPosition } from "@/components/decor/SoftCloud";
import { SKY_GRADIENT, skyGradient } from "@/components/decor/sky";

// Second lilac petal, only in this frame (node 1360:8976), as a percentage of
// the 1440x1202 artwork like the shared placements.
const LANDING_ARTWORK_EXTRAS: DecorPlacement[] = [
  { Art: LilacPetal, left: "50.833%", top: "53.91%", width: "3.01%" },
];

// Flowers on the flat ground below the artwork, in page pixels, sitting
// beside the content column: nodes 1360:8589 and 1360:8903.
const LOWER_FLOWERS: DecorPlacement[] = [
  { Art: PairFlower, left: "1249px", top: "1605px", width: "131.76px" },
  { Art: YellowFlower, left: "1162px", top: "1371px", width: "87.5px" },
];

// The lone white flower hugs the left page margin (node 1360:8924), so it is
// an edge piece: pinned to the viewport's left edge like the soft clouds.
const EDGE_FLOWERS: DecorPlacement[] = [{ Art: WhiteFlower, left: "38px", top: "1185px", width: "84.1px" }];

// The four "bg-cloud" blobs (nodes 1360:8847–8850). Each hugs a page edge in
// Figma, so each is pinned to that viewport edge by its Figma offset.
const SOFT_CLOUDS: SoftCloudPosition[] = [
  { left: "-120px", top: "120px", width: "320px", height: "160px" },
  { right: "40px", top: "140px", width: "280px", height: "140px" },
  { left: "-80px", top: "820px", width: "260px", height: "130px" },
  { right: "60px", top: "780px", width: "220px", height: "110px" },
];

/**
 * The decorative backdrop for the landing redesign (Figma node 1360:8562,
 * 1440x2706). Everything here is aria-hidden and pointer-events-none, and
 * the page wrapper reserves its height, so it never affects layout, scroll or
 * the a11y tree. Same two tiers as HeroScene and RegisterScene: the sky
 * gradient only below `lg`, the full scene at `lg` and up. No motion yet: the
 * shared clouds render with `animated={false}`.
 *
 * The scene is not fluid like RegisterScene's `dvh` frame. This is a
 * scrolling page with a fixed design height, so it keeps Figma's pixels:
 * - **Artwork** (node 1360:8563, the top 1440x1202): the same hills, clouds,
 *   trees and flowers as the register-child frame, reused from those
 *   components, plus this frame's deltas: a 273px sky band (vs 252px), no
 *   `y=761` mid band, no pair flower and a second lilac petal. As in
 *   RegisterScene, the hills/clouds box widens with the viewport, so the
 *   mirrored hills fill the gutters and the clouds spread out, while the
 *   decor box stays exactly 1440 wide and centred.
 * - **Ground**: a flat `hill-front` fill down the rest of the page. It starts
 *   at y=905, where the artwork's "hill-bottom-fill" rect starts, not at the
 *   artwork's 1202 edge. That rect is opaque in this frame but drawn at 70%
 *   in RegisterHills, so a 1202 edge would show a seam at the far left and
 *   right where no hill covers it.
 * - **Edge pieces**: the soft cloud blobs, the left-margin white flower and
 *   the two bottom-corner grass clusters hug or bleed off the page edges in
 *   Figma. They're pinned to the
 *   viewport edges rather than the centred 1440 frame, so wider screens
 *   don't strand them in mid-air and narrower `lg` screens don't crop them
 *   away. The grass is pinned to the page bottom by its Figma overhang.
 * `overflow-hidden` on the layer crops whatever bleeds past the page.
 */
export default function LandingScene() {
  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden lg:hidden"
        style={{ background: SKY_GRADIENT }}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 hidden overflow-hidden bg-hill-front lg:block"
        style={{ contain: "paint" }}
      >
        <div
          className="absolute inset-x-0 top-0 h-[905px] bg-surface-artwork"
          style={{ backgroundImage: skyGradient(273) }}
        />

        <div
          className="absolute top-0 left-1/2 h-[1202px] -translate-x-1/2 overflow-hidden"
          style={{ width: "max(100%, 1440px)" }}
        >
          <RegisterHills midBand={false} />
          <RegisterClouds animated={false} />
        </div>

        <div className="absolute top-0 left-1/2 h-[2706px] w-[1440px] -translate-x-1/2">
          <div className="absolute inset-x-0 top-0 h-[1202px]">
            <DecorItems items={ARTWORK_TREES} />
            <DecorItems items={ARTWORK_FLOWERS} />
            <DecorItems items={LANDING_ARTWORK_EXTRAS} />
            <ArtworkGlint />
          </div>

          <DecorItems items={LOWER_FLOWERS} />
        </div>

        {SOFT_CLOUDS.map((cloud, i) => (
          <SoftCloud key={i} {...cloud} />
        ))}
        <DecorItems items={EDGE_FLOWERS} />

        <LeftGrassCluster className="-bottom-[76.85px] -left-[97px] h-[415.85px] w-[396.3px]" />
        <RightGrassCluster className="-right-[150.55px] -bottom-[87.21px] h-[360.21px] w-[418.55px]" />
      </div>
    </>
  );
}
