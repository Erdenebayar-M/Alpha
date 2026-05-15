import { redirect } from 'next/navigation';
import { serverFetch } from '@/lib/api/server';
import { UnauthorizedError } from '@/lib/api/types';
import { Nunito_Sans, Plus_Jakarta_Sans } from 'next/font/google';
import { ParentShell } from '@/components/parent/ParentShell';
import type { ParentProfile } from '@/lib/stores/authStore';
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

export default async function ParentLayout({ children }: { children: ReactNode }) {
  let profile: ParentProfile;
  try {
    profile = await serverFetch<ParentProfile>('/api/auth/me');
  } catch (e) {
    if (e instanceof UnauthorizedError) redirect('/login');
    redirect('/login');
  }

  return (
    <div className={`${nunito.variable} ${jakarta.variable}`}>
      <ParentShell profile={profile}>{children}</ParentShell>
    </div>
  );
}
