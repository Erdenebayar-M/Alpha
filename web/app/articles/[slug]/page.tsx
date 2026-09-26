import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleBody } from "@/components/article/ArticleBody";
import { fetchPublicArticle } from "@/lib/api/server/publicArticle";

// Reading page for a Published Article. The card is deliberately plain white
// (Figma frame 1422:6961) and renders the Body with ArticleBody's own styles.
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
    <main id="main" className="min-h-dvh bg-surface-page px-4 py-10">
      <article className="mx-auto flex max-w-[1000px] flex-col gap-6 rounded-3xl bg-surface p-6 sm:p-10">
        <h1 className="text-center text-3xl font-extrabold text-text-navy">{article.title}</h1>
        <ArticleBody blocks={article.body} />
      </article>
    </main>
  );
}
