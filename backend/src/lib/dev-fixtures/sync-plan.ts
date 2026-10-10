// Splits content rows copied from production into what the target database
// lacks, what it holds differently, and what it already matches, so a second
// run writes nothing. Rows only the target has are left alone (never deleted):
// a dev Task may already carry Attempts, which can't outlive it.

export interface SyncPlan<T> {
  create: T[];
  update: T[];
  unchanged: number;
}

// JSON with object keys sorted, so a jsonb column read back in a different key
// order doesn't count as a change. Dates compare by instant (via toJSON).
function canonical(value: unknown): string {
  return JSON.stringify(value, (_key, v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, v[k]]))
      : v,
  );
}

export function planSync<T extends { id: string }, U extends { id: string }>(source: T[], target: U[]): SyncPlan<T> {
  const existing = new Map(target.map((row) => [row.id, canonical(row)]));
  const plan: SyncPlan<T> = { create: [], update: [], unchanged: 0 };
  for (const row of source) {
    const current = existing.get(row.id);
    if (current === undefined) plan.create.push(row);
    else if (current !== canonical(row)) plan.update.push(row);
    else plan.unchanged++;
  }
  return plan;
}
