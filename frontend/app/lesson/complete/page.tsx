'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { MobileShell } from '@/components/figma/MobileShell';
import Link from 'next/link';

const P = {
  nunito: 'var(--font-nunito), "Nunito Sans", sans-serif',
  jakarta: 'var(--font-jakarta), "Plus Jakarta Sans", sans-serif',
};

export default function LessonCompletePage() {
  const searchParams = useSearchParams();
  const lessonId = searchParams.get('lesson_id') ?? '';
  const learnerId = searchParams.get('learner_id') ?? '';
  const count = Number(searchParams.get('count') ?? 0);

  const [show, setShow] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <MobileShell>
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px 24px',
          gap: '20px',
          overflowY: 'auto',
        }}
      >
        {/* Celebration */}
        <div
          style={{
            fontSize: '72px',
            transform: show ? 'scale(1)' : 'scale(0.4)',
            opacity: show ? 1 : 0,
            transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          }}
        >
          🎉
        </div>

        <div
          style={{
            textAlign: 'center',
            opacity: show ? 1 : 0,
            transform: show ? 'translateY(0)' : 'translateY(16px)',
            transition: 'all 0.4s ease 0.15s',
          }}
        >
          <p
            style={{
              fontFamily: P.nunito,
              fontWeight: 800,
              fontSize: '28px',
              color: '#01618F',
              margin: '0 0 8px',
            }}
          >
            Маш сайн!
          </p>
          <p
            style={{
              fontFamily: P.jakarta,
              fontSize: '15px',
              color: '#405E7E',
              margin: 0,
              lineHeight: '1.6',
            }}
          >
            Хичээлийг амжилттай дуусгалаа
          </p>
        </div>

        {/* Stats */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px',
            width: '100%',
            maxWidth: '320px',
            opacity: show ? 1 : 0,
            transition: 'opacity 0.4s ease 0.25s',
          }}
        >
          {[
            { emoji: '📝', label: 'Нийт даалгавар', value: `${count}ш` },
            { emoji: '🔥', label: 'Дараалал', value: '+1 өдөр' },
          ].map(({ emoji, label, value }) => (
            <div
              key={label}
              style={{
                background: 'white',
                borderRadius: '16px',
                padding: '16px',
                textAlign: 'center',
                border: '1px solid #E9F1FF',
                boxShadow: '0 2px 8px rgba(1,97,143,0.05)',
              }}
            >
              <div style={{ fontSize: '24px', marginBottom: '6px' }}>{emoji}</div>
              <p style={{ margin: '0 0 2px', fontFamily: P.nunito, fontWeight: 800, fontSize: '18px', color: '#01618F' }}>
                {value}
              </p>
              <p style={{ margin: 0, fontFamily: P.jakarta, fontSize: '11px', color: '#7A9BB5' }}>
                {label}
              </p>
            </div>
          ))}
        </div>

        {/* Message */}
        <div
          style={{
            background: 'linear-gradient(135deg, #F3F6FF, #EAF4FF)',
            borderRadius: '16px',
            padding: '16px 20px',
            textAlign: 'center',
            border: '1px solid #E2EAFF',
            width: '100%',
            maxWidth: '320px',
            opacity: show ? 1 : 0,
            transition: 'opacity 0.4s ease 0.3s',
          }}
        >
          <p style={{ margin: 0, fontFamily: P.jakarta, fontSize: '13px', color: '#405E7E', lineHeight: '1.5' }}>
            Дараагийн хичээл <strong>маргааш</strong> хүлээж байна. Үргэлжлүүлж байгаарай! 💪
          </p>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          flexShrink: 0,
          padding: '12px 20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          opacity: show ? 1 : 0,
          transition: 'opacity 0.4s ease 0.35s',
        }}
      >
        <Link
          href={learnerId ? `/learner/${learnerId}` : '/dashboard'}
          style={{
            display: 'block',
            textAlign: 'center',
            padding: '16px',
            borderRadius: '9999px',
            background: 'linear-gradient(135deg, #01618F, #31B2FB)',
            color: 'white',
            fontFamily: P.nunito,
            fontWeight: 800,
            fontSize: '16px',
            textDecoration: 'none',
            boxShadow: '0 6px 20px rgba(1,97,143,0.28)',
          }}
        >
          Дэлгэрэнгүй харах
        </Link>
        <Link
          href="/dashboard"
          style={{
            display: 'block',
            textAlign: 'center',
            padding: '14px',
            borderRadius: '9999px',
            border: '1px solid #E9F1FF',
            background: 'white',
            color: '#405E7E',
            fontFamily: P.jakarta,
            fontWeight: 600,
            fontSize: '14px',
            textDecoration: 'none',
          }}
        >
          Нүүр хуудас руу буцах
        </Link>
      </div>
    </MobileShell>
  );
}
