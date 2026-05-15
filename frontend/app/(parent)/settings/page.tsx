'use client';

import { useState } from 'react';
import { useAuthStore } from '@/lib/stores/authStore';
import { clientFetch } from '@/lib/api/client';
import { useRouter } from 'next/navigation';

const inputStyle: React.CSSProperties = {
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
  transition: 'border-color 0.2s',
};

export default function SettingsPage() {
  const profile = useAuthStore((s) => s.profile);
  const setProfile = useAuthStore((s) => s.setProfile);
  const router = useRouter();

  const [name, setName] = useState(profile?.name ?? '');
  const [email, setEmail] = useState(profile?.email ?? '');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [showDelete, setShowDelete] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveMsg('');
    try {
      // TODO: replace with PUT /api/auth/me when endpoint is implemented
      setSaveMsg('Тохиргоо хадгалагдлаа');
      if (profile) setProfile({ ...profile, name, email });
    } catch {
      setSaveMsg('Хадгалахад алдаа гарлаа');
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    await clientFetch('/api/auth/logout', { method: 'POST' }).catch(() => null);
    setProfile(null);
    router.push('/login');
  }

  return (
    <div style={{ padding: '32px 24px', maxWidth: '560px' }}>
      <h1
        style={{
          fontFamily: 'var(--font-nunito), "Nunito Sans", sans-serif',
          fontWeight: 800,
          fontSize: '24px',
          color: '#01618F',
          margin: '0 0 28px',
        }}
      >
        Тохиргоо
      </h1>

      {/* Profile form */}
      <div
        style={{
          background: 'white',
          borderRadius: '20px',
          padding: '24px',
          border: '1px solid #E9F1FF',
          boxShadow: '0 2px 12px rgba(1,97,143,0.06)',
          marginBottom: '16px',
        }}
      >
        <h2
          style={{
            fontFamily: 'var(--font-nunito), "Nunito Sans", sans-serif',
            fontWeight: 800,
            fontSize: '16px',
            color: '#01618F',
            margin: '0 0 20px',
          }}
        >
          Профайл мэдээлэл
        </h2>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} noValidate>
          {saveMsg && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '10px',
                background: saveMsg.includes('алдаа') ? 'rgba(251,81,81,0.08)' : 'rgba(118,206,121,0.12)',
                border: `1px solid ${saveMsg.includes('алдаа') ? 'rgba(251,81,81,0.25)' : 'rgba(118,206,121,0.3)'}`,
                color: saveMsg.includes('алдаа') ? '#C53030' : '#166534',
                fontFamily: 'var(--font-jakarta), "Plus Jakarta Sans", sans-serif',
                fontSize: '14px',
              }}
            >
              {saveMsg}
            </div>
          )}

          {[
            { label: 'Нэр', val: name, set: setName, type: 'text', autocomplete: 'name' },
            { label: 'Имэйл хаяг', val: email, set: setEmail, type: 'email', autocomplete: 'email' },
          ].map(({ label, val, set, type, autocomplete }) => (
            <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
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
                type={type}
                value={val}
                onChange={(e) => set(e.target.value)}
                autoComplete={autocomplete}
                style={inputStyle}
              />
            </div>
          ))}

          <button
            type="submit"
            disabled={saving}
            style={{
              padding: '14px',
              borderRadius: '9999px',
              background: saving ? '#A0C4D8' : '#01618F',
              color: 'white',
              fontFamily: 'var(--font-nunito), "Nunito Sans", sans-serif',
              fontWeight: 800,
              fontSize: '15px',
              border: 'none',
              cursor: saving ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
            }}
          >
            {saving ? 'Хадгалж байна...' : 'Тохиргоо хадгалах'}
          </button>
        </form>
      </div>

      {/* Danger zone */}
      <div
        style={{
          background: 'white',
          borderRadius: '20px',
          padding: '24px',
          border: '1px solid #E9F1FF',
          boxShadow: '0 2px 12px rgba(1,97,143,0.06)',
        }}
      >
        <h2
          style={{
            fontFamily: 'var(--font-nunito), "Nunito Sans", sans-serif',
            fontWeight: 800,
            fontSize: '16px',
            color: '#01618F',
            margin: '0 0 16px',
          }}
        >
          Бусад үйлдлүүд
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            onClick={handleLogout}
            style={{
              padding: '12px 20px',
              borderRadius: '12px',
              border: '1px solid #E9F1FF',
              background: 'white',
              color: '#405E7E',
              fontFamily: 'var(--font-jakarta), "Plus Jakarta Sans", sans-serif',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            Системээс гарах
          </button>

          {!showDelete ? (
            <button
              onClick={() => setShowDelete(true)}
              style={{
                padding: '12px 20px',
                borderRadius: '12px',
                border: '1px solid rgba(251,81,81,0.25)',
                background: 'rgba(251,81,81,0.05)',
                color: '#C53030',
                fontFamily: 'var(--font-jakarta), "Plus Jakarta Sans", sans-serif',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              Бүртгэл устгах
            </button>
          ) : (
            <div
              style={{
                padding: '16px',
                borderRadius: '12px',
                border: '1px solid rgba(251,81,81,0.3)',
                background: 'rgba(251,81,81,0.06)',
              }}
            >
              <p
                style={{
                  fontFamily: 'var(--font-jakarta), "Plus Jakarta Sans", sans-serif',
                  fontSize: '13px',
                  color: '#C53030',
                  margin: '0 0 12px',
                  lineHeight: '1.5',
                }}
              >
                Бүртгэлийг устгавал бүх мэдээлэл устах болно. Энэ үйлдлийг буцааж болохгүй.
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setShowDelete(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '9999px',
                    border: '1px solid #E9F1FF',
                    background: 'white',
                    color: '#405E7E',
                    fontFamily: 'var(--font-nunito), "Nunito Sans", sans-serif',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Болих
                </button>
                <button
                  onClick={() => {
                    // TODO: DELETE /api/auth/me when endpoint is implemented
                    alert('Энэ функц одоохондоо хаагдсан байна');
                    setShowDelete(false);
                  }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '9999px',
                    border: 'none',
                    background: '#FB5151',
                    color: 'white',
                    fontFamily: 'var(--font-nunito), "Nunito Sans", sans-serif',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Устгах
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
