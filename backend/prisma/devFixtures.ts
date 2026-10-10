/*
 * Dev fixtures: fill a freshly migrated dev database with what the product
 * owner needs to test end to end (#160).
 *
 *   1. Learning content — Words and Tasks copied from the production database
 *      over a read-only transaction, human edits and asset URLs included.
 *   2. Articles — published ones copied from production's public read API;
 *      any other Article Published in dev goes back to Draft.
 *   3. Demo accounts — DEMO_PARENTS, email-confirmed, each with Learners.
 *
 * Only Word and Task are ever read from production: never Parent, Learner,
 * Attempt, ErrorLog, tokens or any other personal or usage data. Every write
 * goes to DATABASE_URL, which must not be production's endpoint
 * (assertNotProduction). Re-running is safe: rows already matching production
 * are left untouched, and nothing is deleted.
 *
 * Config (env):
 *   DATABASE_URL           target dev database (written)
 *   PROD_DATABASE_URL      production database (read-only; also the guard)
 *   PROD_API_URL           production backend origin, e.g. https://api.example
 *   DEMO_ACCOUNT_PASSWORD  sign-in password for every demo Parent account
 *
 * Usage:
 *   npm run fixtures:dev -- --dry-run   # report what would change
 *   npm run fixtures:dev                # write
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient, type Task, type Word } from "../generated/prisma";
import { assertNotProduction } from "../src/lib/dev-fixtures/production-guard";
import { planSync, type SyncPlan } from "../src/lib/dev-fixtures/sync-plan";
import { fetchPublishedArticles, type PublicArticle } from "../src/lib/dev-fixtures/articles";
import { DEMO_PARENTS, demoPasswordProblem } from "../src/lib/dev-fixtures/demo-accounts";
import { initialSkillState, variantForGrade } from "../src/lib/learner-defaults";
import { comparePassword, hashPassword } from "../src/lib/auth/password";

const isDryRun = process.argv.includes("--dry-run");
const CHUNK = 1000;
const TX_TIMEOUT_MS = 10 * 60 * 1000;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

function client(url: string): PrismaClient {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
}

function chunks<T>(rows: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += CHUNK) out.push(rows.slice(i, i + CHUNK));
  return out;
}

// ─── Production reads ──────────────────────────────────────────────────────────

/** Words and Tasks from production, read inside a READ ONLY transaction so
 *  Postgres itself rejects any write on this connection. */
async function readProductionContent(prod: PrismaClient): Promise<{ words: Word[]; tasks: Task[] }> {
  return prod.$transaction(
    async (tx) => {
      // The one raw statement: Prisma has no API for transaction access mode.
      // A fixed string, no input, so none of $executeRaw's injection risk.
      await tx.$executeRaw`SET TRANSACTION READ ONLY`;
      const words = await tx.word.findMany({ orderBy: { id: "asc" } });
      const tasks = await tx.task.findMany({ orderBy: { id: "asc" } });
      return { words, tasks };
    },
    { timeout: TX_TIMEOUT_MS },
  ).catch((e: Error) => {
    // This branch's generated client reads every Word/Task column it knows,
    // so production must be migrated at least as far as this checkout.
    throw new Error(`Reading production content failed (is production behind this branch's migrations?): ${e.message}`);
  });
}

// ─── Content sync ──────────────────────────────────────────────────────────────

function logPlan(label: string, plan: SyncPlan<unknown>) {
  console.log(`${label.padEnd(9)} ${plan.create.length} to create, ${plan.update.length} to update, ${plan.unchanged} unchanged`);
}

/** Applies a plan in order: new rows in createMany batches, then changed rows
 *  updated a batch per transaction, so each batch commits or fails whole. */
async function applyPlan<T extends { id: string }>(
  db: PrismaClient,
  plan: SyncPlan<T>,
  createMany: (rows: T[]) => Prisma.PrismaPromise<unknown>,
  update: (row: T) => Prisma.PrismaPromise<unknown>,
) {
  for (const batch of chunks(plan.create)) await createMany(batch);
  for (const batch of chunks(plan.update)) {
    await db.$transaction(batch.map(update));
  }
}

