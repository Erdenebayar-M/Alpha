import { adminFetch } from '@/lib/api/adminFetch';
import WordsClient, { type Word, type WordMeta, type WordFacets } from './WordsClient';

interface WordsApiResponse {
  words: Word[];
  total: number;
  meta: WordMeta;
}

interface PageProps {
  searchParams: Promise<{
    grade?: string;
    category?: string;
    q?: string;
    page?: string;
  }>;
}

export default async function WordsPage({ searchParams }: PageProps) {
  const { grade, category, q, page = '1' } = await searchParams;

  const qs = new URLSearchParams({ page, per_page: '50' });
  if (grade) qs.set('grade', grade);
  if (category) qs.set('category', category);
  if (q) qs.set('q', q);

  let wordsData: WordsApiResponse | null = null;
  let facets: WordFacets | null = null;
  let fetchError: string | null = null;

  try {
    [wordsData, facets] = await Promise.all([
      adminFetch<WordsApiResponse>(`/api/admin/content/words?${qs}`),
      adminFetch<WordFacets>('/api/admin/content/words/facets'),
    ]);
  } catch (e) {
    fetchError = (e as Error).message;
  }

  if (fetchError || !wordsData || !facets) {
    return (
      <div
        style={{
          padding: '48px 24px',
          textAlign: 'center',
          color: '#FB5151',
          fontFamily: 'var(--font-geist-sans), sans-serif',
        }}
      >
        <p style={{ fontWeight: 600, marginBottom: 8 }}>Өгөгдөл ачаалахад алдаа гарлаа</p>
        <p style={{ fontSize: '13px', color: '#7A9BB5' }}>
          {fetchError ?? 'ADMIN_SECRET тохиргоог шалгана уу'}
        </p>
      </div>
    );
  }

  return (
    <WordsClient
      initialWords={wordsData.words}
      initialMeta={wordsData.meta}
      facets={facets}
      activeFilters={{ grade, category, q }}
    />
  );
}
