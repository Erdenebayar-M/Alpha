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
 * flow's section height is `100dvh`-driven (no page scroll allowed), and a
 * *fixed* artwork height fights that in both directions — too tall relative
 * to a short viewport crops away most of the sky (tried this: on a plain
 * short-but-not-especially-wide window it looked worse, not better), and
 * `RegisterHills`' `xMidYMax slice` cropping (scale =
 * `max(boxWidth/1440, boxHeight/1202)`) still lets a wide-enough box push
 * scale past 1 — a real enlargement of every hill shape, which is what
 * actually caused "the mountain is so high" in the first place.
 *
 * Fix: give the *artwork* frame (the inner, clipped layer below) its own
 * `aspect-[1440/1202]` and cap its width at `max-w-[1440px]`, centered, all
 * sitting on a plain `SKY_GRADIENT` painted on the *outer* (dynamic,
 * `100dvh`) wrapper instead of the artwork frame itself. That makes the
 * artwork frame's height a pure function of its own (capped) width — never
 * of the viewport's height — so `RegisterHills`' slice-scale is pinned at
 * `boxWidth/1440` with `boxHeight/1202` always equal to it by construction:
 * scale can never exceed 1 (capped width), and it shrinks proportionately,
 * whole-scene-at-once, on narrower/shorter viewports instead of just
 * cropping the top off. `bottom-0` (no `top`) keeps it anchored to the
 * ground; on a short viewport, resulting excess bleeds *upward* behind the
 * header (same trick as HeroScene's `-top-20`) instead of past the
 * section's bottom edge, which is what caused the earlier page-scroll bug.
 * On viewports wider than 1440px the capped frame no longer reaches the
 * edges — the outer wrapper's matching sky gradient shows through there
 * instead of a hard edge.
 *
 * Two nested layers here, unlike HeroScene's one: an unclipped "ambience"
 * layer (four soft cloud blobs + two radial glows that intentionally bleed
 * past the artwork edges in Figma, since only the inner artwork frame has
 * `overflow-clip`) sits behind the clipped "artwork" frame (hills, clouds,
 * trees, flowers, and the card's glint accent — everything Figma nests
 * inside the clipped frame).
 */
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

        <div
          className="absolute inset-x-0 bottom-0 mx-auto aspect-[1440/1202] w-full max-w-[1440px] overflow-hidden"
          style={{ contain: "paint" }}
        >
          <RegisterClouds />
          <RegisterHills />

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
    </>
  );
}
