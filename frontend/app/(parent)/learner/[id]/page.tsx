'use client';

import { useQuery } from '@tanstack/react-query';
import { clientFetch } from '@/lib/api/client';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface SkillState {
  general_level: string;
  current_streak: number;
  longest_streak: number;
  s1_score: number;
  s2_score: number;
  s3_score: number;
  s4_score: number;
  s5_score: number;
  s6_score: number;
  s7_score: number;
  s8_score: number;
  s1_level: string;
  s2_level: string;
  s3_level: string;
  s4_level: string;
  s5_level: string;
  s6_level: string;
  s7_level: string;
  s8_level: string;
  top_error_codes: string[];
  weak_skills: string[];
}

interface LearnerDetail {
  id: string;
  name: string;
  grade: number;
  variant: string;
  daily_minutes: number;
  skill_state: SkillState | null;
}

const SKILLS = [
  { key: 's1', label: 'Үсэг-авиа ялгалт' },
  { key: 's2', label: 'Үгийн зөв бичлэг' },
  { key: 's3', label: 'Урт/богино эгшиг' },
  { key: 's4', label: 'Балархай эгшиг' },
  { key: 's5', label: 'Залгавар/нөхцөл' },
  { key: 's6', label: 'Өгүүлбэрийн тэмдэглэгээ' },
  { key: 's7', label: 'Сонсголоор буулгах' },
  { key: 's8', label: 'Алдаа засах' },
] as const;

const LEVEL_COLOR: Record<string, string> = {
  M0: '#9CA3AF', M1: '#60A5FA', M2: '#34D399',
  M3: '#FBBF24', M4: '#F97316', M5: '#8B5CF6',
};

function SkeletonBar() {
  return (
    <div
      style={{
        height: '16px',
        borderRadius: '8px',
        background: 'linear-gradient(90deg, #F0F5FF 25%, #E2EAFB 50%, #F0F5FF 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite',
      }}
    />
  );
}

export default function LearnerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data, isLoading, error } = useQuery({
    queryKey: ['learner', id],
    queryFn: () => clientFetch<LearnerDetail>(`/api/learner/${id}`),
    enabled: !!id,
  });

  const level = data?.skill_state?.general_level ?? 'M0';
  const levelColor = LEVEL_COLOR[level] ?? '#9CA3AF';

  if (error) {
    return (
      <div style={{ padding: '32px 24px', textAlign: 'center' }}>
        <p style={{ color: '#FB5151', fontFamily: 'var(--font-jakarta), "Plus Jakarta Sans", sans-serif' }}>
          Мэдээлэл ачаалахад алдаа гарлаа
        </p>
        <button onClick={() => router.back()} style={{ marginTop: '16px', padding: '10px 20px', borderRadius: '12px', border: 'none', background: '#01618F', color: 'white', cursor: 'pointer', fontFamily: 'var(--font-nunito), "Nunito Sans", sans-serif', fontWeight: 700 }}>
          Буцах
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px 24px', maxWidth: '800px' }}>
      <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>

      {/* Back + header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button
          onClick={() => router.push('/dashboard')}
          style={{ padding: '8px', borderRadius: '10px', border: '1px solid #E9F1FF', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        >
          <ArrowLeft size={18} color="#405E7E" />
        </button>
        <div>
          <h1 style={{ fontFamily: 'var(--font-nunito), "Nunito Sans", sans-serif', fontWeight: 800, fontSize: '22px', color: '#01618F', margin: 0 }}>
            {isLoading ? '...' : data?.name}
          </h1>
          <p style={{ fontFamily: 'var(--font-jakarta), "Plus Jakarta Sans", sans-serif', fontSize: '13px', color: '#7A9BB5', margin: 0 }}>
            {data ? `${data.grade}-р анги · ${data.daily_minutes} мин/өдөр` : ''}
          </p>
        </div>
      </div>

      {/* Top cards row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Түвшин', value: isLoading ? '...' : level, color: levelColor },
          { label: 'Дараалал', value: isLoading ? '...' : `${data?.skill_state?.current_streak ?? 0}🔥`, color: '#F97316' },
          { label: 'Хамгийн урт', value: isLoading ? '...' : `${data?.skill_state?.longest_streak ?? 0} өдөр`, color: '#01618F' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: 'white', borderRadius: '16px', padding: '16px 20px', border: '1px solid #E9F1FF', boxShadow: '0 2px 8px rgba(1,97,143,0.05)' }}>
            <p style={{ margin: '0 0 4px', fontFamily: 'var(--font-jakarta), "Plus Jakarta Sans", sans-serif', fontSize: '12px', color: '#7A9BB5' }}>{label}</p>
            <p style={{ margin: 0, fontFamily: 'var(--font-nunito), "Nunito Sans", sans-serif', fontWeight: 800, fontSize: '22px', color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Skills breakdown */}
      <div style={{ background: 'white', borderRadius: '20px', padding: '24px', border: '1px solid #E9F1FF', boxShadow: '0 2px 12px rgba(1,97,143,0.06)', marginBottom: '16px' }}>
        <h2 style={{ fontFamily: 'var(--font-nunito), "Nunito Sans", sans-serif', fontWeight: 800, fontSize: '17px', color: '#01618F', margin: '0 0 20px' }}>
          Чадварын хэмжилт (S1–S8)
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {SKILLS.map(({ key, label }) => {
            const scoreKey = `${key}_score` as keyof SkillState;
            const score = (data?.skill_state?.[scoreKey] as number) ?? 0;
            const pct = Math.round(score * 100);

            return (
              <div key={key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontFamily: 'var(--font-jakarta), "Plus Jakarta Sans", sans-serif', fontSize: '13px', color: '#405E7E', fontWeight: 600 }}>
                    {key.toUpperCase()} · {label}
                  </span>
                  <span style={{ fontFamily: 'var(--font-nunito), "Nunito Sans", sans-serif', fontSize: '13px', fontWeight: 800, color: pct >= 70 ? '#34D399' : pct >= 40 ? '#FBBF24' : '#FB5151' }}>
                    {isLoading ? '—' : `${pct}%`}
                  </span>
                </div>
                {isLoading ? (
                  <SkeletonBar />
                ) : (
                  <div style={{ height: '8px', borderRadius: '9999px', background: '#F0F5FF', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        borderRadius: '9999px',
                        width: `${pct}%`,
                        background: pct >= 70 ? '#34D399' : pct >= 40 ? '#FBBF24' : '#FB5151',
                        transition: 'width 0.6s ease',
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Top errors */}
      {(data?.skill_state?.top_error_codes?.length ?? 0) > 0 && (
        <div style={{ background: 'white', borderRadius: '20px', padding: '24px', border: '1px solid #E9F1FF', boxShadow: '0 2px 12px rgba(1,97,143,0.06)', marginBottom: '16px' }}>
          <h2 style={{ fontFamily: 'var(--font-nunito), "Nunito Sans", sans-serif', fontWeight: 800, fontSize: '17px', color: '#01618F', margin: '0 0 16px' }}>
            Давтагдах алдаанууд
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {data!.skill_state!.top_error_codes.map((code) => (
              <span
                key={code}
                style={{
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  background: 'rgba(251,81,81,0.09)',
                  border: '1px solid rgba(251,81,81,0.22)',
                  fontFamily: 'var(--font-nunito), "Nunito Sans", sans-serif',
                  fontWeight: 800,
                  fontSize: '13px',
                  color: '#C53030',
                }}
              >
                {code}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      <Link
        href={`/diagnostic/intro?learner_id=${id}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
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
        Оношилгоо дахин авах →
      </Link>
    </div>
  );
}
