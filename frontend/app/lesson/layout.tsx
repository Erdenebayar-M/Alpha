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

export default function LessonLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${nunito.variable} ${jakarta.variable}`}
      style={
        {
          '--color-primary': '#01618F',
          '--color-primary-mid': '#31B2FB',
          '--color-bg': '#F3F6FF',
          '--color-card-border': '#E9F1FF',
          '--color-correct': '#76CE79',
          '--color-wrong': '#FB5151',
          '--color-stage': '#F9B854',
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}
