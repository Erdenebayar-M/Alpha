import Image from 'next/image';
import type { ProgressInfo } from './types';

interface TopAppBarProps {
  title: string;
  progress: ProgressInfo;
  stage: string;
  backIconUrl: string;
  onBack?: () => void;
}

export function TopAppBar({ title, progress, stage, backIconUrl, onBack }: TopAppBarProps) {
  const pct = `${Math.round((progress.current / progress.total) * 100)}%`;

  return (
    <header
      style={{
        flexShrink: 0,
        height: '80px',
        display: 'flex',
        alignItems: 'center',
        padding: '13px 20px',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        background: 'rgba(255,255,255,0.7)',
        boxShadow: '0px 20px 40px 0px rgba(0,97,143,0.06)',
        gap: '12px',
      }}
    >
      <button
        onClick={onBack}
        aria-label="Буцах"
        style={{
          flexShrink: 0,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '8px',
          lineHeight: 0,
          borderRadius: '8px',
        }}
      >
        <Image src={backIconUrl} alt="" width={16} height={16} unoptimized />
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontFamily: 'var(--font-nunito), "Nunito Sans", sans-serif',
            fontWeight: 800,
            fontSize: 'clamp(15px, 4vw, 20px)',
            lineHeight: '26px',
            color: '#00618F',
            margin: 0,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {title}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
          <div
            style={{
              flex: 1,
              maxWidth: '96px',
              height: '6px',
              background: '#DAE9FF',
              borderRadius: '9999px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: pct,
                background: '#31B2FB',
                transition: 'width 0.4s ease',
              }}
            />
          </div>
          <span
            style={{
              fontFamily: 'var(--font-jakarta), "Plus Jakarta Sans", sans-serif',
              fontWeight: 700,
              fontSize: '12px',
              color: '#405E7E',
              whiteSpace: 'nowrap',
            }}
          >
            {progress.current}/{progress.total}
          </span>
        </div>
      </div>

      <div
        style={{
          flexShrink: 0,
          background: '#F9B854',
          borderRadius: '9999px',
          padding: '4px 12px',
        }}
      >
        <span
          style={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: 700,
            fontSize: '11px',
            color: '#573800',
            whiteSpace: 'nowrap',
          }}
        >
          {stage}
        </span>
      </div>
    </header>
  );
}
