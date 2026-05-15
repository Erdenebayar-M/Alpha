import { redirect } from 'next/navigation';
import { serverFetch } from '@/lib/api/server';

export default async function RootPage() {
  try {
    await serverFetch('/api/auth/me');
    redirect('/dashboard');
  } catch {
    redirect('/login');
  }
}
