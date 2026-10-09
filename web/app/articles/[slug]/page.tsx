import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleBody } from "@/components/article/ArticleBody";
import Header from "@/components/layout/Header";
import CategoryPills from "@/components/sections/CategoryPills";
import LandingScene from "@/components/sections/LandingScene";
import Container from "@/components/ui/Container";
import { fetchPublicArticle } from "@/lib/api/server/publicArticle";
import { categoryByApiValue, landingNav } from "@/lib/content";

// Reading page for a Published Article — Figma frame 70:9243 (file
// ahVCzzSLccRd0vOVLFiEKg). Chrome (sky/hills, nav, Category pills) is the
// landing page's. The card is the frame's "Setup card" (70:9449): 32px
// radius, 48px padding, 20px between the title and each Block. No date,
// reading time, Category badge, excerpt or Thumbnail here.
//
// Two parts of the frame are left out on purpose: the Collections heading
// above the card (70:9448, a copy-paste leftover) and the blurred/locked
// "Онцлох нийтлэл" / "Түгжээг тайлах" block (70:9473–70:9494) — every
// parent reads the whole Body.
export async function generateMetadata({ params }: PageProps<"/articles/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const article = await fetchPublicArticle(slug);
  if (!article) return {};
  const { title, excerpt, thumbnail } = article;
  // Open Graph and Twitter don't inherit each other's image, so both get it.
  const images = thumbnail
    ? [{ url: thumbnail.src, width: thumbnail.width ?? undefined, height: thumbnail.height ?? undefined, alt: thumbnail.alt ?? undefined }]
    : undefined;
  return {
    title,
    description: excerpt ?? undefined,
    openGraph: { title, description: excerpt ?? undefined, images },
    twitter: { card: images ? "summary_large_image" : "summary", title, description: excerpt ?? undefined, images },
  };
}

export default async function ArticlePage({ params }: PageProps<"/articles/[slug]">) {
  const { slug } = await params;
  const article = await fetchPublicArticle(slug);
  if (!article) notFound();

  return (
    <div className="relative isolate min-h-dvh">
      <LandingScene />
      {/* The nav's #top link targets the landing sections, so resolve it there. */}
      <Header basePath="/" links={landingNav.links} variant="spacious" />
      <main id="main" className="relative">
        <CategoryPills current={categoryByApiValue[article.category]} />
        <Container className="pb-16">
          <article className="flex flex-col gap-5 rounded-card bg-article-card p-6 shadow-setup-card sm:p-12">
            {/* 70:9451 — Comic Relief Bold in Figma, set in Nunito (web/AGENTS.md). */}
            <h1 className="text-center text-[28px] font-bold text-article-heading sm:text-4xl">{article.title}</h1>
            <ArticleBody blocks={article.body} />
          </article>
        </Container>
      </main>
    </div>
  );
}
