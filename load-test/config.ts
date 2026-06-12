export type JourneyType = 'full' | 'diagnostic' | 'lesson-loop';

export interface Config {
  baseUrl: string;
  users: number;
  concurrency: number;
  accuracy: number;       // 0-1, fraction of task attempts that should be correct
  rampSeconds: number;    // spread VU starts over this many seconds
  journey: JourneyType;
  thinkMs: [number, number]; // [min, max] think-time between API calls
  runId: string;
}

function arg(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  return idx !== -1 ? process.argv[idx + 1] : undefined;
}

function num(name: string, def: number): number {
  const v = arg(name);
  if (v === undefined) return def;
  const n = Number(v);
  if (isNaN(n)) throw new Error(`--${name} must be a number, got "${v}"`);
  return n;
}

export function parseConfig(): Config {
  const journey = (arg('journey') ?? 'full') as JourneyType;
  if (!['full', 'diagnostic', 'lesson-loop'].includes(journey)) {
    throw new Error(`--journey must be full|diagnostic|lesson-loop`);
  }
  const thinkRaw = arg('think') ?? '200,800';
  const [tMin, tMax] = thinkRaw.split(',').map(Number);

  return {
    baseUrl: arg('base-url') ?? 'http://localhost:3000',
    users: num('users', 1),
    concurrency: num('concurrency', 5),
    accuracy: num('accuracy', 0.8),
    rampSeconds: num('ramp', 0),
    journey,
    thinkMs: [tMin ?? 200, tMax ?? 800],
    runId: Date.now().toString(36),
  };
}
