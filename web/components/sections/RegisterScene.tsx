import RegisterHills from "@/components/decor/RegisterHills";
import RegisterClouds from "@/components/decor/RegisterClouds";
import DistantTrees from "@/components/decor/DistantTrees";
import { PairFlower, YellowFlower, WhiteTrioFlower, LilacPetal } from "@/components/decor/Flower";
import Tree from "@/components/decor/Tree";
import { SKY_GRADIENT } from "@/components/decor/sky";

/**
 * The decorative backdrop for the register-child flow (Figma node 1218:13206,
 * "Skill Journey - Page Background"). Same technique and two-tier rule as
 * HeroScene — sky gradient only below `lg`, full scene at `lg` and up.
 *
 * The `lg` tier can't just copy HeroScene's fixed-`927px`-box trick: this
 * flow's section height is `100dvh`-driven (no page scroll allowed), so the
 * artwork frame is sized dynamically instead.
 *
 * Sky:land must read 1:1 at every viewport. In the 1440×1202 artboard the
 * full-width green crest (the `cx=674 rx=845` ellipse in RegisterHills) peaks
 * at y=593 — 1202/1218 of the way down a box whose *land portion* (593→1202,
 * 609 units) is pinned to exactly `50dvh`. So the box's height is driven by
 * `100dvh * 1202/1218` (≈ 98.7dvh) and its width by the matching
 * `100dvh * 1440/1218`, both constants below as `SCENE_H`/`SCENE_W` — the
 * artboard's bottom edge is already the land band's bottom edge, so
 * `bottom-0` still anchors it correctly; only the height source changed
 * (from width-derived to dvh-derived). An earlier version sized this frame
 * by covering the viewport (`width: max(100%, ...)`, height from aspect
 * ratio) — that kept the frame's aspect locked to the artboard's, which
 * anchoring only the bottom edge meant a wider viewport grew the frame
 * *and* pushed the horizon up screen with it, eventually erasing the sky
 * entirely on a wide monitor. Driving height alone from `dvh` breaks that
 * coupling: width can no longer feed back into how tall the box gets.
 *
 * `SCENE_W` can be narrower than the viewport (e.g. a wide, short monitor).
 * Two sibling boxes at that same `SCENE_H`/`SCENE_W` split what happens to
 * the leftover width:
 * - The **ground** box takes `width: max(100%, SCENE_W)` — at least
 *   viewport-wide — so `RegisterHills`' own `xMidYMax meet` fit still
 *   resolves to the same scale (`min(boxW/1440, boxH/1202)`, and `boxH/1202`
 *   is already that scale, so the `max()` just guarantees the width term
 *   can't undercut it) while its two mirrored copies (see that file) bleed
 *   into whatever gutter `meet`'s own horizontal centering opens up —
 *   extending the ground sideways rather than upscaling it. `RegisterClouds`
 *   lives here too, not in the artboard box below: on a normal-proportioned
 *   viewport this box is exactly `SCENE_W` wide anyway (`max()` is a no-op),
 *   so clouds sit at their usual Figma percentages; only on an extreme wide
 *   monitor does this box widen past `SCENE_W`, spreading the clouds out
 *   with it instead of leaving the newly-revealed sky at the sides bare.
 * - The **artboard** box stays at exactly `SCENE_W`×`SCENE_H` (true
 *   1440:1202), so every remaining decor child's Figma-derived
 *   `left`/`top`/`width` percentage (node 1218:13206) still means exactly
 *   what it says — these are anchored to specific hill/ground features, so
 *   unlike clouds they can't drift with viewport width.
 *
 * On viewports taller/narrower than 1440:1202, `SCENE_W` alone can exceed
 * the viewport width, and the artboard's sides crop symmetrically — the
 * same "excess bleeds off, ground never does" trade as before, just driven
 * by width now instead of height.
 *
 * Two nested layers here, unlike HeroScene's one: an unclipped "ambience"
 * layer (four soft cloud blobs + two radial glows that intentionally bleed
 * past the artwork edges in Figma, since only the inner artwork frame has
 * `overflow-clip`) sits behind the clipped ground/artboard boxes (hills,
 * clouds, trees, flowers, and the card's glint accent — everything Figma
 * nests inside the clipped frame).
 */
