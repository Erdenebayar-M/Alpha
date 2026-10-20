import { playAudio } from '../../../audio/play';

const RETRY = ['fb_retry_1', 'fb_retry_2'] as const;
let retryTurn = 0;

/** Spoken encouragement after a wrong answer, alternating so it never nags. */
export function encourageRetry(): void {
  playAudio(RETRY[retryTurn++ % RETRY.length]);
}
