#!/usr/bin/env ts-node
import { parseConfig } from './config';
import { Metrics } from './metrics';
import { runBot, JourneyResult } from './bot';

async function main(): Promise<void> {
  const cfg = parseConfig();
  const metrics = new Metrics();

  console.log(`\n\x1b[1mBot Harness\x1b[0m`);
  console.log(`  Target:      ${cfg.baseUrl}`);
  console.log(`  Users:       ${cfg.users}`);
  console.log(`  Concurrency: ${cfg.concurrency}`);
  console.log(`  Accuracy:    ${Math.round(cfg.accuracy * 100)}%`);
  console.log(`  Journey:     ${cfg.journey}`);
  console.log(`  Ramp:        ${cfg.rampSeconds}s`);
  console.log(`  Run ID:      ${cfg.runId}`);
  console.log('');

  // Verify server is reachable
  try {
    const res = await fetch(`${cfg.baseUrl}/api/auth/me`);
    if (!res.ok && res.status !== 401) throw new Error(`unexpected status ${res.status}`);
  } catch (e) {
    if (e instanceof TypeError && String(e.message).includes('fetch')) {
      console.error(`\x1b[31m✗ Cannot reach ${cfg.baseUrl}  — is the backend running?\x1b[0m\n`);
      process.exit(1);
    }
  }

  metrics.startReporter();

  // Handle Ctrl-C gracefully
  let stopping = false;
  process.on('SIGINT', () => {
    if (!stopping) {
      stopping = true;
      console.log('\n\x1b[33mInterrupted — waiting for in-flight bots to finish...\x1b[0m');
    }
  });

  const failures: JourneyResult[] = [];
  let queued = 0;
  let active = 0;

  // Semaphore-style pool
  await new Promise<void>((resolve) => {
    function tryStart(): void {
      while (!stopping && active < cfg.concurrency && queued < cfg.users) {
        const n = queued++;
        active++;
        const botId = String(n + 1).padStart(String(cfg.users).length, '0');

        // Stagger starts during ramp period
        const delay = cfg.rampSeconds > 0
          ? (n / cfg.users) * cfg.rampSeconds * 1000
          : 0;

        setTimeout(async () => {
          const result = await runBot(botId, cfg, metrics);
          if (!result.ok) failures.push(result);
          active--;
          tryStart();
          if (active === 0 && (queued >= cfg.users || stopping)) resolve();
        }, delay);
      }

      if (active === 0 && (queued >= cfg.users || stopping)) resolve();
    }

    tryStart();
  });

  metrics.printFinal();

  if (failures.length > 0) {
    console.log('\x1b[31mFailed journeys:\x1b[0m');
    for (const f of failures.slice(0, 20)) {
      console.log(`  bot ${f.botId}  step=${f.failedStep}  ${f.error}`);
    }
    if (failures.length > 20) {
      console.log(`  ... and ${failures.length - 20} more`);
    }
    console.log('');
  }

  console.log(`\x1b[2mTo delete this run's data:\x1b[0m`);
  console.log(`  npx ts-node load-test/cleanup.ts --run ${cfg.runId}\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
