interface ActionButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'next';
}

export function ActionButton({ label, onClick, disabled = false, variant = 'primary' }: ActionButtonProps) {
  const isNext = variant === 'next';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%',
        height: '64px',
        borderRadius: '9999px',
        border: 'none',
        background: '#01618F',
        color: 'white',
        fontFamily: 'var(--font-nunito), "Nunito Sans", sans-serif',
        fontWeight: 800,
        fontSize: 'clamp(20px, 5vw, 28px)',
        lineHeight: '30px',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        boxShadow: disabled
          ? 'none'
          : '0px 20px 25px -5px rgba(0,97,143,0.2), 0px 8px 10px -6px rgba(0,97,143,0.2)',
        transition: 'opacity 0.2s ease, box-shadow 0.2s ease, transform 0.1s ease',
        transform: disabled ? 'none' : 'translateY(0)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
      }}
    >
      {label}
      {isNext && (
        <span
          style={{
            fontSize: 'clamp(16px, 4vw, 22px)',
            fontWeight: 400,
            lineHeight: 1,
            marginTop: '-1px',
          }}
        >
          →
        </span>
      )}
    </button>
  );
}