const SCENE_H = "calc(100dvh * 1202 / 1218)";
const SCENE_W = "calc(100dvh * 1440 / 1218)";

export default function RegisterScene() {
  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-20 bottom-0 overflow-hidden lg:hidden"
        style={{ background: SKY_GRADIENT }}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-20 bottom-0 hidden lg:block"
        style={{ background: SKY_GRADIENT }}
      >
        <div className="absolute inset-0" style={{ contain: "paint" }}>
          <div
            className="absolute rounded-full bg-white"
            style={{ left: "-8.333%", top: "-9.984%", width: "22.222%", height: "13.311%", opacity: 0.35, filter: "blur(20px)" }}
          />
          <div
            className="absolute rounded-full bg-white"
            style={{ left: "77.778%", top: "11.647%", width: "19.444%", height: "11.647%", opacity: 0.35, filter: "blur(20px)" }}
          />
          <div
            className="absolute rounded-full bg-white"
            style={{ left: "-5.556%", top: "68.22%", width: "18.056%", height: "10.816%", opacity: 0.35, filter: "blur(20px)" }}
          />
          <div
            className="absolute rounded-full bg-white"
            style={{ left: "80.556%", top: "64.892%", width: "15.278%", height: "9.151%", opacity: 0.35, filter: "blur(20px)" }}
          />
          <div
            className="absolute rounded-full"
            style={{
              left: "-8.333%",
              top: "-9.984%",
              width: "27.778%",
              height: "33.278%",
              opacity: 0.18,
              filter: "blur(60px)",
              background: "radial-gradient(closest-side, rgba(253,183,173,1), rgba(253,183,173,0))",
            }}
          />
          <div
            className="absolute rounded-full"
            style={{
              left: "72.222%",
              top: "-6.656%",
              width: "22.222%",
              height: "26.622%",
              opacity: 0.12,
              filter: "blur(50px)",
              background: "radial-gradient(closest-side, rgba(248,186,18,1), rgba(248,186,18,0))",
            }}
          />
        </div>

        <div className="absolute inset-0 overflow-hidden" style={{ contain: "paint" }}>
          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2"
            style={{ width: `max(100%, ${SCENE_W})`, height: SCENE_H }}
          >
            <RegisterHills />
            <RegisterClouds />
          </div>

          <div className="absolute bottom-0 left-1/2 -translate-x-1/2" style={{ width: SCENE_W, height: SCENE_H }}>
            <Tree className="h-auto" style={{ left: "88.889%", top: "54.243%", width: "6.024%" }} />
            <Tree className="h-auto" style={{ left: "93.193%", top: "58.15%", width: "5.368%" }} />
            <DistantTrees className="h-auto" style={{ left: "5.972%", top: "44.593%", width: "14.887%" }} />

            <PairFlower className="h-auto" style={{ left: "73.958%", top: "78.869%", width: "9.15%" }} />
            <YellowFlower className="h-auto" style={{ left: "14.167%", top: "80.616%", width: "6.076%" }} />
            <WhiteTrioFlower className="h-auto" style={{ left: "59.431%", top: "66.639%", width: "4.781%" }} />
            <LilacPetal className="h-auto" style={{ left: "8.889%", top: "61.065%", width: "3.01%" }} />

            <div
              aria-hidden="true"
              className="absolute rotate-45 bg-white"
              style={{ left: "31.16%", top: "12.665%", width: "2.828%", aspectRatio: "1 / 1", filter: "blur(8px)" }}
            />
          </div>
        </div>
      </div>
    </>
  );
}
