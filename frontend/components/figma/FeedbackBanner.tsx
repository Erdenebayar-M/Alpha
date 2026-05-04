import Image from 'next/image';

/**
 * SRP: renders the correct / wrong feedback strip shown after submission.
 * Receives only what it needs — no screen state leaks in.
 */
interface FeedbackBannerProps {
  isCorrect: boolean;
  correctAnswer?: string;
  checkmarkUrl: string;
  crossUrl: string;
}

export function FeedbackBanner({
  isCorrect,
  correctAnswer,
  checkmarkUrl,
  crossUrl,
}: FeedbackBannerProps) {
  const accent = isCorrect ? '#76CE79' : '#FB5151';
  const textColor = isCorrect ? '#1A6B1D' : '#B91C1C';
  const bg = isCorrect ? 'rgba(118,206,121,0.10)' : 'rgba(251,81,81,0.08)';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        padding: '16px 20px',
        borderRadius: '22px',
        background: bg,
        border: `2px solid ${accent}`,
        marginTop: '16px',
        width: 'min(342px, calc(100% - 32px))',
      }}
    >
      <span
        style={{
          width: '44px',
          height: '44px',
          borderRadius: '9999px',
          background: accent,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxShadow: `0 4px 12px ${accent}55`,
        }}
      >
        <Image
          src={isCorrect ? checkmarkUrl : crossUrl}
          alt={isCorrect ? 'Зөв' : 'Буруу'}
          width={isCorrect ? 18 : 14}
          height={isCorrect ? 14 : 14}
          unoptimized
        />
      </span>

      <div>
        <p
          style={{
            fontFamily: 'var(--font-nunito), "Nunito Sans", sans-serif',
            fontWeight: 800,
            fontSize: '17px',
            color: textColor,
            margin: 0,
            lineHeight: 1.3,
          }}
        >
          {isCorrect ? 'Зөв!' : 'Буруу'}
        </p>
        {!isCorrect && correctAnswer && (
          <p
            style={{
              fontFamily: 'var(--font-nunito), "Nunito Sans", sans-serif',
              fontWeight: 600,
              fontSize: '13px',
              color: '#405E7E',
              margin: '3px 0 0',
              lineHeight: 1.4,
            }}
          >
            Зөв хариулт:{' '}
            <strong style={{ color: '#01618F', fontWeight: 800 }}>{correctAnswer}</strong>
          </p>
        )}
      </div>
    </div>
  );
}
