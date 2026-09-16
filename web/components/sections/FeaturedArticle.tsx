import Badge from "@/components/ui/Badge";
import Container from "@/components/ui/Container";
import FeaturedArticleArt from "@/components/sections/FeaturedArticleArt";
import RoundArrowLink from "@/components/ui/RoundArrowLink";
import SectionHeading from "@/components/ui/SectionHeading";
import { featuredArticle } from "@/lib/content";

/**
 * /landing-new's Featured article (Figma node 1401:22062, "Онцлох нийтлэл
 * групп"), directly under the Diagnostic card: the section heading and the
 * illustration + Article text row, both painted inside one shared card
 * surface — not a heading sitting above the card. Figma's own node tree
 * confirms this: the "Hero Card" frame and the heading text share the same
 * 1119x401 box (heading at local `(4, 22)`, well inside it, well above the
 * row's own `y≈59` start), so the heading is layered on the card's gradient
 * background, not a separate block with a gap before it.
 *
 * The outer card uses the shared `card-surface` utility (globals.css) —
 * DiagnosticCard's own gradient/radius/padding treatment, extracted there
 * once this became its second verbatim copy. Unlike DiagnosticCard (whose
 * only child is its content, with the mascot an absolute overlay), this card
 * holds two real flex-col children — the heading, then the illustration+text
 * row — so `lg:items-stretch` (also borrowed from DiagnosticCard) makes both
 * stretch full-width instead of shrink-centering, and `lg:justify-center`
 * centres that two-child block vertically in case the `aspect-[1119/401]`
 * floor (see DiagnosticCard's comment for why an aspect ratio rather than a
 * literal height) leaves slack past their natural height.
 *
 * `lg:pt-[1.966%]` (22/1119), `lg:pb-[3.485%]` (39/1119) and the heading's
 * own `lg:mb-[0.268%]` (3/1119) reproduce Figma's card-top → heading,
 * heading → row and row → card-bottom gaps — percentages of the card's own
 * width, since padding/margin resolve against width even for a vertical
 * measurement. `lg:px-[2.368%]` (26.5/1119) is Figma's horizontal inset,
 * still doing the same job as before: Figma centres the illustration panel +
 * text row inside 40px of padding, but that row (389 + 677 = 1066px) is
 * wider than the padded box (1119 - 2*40 = 1039px) — the overflow is
 * absorbed symmetrically by centring, landing the real inset at 26.5px each
 * side (1119 - 2*26.5 = 1066) with zero gap between the panel and the text
 * column. It now lives on the outer card rather than the row, so the heading
 * gets it too: Figma hand-places the heading only 4px from the card's left
 * edge, noticeably less inset than the row's own ~26.5px, but every content
 * row on this page lines up with the same Content column (web/CONTEXT.md) —
 * so the heading takes the row's inset rather than Figma's slightly
 * different one, the same kind of override Container.tsx and LandingHero.tsx
 * already make when a Figma element's own x doesn't match the column every
 * other row uses.
 *
 * Figma has no mobile frame; below `lg` the illustration stacks above the
 * text (the panel is first in the DOM for this reason, and only becomes a
 * flex sibling at `lg`).
 *
 * The heading and body use the shared `card-heading`/`card-body` utilities —
 * DiagnosticCard's fluid-clamp treatment, extracted for the same reason as
 * `card-surface`: both cards' headings are Figma's same 26px/31px-leading
 * type and both bodies the same 18px/31px-leading type, so the same
 * floor-at-`lg`, scale-with-viewport, cap-at-1440px clamp() keeps this
 * heading's line break matching Figma's (see DiagnosticCard's comment for
 * the derivation).
 */
export default function FeaturedArticle() {
  const { article } = featuredArticle;

  return (
    <section aria-labelledby="featured-article-heading" className="relative pb-10 lg:pb-[45px]">
      <Container>
        <div className="card-surface lg:aspect-[1119/401] lg:items-stretch lg:justify-center lg:px-[2.368%] lg:pt-[1.966%] lg:pb-[3.485%]">
          <SectionHeading id="featured-article-heading" className="lg:mb-[0.268%]">
            {featuredArticle.heading}
          </SectionHeading>

          <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-center lg:gap-0">
            <div className="relative aspect-[389/303] w-full max-w-sm shrink-0 overflow-hidden rounded-[24px] bg-art-panel lg:w-[34.763%] lg:max-w-none">
              <FeaturedArticleArt className="absolute inset-0 size-full" />
            </div>

            <div className="flex flex-col items-center gap-4 lg:flex-1 lg:items-start lg:gap-[17px] lg:pl-[5.95%]">
              <Badge variant="lilac">{article.category}</Badge>
              <div className="flex flex-col gap-3 lg:gap-[15px]">
                <h3 className="card-heading max-w-md lg:max-w-none">{article.title}</h3>
                <p className="card-body max-w-md lg:max-w-[589px]">{article.excerpt}</p>
              </div>
              <RoundArrowLink
                href={article.href}
                aria-label={featuredArticle.readMoreLabel(article.title)}
                className="self-end"
              />
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
