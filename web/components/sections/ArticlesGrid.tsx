import Reveal from "@/components/animations/Reveal";
import { revealItem } from "@/components/animations/revealItem";
import ArticleCard, { type ArticleCardArt } from "@/components/ui/ArticleCard";
import Container from "@/components/ui/Container";
import SectionHeading from "@/components/ui/SectionHeading";
import { articlesGrid } from "@/lib/content";

// Per-card art (asset paths + geometry) isn't copy, so it's kept here rather
// than in lib/content.ts — paired with articlesGrid.items by index, the same
// split FeaturedArticleArt draws between its own local Boxes and
// featuredArticle's copy. Card 1's green Khishigee export is taller
// (321x196) than cards 2/3's own exports (321x185, see ArticleCard's own
// comment for why all three are flattened exports); only card 1 carries the
// two flower pairs Figma places outside its exported scene.
//
// Typed as an exact 3-tuple, matching articlesGrid.items's own 3-tuple type
// (lib/content.ts) — the two are zipped by index below, so this is the
// other half of the compile-time tripwire that catches the two drifting out
// of sync (an added/removed card in one file without the other).
const art: readonly [ArticleCardArt, ArticleCardArt, ArticleCardArt] = [
  {
    scene: { src: "/images/landing/article-card-1-scene.svg", width: 321, height: 196 },
    flowers: [
      { src: "/images/landing/article-card-1-flower-left.svg", box: { x: 67, y: 205, width: 34, height: 41.547 } },
      { src: "/images/landing/article-card-1-flower-right.svg", box: { x: 236, y: 224, width: 34, height: 41.552 } },
    ],
  },
  { scene: { src: "/images/landing/article-card-2-scene.svg", width: 321, height: 185 } },
  { scene: { src: "/images/landing/article-card-3-scene.svg", width: 321, height: 185 } },
];

/**
 * /landing-new's Articles-for-parents grid (Figma node 1371:9792,
 * "Эцэг эхчүүдэд туслах нийтлэлүүд"), directly under the Featured article —
 * three more Article cards for parents to browse (see web/CONTEXT.md's
 * Article entry). One `ArticleCard` component, three cards from one data
 * array (`articlesGrid.items` zipped with the `art` config above), per the
 * root "don't hand-write the same structure twice" rule.
 *
 * Figma has no mobile frame for this row; below `lg` the cards stack full-
 * width in a single column rather than the 3-up row, matching the pattern
 * every other /landing-new section uses.
 */
export default function ArticlesGrid() {
  return (
    <section aria-labelledby="articles-grid-heading" className="landing-section-gap-b">
      <Reveal mode="sequence">
        <Container className="flex flex-col gap-6 lg:gap-[30px]">
          <div {...revealItem("fade", 0)}>
            <SectionHeading id="articles-grid-heading">{articlesGrid.heading}</SectionHeading>
          </div>

          <div className="flex flex-col gap-5 lg:flex-row lg:gap-[20px]">
            {articlesGrid.items.map((card, index) => (
              // `flex w-full` lets the card's own `w-full` keep sizing it against the row.
              <div key={index} className="flex w-full" {...revealItem("slide", index + 1)}>
                <ArticleCard card={card} art={art[index]} />
              </div>
            ))}
          </div>
        </Container>
      </Reveal>
    </section>
  );
}
