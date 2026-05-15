'use client';

import Link from 'next/link';

interface SkillState {
  general_level: string;
  current_streak: number;
}

export interface Learner {
  id: string;
  name: string;
  grade: number;
  variant: 'A' | 'B';
  daily_minutes: number;
  created_at: string;
  skill_state: SkillState | null;
}

const LEVEL_COLOR: Record<string, string> = {
  M0: '#9CA3AF',
  M1: '#60A5FA',
  M2: '#34D399',
  M3: '#FBBF24',
  M4: '#F97316',
  M5: '#8B5CF6',
};

const LEVEL_LABEL: Record<string, string> = {
  M0: 'Суурь',
  M1: 'Анхан',
  M2: 'Дунд',
  M3: 'Ахисан',
  M4: 'Тогтвортой',
  M5: 'Мэргэшсэн',
};

export function LearnerGrid({ learners }: { learners: Learner[] }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: '16px',
      }}
    >
      {learners.map((l) => {
        const level = l.skill_state?.general_level ?? 'M0';
        const streak = l.skill_state?.current_streak ?? 0;
        const levelColor = LEVEL_COLOR[level] ?? '#9CA3AF';

        return (
          <Link
            key={l.id}
            href={`/learner/${l.id}`}
            style={{ textDecoration: 'none' }}
          >
            <div
              style={{
                background: 'white',
                borderRadius: '20px',
                padding: '24px',
                boxShadow: '0 2px 12px rgba(1,97,143,0.06)',
                border: '1px solid #E9F1FF',
                transition: 'box-shadow 0.2s, transform 0.15s',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(1,97,143,0.12)';
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 12px rgba(1,97,143,0.06)';
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
              }}
            >
              {/* Avatar + name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '9999px',
                    background: `linear-gradient(135deg, ${levelColor}44, ${levelColor}22)`,
                    border: `2px solid ${levelColor}55`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'var(--font-nunito), "Nunito Sans", sans-serif',
                    fontWeight: 800,
                    fontSize: '20px',
                    color: levelColor,
                    flexShrink: 0,
                  }}
                >
                  {l.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p
                    style={{
                      margin: 0,
                      fontFamily: 'var(--font-nunito), "Nunito Sans", sans-serif',
                      fontWeight: 800,
                      fontSize: '17px',
                      color: '#01618F',
                    }}
                  >
                    {l.name}
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontFamily: 'var(--font-jakarta), "Plus Jakarta Sans", sans-serif',
                      fontSize: '12px',
                      color: '#7A9BB5',
                    }}
                  >
                    {l.grade}-р анги
                  </p>
                </div>
              </div>

              {/* Level badge */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 12px',
                  borderRadius: '9999px',
                  background: `${levelColor}18`,
                  marginBottom: '12px',
                }}
              >
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '9999px',
                    background: levelColor,
                  }}
                />
                <span
                  style={{
                    fontFamily: 'var(--font-jakarta), "Plus Jakarta Sans", sans-serif',
                    fontWeight: 700,
                    fontSize: '12px',
                    color: levelColor,
                  }}
                >
                  {level} — {LEVEL_LABEL[level] ?? level}
                </span>
              </div>

              {/* Stats row */}
              <div
                style={{
                  display: 'flex',
                  gap: '16px',
                  paddingTop: '12px',
                  borderTop: '1px solid #F0F5FF',
                }}
              >
                <div>
                  <p
                    style={{
                      margin: 0,
                      fontFamily: 'var(--font-nunito), "Nunito Sans", sans-serif',
                      fontWeight: 800,
                      fontSize: '18px',
                      color: streak > 0 ? '#F97316' : '#A0BACE',
                    }}
                  >
                    {streak}🔥
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontFamily: 'var(--font-jakarta), "Plus Jakarta Sans", sans-serif',
                      fontSize: '11px',
                      color: '#7A9BB5',
                    }}
                  >
                    Дараалал
                  </p>
                </div>
                <div>
                  <p
                    style={{
                      margin: 0,
                      fontFamily: 'var(--font-nunito), "Nunito Sans", sans-serif',
                      fontWeight: 800,
                      fontSize: '18px',
                      color: '#01618F',
                    }}
                  >
                    {l.daily_minutes}мин
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontFamily: 'var(--font-jakarta), "Plus Jakarta Sans", sans-serif',
                      fontSize: '11px',
                      color: '#7A9BB5',
                    }}
                  >
                    Өдрийн хичээл
                  </p>
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
