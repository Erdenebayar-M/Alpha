import type { Metadata } from "next";
import LandingScene from "@/components/sections/LandingScene";

// Review route for the parents' landing redesign (Figma frame 1360:8561).
// Kept out of search until it replaces `/`; everything else is inherited from
// the root layout. `robots` is merged shallowly, so `follow` is restated.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function LandingNewPage() {
  return (
    // Reserves the design's full 2706px height at `lg`+ so the whole scene can
    // be reviewed while the sections are still to come. No `overflow` here:
    // the horizontal guard lives on `html` (see HeroScene).
    <div className="relative isolate min-h-dvh lg:min-h-[2706px]">
      <LandingScene />
      <main id="main" className="relative" />
    </div>
  );
}
