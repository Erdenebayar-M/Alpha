import Image from 'next/image';
import type { NavItem } from './types';

interface BottomNavProps {
  items: NavItem[];
}

export function BottomNav({ items }: BottomNavProps) {
  return (
    <nav
      aria-label="Доод цэс"
      style={{
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        background: 'rgba(255,255,255,0.7)',
        boxShadow: '0px -12px 12px rgba(55,56,48,0.06)',
        borderRadius: '40px 40px 0 0',
        paddingTop: '14px',
        paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
        display: 'flex',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <ul
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'clamp(40px, 15vw, 92px)',
          listStyle: 'none',
          margin: 0,
          padding: 0,
        }}
      >
        {items.map((item) => (
          <li key={item.label}>
            <button
              aria-label={item.label}
              aria-current={item.active ? 'page' : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '48px',
                height: '48px',
                borderRadius: '9999px',
                background: item.active ? 'rgba(110,186,247,0.2)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                lineHeight: 0,
              }}
            >
              <Image
                src={item.iconUrl}
                alt=""
                width={20}
                height={20}
                unoptimized
                style={{ objectFit: 'contain' }}
              />
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
