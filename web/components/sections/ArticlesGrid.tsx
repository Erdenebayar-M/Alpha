import Reveal from "@/components/animations/Reveal";
import { revealItem } from "@/components/animations/revealItem";
import ArticleCard, { type ArticleCardArt } from "@/components/ui/ArticleCard";
import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";
import type { ArticleSummary } from "@/lib/api/server/publicArticles";
import { articlesGrid, type ArticleCategoryValue } from "@/lib/content";

// Per-Category fallback art (asset paths + geometry) for an Article without a
// Thumbnail — not copy, so it's kept here rather than in lib/content.ts. Keyed
// by Category so an Article's scene is stable. The READING scene is the green
// Khishigee export, taller (321x196) than the other two (321x185, see
// ArticleCard's own comment for why all are flattened exports); only it
// carries the two flower pairs Figma places outside its exported scene.
const art: Record<ArticleCategoryValue, ArticleCardArt> = {
  READING: {
    scene: { src: "/images/landing/article-card-1-scene.svg", width: 321, height: 196 },
    flowers: [
      { src: "/images/landing/article-card-1-flower-left.svg", box: { x: 67, y: 205, width: 34, height: 41.547 } },
      { src: "/images/landing/article-card-1-flower-right.svg", box: { x: 236, y: 224, width: 34, height: 41.552 } },
    ],
  },
  ORTHOGRAPHY: { scene: { src: "/images/landing/article-card-2-scene.svg", width: 321, height: 185 } },
  SPELLING: { scene: { src: "/images/landing/article-card-3-scene.svg", width: 321, height: 185 } },
};

/**
  * The homepage's Articles-for-parents grid (Figma node 1371:9792,
 * "Эцэг эхчүүдэд туслах нийтлэлүүд"), directly under the Featured article —
 * up to three more Articles for parents to browse (see web/CONTEXT.md's
 * Article entry). One `ArticleCard` component, one card per Article from a
 * single map, per the root "don't hand-write the same structure twice" rule.
 * With no Articles the section is left out.
 *
 * Figma has no mobile frame for this row; below `lg` the cards stack full-
 * width in a single column rather than the 3-up row, matching the pattern
 * every other homepage section uses.
 */
export default function ArticlesGrid({ articles }: { articles: readonly ArticleSummary[] }) {
  if (articles.length === 0) return null;

  return (
    <section aria-labelledby="articles-grid-heading" className="landing-section-gap-b">
      <Reveal mode="sequence">
        <Container className="flex flex-col gap-6 lg:gap-[30px]">
          <div {...revealItem("fade", 0)}>
            <SectionHeading id="articles-grid-heading">{articlesGrid.heading}</SectionHeading>
          </div>

          <div className="flex flex-col gap-5 lg:flex-row lg:gap-[20px]">
            {articles.map((article, index) => (
              // `flex w-full` lets the card's own `w-full` keep sizing it against the row.
              <div key={article.slug} className="flex w-full" {...revealItem("slide", index + 1)}>
                <ArticleCard article={article} art={art[article.category]} />
              </div>
            ))}
          </div>
        </Container>
      </Reveal>
    </section>
  );
}
