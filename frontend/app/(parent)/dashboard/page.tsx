import { serverFetch } from '@/lib/api/server';
import Link from 'next/link';
import { LearnerGrid, type Learner } from './LearnerGrid';

interface LearnersResponse {
  learners: Learner[];
}

export default async function DashboardPage() {
  let learners: Learner[] = [];
  try {
    const data = await serverFetch<LearnersResponse>('/api/learner');
    learners = data.learners;
  } catch {
    // show empty state
  }

  return (
    <div style={{ padding: '32px 24px', maxWidth: '900px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '28px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: 'var(--font-nunito), "Nunito Sans", sans-serif',
              fontWeight: 800,
              fontSize: '24px',
              color: '#01618F',
              margin: 0,
            }}
          >
            Миний хүүхдүүд
          </h1>
          <p
            style={{
              fontFamily: 'var(--font-jakarta), "Plus Jakarta Sans", sans-serif',
              fontSize: '14px',
              color: '#7A9BB5',
              margin: '4px 0 0',
            }}
          >
            {learners.length} хүүхдийн мэдээлэл
          </p>
        </div>
        <Link
          href="/learner/new"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            borderRadius: '9999px',
            background: '#01618F',
            color: 'white',
            fontFamily: 'var(--font-nunito), "Nunito Sans", sans-serif',
            fontWeight: 800,
            fontSize: '14px',
            textDecoration: 'none',
          }}
        >
          + Хүүхэд нэмэх
        </Link>
      </div>

      {learners.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '64px 32px',
            background: 'white',
            borderRadius: '24px',
            border: '2px dashed #E9F1FF',
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>👦</div>
          <p
            style={{
              fontFamily: 'var(--font-nunito), "Nunito Sans", sans-serif',
              fontWeight: 800,
              fontSize: '20px',
              color: '#01618F',
              margin: '0 0 8px',
            }}
          >
            Хүүхэд бүртгэлгүй байна
          </p>
          <p
            style={{
              fontFamily: 'var(--font-jakarta), "Plus Jakarta Sans", sans-serif',
              fontSize: '14px',
              color: '#7A9BB5',
              margin: '0 0 24px',
            }}
          >
            Хүүхэдээ нэмж оношилгоог эхлүүлнэ үү
          </p>
          <Link
            href="/learner/new"
            style={{
              display: 'inline-block',
              padding: '14px 28px',
              borderRadius: '9999px',
              background: '#01618F',
              color: 'white',
              fontFamily: 'var(--font-nunito), "Nunito Sans", sans-serif',
              fontWeight: 800,
              fontSize: '15px',
              textDecoration: 'none',
            }}
          >
            Хүүхэд нэмэх
          </Link>
        </div>
      ) : (
        <LearnerGrid learners={learners} />
      )}
    </div>
  );
}
