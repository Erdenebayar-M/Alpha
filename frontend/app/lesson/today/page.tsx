'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { clientFetch } from '@/lib/api/client';
import { MobileShell } from '@/components/figma/MobileShell';
import Link from 'next/link';

interface LessonTask {
  id: string;
  task_type: string;
  title: string;
  primary_skill: string;
  estimated_time_seconds: number;
}

interface LessonData {
  id: string;
  status: string;
  scheduled_date: string;
  focus_skill: string;
  tasks: LessonTask[];
}

interface TodayResponse {
  lesson: LessonData;
}

const SKILL_LABEL: Record<string, string> = {
  S1: 'Үсэг-авиа ялгалт',
  S2: 'Үгийн зөв бичлэг',
  S3: 'Урт/богино эгшиг',
  S4: 'Балархай эгшиг',
  S5: 'Залгавар/нөхцөл',
  S6: 'Өгүүлбэрийн тэмдэглэгээ',
  S7: 'Сонсголоор буулгах',
  S8: 'Алдаа засах',
};

const P = {
  nunito: 'var(--font-nunito), "Nunito Sans", sans-serif',
  jakarta: 'var(--font-jakarta), "Plus Jakarta Sans", sans-serif',
};

export default function LessonTodayPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const learnerId = searchParams.get('learner_id') ?? '';

  const [lesson, setLesson] = useState<LessonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [noLesson, setNoLesson] = useState(false);

  useEffect(() => {
    if (!learnerId) { router.replace('/dashboard'); return; }
    clientFetch<TodayResponse>(`/api/lesson/today?learner_id=${learnerId}`)
      .then((data) => { setLesson(data.lesson); setLoading(false); })
      .catch((e) => {
        if (e?.code === 'NO_LESSON_TODAY') setNoLesson(true);
        else setNoLesson(true);
        setLoading(false);
      });
  }, [learnerId, router]);

  const estimatedMin = lesson
    ? Math.ceil(lesson.tasks.reduce((s, t) => s + t.estimated_time_seconds, 0) / 60)
    : 0;

  const focusLabel = lesson?.focus_skill ? (SKILL_LABEL[lesson.focus_skill] ?? lesson.focus_skill) : '';

  const today = new Date();
  const dateStr = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;

  return (
    <MobileShell>
      {/* Header */}
      <header
        style={{
          padding: '16px 20px',
          background: 'white',
          borderBottom: '1px solid #E9F1FF',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <button
          onClick={() => router.push('/dashboard')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: P.jakarta, fontSize: '14px', color: '#405E7E', display: 'flex', alignItems: 'center', gap: '4px', padding: 0 }}
        >
          ← Буцах
        </button>
        <p style={{ margin: 0, fontFamily: P.nunito, fontWeight: 800, fontSize: '16px', color: '#01618F' }}>
          Өнөөдрийн хичээл
        </p>
        <div style={{ width: '60px' }} />
      </header>

      {/* Body */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        {loading ? (
          <div style={{ textAlign: 'center', paddingTop: '60px' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>⏳</div>
            <p style={{ fontFamily: P.jakarta, color: '#405E7E' }}>Хичээл ачаалж байна...</p>
          </div>
        ) : noLesson ? (
          <div style={{ textAlign: 'center', paddingTop: '40px', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
            <div style={{ fontSize: '48px' }}>📅</div>
            <p style={{ fontFamily: P.nunito, fontWeight: 800, fontSize: '20px', color: '#01618F', margin: 0 }}>
              Өнөөдрийн хичээл байхгүй
            </p>
            <p style={{ fontFamily: P.jakarta, fontSize: '14px', color: '#7A9BB5', margin: 0, lineHeight: '1.5' }}>
              Сургалтын төлөвлөгөөг эхлүүлэхийн тулд оношилгоог дуусгана уу
            </p>
            <Link
              href={`/diagnostic/intro?learner_id=${learnerId}`}
              style={{
                padding: '14px 24px',
                borderRadius: '9999px',
                background: '#01618F',
                color: 'white',
                fontFamily: P.nunito,
                fontWeight: 800,
                fontSize: '15px',
                textDecoration: 'none',
              }}
            >
              Оношилгоо авах
            </Link>
          </div>
        ) : lesson ? (
          <>
            {/* Date */}
            <p style={{ margin: 0, fontFamily: P.jakarta, fontSize: '13px', color: '#7A9BB5' }}>
              {dateStr}
            </p>

            {/* Main lesson card */}
            <div
              style={{
                background: 'linear-gradient(135deg, #01618F, #31B2FB)',
                borderRadius: '24px',
                padding: '24px',
                color: 'white',
                boxShadow: '0 8px 24px rgba(1,97,143,0.3)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <span style={{ fontSize: '24px' }}>📚</span>
                <p style={{ margin: 0, fontFamily: P.nunito, fontWeight: 800, fontSize: '18px' }}>
                  Өнөөдрийн хичээл
                </p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {[
                  { label: 'Даалгавар', value: `${lesson.tasks.length}ш` },
                  { label: 'Хугацаа', value: `~${estimatedMin} мин` },
                  ...(focusLabel ? [{ label: 'Анхаарах чадвар', value: focusLabel }] : []),
                ].map(({ label, value }) => (
                  <div key={label} style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '12px', padding: '12px' }}>
                    <p style={{ margin: '0 0 2px', fontFamily: P.jakarta, fontSize: '11px', opacity: 0.8 }}>{label}</p>
                    <p style={{ margin: 0, fontFamily: P.nunito, fontWeight: 800, fontSize: '15px' }}>{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Task list preview */}
            <div
              style={{
                background: 'white',
                borderRadius: '20px',
                padding: '20px',
                border: '1px solid #E9F1FF',
                boxShadow: '0 2px 10px rgba(1,97,143,0.05)',
              }}
            >
              <p style={{ margin: '0 0 12px', fontFamily: P.nunito, fontWeight: 800, fontSize: '15px', color: '#01618F' }}>
                Даалгавруудын жагсаалт
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {lesson.tasks.map((t, i) => (
                  <div
                    key={t.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      background: '#F7FAFF',
                    }}
                  >
                    <span style={{ fontFamily: P.nunito, fontWeight: 800, fontSize: '13px', color: '#31B2FB', minWidth: '20px' }}>
                      {i + 1}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontFamily: P.jakarta, fontWeight: 600, fontSize: '13px', color: '#405E7E', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {t.title}
                      </p>
                      <p style={{ margin: 0, fontFamily: P.jakarta, fontSize: '11px', color: '#7A9BB5' }}>
                        {t.primary_skill} · {Math.round(t.estimated_time_seconds / 60)} мин
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : null}
      </div>

      {/* Footer */}
      {lesson && (
        <div style={{ flexShrink: 0, padding: '12px 20px 24px' }}>
          <Link
            href={`/lesson/session?lesson_id=${lesson.id}&learner_id=${learnerId}`}
            style={{
              display: 'block',
              textAlign: 'center',
              padding: '18px',
              borderRadius: '9999px',
              background: 'linear-gradient(135deg, #01618F, #31B2FB)',
              color: 'white',
              fontFamily: P.nunito,
              fontWeight: 800,
              fontSize: '18px',
              textDecoration: 'none',
              boxShadow: '0 6px 20px rgba(1,97,143,0.3)',
            }}
          >
            Хичээлийг эхлэх →
          </Link>
        </div>
      )}
    </MobileShell>
  );
}
