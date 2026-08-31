import { useEffect, useRef, useState } from 'react';

/**
 * Advances 0 -> waveCount-1 one requestAnimationFrame at a time once `play`
 * turns true, so a caller can mount expensive children in stages instead of
 * all in the same commit. See Slide1.tsx for why this is safe there: every
 * layer's first entrance track starts from `opacity: 0`, so a layer admitted
 * a few frames late looks identical to one that mounted immediately and just
 * hasn't animated in yet.
 */
export function useMountWaves(play: boolean, waveCount: number): number {
  const [wave, setWave] = useState(0);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!play) return;

    const scheduleNext = (next: number) => {
      if (next >= waveCount) return;
      frameRef.current = requestAnimationFrame(() => {
        setWave(next);
        scheduleNext(next + 1);
      });
    };
    scheduleNext(1);

    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [play]);

  return wave;
}
