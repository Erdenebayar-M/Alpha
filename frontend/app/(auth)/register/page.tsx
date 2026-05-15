'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, type RegisterInput } from '@app/shared';
import { clientFetch } from '@/lib/api/client';
import { useAuthStore } from '@/lib/stores/authStore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
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

export default function RegisterPage() {
  const router = useRouter();
  const setProfile = useAuthStore((s) => s.setProfile);
  const [agreed, setAgreed] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  async function onSubmit(data: RegisterInput) {
    if (!agreed) {
      setError('root', { message: 'Зөвшөөрлийг сонгоно уу' });
      return;
    }
    try {
      const profile = await clientFetch<ParentProfile & { token?: string }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      setProfile({ id: profile.id, email: profile.email, name: profile.name });
      router.push('/learner/new');
    } catch (e: unknown) {
      const msg =
        e instanceof Error && e.message.includes('email')
          ? 'Энэ имэйл хаяг бүртгэлтэй байна'
          : 'Бүртгэл амжилтгүй боллоо. Дахин оролдоно уу';
      setError('root', { message: msg });
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
          Эцэг эхийн бүртгэл үүсгэх
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
          style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
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

          {[
            { field: 'name' as const, label: 'Таны нэр', type: 'text', placeholder: 'Жишээ: Бат-Эрдэнэ', autocomplete: 'name' },
            { field: 'email' as const, label: 'Имэйл хаяг', type: 'email', placeholder: 'example@email.com', autocomplete: 'email' },
            { field: 'password' as const, label: 'Нууц үг (8+ тэмдэгт)', type: 'password', placeholder: '••••••••', autocomplete: 'new-password' },
          ].map(({ field, label, type, placeholder, autocomplete }) => (
            <div key={field} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label
                style={{
                  fontFamily: 'var(--font-jakarta), "Plus Jakarta Sans", sans-serif',
                  fontWeight: 700,
                  fontSize: '13px',
                  color: '#405E7E',
                }}
              >
                {label}
              </label>
              <input
                {...register(field)}
                type={type}
                placeholder={placeholder}
                autoComplete={autocomplete}
                style={inputStyle(!!errors[field])}
              />
              {errors[field] && (
                <span
                  style={{
                    fontSize: '12px',
                    color: '#FB5151',
                    fontFamily: 'var(--font-jakarta), "Plus Jakarta Sans", sans-serif',
                  }}
                >
                  {errors[field]?.message}
                </span>
              )}
            </div>
          ))}

          <label
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              cursor: 'pointer',
              marginTop: '4px',
            }}
          >
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              style={{ marginTop: '2px', width: '18px', height: '18px', accentColor: '#01618F', flexShrink: 0 }}
            />
            <span
              style={{
                fontFamily: 'var(--font-jakarta), "Plus Jakarta Sans", sans-serif',
                fontSize: '13px',
                color: '#405E7E',
                lineHeight: '1.5',
              }}
            >
              Нууцлалын бодлого болон хүүхдийн мэдээлэл хамгаалах нөхцөлийг зөвшөөрч байна
            </span>
          </label>

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
              transition: 'background 0.2s',
              marginTop: '8px',
            }}
          >
            {isSubmitting ? 'Бүртгэж байна...' : 'Бүртгүүлэх'}
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
            Бүртгэл байна уу?{' '}
          </span>
          <Link
            href="/login"
            style={{
              fontFamily: 'var(--font-jakarta), "Plus Jakarta Sans", sans-serif',
              fontWeight: 700,
              fontSize: '14px',
              color: '#01618F',
              textDecoration: 'none',
            }}
          >
            Нэвтрэх
          </Link>
        </div>
      </div>
    </div>
  );
}
