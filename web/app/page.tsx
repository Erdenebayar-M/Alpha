import Header from "@/components/layout/Header";
import ArticlesGrid from "@/components/sections/ArticlesGrid";
import CategoryPills from "@/components/sections/CategoryPills";
import CollectionsRow from "@/components/sections/CollectionsRow";
import DiagnosticCard from "@/components/sections/DiagnosticCard";
import FeaturedArticle from "@/components/sections/FeaturedArticle";
import LandingHero from "@/components/sections/LandingHero";
import LandingScene from "@/components/sections/LandingScene";
import { fetchFeaturedArticle, fetchLatestArticles } from "@/lib/api/server/publicArticles";
import { landingNav } from "@/lib/content";

// How many Articles the Articles-for-parents grid shows at most.
const GRID_SIZE = 3;

// Parents' landing page (Figma frame 1360:8561).
export default async function Home() {
  // Null both when nothing is Featured and when the backend can't be reached
  // (logged by the fetcher) — either way the section is left out.
  // The grid never repeats the Featured Article; an empty list hides it.
  const [featured, latest] = await Promise.all([fetchFeaturedArticle(), fetchLatestArticles(GRID_SIZE)]);

  return (
    // Reserves the design's full 2706px height at `lg`+. No `overflow` here:
    // the horizontal guard lives on `html` (see HeroScene).
    <div className="relative isolate min-h-dvh lg:min-h-[2706px]">
      <LandingScene />
      <Header links={landingNav.links} variant="spacious" activeHref="#top" />
      <main id="main" className="relative">
        <LandingHero />
        <CategoryPills />
        <DiagnosticCard />
        {featured && <FeaturedArticle article={featured} />}
        <ArticlesGrid articles={latest} />
        <CollectionsRow />
      </main>
    </div>
  );
}
