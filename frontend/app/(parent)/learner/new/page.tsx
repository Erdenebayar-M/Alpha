'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createLearnerSchema, type CreateLearnerInput } from '@app/shared';
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

const GRADE_OPTS = [1, 2, 3, 4];
const MINUTES_OPTS = [5, 10, 15, 20];

export default function NewLearnerPage() {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateLearnerInput>({
    resolver: zodResolver(createLearnerSchema),
    defaultValues: { grade: 1, daily_minutes: 10 },
  });

  const grade = watch('grade');
  const minutes = watch('daily_minutes');

  async function onSubmit(data: CreateLearnerInput) {
    setErrorMsg('');
    try {
      const learner = await clientFetch<{ id: string }>('/api/learner', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      router.push(`/diagnostic/intro?learner_id=${learner.id}`);
    } catch {
      setErrorMsg('Хүүхдийн мэдээлэл хадгалах амжилтгүй боллоо');
    }
  }

  return (
    <div style={{ padding: '32px 24px', maxWidth: '560px' }}>
      <h1
        style={{
          fontFamily: 'var(--font-nunito), "Nunito Sans", sans-serif',
          fontWeight: 800,
          fontSize: '24px',
          color: '#01618F',
          margin: '0 0 8px',
        }}
      >
        Хүүхэд нэмэх
      </h1>
      <p
        style={{
          fontFamily: 'var(--font-jakarta), "Plus Jakarta Sans", sans-serif',
          fontSize: '14px',
          color: '#7A9BB5',
          margin: '0 0 28px',
        }}
      >
        Мэдээллийг бөглөсний дараа оношилгоог эхлүүлнэ
      </p>

      <div
        style={{
          background: 'white',
          borderRadius: '24px',
          padding: '28px',
          boxShadow: '0 2px 16px rgba(1,97,143,0.07)',
        }}
      >
        <form
          onSubmit={handleSubmit(onSubmit)}
          style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
          noValidate
        >
          {errorMsg && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: '12px',
                background: 'rgba(251,81,81,0.08)',
                border: '1px solid rgba(251,81,81,0.25)',
                color: '#C53030',
                fontFamily: 'var(--font-jakarta), "Plus Jakarta Sans", sans-serif',
                fontSize: '14px',
              }}
            >
              {errorMsg}
            </div>
          )}

          {/* Name */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label
              style={{
                fontFamily: 'var(--font-jakarta), "Plus Jakarta Sans", sans-serif',
                fontWeight: 700,
                fontSize: '13px',
                color: '#405E7E',
              }}
            >
              Хүүхдийн нэр
            </label>
            <input
              {...register('name')}
              type="text"
              placeholder="Жишээ: Болд"
              autoComplete="off"
              style={{ ...inputStyle, border: errors.name ? '2px solid #FB5151' : '2px solid #E9F1FF' }}
            />
            {errors.name && (
              <span style={{ fontSize: '12px', color: '#FB5151', fontFamily: 'var(--font-jakarta), "Plus Jakarta Sans", sans-serif' }}>
                {errors.name.message}
              </span>
            )}
          </div>

          {/* Grade selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label
              style={{
                fontFamily: 'var(--font-jakarta), "Plus Jakarta Sans", sans-serif',
                fontWeight: 700,
                fontSize: '13px',
                color: '#405E7E',
              }}
            >
              Хэддүгээр ангид суралцдаг вэ?
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {GRADE_OPTS.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setValue('grade', g)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '12px',
                    border: `2px solid ${grade === g ? '#01618F' : '#E9F1FF'}`,
                    background: grade === g ? '#01618F' : 'white',
                    color: grade === g ? 'white' : '#405E7E',
                    fontFamily: 'var(--font-nunito), "Nunito Sans", sans-serif',
                    fontWeight: 800,
                    fontSize: '16px',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    minWidth: '56px',
                  }}
                >
                  {g}-р
                </button>
              ))}
            </div>
          </div>

          {/* Daily minutes selector */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label
              style={{
                fontFamily: 'var(--font-jakarta), "Plus Jakarta Sans", sans-serif',
                fontWeight: 700,
                fontSize: '13px',
                color: '#405E7E',
              }}
            >
              Өдрийн хичээлийн үргэлжлэх хугацаа
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {MINUTES_OPTS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setValue('daily_minutes', m)}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '12px',
                    border: `2px solid ${minutes === m ? '#01618F' : '#E9F1FF'}`,
                    background: minutes === m ? '#01618F' : 'white',
                    color: minutes === m ? 'white' : '#405E7E',
                    fontFamily: 'var(--font-nunito), "Nunito Sans", sans-serif',
                    fontWeight: 700,
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {m} мин
                </button>
              ))}
            </div>
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
              transition: 'background 0.2s',
              marginTop: '8px',
            }}
          >
            {isSubmitting ? 'Хадгалж байна...' : 'Оношилгоо эхлүүлэх →'}
          </button>
        </form>
      </div>
    </div>
  );
}
