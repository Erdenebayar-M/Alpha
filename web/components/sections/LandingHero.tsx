import Badge from "@/components/ui/Badge";
import LandingHeroArt from "@/components/sections/LandingHeroArt";
import { landingHero } from "@/lib/content";

/**
 * /landing-new's hero (Figma node 1360:8705, inside layout 1360:8704): the
 * "Эцэг эхэд" badge, the page's only h1, the lead paragraph, and the cloud +
 * reading-characters illustration. Figma is a fixed 1440-wide desktop
 * design with no mobile frame, so below `lg` the content stacks in a simple
 * centred column (per the parent spec's agreed single-column rules), and at
 * `lg`+ every horizontal measurement is a percentage instead of a fixed px,
 * so the whole row scales down together between the `lg` breakpoint
 * (1024px) and 1440px instead of overflowing — the fixed-px numbers this
 * replaced summed to the full 1440px design width with no slack, so they
 * never fit below 1440px. Padding percentages are relative to the row's own
 * box, e.g. left padding 200/1440=13.889%; CSS resolves a flex child's
 * percentage width against what's left after padding (here
 * 1440-200-140.828=1099.172px), so the text/gap/art percentages are taken
 * against that instead, e.g. text 572/1099.172=52.038%. Together they
 * reproduce Figma's exact pixels once the row reaches its natural 1440px
 * width. Top padding (132px = the 106px header + 87px gap to the card +
 * 45px of the card's own padding) and bottom padding (45px) stay fixed —
 * they don't interact with the row's horizontal overflow.
 */
export default function LandingHero() {
  return (
    <section id="top" aria-label={landingHero.sectionLabel} className="relative isolate">
      <div className="relative mx-auto flex max-w-[1440px] flex-col items-center gap-10 px-5 pt-10 pb-16 text-center md:px-10 lg:flex-row lg:items-start lg:gap-[2.184%] lg:pt-[132px] lg:pr-[9.780%] lg:pb-[45px] lg:pl-[13.889%] lg:text-left">
        <div className="flex w-full max-w-[554px] flex-col items-center gap-5 lg:w-[52.038%] lg:max-w-none lg:items-start lg:gap-[12px]">
          <Badge variant="flat">{landingHero.badge}</Badge>
          <h1 className="text-[26px] leading-[1.3] font-bold text-hero-ink lg:text-[32px] lg:leading-[44px] lg:tracking-[0.64px]">
            {landingHero.headingLines[0]}{" "}
            <br />
            {landingHero.headingLines[1]}
          </h1>
          <p className="text-base leading-[1.6] text-hero-lead lg:text-[18px] lg:leading-[31px]">{landingHero.lead}</p>
        </div>

        <LandingHeroArt className="order-first w-full max-w-[360px] lg:order-last lg:w-[45.778%] lg:max-w-none" />
      </div>
    </section>
  );
}
