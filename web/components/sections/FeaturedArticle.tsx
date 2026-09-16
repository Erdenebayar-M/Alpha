import Badge from "@/components/ui/Badge";
import Container from "@/components/ui/Container";
import FeaturedArticleArt from "@/components/sections/FeaturedArticleArt";
import RoundArrowLink from "@/components/ui/RoundArrowLink";
import SectionHeading from "@/components/ui/SectionHeading";
import { featuredArticle } from "@/lib/content";

/**
 * /landing-new's Featured article (Figma node 1401:22062, "Онцлох нийтлэл
 * групп"), directly under the Diagnostic card: the section heading, then a
 * card with the illustration on the left and the Article's Category badge,
 * title, excerpt and arrow CTA on the right.
 *
 * The outer card uses the shared `card-surface` utility (globals.css) —
 * DiagnosticCard's own gradient/radius/padding treatment, extracted there
 * once this became its second verbatim copy. This card adds its own
 * `aspect-[1119/401]`-from-width (see DiagnosticCard's comment for why an
 * aspect ratio rather than a literal height) and `lg:flex-row` — a real row,
 * unlike DiagnosticCard's `lg:items-stretch` (its mascot is an absolute
 * overlay, not a flex sibling). Figma centres the illustration panel + text
 * row inside 40px of padding, but that row (389 + 677 = 1066px) is wider
 * than the padded box (1119 - 2*40 = 1039px) — the overflow is absorbed
 * symmetrically by centring, landing the real inset at 26.5px each side
 * (1119 - 2*26.5 = 1066) with zero gap between the panel and the text
 * column. `px-[2.368%]` (26.5/1119) reproduces that directly instead of
 * re-deriving it from the nominal-but-overflowing 40px padding.
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
        <SectionHeading id="featured-article-heading" className="mb-6 lg:mb-[22px]">
          {featuredArticle.heading}
        </SectionHeading>

        <div className="card-surface lg:aspect-[1119/401] lg:flex-row lg:items-center lg:px-[2.368%] lg:py-0">
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
      </Container>
    </section>
  );
}
