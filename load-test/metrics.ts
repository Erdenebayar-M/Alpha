export interface RequestRecord {
  group: string;
  status: number;
  ms: number;
}

interface GroupStats {
  count: number;
  errors: number;
  samples: number[];
}

export class Metrics {
  private groups = new Map<string, GroupStats>();
  private journeysStarted = 0;
  private journeysCompleted = 0;
  private journeysFailed = 0;
  private startTime = Date.now();
  private lastCount = 0;
  private lastTime = Date.now();
  private timer: NodeJS.Timeout | null = null;

  record(r: RequestRecord): void {
    let g = this.groups.get(r.group);
    if (!g) { g = { count: 0, errors: 0, samples: [] }; this.groups.set(r.group, g); }
    g.count++;
    g.samples.push(r.ms);
    if (r.status >= 400) g.errors++;
  }

  journeyStart(): void { this.journeysStarted++; }
  journeyDone(): void { this.journeysCompleted++; }
  journeyFail(): void { this.journeysFailed++; }

  startReporter(): void {
    this.timer = setInterval(() => this.printLive(), 1000);
  }

  stopReporter(): void {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  private percentile(arr: number[], p: number): number {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, idx)];
  }

  private totalRequests(): number {
    let n = 0;
    this.groups.forEach((g) => { n += g.count; });
    return n;
  }

  private rps(): number {
    const now = Date.now();
    const total = this.totalRequests();
    const delta = (total - this.lastCount) / ((now - this.lastTime) / 1000);
    this.lastCount = total;
    this.lastTime = now;
    return Math.round(delta * 10) / 10;
  }

  private printLive(): void {
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(0);
    const rps = this.rps();
    process.stdout.write('\x1b[2J\x1b[H'); // clear screen

    console.log(`\x1b[1m=== Load Test — ${elapsed}s elapsed  |  ${rps} req/s  |  Journeys: ${this.journeysCompleted}/${this.journeysStarted} done  ${this.journeysFailed} failed ===\x1b[0m`);
    console.log('');

    const header = 'Endpoint'.padEnd(30) + 'Reqs'.padStart(6) + 'Err'.padStart(6) + 'p50'.padStart(8) + 'p95'.padStart(8) + 'p99'.padStart(8);
    console.log(header);
    console.log('─'.repeat(header.length));

    for (const [group, g] of [...this.groups.entries()].sort()) {
      const p50 = this.percentile(g.samples, 50);
      const p95 = this.percentile(g.samples, 95);
      const p99 = this.percentile(g.samples, 99);
      const errColor = g.errors > 0 ? '\x1b[31m' : '';
      const reset = '\x1b[0m';
      console.log(
        group.padEnd(30) +
        String(g.count).padStart(6) +
        `${errColor}${String(g.errors).padStart(6)}${reset}` +
        `${p50}ms`.padStart(8) +
        `${p95}ms`.padStart(8) +
        `${p99}ms`.padStart(8),
      );
    }
  }

  printFinal(): void {
    this.stopReporter();
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
    const total = this.totalRequests();

    console.log('\n\x1b[1m╔══════════════════ FINAL REPORT ══════════════════╗\x1b[0m');
    console.log(`  Duration:     ${elapsed}s`);
    console.log(`  Total reqs:   ${total}  (${(total / Number(elapsed)).toFixed(1)} req/s avg)`);
    console.log(`  Journeys:     ${this.journeysCompleted} completed, ${this.journeysFailed} failed of ${this.journeysStarted} started`);
    console.log('');

    const header = '  Endpoint'.padEnd(32) + 'Reqs'.padStart(6) + 'Errs'.padStart(6) + 'p50'.padStart(8) + 'p95'.padStart(8) + 'p99'.padStart(8);
    console.log(header);
    console.log('  ' + '─'.repeat(header.length - 2));

    let allErrors = 0;
    for (const [group, g] of [...this.groups.entries()].sort()) {
      allErrors += g.errors;
      const p50 = this.percentile(g.samples, 50);
      const p95 = this.percentile(g.samples, 95);
      const p99 = this.percentile(g.samples, 99);
      console.log(
        ('  ' + group).padEnd(32) +
        String(g.count).padStart(6) +
        String(g.errors).padStart(6) +
        `${p50}ms`.padStart(8) +
        `${p95}ms`.padStart(8) +
        `${p99}ms`.padStart(8),
      );
    }
    console.log('');
    if (allErrors === 0) {
      console.log('  \x1b[32m✓ Zero errors\x1b[0m');
    } else {
      console.log(`  \x1b[31m✗ ${allErrors} errors across all endpoints\x1b[0m`);
    }
    console.log('\x1b[1m╚═══════════════════════════════════════════════════╝\x1b[0m\n');
  }
}
