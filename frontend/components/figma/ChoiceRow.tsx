import Image from 'next/image';

export type RowStatus = 'idle' | 'selected' | 'correct' | 'wrong';

const ROW_STYLE: Record<RowStatus, { border: string; bg: string; color: string }> = {
  idle:     { border: 'transparent',              bg: '#EEF4FF',               color: '#01618F' },
  selected: { border: '#31B2FB',                  bg: 'rgba(49,178,251,0.08)', color: '#01618F' },
  correct:  { border: '#76CE79',                  bg: 'rgba(118,206,121,0.10)', color: '#1A6B1D' },
  wrong:    { border: '#FB5151',                  bg: 'rgba(251,81,81,0.08)',  color: '#B91C1C' },
};

interface ChoiceRowProps {
  label: string;
  status: RowStatus;
  badgeCheckUrl: string;
  badgeCrossUrl: string;
  onClick?: () => void;
}

export function ChoiceRow({ label, status, badgeCheckUrl, badgeCrossUrl, onClick }: ChoiceRowProps) {
  const s = ROW_STYLE[status];
  const isSubmitted = status === 'correct' || status === 'wrong';

  return (
    <button
      onClick={onClick}
      disabled={isSubmitted}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 18px',
        borderRadius: '22px',
        border: `2.5px solid ${s.border}`,
        background: s.bg,
        cursor: isSubmitted ? 'default' : 'pointer',
        transition: 'border-color 0.18s, background 0.18s, transform 0.1s',
        transform: status === 'selected' ? 'scale(1.01)' : 'scale(1)',
        boxShadow: '0 2px 8px rgba(0,97,143,0.04)',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-nunito), "Nunito Sans", sans-serif',
          fontWeight: 800,
          fontSize: 'clamp(18px, 5vw, 24px)',
          color: s.color,
        }}
      >
        {label}
      </span>

      {status === 'correct' && (
        <span style={badgeStyle('#76CE79')}>
          <Image src={badgeCheckUrl} alt="Зөв" width={14} height={10} unoptimized />
        </span>
      )}
      {status === 'wrong' && (
        <span style={badgeStyle('#FB5151')}>
          <Image src={badgeCrossUrl} alt="Буруу" width={12} height={12} unoptimized />
        </span>
      )}
      {(status === 'idle' || status === 'selected') && (
        <span
          style={{
            width: '22px',
            height: '22px',
            borderRadius: '9999px',
            border: `2px solid ${status === 'selected' ? '#31B2FB' : '#C5D8F0'}`,
            background: status === 'selected' ? '#31B2FB' : 'transparent',
            flexShrink: 0,
          }}
        />
      )}
    </button>
  );
}

function badgeStyle(color: string): React.CSSProperties {
  return {
    width: '28px',
    height: '28px',
    borderRadius: '9999px',
    background: color,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  };
}
