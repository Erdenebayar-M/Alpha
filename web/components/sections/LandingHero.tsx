import Badge from "@/components/ui/Badge";
import Container from "@/components/ui/Container";
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
 * never fit below 1440px.
 *
 * The row fills the Content column (`Container`), so the three percentages
 * below are fractions of it — and they sum to exactly 100.000%
 * (52.038 + 2.184 + 45.778), because they were already fractions of the span
 * from the h1's left edge to the artwork's right edge rather than of 1440.
 * They are therefore unchanged by the move onto the column; what changed is
 * where that span starts and ends.
 *
 * This hero is the reason the column aligns *painted* edges rather than Figma
 * frames. It has no card behind it — node 1360:8705 is an invisible grouping
 * frame — so its leftmost visible pixel is the badge, which Figma insets 40px
 * inside that frame. Honouring the frame would leave the h1 adrift of the
 * card and pill rows below with nothing on screen to explain the gap, so the
 * badge/h1 sit on the column edge instead: x=150 rather than Figma's x=200,
 * and the artwork ends at 1290 rather than overflowing to 1299 as it does in
 * the design. See docs/adr/0003-page-content-column.md.
 *
 * Top padding (132px = the 106px header + 87px gap to the card + 45px of the
 * card's own padding) and bottom padding (45px) stay fixed — vertical
 * measurements don't interact with the row's horizontal overflow.
 */
export default function LandingHero() {
  return (
    <section id="top" aria-label={landingHero.sectionLabel} className="relative isolate">
      <Container className="relative flex flex-col items-center gap-10 pt-10 pb-16 text-center lg:flex-row lg:items-start lg:gap-[2.184%] lg:pt-[132px] lg:pb-[45px] lg:text-left">
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
      </Container>
    </section>
  );
}