// A form row points at its root, so every Word must land after the one it
// points at: order by depth in the root chain (roots 0, their forms 1, …).
function rootsFirst(words: Word[]): Word[] {
  const byId = new Map(words.map((w) => [w.id, w]));
  const depth = (w: Word, seen = new Set<string>()): number => {
    const root = w.root_word_id ? byId.get(w.root_word_id) : undefined;
    return root && !seen.has(w.id) ? 1 + depth(root, seen.add(w.id)) : 0;
  };
  return words.map((w) => ({ w, d: depth(w) })).sort((a, b) => a.d - b.d).map(({ w }) => w);
}

async function syncWords(db: PrismaClient, source: Word[]) {
  const plan = planSync(rootsFirst(source), await db.word.findMany());
  logPlan("Words:", plan);
  if (isDryRun) return;
  await applyPlan(
    db,
    plan,
    (rows) => db.word.createMany({ data: rows }),
    ({ id, ...data }) => db.word.update({ where: { id }, data }),
  );
}

const taskData = (task: Task) => ({ ...task, options: task.options as Prisma.InputJsonValue });

async function syncTasks(db: PrismaClient, source: Task[]) {
  const plan = planSync(source, await db.task.findMany());
  logPlan("Tasks:", plan);
  if (isDryRun) return;
  await applyPlan(
    db,
    plan,
    (rows) => db.task.createMany({ data: rows.map(taskData) }),
    (task) => {
      const { id, ...data } = taskData(task);
      return db.task.update({ where: { id }, data });
    },
  );
}

// ─── Articles ──────────────────────────────────────────────────────────────────

const ARTICLE_SELECT = {
  slug: true, title: true, excerpt: true, category: true, body: true,
  thumbnail_url: true, thumbnail_alt: true, thumbnail_width: true, thumbnail_height: true,
  reading_time_minutes: true, published_at: true, is_featured: true, status: true,
} as const;

// Both sides in one comparable shape, keyed by slug: production's public API
// never exposes an Article's id.
function articleRow(a: PublicArticle) {
  return { id: a.slug, ...a, status: "PUBLISHED" as const };
}

async function syncArticles(db: PrismaClient, source: PublicArticle[]) {
  const existing = await db.article.findMany({ where: { slug: { in: source.map((a) => a.slug) } }, select: ARTICLE_SELECT });
  const plan = planSync(
    source.map(articleRow),
    existing.map((a) => ({ id: a.slug, ...a, published_at: a.published_at?.toISOString() ?? null })),
  );
  logPlan("Articles:", plan);

  // Dev's Published set mirrors production's: an Article Published here but
  // not there (unpublished or deleted in production, or published only in dev)
  // goes back to Draft, as the admin Unpublish does. Never deleted.
  const notInProduction = { status: "PUBLISHED" as const, slug: { notIn: source.map((a) => a.slug) } };
  const toUnpublish = await db.article.count({ where: notInProduction });
  console.log(`          ${toUnpublish} to unpublish (not Published in production)`);
  if (isDryRun) return;

  const featured = source.find((a) => a.is_featured);
  await db.$transaction(async (tx) => {
    if (toUnpublish > 0) {
      await tx.article.updateMany({
        where: notInProduction,
        data: { status: "DRAFT", is_featured: false, version: { increment: 1 } },
      });
    }
    // At most one Featured Article (partial unique index): clear any other
    // before production's lands.
    if (featured) {
      await tx.article.updateMany({
        where: { is_featured: true, slug: { not: featured.slug } },
        data: { is_featured: false },
      });
    }
    for (const { id: slug, ...row } of [...plan.create, ...plan.update]) {
      const data = { ...row, body: row.body as Prisma.InputJsonValue, published_at: row.published_at ? new Date(row.published_at) : null };
      await tx.article.upsert({
        where: { slug },
        create: data,
        // A version bump, as an admin save would, so an editor open on the
        // old copy gets a conflict instead of overwriting it.
        update: { ...data, version: { increment: 1 } },
      });
    }
  }, { timeout: TX_TIMEOUT_MS });
}

