import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Container from "@/components/ui/Container";
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
 * The card's own gradient/radius/padding surface and its heading/body's
 * fluid-clamp type are the `card-surface`/`card-heading`/`card-body`
 * utilities (globals.css) — the Featured article card (Figma node 1401:22064)
 * repeats this exact surface and the exact same 26px/31px-leading heading
 * and 18px/31px-leading body type, so both cards share one definition rather
 * than two hand-copies of the same Tailwind string.
 *
 * The card fills the Content column, so it renders 1140px wide at the 1440px
 * design width rather than Figma's 1115px: the design places this card at
 * x=156, 6px off the centre line the hero and pills share, and the column
 * replaces all of those mismatched edges (see
 * docs/adr/0003-page-content-column.md). Everything inside is a percentage of
 * the card's own box, so the interior scales with it — 2.24% larger than
 * Figma, exactly proportional — and no interior number needed rebasing.
 * Vertical measurements don't cause horizontal overflow, so they stay
 * Figma's literal px where they aren't tied to the box.
 *
 * Which box a percentage resolves against is the thing to get right here: it
 * is always the element's own parent's *content* box, never "the card"
 * unconditionally. `pt`/`mt` percentages resolve against that parent's
 * **width** even though they are a vertical measurement (CSS's
 * padding/margin rule). So the content wrapper's `pt` and the CTA wrapper's
 * `mt` are direct children of the (unpadded) card and convert against the
 * card; the heading's and body's `mt` and `max-w`, one level deeper inside
 * the content wrapper's own 5.785%-padded box, convert against *that* box's
 * narrower content width (the card less 2x5.785%). The CTA wrapper's
 * `max-w` used to get this wrong — 59.23% is 584/986, i.e. computed against
 * the content wrapper's inner width, but it is a child of the card, so it
 * resolved against the full width and drew the button ~12px too wide. It is
 * now 58.161% = (584 + 64.5)/1115, the same ratio expressed against the card,
 * which is scale-invariant and so holds at 1140 too. Only the Mascot's `top`
 * (an absolute-position offset, which *does* resolve against height)
 * converts against the card's height.
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
 * 1440px itself. The card is still a fixed fraction of the viewport, so
 * those vw middles are unaffected by the move onto the column. `leading-*`
 * is unitless for the same reason: a fixed px line-height would stop
 * matching Figma's ratio the moment the font-size starts floating.
 *
 * The card's own outer box is the other exception: unlike LandingHero and
 * CategoryPills, which never pin their own root box's height (it's purely
 * content-driven), this card does — so a literal `h-[401px]` alongside a
 * scaling width fought itself, squaring the card off as the viewport
 * narrowed. `aspect-[1115/401]` derives height from the (already-correct,
 * scaling) width instead, keeping Figma's ratio at every width — 410.4px at
 * 1440px, since the card is now column-width. It's a floor, not a ceiling,
 * on a plain block box with no `overflow`/`min-height` override, so content
 * that needs more room just grows the box rather than clipping. One knock-on
 * of the wider card: the content stack (408.6px) now sits inside that floor,
 * so Figma's deliberate 3.5px overhang of the CTA past the card's bottom edge
 * is gone and the button lands just inside it.
 */
export default function DiagnosticCard() {
  return (
    <section aria-labelledby="diagnostic-heading" className="landing-section-gap-b">
      <Container>
        <div className="relative card-surface shadow-card lg:aspect-[1115/401] lg:items-stretch lg:p-0 lg:shadow-none">
          <Mascot className="w-40 sm:w-48 lg:absolute lg:top-[26.185%] lg:left-[71.735%] lg:w-[18.598%]" />

          <div className="flex flex-col items-center gap-4 lg:items-start lg:gap-0 lg:pt-[5.650%] lg:pr-[5.785%] lg:pl-[5.785%]">
            <Badge variant="lilac">{diagnosticCard.badge}</Badge>
            <h2 id="diagnostic-heading" className="card-heading max-w-md lg:mt-[4.767%] lg:max-w-[61.56%]">
              {diagnosticCard.heading}
            </h2>
            <p className="card-body font-normal max-w-md lg:mt-[2.941%] lg:max-w-[59.74%]">{diagnosticCard.body}</p>
          </div>

          <div className="w-full max-w-sm lg:mt-[3.722%] lg:max-w-[58.161%] lg:pl-[5.785%]">
            <Button variant="cardCta" href={siteConfig.assessmentUrl}>
              {diagnosticCard.cta}
            </Button>
          </div>
        </div>
      </Container>
    </section>
  );
}
