import { Nunito_Sans, Plus_Jakarta_Sans } from 'next/font/google';
import type { ReactNode } from 'react';

const nunito = Nunito_Sans({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '700', '800'],
  variable: '--font-nunito',
  display: 'swap',
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-jakarta',
  display: 'swap',
});

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${nunito.variable} ${jakarta.variable}`}
      style={{
        minHeight: '100dvh',
        background: 'linear-gradient(135deg, #F3F6FF 0%, #DCE9F5 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        '--color-primary': '#01618F',
        '--color-primary-mid': '#31B2FB',
        '--color-bg': '#F3F6FF',
        '--color-correct': '#76CE79',
        '--color-wrong': '#FB5151',
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
}
