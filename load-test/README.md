# Load-Test Harness

Headless bot harness that drives the real backend API to simulate user journeys, generate realistic data, and measure capacity.

## Prerequisites

- Backend running with rate limiting off (required for >10 bots — all bots share `localhost` as their IP):
  ```bash
  RATE_LIMIT_DISABLED=true npm run dev:backend
  ```
  `RATE_LIMIT_DISABLED` is ignored when `NODE_ENV=production`, so prod security is unaffected.
- DB seeded: `npm --workspace=@app/backend run seed` (so diagnostic/lesson tasks exist)

## Usage

All commands run from the **repo root**.

```bash
# Single bot — full journey (smoke test)
npx ts-node --project load-test/tsconfig.json load-test/harness.ts --users 1 --concurrency 1

# 10 bots, diagnostic phase only
npx ts-node --project load-test/tsconfig.json load-test/harness.ts --users 10 --concurrency 5 --journey diagnostic

# 50 bots, ramp over 10 seconds, 80% accuracy
npx ts-node --project load-test/tsconfig.json load-test/harness.ts --users 50 --concurrency 20 --ramp 10

# 200 bots, medium load
npx ts-node --project load-test/tsconfig.json load-test/harness.ts --users 200 --concurrency 50 --ramp 20

# 500 bots, high load
npx ts-node --project load-test/tsconfig.json load-test/harness.ts --users 500 --concurrency 100 --ramp 30
```

## CLI Flags

| Flag | Default | Description |
|------|---------|-------------|
| `--users` | `1` | Total number of virtual users (bot journeys) to run |
| `--concurrency` | `5` | Max simultaneous in-flight journeys |
| `--base-url` | `http://localhost:3000` | Backend base URL |
| `--accuracy` | `0.8` | Fraction of task answers that should be correct (0–1) |
| `--ramp` | `0` | Spread VU starts over this many seconds (avoids bcrypt thundering herd) |
| `--journey` | `full` | `full` \| `diagnostic` \| `lesson-loop` |
| `--think` | `200,800` | Think-time range in ms between API calls (format: `min,max`) |

## Journey types

- **`full`** — register → learner → diagnostic (3 phases) → lesson (today) → dashboard → checkpoint
- **`diagnostic`** — stops after diagnostic completes (faster; no plan/lesson needed)
- **`lesson-loop`** — full diagnostic + one lesson cycle + dashboard (no checkpoint)

## Live metrics

The harness clears and repaints the terminal every second showing:

```
=== Load Test — 12s  |  38.2 req/s  |  Journeys: 47/100 done  0 failed ===

Endpoint                      Reqs   Err     p50     p95     p99
─────────────────────────────────────────────────────────────────
GET /api/dashboard/progress     47     0    23ms    61ms    88ms
GET /api/dashboard/skills       47     0    19ms    55ms    82ms
GET /api/lesson/today           47     0    44ms   108ms   195ms
POST /api/auth/register        100     0   210ms   480ms   620ms
POST /api/checkpoint/submit     12     0    88ms   195ms   220ms
POST /api/diagnostic/next...    94     0    65ms   140ms   210ms
POST /api/diagnostic/start      47     0    55ms   120ms   188ms
POST /api/diagnostic/submit    376     0    31ms    72ms    95ms
POST /api/learner               47     0    28ms    68ms    90ms
POST /api/lesson/:id/complete   47     0    35ms    75ms    98ms
POST /api/lesson/attempt       235     0    42ms    95ms   140ms
```

## Interpreting results

| Signal | Likely cause |
|--------|-------------|
| p95/p99 latency spikes on `diagnostic-start` or `next-phase` | Prisma connection pool exhaustion — add `?connection_limit=20` to `DATABASE_URL` and raise Postgres `max_connections` |
| `500` errors | Usually a DB error; check backend logs |
| `429` on register | All bots share `localhost` IP — start the backend with `RATE_LIMIT_DISABLED=true` |
| Journey failures at `lesson-today` | Seed data may be missing — run `npm run seed` |

## Cleanup

Each run prints its `runId`. Use it to remove all generated data:

```bash
# Remove one run
npx ts-node --project load-test/tsconfig.json load-test/cleanup.ts --run <runId>

# Remove all loadtest accounts
npx ts-node --project load-test/tsconfig.json load-test/cleanup.ts --all
```

Deletion cascades: Parent → Learner → SkillState, DiagnosticSession, Plan, Lesson, Attempt, ErrorLog.

## Bot identity

Every bot registers as `loadbot+<runId>-<N>@loadtest.local`. This pattern makes load-test accounts easy to identify in `db:studio` and `cleanup.ts` targets them by this prefix.
