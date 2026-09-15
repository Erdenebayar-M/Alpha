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
 *
 * The heading and body are the one exception to "text stays literal px":
 * unlike LandingHero/CategoryPills, whose fixed-px text can afford to drift
 * from Figma's line breaks a little as their box scales down, this heading
 * has no manually-authored line breaks, so a fixed 26px in a shrinking box
 * re-wraps into an ugly orphaned third line well before `lg`. Both
 * `text-[clamp(...)]` calls scale 1:1 with the viewport instead (min at the
 * `lg` floor, `Npx/1440*100vw` as the fluid middle, capped at Figma's exact
 * size) so the heading/body keep the same characters-per-line — and thus
 * Figma's own wrap — at every width between `lg` and 1440px, not just at
 * 1440px itself. `leading-*` is unitless for the same reason: a fixed px
 * line-height would stop matching Figma's ratio the moment the font-size
 * starts floating.
 *
 * The card's own outer box is the other exception: unlike LandingHero and
 * CategoryPills, which never pin their own root box's height (it's purely
 * content-driven), this card does — so a literal `h-[401px]` alongside a
 * scaling width fought itself, squaring the card off as the viewport
 * narrowed below 1440px. `aspect-[1115/401]` derives height from the
 * (already-correct, scaling) width instead, reproducing exactly 401px at
 * 1440px and shrinking the true Figma ratio below it — it's a floor, not a
 * ceiling, on a plain block box with no `overflow`/`min-height` override, so
 * content that needs more room just grows the box rather than clipping.
 * Everything sized relative to the old fixed-401px context has to follow:
 * `pt`/`mt` percentages resolve against the containing block's *width*, never
 * its height (CSS's padding/margin rule, even for a vertical side) — and
 * "containing block" means each element's own parent, not the card
 * unconditionally: the content wrapper's `pt` and the CTA wrapper's `mt` are
 * direct children of the (unpadded) card, so they convert against the card's
 * own 1115px; the heading's and body's `mt`, one level deeper inside the
 * content wrapper's own 5.785%-padded box, convert against *that* box's
 * narrower content width (1115 − 2×64.5 = 986px) instead. Only the Mascot's
 * `top` (an absolute-position offset, which *does* resolve against height)
 * converts against the card's height, 401.
 */
export default function DiagnosticCard() {
  return (
    <section
      aria-labelledby="diagnostic-heading"
      className="relative mx-auto max-w-[1440px] px-5 pb-10 md:px-10 lg:px-0 lg:pb-[45px] lg:pl-[10.833%]"
    >
      <div className="relative flex flex-col items-center gap-6 rounded-[32px] bg-linear-to-b from-card-surface-from to-card-surface-to p-6 text-center shadow-card sm:p-8 lg:aspect-[1115/401] lg:w-[77.431%] lg:items-stretch lg:gap-0 lg:p-0 lg:text-left lg:shadow-none">
        <Mascot className="w-40 sm:w-48 lg:absolute lg:top-[26.185%] lg:left-[71.735%] lg:w-[18.598%]" />

        <div className="flex flex-col items-center gap-4 lg:items-start lg:gap-0 lg:pt-[5.650%] lg:pr-[5.785%] lg:pl-[5.785%]">
          <Badge variant="lilac">{diagnosticCard.badge}</Badge>
          <h2
            id="diagnostic-heading"
            className="max-w-md text-2xl leading-[1.3] font-bold text-card-ink lg:mt-[4.767%] lg:max-w-[61.56%] lg:text-[clamp(18.49px,1.806vw,26px)] lg:leading-[1.1923]"
          >
            {diagnosticCard.heading}
          </h2>
          <p className="max-w-md text-base leading-relaxed font-normal text-card-ink lg:mt-[2.941%] lg:max-w-[59.74%] lg:text-[clamp(12.8px,1.25vw,18px)] lg:leading-[1.7222]">
            {diagnosticCard.body}
          </p>
        </div>

        <div className="w-full max-w-sm lg:mt-[3.722%] lg:max-w-[59.23%] lg:pl-[5.785%]">
          <Button variant="cardCta" href={siteConfig.assessmentUrl}>
            {diagnosticCard.cta}
          </Button>
        </div>
      </div>
    </section>
  );
}
