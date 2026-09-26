import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleBody } from "@/components/article/ArticleBody";
import Header from "@/components/layout/Header";
import CategoryPills from "@/components/sections/CategoryPills";
import LandingScene from "@/components/sections/LandingScene";
import Container from "@/components/ui/Container";
import { fetchPublicArticle } from "@/lib/api/server/publicArticle";
import { categoryByApiValue, landingNav } from "@/lib/content";

// Reading page for a Published Article. Chrome (sky/hills, nav, Category
// pills) is the landing page's, per Figma frame 1422:6961; the card is
// deliberately plain white and renders the Body with ArticleBody's own
// styles. No date, reading time, Category badge, excerpt or Thumbnail here.
export async function generateMetadata({ params }: PageProps<"/articles/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const article = await fetchPublicArticle(slug);
  return article ? { title: article.title } : {};
}

export default async function ArticlePage({ params }: PageProps<"/articles/[slug]">) {
  const { slug } = await params;
  const article = await fetchPublicArticle(slug);
  if (!article) notFound();

  return (
    <div className="relative isolate min-h-dvh">
      <LandingScene />
      {/* The nav's #top links target the landing sections, so resolve them there. */}
      <Header basePath="/landing-new" links={landingNav.links} variant="spacious" />
      <main id="main" className="relative">
        <CategoryPills current={categoryByApiValue[article.category]} />
        <Container className="pb-16">
          <article className="flex flex-col gap-6 rounded-3xl bg-surface p-6 sm:p-10">
            <h1 className="text-center text-3xl font-extrabold text-text-navy">{article.title}</h1>
            <ArticleBody blocks={article.body} />
          </article>
        </Container>
      </main>
    </div>
  );
}
