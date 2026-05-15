'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    // TODO: POST /api/auth/reset-request when endpoint is implemented
    setSubmitted(true);
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
      </div>

      <div
        style={{
          background: 'white',
          borderRadius: '28px',
          padding: '32px',
          boxShadow: '0 8px 32px rgba(1,97,143,0.10)',
        }}
      >
        {submitted ? (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ fontSize: '48px' }}>📧</div>
            <p
              style={{
                fontFamily: 'var(--font-nunito), "Nunito Sans", sans-serif',
                fontWeight: 800,
                fontSize: '20px',
                color: '#01618F',
                margin: 0,
              }}
            >
              Имэйл илгээлээ
            </p>
            <p
              style={{
                fontFamily: 'var(--font-jakarta), "Plus Jakarta Sans", sans-serif',
                fontSize: '14px',
                color: '#405E7E',
                margin: 0,
                lineHeight: '1.6',
              }}
            >
              {email} хаягт нууц үг сэргээх холбоос илгээлээ. Имэйлээ шалгана уу.
            </p>
            <Link
              href="/login"
              style={{
                padding: '14px',
                borderRadius: '9999px',
                background: '#01618F',
                color: 'white',
                fontFamily: 'var(--font-nunito), "Nunito Sans", sans-serif',
                fontWeight: 800,
                fontSize: '15px',
                textDecoration: 'none',
                display: 'block',
                textAlign: 'center',
                marginTop: '8px',
              }}
            >
              Нэвтрэх хуудас руу буцах
            </Link>
          </div>
        ) : (
          <>
            <p
              style={{
                fontFamily: 'var(--font-nunito), "Nunito Sans", sans-serif',
                fontWeight: 800,
                fontSize: '20px',
                color: '#01618F',
                margin: '0 0 8px',
              }}
            >
              Нууц үг сэргээх
            </p>
            <p
              style={{
                fontFamily: 'var(--font-jakarta), "Plus Jakarta Sans", sans-serif',
                fontSize: '14px',
                color: '#405E7E',
                margin: '0 0 24px',
                lineHeight: '1.5',
              }}
            >
              Бүртгэлтэй имэйл хаягаа оруулна уу. Нууц үг сэргээх холбоос илгээнэ.
            </p>

            <form
              onSubmit={handleSubmit}
              style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
            >
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
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  autoComplete="email"
                  required
                  style={{
                    padding: '14px 18px',
                    borderRadius: '16px',
                    border: '2px solid #E9F1FF',
                    background: 'white',
                    fontFamily: 'var(--font-nunito), "Nunito Sans", sans-serif',
                    fontSize: '16px',
                    color: '#01618F',
                    outline: 'none',
                    boxSizing: 'border-box',
                    width: '100%',
                  }}
                />
              </div>

              <button
                type="submit"
                style={{
                  padding: '16px',
                  borderRadius: '9999px',
                  background: '#01618F',
                  color: 'white',
                  fontFamily: 'var(--font-nunito), "Nunito Sans", sans-serif',
                  fontWeight: 800,
                  fontSize: '16px',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Холбоос илгээх
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <Link
                href="/login"
                style={{
                  fontFamily: 'var(--font-jakarta), "Plus Jakarta Sans", sans-serif',
                  fontSize: '14px',
                  color: '#405E7E',
                  textDecoration: 'none',
                }}
              >
                ← Нэвтрэх хуудас руу буцах
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
