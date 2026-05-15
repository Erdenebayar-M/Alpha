'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@app/shared';
import { clientFetch } from '@/lib/api/client';
import { useAuthStore } from '@/lib/stores/authStore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { ParentProfile } from '@/lib/stores/authStore';

const inputStyle = (hasError: boolean): React.CSSProperties => ({
  padding: '14px 18px',
  borderRadius: '16px',
  border: `2px solid ${hasError ? '#FB5151' : '#E9F1FF'}`,
  background: 'white',
  fontFamily: 'var(--font-nunito), "Nunito Sans", sans-serif',
  fontSize: '16px',
  color: '#01618F',
  outline: 'none',
  boxSizing: 'border-box',
  width: '100%',
  transition: 'border-color 0.2s',
});

export default function LoginPage() {
  const router = useRouter();
  const setProfile = useAuthStore((s) => s.setProfile);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(data: LoginInput) {
    try {
      const profile = await clientFetch<ParentProfile & { token?: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      setProfile({ id: profile.id, email: profile.email, name: profile.name });
      router.push('/dashboard');
    } catch {
      setError('root', { message: 'Имэйл эсвэл нууц үг буруу байна' });
    }
  }

  return (
    <div style={{ width: '100%', maxWidth: '420px' }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <p
          style={{
            fontFamily: 'var(--font-nunito), "Nunito Sans", sans-serif',
            fontWeight: 800,
            fontSize: '30px',
            color: '#01618F',
            margin: 0,
          }}
        >
          Монгол Дикт
        </p>
        <p
          style={{
            fontFamily: 'var(--font-jakarta), "Plus Jakarta Sans", sans-serif',
            fontSize: '14px',
            color: '#405E7E',
            margin: '8px 0 0',
          }}
        >
          Эцэг эхийн эрхээр нэвтрэх
        </p>
      </div>

      <div
        style={{
          background: 'white',
          borderRadius: '28px',
          padding: '32px',
          boxShadow: '0 8px 32px rgba(1,97,143,0.10)',
        }}
      >
        <form
          onSubmit={handleSubmit(onSubmit)}
          style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}
          noValidate
        >
          {errors.root && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: '12px',
                background: 'rgba(251,81,81,0.08)',
                border: '1px solid rgba(251,81,81,0.25)',
                color: '#C53030',
                fontFamily: 'var(--font-jakarta), "Plus Jakarta Sans", sans-serif',
                fontSize: '14px',
                textAlign: 'center',
              }}
            >
              {errors.root.message}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label
              style={{
                fontFamily: 'var(--font-jakarta), "Plus Jakarta Sans", sans-serif',
                fontWeight: 700,
                fontSize: '13px',
                color: '#405E7E',
              }}
            >
              Имэйл хаяг
            </label>
            <input
              {...register('email')}
              type="email"
              placeholder="example@email.com"
              autoComplete="email"
              style={inputStyle(!!errors.email)}
            />
            {errors.email && (
              <span
                style={{
                  fontSize: '12px',
                  color: '#FB5151',
                  fontFamily: 'var(--font-jakarta), "Plus Jakarta Sans", sans-serif',
                }}
              >
                {errors.email.message}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label
              style={{
                fontFamily: 'var(--font-jakarta), "Plus Jakarta Sans", sans-serif',
                fontWeight: 700,
                fontSize: '13px',
                color: '#405E7E',
              }}
            >
              Нууц үг
            </label>
            <input
              {...register('password')}
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              style={inputStyle(!!errors.password)}
            />
            {errors.password && (
              <span
                style={{
                  fontSize: '12px',
                  color: '#FB5151',
                  fontFamily: 'var(--font-jakarta), "Plus Jakarta Sans", sans-serif',
                }}
              >
                {errors.password.message}
              </span>
            )}
          </div>

          <div style={{ textAlign: 'right', marginTop: '-6px' }}>
            <Link
              href="/forgot-password"
              style={{
                fontFamily: 'var(--font-jakarta), "Plus Jakarta Sans", sans-serif',
                fontSize: '13px',
                color: '#31B2FB',
                textDecoration: 'none',
              }}
            >
              Нууц үг мартсан уу?
            </Link>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              padding: '16px',
              borderRadius: '9999px',
              background: isSubmitting ? '#A0C4D8' : '#01618F',
              color: 'white',
              fontFamily: 'var(--font-nunito), "Nunito Sans", sans-serif',
              fontWeight: 800,
              fontSize: '16px',
              border: 'none',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s, transform 0.1s',
              marginTop: '4px',
            }}
          >
            {isSubmitting ? 'Нэвтэрч байна...' : 'Нэвтрэх'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <span
            style={{
              fontFamily: 'var(--font-jakarta), "Plus Jakarta Sans", sans-serif',
              fontSize: '14px',
              color: '#405E7E',
            }}
          >
            Бүртгэл байхгүй юу?{' '}
          </span>
          <Link
            href="/register"
            style={{
              fontFamily: 'var(--font-jakarta), "Plus Jakarta Sans", sans-serif',
              fontWeight: 700,
              fontSize: '14px',
              color: '#01618F',
              textDecoration: 'none',
            }}
          >
            Бүртгүүлэх
          </Link>
        </div>
      </div>
    </div>
  );
}
