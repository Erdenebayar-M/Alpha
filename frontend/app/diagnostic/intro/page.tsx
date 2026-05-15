'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { clientFetch } from '@/lib/api/client';
import { MobileShell } from '@/components/figma/MobileShell';

const PHASES = [
  { label: 'A хэсэг', desc: '8 даалгавар — Ерөнхий түвшин тодорхойлох', icon: '📝' },
  { label: 'B хэсэг', desc: '8 даалгавар — Дэлгэрэнгүй дүн шинжилгээ', icon: '🔍' },
  { label: 'C хэсэг', desc: '4 даалгавар — Түвшин баталгаажуулах', icon: '✅' },
];

export default function DiagnosticIntroPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const learnerId = searchParams.get('learner_id') ?? '';
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!learnerId) router.replace('/dashboard');
  }, [learnerId, router]);

  async function handleStart() {
    if (!learnerId) return;
    setStarting(true);
    setError('');
    try {
      const data = await clientFetch<{ session_id: string; tasks: unknown[] }>('/api/diagnostic/start', {
        method: 'POST',
        body: JSON.stringify({ learner_id: learnerId }),
      });
      // Store phase A tasks so session page can use them without re-fetching
      sessionStorage.setItem(`diag_tasks_${data.session_id}`, JSON.stringify(data.tasks));
      router.push(`/diagnostic/session?session_id=${data.session_id}&learner_id=${learnerId}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '';
      setError(msg.includes('already') ? 'Оношилгоо хийгдэж байна' : 'Оношилгоо эхлүүлэхэд алдаа гарлаа');
      setStarting(false);
    }
  }

  return (
    <MobileShell>
      {/* Header */}
      <header
        style={{
          padding: '20px 20px 16px',
          background: 'white',
          borderBottom: '1px solid #E9F1FF',
          flexShrink: 0,
        }}
      >
        <button
          onClick={() => router.push('/dashboard')}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px 0',
            fontFamily: 'var(--font-jakarta), "Plus Jakarta Sans", sans-serif',
            fontSize: '14px',
            color: '#405E7E',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          ← Буцах
        </button>
      </header>

      {/* Body */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          padding: '24px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div style={{ textAlign: 'center', paddingBottom: '8px' }}>
          <div style={{ fontSize: '52px', marginBottom: '12px' }}>📊</div>
          <h1
            style={{
              fontFamily: 'var(--font-nunito), "Nunito Sans", sans-serif',
              fontWeight: 800,
              fontSize: '26px',
              color: '#01618F',
              margin: '0 0 8px',
            }}
          >
            Оношилгоо
          </h1>
          <p
            style={{
              fontFamily: 'var(--font-jakarta), "Plus Jakarta Sans", sans-serif',
              fontSize: '14px',
              color: '#405E7E',
              margin: 0,
              lineHeight: '1.6',
            }}
          >
            Хүүхдийн зөв бичих чадварыг тодорхойлж, тохирсон сургалтын төлөвлөгөө гаргана
          </p>
        </div>

        <div
          style={{
            background: 'white',
            borderRadius: '20px',
            padding: '20px',
            border: '1px solid #E9F1FF',
            boxShadow: '0 2px 10px rgba(1,97,143,0.05)',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-jakarta), "Plus Jakarta Sans", sans-serif',
              fontWeight: 700,
              fontSize: '13px',
              color: '#7A9BB5',
              margin: '0 0 14px',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            Оношилгооны бүтэц
          </p>
          {PHASES.map((p, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start',
                padding: '10px 0',
                borderBottom: i < PHASES.length - 1 ? '1px solid #F0F5FF' : 'none',
              }}
            >
              <span style={{ fontSize: '20px', flexShrink: 0 }}>{p.icon}</span>
              <div>
                <p
                  style={{
                    fontFamily: 'var(--font-nunito), "Nunito Sans", sans-serif',
                    fontWeight: 800,
                    fontSize: '14px',
                    color: '#01618F',
                    margin: '0 0 2px',
                  }}
                >
                  {p.label}
                </p>
                <p
                  style={{
                    fontFamily: 'var(--font-jakarta), "Plus Jakarta Sans", sans-serif',
                    fontSize: '12px',
                    color: '#7A9BB5',
                    margin: 0,
                  }}
                >
                  {p.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            display: 'flex',
            gap: '12px',
            padding: '14px 16px',
            borderRadius: '14px',
            background: '#F3F6FF',
            border: '1px solid #E2EAFF',
          }}
        >
          <span style={{ fontSize: '18px' }}>⏱️</span>
          <p
            style={{
              fontFamily: 'var(--font-jakarta), "Plus Jakarta Sans", sans-serif',
              fontSize: '13px',
              color: '#405E7E',
              margin: 0,
              lineHeight: '1.5',
            }}
          >
            Нийт <strong>20 даалгавар</strong>, ойролцоогоор <strong>10–15 минут</strong> зарцуулна
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '12px',
              background: 'rgba(251,81,81,0.08)',
              border: '1px solid rgba(251,81,81,0.25)',
              color: '#C53030',
              fontFamily: 'var(--font-jakarta), "Plus Jakarta Sans", sans-serif',
              fontSize: '14px',
              textAlign: 'center',
            }}
          >
            {error}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ flexShrink: 0, padding: '12px 20px 24px' }}>
        <button
          onClick={handleStart}
          disabled={starting}
          style={{
            width: '100%',
            padding: '18px',
            borderRadius: '9999px',
            border: 'none',
            background: starting ? '#A0C4D8' : 'linear-gradient(135deg, #01618F, #31B2FB)',
            color: 'white',
            fontFamily: 'var(--font-nunito), "Nunito Sans", sans-serif',
            fontWeight: 800,
            fontSize: '18px',
            cursor: starting ? 'not-allowed' : 'pointer',
            boxShadow: starting ? 'none' : '0 6px 20px rgba(1,97,143,0.3)',
            transition: 'all 0.2s',
          }}
        >
          {starting ? 'Эхлүүлж байна...' : 'Оношилгоо эхлэх'}
        </button>
      </div>
    </MobileShell>
  );
}
