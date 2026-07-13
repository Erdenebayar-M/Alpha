/**
 * Audit audio Content-Type integrity across Task + TaskDraft rows.
 *
 * Read-only. Finds every non-null audio_url / prompt_audio_url, fetches the
 * first bytes of each object, and flags any row where the served Content-Type,
 * the URL extension, and the actual magic bytes disagree — or where the real
 * container is one iOS AVFoundation (expo-audio) cannot decode (WebM / Ogg).
 *
 * Background: an external recording tool uploaded human recordings as `.m4a`
 * that were actually WebM/Opus. The URL returned HTTP 200 but the mobile
 * "Listen" button silently did nothing. This script locates the whole batch,
 * not just the one row already known to be broken.
 *
 * Usage:  npx ts-node content-pipeline/scripts/auditAudioContentType.ts
 *         (requires backend/.env with DATABASE_URL)
 *
 * Exit code 1 if any mismatch is found, 0 if all audio is consistent.
 */
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../backend/.env') });

// The backend sniffer is the single source of truth for magic-byte detection.
import {
  sniffContentType,
  isIosPlayableAudio,
  EXT_FOR_TYPE,
  type SniffedType,
} from '../../backend/src/lib/media-type';

interface Row {
  table: 'Task' | 'TaskDraft';
  id: string;
  field: 'audio_url' | 'prompt_audio_url';
  url: string;
}

interface Result extends Row {
  ext: string;
  servedType: string;
  sniffed: SniffedType | null;
  verdict: 'ok' | 'MISMATCH' | 'IOS_INCOMPATIBLE' | 'UNREACHABLE';
  note: string;
}

/** Fetch enough leading bytes to sniff, plus the served Content-Type header. */
async function probe(url: string): Promise<{ servedType: string; head: Buffer } | null> {
  try {
    const res = await fetch(url, { headers: { Range: 'bytes=0-63' } });
    if (!res.ok && res.status !== 206) return null;
    const servedType = res.headers.get('content-type') ?? '';
    const head = Buffer.from(await res.arrayBuffer());
    return { servedType, head };
  } catch {
    return null;
  }
}

function extOf(url: string): string {
  const clean = url.split('?')[0];
  const dot = clean.lastIndexOf('.');
  return dot >= 0 ? clean.slice(dot + 1).toLowerCase() : '';
}

async function main(): Promise<void> {
  const { PrismaClient } = await import('../../backend/generated/prisma');
  const { PrismaPg } = await import('@prisma/adapter-pg');
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  const rows: Row[] = [];
  try {
    const tasks = await prisma.task.findMany({
      where: { audio_url: { not: null } },
      select: { id: true, audio_url: true },
    });
    for (const t of tasks) {
      rows.push({ table: 'Task', id: t.id, field: 'audio_url', url: t.audio_url! });
    }

    const drafts = await prisma.taskDraft.findMany({
      where: { OR: [{ audio_url: { not: null } }, { prompt_audio_url: { not: null } }] },
      select: { id: true, audio_url: true, prompt_audio_url: true },
    });
    for (const d of drafts) {
      if (d.audio_url) rows.push({ table: 'TaskDraft', id: d.id, field: 'audio_url', url: d.audio_url });
      if (d.prompt_audio_url) {
        rows.push({ table: 'TaskDraft', id: d.id, field: 'prompt_audio_url', url: d.prompt_audio_url });
      }
    }
  } finally {
    await prisma.$disconnect();
  }

  console.log(`\nAudio Content-Type Audit`);
  console.log(`========================`);
  console.log(`Found ${rows.length} audio reference(s) across Task + TaskDraft.\n`);

  if (rows.length === 0) {
    console.log('No audio to audit.');
    return;
  }

  // Only relative /content/ paths cannot be probed over HTTP; skip those cleanly.
  const probable = rows.filter((r) => /^https?:\/\//.test(r.url));
  const skipped = rows.length - probable.length;
  if (skipped > 0) {
    console.log(`(Skipping ${skipped} local /content/ path(s) — not HTTP-reachable.)\n`);
  }

  const results: Result[] = [];
  for (const row of probable) {
    const ext = extOf(row.url);
    const p = await probe(row.url);
    if (!p) {
      results.push({ ...row, ext, servedType: '(unreachable)', sniffed: null, verdict: 'UNREACHABLE', note: 'HEAD/GET failed' });
      continue;
    }
    const sniffed = sniffContentType(p.head);
    const servedBase = p.servedType.split(';')[0].trim().toLowerCase();

    let verdict: Result['verdict'] = 'ok';
    const notes: string[] = [];

    if (!sniffed) {
      verdict = 'MISMATCH';
      notes.push('unrecognized bytes');
    } else {
      if (!isIosPlayableAudio(sniffed)) {
        verdict = 'IOS_INCOMPATIBLE';
        notes.push(`real container ${sniffed} cannot play on iOS`);
      }
      if (servedBase && servedBase !== sniffed) {
        if (verdict === 'ok') verdict = 'MISMATCH';
        notes.push(`served ${servedBase} ≠ actual ${sniffed}`);
      }
      const expectedExt = EXT_FOR_TYPE[sniffed];
      if (ext && ext !== expectedExt && !(sniffed === 'audio/wav' && ext === 'wave')) {
        if (verdict === 'ok') verdict = 'MISMATCH';
        notes.push(`.${ext} ≠ actual .${expectedExt}`);
      }
    }

    results.push({ ...row, ext, servedType: servedBase || '(none)', sniffed, verdict, note: notes.join('; ') });
  }

  const flagged = results.filter((r) => r.verdict !== 'ok');

  for (const r of results) {
    const mark = r.verdict === 'ok' ? '  ok' : `→ ${r.verdict}`;
    console.log(`${mark}  ${r.table} ${r.id} [${r.field}]`);
    console.log(`       url:     ${r.url}`);
    console.log(`       ext=.${r.ext}  served=${r.servedType}  sniffed=${r.sniffed ?? '(unknown)'}`);
    if (r.note) console.log(`       ${r.note}`);
  }

  console.log(`\n------------------------------------------------`);
  console.log(`Total probed: ${results.length} | OK: ${results.length - flagged.length} | Flagged: ${flagged.length}`);

  if (flagged.length > 0) {
    console.log(`\nFlagged rows (need re-record → POST /api/admin/content/upload-audio):`);
    for (const r of flagged) {
      const slot = r.field === 'audio_url' ? 'dictation' : 'prompt';
      console.log(`  - ${r.table} ${r.id}  slot=${slot}  (${r.verdict})`);
    }
    process.exitCode = 1;
  } else {
    console.log(`\nAll audio Content-Types are consistent and iOS-playable. ✓`);
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
