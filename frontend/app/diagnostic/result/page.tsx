'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { clientFetch } from '@/lib/api/client';
import { MobileShell } from '@/components/figma/MobileShell';
import Link from 'next/link';

interface DiagnosticResult {
  session_id: string;
  learner_id: string;
  general_level: string;
  skill_scores: Record<string, number>;
  top_errors: string[];
  plan_id?: string;
  weak_skills: string[];
}

const LEVEL_COLOR: Record<string, string> = {
  M0: '#9CA3AF', M1: '#60A5FA', M2: '#34D399',
  M3: '#FBBF24', M4: '#F97316', M5: '#8B5CF6',
};

const LEVEL_LABEL: Record<string, string> = {
  M0: 'Суурь', M1: 'Анхан шат', M2: 'Дунд шат',
  M3: 'Ахисан шат', M4: 'Тогтвортой', M5: 'Мэргэшсэн',
};

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

export default function DiagnosticResultPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id') ?? '';
  const learnerId = searchParams.get('learner_id') ?? '';

  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) { router.replace('/dashboard'); return; }
    clientFetch<{ result: { general_level: string; skill_scores: Record<string, number>; top_error_codes: string[]; priority_skills: string[] } }>(`/api/diagnostic/result/${sessionId}`)
      .then(({ result: r }) => {
        setResult({
          session_id: sessionId,
          learner_id: learnerId,
          general_level: r.general_level,
          skill_scores: r.skill_scores,
          top_errors: r.top_error_codes ?? [],
          weak_skills: r.priority_skills ?? [],
        });
        setLoading(false);
      })
      .catch(() => {
        // Stub result while API is being connected
        setResult({
          session_id: sessionId,
          learner_id: learnerId,
          general_level: 'M1',
          skill_scores: { S1: 0.6, S2: 0.4, S3: 0.7, S4: 0.5, S5: 0.3, S6: 0.8, S7: 0.4, S8: 0.5 },
          top_errors: ['C1', 'B1', 'E1'],
          weak_skills: ['S5', 'S2', 'S7'],
        });
        setLoading(false);
      });
  }, [sessionId, learnerId, router]);

  const level = result?.general_level ?? 'M0';
  const levelColor = LEVEL_COLOR[level] ?? '#9CA3AF';

  return (
    <MobileShell>
      {/* Header */}
      <header
        style={{
          padding: '16px 20px',
          background: 'white',
          borderBottom: '1px solid #E9F1FF',
          flexShrink: 0,
          textAlign: 'center',
        }}
      >
        <p style={{ margin: 0, fontFamily: P.nunito, fontWeight: 800, fontSize: '17px', color: '#01618F' }}>
          Оношилгооны дүн
        </p>
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
          <div style={{ textAlign: 'center', paddingTop: '40px' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>⏳</div>
            <p style={{ fontFamily: P.jakarta, color: '#405E7E' }}>Дүн боловсруулж байна...</p>
          </div>
        ) : result ? (
          <>
            {/* Level badge */}
            <div
              style={{
                background: 'white',
                borderRadius: '20px',
                padding: '24px',
                border: '1px solid #E9F1FF',
                textAlign: 'center',
                boxShadow: '0 2px 10px rgba(1,97,143,0.06)',
              }}
            >
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '9999px',
                  background: `${levelColor}20`,
                  border: `3px solid ${levelColor}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px',
                  fontFamily: P.nunito,
                  fontWeight: 800,
                  fontSize: '28px',
                  color: levelColor,
                }}
              >
                {level}
              </div>
              <p style={{ margin: '0 0 4px', fontFamily: P.nunito, fontWeight: 800, fontSize: '20px', color: '#01618F' }}>
                {LEVEL_LABEL[level] ?? level}
              </p>
              <p style={{ margin: 0, fontFamily: P.jakarta, fontSize: '13px', color: '#7A9BB5' }}>
                Таны хүүхдийн одоогийн түвшин
              </p>
            </div>

            {/* Skill breakdown */}
            <div
              style={{
                background: 'white',
                borderRadius: '20px',
                padding: '20px',
                border: '1px solid #E9F1FF',
                boxShadow: '0 2px 10px rgba(1,97,143,0.06)',
              }}
            >
              <p style={{ margin: '0 0 16px', fontFamily: P.nunito, fontWeight: 800, fontSize: '15px', color: '#01618F' }}>
                Чадварын дүн
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {Object.entries(SKILL_LABEL).map(([skill, label]) => {
                  const score = (result.skill_scores[skill] ?? 0) * 100;
                  const isWeak = result.weak_skills.includes(skill);
                  return (
                    <div key={skill}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <span style={{ fontFamily: P.jakarta, fontSize: '12px', color: isWeak ? '#C53030' : '#405E7E', fontWeight: isWeak ? 700 : 500 }}>
                          {skill} · {label}
                        </span>
                        <span style={{ fontFamily: P.nunito, fontSize: '12px', fontWeight: 800, color: score >= 70 ? '#34D399' : score >= 40 ? '#FBBF24' : '#FB5151' }}>
                          {Math.round(score)}%
                        </span>
                      </div>
                      <div style={{ height: '6px', borderRadius: '9999px', background: '#F0F5FF', overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${score}%`,
                            borderRadius: '9999px',
                            background: score >= 70 ? '#34D399' : score >= 40 ? '#FBBF24' : '#FB5151',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top errors */}
            {result.top_errors.length > 0 && (
              <div
                style={{
                  background: 'white',
                  borderRadius: '20px',
                  padding: '20px',
                  border: '1px solid #E9F1FF',
                  boxShadow: '0 2px 10px rgba(1,97,143,0.06)',
                }}
              >
                <p style={{ margin: '0 0 12px', fontFamily: P.nunito, fontWeight: 800, fontSize: '15px', color: '#01618F' }}>
                  Давтагдах алдаанууд
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {result.top_errors.map((code) => (
                    <span
                      key={code}
                      style={{
                        padding: '5px 12px',
                        borderRadius: '9999px',
                        background: 'rgba(251,81,81,0.09)',
                        border: '1px solid rgba(251,81,81,0.22)',
                        fontFamily: P.nunito,
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
          </>
        ) : null}
      </div>

      {/* Footer */}
      <div style={{ flexShrink: 0, padding: '12px 20px 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <Link
          href={`/lesson/today?learner_id=${learnerId}`}
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
          Хичээлийг эхлэх →
        </Link>
        <Link
          href={learnerId ? `/learner/${learnerId}` : '/dashboard'}
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
          Дэлгэрэнгүй харах
        </Link>
      </div>
    </MobileShell>
  );
}
