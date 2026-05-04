import Image from 'next/image';

interface AudioButtonProps {
  iconUrl: string;
  isPlaying?: boolean;
  onClick?: () => void;
}

export function AudioButton({ iconUrl, isPlaying = false, onClick }: AudioButtonProps) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '40px' }}>
      <button
        onClick={onClick}
        aria-label="Дуу тоглуулах"
        style={{
          position: 'relative',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          lineHeight: 0,
        }}
      >
        <span
          style={{
            position: 'absolute',
            inset: '-32px',
            background: 'rgba(0,97,143,0.05)',
            borderRadius: '9999px',
            filter: 'blur(32px)',
            opacity: 0.6,
            display: 'block',
            pointerEvents: 'none',
          }}
        />
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '158px',
            height: '158px',
            borderRadius: '9999px',
            border: '8px solid white',
            background: 'linear-gradient(135.18deg, #00618F 0%, #31B2FB 100%)',
            boxShadow: '0px 20px 30px rgba(0,97,143,0.25)',
            position: 'relative',
            transform: isPlaying ? 'scale(0.94)' : 'scale(1)',
            transition: 'transform 0.15s ease',
          }}
        >
          <Image
            src={iconUrl}
            alt=""
            width={54}
            height={52}
            unoptimized
            style={{ objectFit: 'contain' }}
          />
        </span>
      </button>
    </div>
  );
}
