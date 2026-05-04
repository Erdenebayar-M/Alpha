import Image from 'next/image';
import type { CardStatus } from './types';

interface ChoiceCardProps {
  label: string;
  imageUrl?: string;
  status: CardStatus;
  badgeCheckUrl: string;
  badgeCrossUrl: string;
  onClick?: () => void;
}

const BORDER: Record<CardStatus, string> = {
  idle:     '#E9F1FF',
  selected: '#31B2FB',
  correct:  '#76CE79',
  wrong:    '#FB5151',
};

const BADGE_BG: Partial<Record<CardStatus, string>> = {
  correct: '#76CE79',
  wrong:   '#FB5151',
};

export function ChoiceCard({
  label,
  imageUrl,
  status,
  badgeCheckUrl,
  badgeCrossUrl,
  onClick,
}: ChoiceCardProps) {
  const isSubmitted = status === 'correct' || status === 'wrong';
  const badgeBg = BADGE_BG[status];

  return (
    <button
      onClick={onClick}
      disabled={isSubmitted}
      aria-pressed={status === 'selected' || status === 'correct'}
      style={{
        position: 'relative',
        width: '100%',
        borderRadius: '28px',
        border: `4px solid ${BORDER[status]}`,
        background: 'white',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '24px 20px',
        gap: '16px',
        cursor: isSubmitted ? 'default' : 'pointer',
        boxShadow: '0px 4px 10px rgba(0,0,0,0.03)',
        transition: 'border-color 0.2s ease, transform 0.1s ease',
        transform: status === 'selected' ? 'scale(1.01)' : 'scale(1)',
        textAlign: 'center',
      }}
    >
      {/* Image tile */}
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '96px',
          height: '96px',
          borderRadius: '20px',
          background: status === 'correct' ? 'white' : '#E9F1FF',
          overflow: 'hidden',
          flexShrink: 0,
          transition: 'background 0.2s ease',
          position: 'relative',
        }}
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={label}
            fill
            unoptimized
            style={{ objectFit: 'contain', padding: '10px' }}
          />
        ) : (
          <span style={{ fontSize: '48px', lineHeight: 1 }}>🖼</span>
        )}
      </span>

      {/* Word label */}
      <span
        style={{
          fontFamily: 'var(--font-nunito), "Nunito Sans", sans-serif',
          fontWeight: 700,
          fontSize: 'clamp(18px, 5vw, 24px)',
          lineHeight: '1.4',
          color: '#00618F',
        }}
      >
        {label}
      </span>

      {/* Status badge */}
      {badgeBg && (
        <span
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            width: '36px',
            height: '36px',
            borderRadius: '9999px',
            background: badgeBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {status === 'correct' && (
            <Image src={badgeCheckUrl} alt="Зөв" width={14} height={10} unoptimized />
          )}
          {status === 'wrong' && (
            <Image src={badgeCrossUrl} alt="Буруу" width={14} height={14} unoptimized />
          )}
        </span>
      )}
    </button>
  );
}