// ─── Demo accounts ─────────────────────────────────────────────────────────────

async function syncDemoAccounts(db: PrismaClient, password: string) {
  let created = 0;
  let updated = 0;
  // Hashed at most once, and only if some account needs it (bcrypt cost 12).
  let passwordHash: string | undefined;
  const hash = async () => (passwordHash ??= await hashPassword(password));
  for (const demo of DEMO_PARENTS) {
    const existing = await db.parent.findUnique({ where: { email: demo.email } });
    existing ? updated++ : created++;
    if (isDryRun) continue;

    // Rehash only when the password changed, so a re-run is a no-op.
    const keepHash = !!existing?.password_hash && (await comparePassword(password, existing.password_hash));
    const parent = await db.parent.upsert({
      where: { email: demo.email },
      create: {
        email: demo.email,
        name: demo.name,
        surname: demo.surname,
        password_hash: await hash(),
        email_confirmed_at: new Date(),
      },
      update: {
        name: demo.name,
        surname: demo.surname,
        // A new password signs out every session on the old one, as a
        // Password reset does.
        ...(keepHash ? {} : { password_hash: await hash(), token_version: { increment: 1 } }),
        ...(existing?.email_confirmed_at ? {} : { email_confirmed_at: new Date() }),
      },
    });

    for (const learner of demo.learners) {
      // update: {} — a demo Learner the product owner has edited or taken
      // through lessons keeps that state across re-runs.
      await db.learner.upsert({
        where: { id: learner.id },
        create: { ...learner, parent_id: parent.id, variant: variantForGrade(learner.grade) },
        update: {},
      });
      await db.learnerSkillState.upsert({
        where: { learner_id: learner.id },
        create: { learner_id: learner.id, ...initialSkillState(learner.daily_minutes) },
        update: {},
      });
    }
  }
  console.log(`Demo:     ${created} Parent accounts to create, ${updated} already present`);
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (isDryRun) console.log("[DRY RUN] No writes will be made.\n");

  const targetUrl = requireEnv("DATABASE_URL");
  const prodUrl = requireEnv("PROD_DATABASE_URL");
  assertNotProduction(targetUrl, prodUrl);

  const apiUrl = requireEnv("PROD_API_URL");
  const password = requireEnv("DEMO_ACCOUNT_PASSWORD");
  const weakness = demoPasswordProblem(password);
  if (weakness) throw new Error(`DEMO_ACCOUNT_PASSWORD is too weak (${weakness})`);

  // Everything is read before anything is written, so a failed read can't
  // leave the dev database half-filled.
  const prod = client(prodUrl);
  let content: { words: Word[]; tasks: Task[] };
  try {
    content = await readProductionContent(prod);
  } finally {
    await prod.$disconnect();
  }
  if (content.words.length === 0 || content.tasks.length === 0) {
    throw new Error(`Production returned ${content.words.length} Words and ${content.tasks.length} Tasks — refusing to continue`);
  }
  const articles = await fetchPublishedArticles(apiUrl);
  console.log(`Read from production: ${content.words.length} Words, ${content.tasks.length} Tasks, ${articles.length} published Articles\n`);

  const db = client(targetUrl);
  try {
    await syncWords(db, content.words);
    await syncTasks(db, content.tasks);
    await syncArticles(db, articles);
    await syncDemoAccounts(db, password);
  } finally {
    await db.$disconnect();
  }
  console.log(`\nDemo sign-in: ${DEMO_PARENTS.map((p) => p.email).join(", ")} with DEMO_ACCOUNT_PASSWORD`);
}

main().catch((e) => {
  console.error((e as Error).message);
  process.exit(1);
});
