import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Mascot from "@/components/brand/Mascot";
import { diagnosticCard } from "@/lib/content";
import { siteConfig } from "@/lib/site-config";

/**
 * /landing-new's Diagnostic card (Figma node 1401:21880, "Hero Card"),
 * directly under the Category pills: the lilac "Оношилгоо" badge, the
 * question heading, body copy and CTA on the left, and the ORto mascot
 * (node 1401:21910, "Sound idle component" — the same idle character
 * Mascot.tsx already draws, positioned as a sibling overlay rather than a
 * card child in Figma) on the right.
 *
 * The card (1115px) plus its left margin (156px) sum past the `lg`
 * breakpoint (1024px) at their native 1440px pixels, so — like LandingHero
 * and CategoryPills — the card's left offset and width are percentages of
 * the 1440px reference, and everything measured from the card's own edges
 * (its padding, the mascot's position, and every text/CTA max-width) is a
 * percentage of *the card's own box* rather than of 1440: those percentages
 * are set on children of the (unpadded, 100%-wide) inner wrapper below, so
 * they resolve against the card's own current width and keep Figma's exact
 * proportions as the card scales between `lg` and 1440px. Vertical measurements
 * don't cause horizontal overflow, so they stay Figma's literal px, unscaled
 * — the same split LandingHero's own comment explains.
 *
 * Figma has no mobile frame; below `lg` the card stacks mascot, then text,
 * then a full-width CTA (the mascot is first in the DOM for this reason,
 * and only becomes an absolutely-positioned overlay at `lg`).
 */
export default function DiagnosticCard() {
  return (
    <section
      aria-labelledby="diagnostic-heading"
      className="relative mx-auto max-w-[1440px] px-5 pb-10 md:px-10 lg:px-0 lg:pb-[45px] lg:pl-[10.833%]"
    >
      <div className="relative flex flex-col items-center gap-6 rounded-[32px] bg-linear-to-b from-card-surface-from to-card-surface-to p-6 text-center shadow-card sm:p-8 lg:h-[401px] lg:w-[77.431%] lg:items-stretch lg:gap-0 lg:p-0 lg:text-left lg:shadow-none">
        <Mascot className="w-40 sm:w-48 lg:absolute lg:top-[105px] lg:left-[71.735%] lg:w-[18.598%]" />

        <div className="flex flex-col items-center gap-4 lg:items-start lg:gap-0 lg:pt-[63px] lg:pr-[5.785%] lg:pl-[5.785%]">
          <Badge variant="lilac">{diagnosticCard.badge}</Badge>
          <h2
            id="diagnostic-heading"
            className="max-w-md text-2xl leading-[1.3] font-bold text-card-ink lg:mt-[47px] lg:max-w-[61.56%] lg:text-[26px] lg:leading-[31px]"
          >
            {diagnosticCard.heading}
          </h2>
          <p className="max-w-md text-base leading-relaxed font-normal text-card-ink lg:mt-[29px] lg:max-w-[59.74%] lg:text-[18px] lg:leading-[31px]">
            {diagnosticCard.body}
          </p>
        </div>

        <div className="w-full max-w-sm lg:mt-[41.5px] lg:max-w-[59.23%] lg:pl-[5.785%]">
          <Button variant="cardCta" href={siteConfig.assessmentUrl}>
            {diagnosticCard.cta}
          </Button>
        </div>
      </div>
    </section>
  );
}
