'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { clientFetch } from '@/lib/api/client';
import { TaskRunner, type BackendTask, type SubmitResult } from '@/components/task/TaskRunner';
import { MobileShell } from '@/components/figma/MobileShell';

interface LessonResponse {
  lesson: {
    id: string;
    task_ids: string[];
    tasks: BackendTask[];
  };
}

export default function LessonSessionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lessonId = searchParams.get('lesson_id') ?? '';
  const learnerId = searchParams.get('learner_id') ?? '';

  const [tasks, setTasks] = useState<BackendTask[]>([]);
  const [taskIdx, setTaskIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const startTime = useRef(Date.now());

  useEffect(() => {
    if (!lessonId) { router.replace('/dashboard'); return; }
    clientFetch<LessonResponse>(`/api/lesson/today?learner_id=${learnerId}`)
      .then((data) => { setTasks(data.lesson.tasks ?? []); setLoading(false); })
      .catch(() => {
        setError('Хичээлийн мэдээлэл ачаалахад алдаа гарлаа');
        setLoading(false);
      });
  }, [lessonId, learnerId, router]);

  async function handleSubmit(taskId: string, answer: string): Promise<SubmitResult> {
    const elapsedSec = Math.round((Date.now() - startTime.current) / 1000);
    try {
      const data = await clientFetch<{ score: number; is_correct: boolean; feedback: string }>('/api/lesson/attempt', {
        method: 'POST',
        body: JSON.stringify({
          lesson_id: lessonId,
          task_id: taskId,
          input_text: answer,
          time_seconds: elapsedSec,
        }),
      });
      startTime.current = Date.now();
      return { is_correct: data.is_correct, score: data.score, feedback: data.feedback ?? '' };
    } catch {
      startTime.current = Date.now();
      return { is_correct: false, score: 0, feedback: '' };
    }
  }

  function handleNext() {
    const next = taskIdx + 1;
    if (next < tasks.length) {
      setTaskIdx(next);
    } else {
      router.push(`/lesson/complete?lesson_id=${lessonId}&learner_id=${learnerId}&count=${tasks.length}`);
    }
  }

  if (loading) {
    return (
      <MobileShell>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
          <div style={{ fontSize: '40px' }}>⏳</div>
          <p style={{ fontFamily: 'var(--font-nunito), "Nunito Sans", sans-serif', fontWeight: 800, fontSize: '18px', color: '#01618F', margin: 0 }}>
            Ачаалж байна...
          </p>
        </div>
      </MobileShell>
    );
  }

  if (error || tasks.length === 0) {
    return (
      <MobileShell>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px', padding: '24px' }}>
          <p style={{ fontFamily: 'var(--font-jakarta), "Plus Jakarta Sans", sans-serif', fontSize: '14px', color: '#FB5151', textAlign: 'center' }}>
            {error || 'Даалгавар байхгүй байна'}
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            style={{ padding: '12px 24px', borderRadius: '9999px', border: 'none', background: '#01618F', color: 'white', fontFamily: 'var(--font-nunito), "Nunito Sans", sans-serif', fontWeight: 800, fontSize: '15px', cursor: 'pointer' }}
          >
            Буцах
          </button>
        </div>
      </MobileShell>
    );
  }

  const currentTask = tasks[taskIdx];

  return (
    <TaskRunner
      task={currentTask}
      progress={{ current: taskIdx + 1, total: tasks.length }}
      onSubmit={handleSubmit}
      onNext={handleNext}
    />
  );
}
