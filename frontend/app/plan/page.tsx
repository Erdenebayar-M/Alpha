'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { clientFetch } from '@/lib/api/client';
import { MobileShell } from '@/components/figma/MobileShell';

interface PlanLesson {
  id: string;
  day_number: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';
  scheduled_date: string;
  primary_skill: string;
  total_tasks: number;
  completed_tasks: number;
}

interface PlanCheckpoint {
  id: string;
  scheduled_date: string;
  status: 'PENDING' | 'COMPLETED' | 'SKIPPED';
}

interface PlanData {
  id: string;
  template: 'INTENSIVE' | 'BALANCED' | 'STABILIZATION';
  status: string;
  priority_skills: string[];
  target_errors: string[];
  daily_minutes: number;
  duration_days: number;
  source: string;
  started_at: string;
  ended_at: string | null;
  lessons: PlanLesson[];
  checkpoints: PlanCheckpoint[];
}

const P = {
  nunito: 'var(--font-nunito), "Nunito Sans", sans-serif',
  jakarta: 'var(--font-jakarta), "Plus Jakarta Sans", sans-serif',
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

const TEMPLATE_LABEL: Record<string, string> = {
  INTENSIVE: 'Эрчимтэй',
  BALANCED: 'Тэнцвэртэй',
  STABILIZATION: 'Бэхжүүлэх',
};

const TEMPLATE_COLOR: Record<string, string> = {
  INTENSIVE: '#FB5151',
  BALANCED: '#31B2FB',
  STABILIZATION: '#34D399',
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Хүлээж буй',
  IN_PROGRESS: 'Үргэлжилж буй',
  COMPLETED: 'Дууссан',
  SKIPPED: 'Алгассан',
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: '#7A9BB5',
  IN_PROGRESS: '#31B2FB',
  COMPLETED: '#34D399',
  SKIPPED: '#A0BACE',
};

function ymd(d: string): string {
  const x = new Date(d);
  return `${x.getUTCFullYear()}.${String(x.getUTCMonth() + 1).padStart(2, '0')}.${String(x.getUTCDate()).padStart(2, '0')}`;
}

export default function PlanOverviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const learnerId = searchParams.get('learner_id') ?? '';

  const [plan, setPlan] = useState<PlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [noPlan, setNoPlan] = useState(false);

  useEffect(() => {
    if (!learnerId) {
      router.replace('/dashboard');
      return;
    }
    clientFetch<{ plan: PlanData }>(`/api/plan/current?learner_id=${learnerId}`)
      .then(({ plan }) => {
        setPlan(plan);
        setLoading(false);
      })
      .catch((e: { code?: string }) => {
        if (e?.code === 'NO_ACTIVE_PLAN') setNoPlan(true);
        else setNoPlan(true);
        setLoading(false);
      });
  }, [learnerId, router]);

  type TimelineRow =
    | { kind: 'lesson'; date: string; data: PlanLesson }
    | { kind: 'checkpoint'; date: string; data: PlanCheckpoint };

  const timeline: TimelineRow[] = plan
    ? [
        ...plan.lessons.map<TimelineRow>((l) => ({ kind: 'lesson', date: l.scheduled_date, data: l })),
        ...plan.checkpoints.map<TimelineRow>((cp) => ({ kind: 'checkpoint', date: cp.scheduled_date, data: cp })),
      ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    : [];

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
          onClick={() => (learnerId ? router.push(`/learner/${learnerId}`) : router.push('/dashboard'))}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: P.jakarta, fontSize: '14px', color: '#405E7E', display: 'flex', alignItems: 'center', gap: '4px', padding: 0 }}
        >
          ← Буцах
        </button>
        <p style={{ margin: 0, fontFamily: P.nunito, fontWeight: 800, fontSize: '16px', color: '#01618F' }}>
          Сургалтын төлөвлөгөө
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
            <p style={{ fontFamily: P.jakarta, color: '#405E7E' }}>Төлөвлөгөө ачаалж байна...</p>
          </div>
        ) : noPlan ? (
          <div style={{ textAlign: 'center', paddingTop: '40px', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
            <div style={{ fontSize: '48px' }}>📋</div>
            <p style={{ fontFamily: P.nunito, fontWeight: 800, fontSize: '20px', color: '#01618F', margin: 0 }}>
              Идэвхтэй төлөвлөгөө байхгүй
            </p>
            <p style={{ fontFamily: P.jakarta, fontSize: '14px', color: '#7A9BB5', margin: 0, lineHeight: '1.5' }}>
              Төлөвлөгөө үүсгэхийн тулд оношилгоог дуусгана уу
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
        ) : plan ? (
          <>
            {/* Summary */}
            <div
              style={{
                background: 'white',
                borderRadius: '20px',
                padding: '20px',
                border: '1px solid #E9F1FF',
                boxShadow: '0 2px 10px rgba(1,97,143,0.06)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <span
                  style={{
                    padding: '5px 12px',
                    borderRadius: '9999px',
                    background: `${TEMPLATE_COLOR[plan.template]}18`,
                    color: TEMPLATE_COLOR[plan.template],
                    fontFamily: P.nunito,
                    fontWeight: 800,
                    fontSize: '13px',
                  }}
                >
                  {TEMPLATE_LABEL[plan.template] ?? plan.template}
                </span>
                <p style={{ margin: 0, fontFamily: P.jakarta, fontSize: '12px', color: '#7A9BB5' }}>
                  Эхэлсэн: {ymd(plan.started_at)}
                </p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {[
                  { label: 'Үргэлжлэх', value: `${plan.duration_days} өдөр` },
                  { label: 'Өдөрт', value: `${plan.daily_minutes} мин` },
                ].map(({ label, value }) => (
                  <div key={label} style={{ background: '#F7FAFF', borderRadius: '12px', padding: '12px' }}>
                    <p style={{ margin: '0 0 2px', fontFamily: P.jakarta, fontSize: '11px', color: '#7A9BB5' }}>{label}</p>
                    <p style={{ margin: 0, fontFamily: P.nunito, fontWeight: 800, fontSize: '17px', color: '#01618F' }}>{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Priority skills */}
            {plan.priority_skills.length > 0 && (
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
                  Анхаарах чадварууд
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {plan.priority_skills.map((s) => (
                    <span
                      key={s}
                      style={{
                        padding: '5px 12px',
                        borderRadius: '9999px',
                        background: 'rgba(49,178,251,0.10)',
                        border: '1px solid rgba(49,178,251,0.25)',
                        fontFamily: P.nunito,
                        fontWeight: 700,
                        fontSize: '12px',
                        color: '#01618F',
                      }}
                    >
                      {s} · {SKILL_LABEL[s] ?? s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Target errors */}
            {plan.target_errors.length > 0 && (
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
                  Засах алдааны кодууд
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {plan.target_errors.map((code) => (
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

            {/* Timeline */}
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
                Өдрийн хуваарь
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {timeline.map((row) =>
                  row.kind === 'lesson' ? (
                    <div
                      key={`l-${row.data.id}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 14px',
                        borderRadius: '12px',
                        background: '#F7FAFF',
                      }}
                    >
                      <div
                        style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '9999px',
                          background: 'white',
                          border: '1px solid #E9F1FF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontFamily: P.nunito,
                          fontWeight: 800,
                          fontSize: '13px',
                          color: '#01618F',
                          flexShrink: 0,
                        }}
                      >
                        {row.data.day_number}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontFamily: P.jakarta, fontWeight: 700, fontSize: '13px', color: '#405E7E' }}>
                          {SKILL_LABEL[row.data.primary_skill] ?? row.data.primary_skill}
                        </p>
                        <p style={{ margin: 0, fontFamily: P.jakarta, fontSize: '11px', color: '#7A9BB5' }}>
                          {ymd(row.data.scheduled_date)} · {row.data.completed_tasks}/{row.data.total_tasks} даалгавар
                        </p>
                      </div>
                      <span
                        style={{
                          padding: '4px 10px',
                          borderRadius: '9999px',
                          background: `${STATUS_COLOR[row.data.status]}1A`,
                          color: STATUS_COLOR[row.data.status],
                          fontFamily: P.nunito,
                          fontWeight: 700,
                          fontSize: '11px',
                          flexShrink: 0,
                        }}
                      >
                        {STATUS_LABEL[row.data.status] ?? row.data.status}
                      </span>
                    </div>
                  ) : (
                    <div
                      key={`c-${row.data.id}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 14px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, rgba(139,92,246,0.10), rgba(49,178,251,0.10))',
                        border: '1px dashed rgba(139,92,246,0.35)',
                      }}
                    >
                      <div
                        style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '9999px',
                          background: 'white',
                          border: '1px solid rgba(139,92,246,0.35)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '16px',
                          flexShrink: 0,
                        }}
                      >
                        ✓
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontFamily: P.nunito, fontWeight: 800, fontSize: '13px', color: '#5B21B6' }}>
                          Дунд шалгалт
                        </p>
                        <p style={{ margin: 0, fontFamily: P.jakarta, fontSize: '11px', color: '#7A9BB5' }}>
                          {ymd(row.data.scheduled_date)}
                        </p>
                      </div>
                      <span
                        style={{
                          padding: '4px 10px',
                          borderRadius: '9999px',
                          background: `${STATUS_COLOR[row.data.status]}1A`,
                          color: STATUS_COLOR[row.data.status],
                          fontFamily: P.nunito,
                          fontWeight: 700,
                          fontSize: '11px',
                          flexShrink: 0,
                        }}
                      >
                        {STATUS_LABEL[row.data.status] ?? row.data.status}
                      </span>
                    </div>
                  ),
                )}
              </div>
            </div>
          </>
        ) : null}
      </div>

      {/* Footer */}
      {plan && (
        <div style={{ flexShrink: 0, padding: '12px 20px 24px' }}>
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
            Өнөөдрийн хичээл →
          </Link>
        </div>
      )}
    </MobileShell>
  );
}
