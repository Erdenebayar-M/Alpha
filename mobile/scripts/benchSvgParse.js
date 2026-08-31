#!/usr/bin/env node
/**
 * Standalone (no device, no Metro, no Jest) measurement of the XML-parsing cost the
 * Slide1 onboarding entrance used to pay on every mount, before the compile-time JSX
 * fix in `svgToJsx.js`/`svgTransformer.js`.
 *
 * Times `parseSvgSource` — the vendored port of `react-native-svg`'s own `parse()` state
 * machine (same algorithm, same attribute coercion, see `svgToJsx.js`'s header) — over
 * every real Slide1 asset on disk. `react-native-svg` itself can't be `require()`'d from
 * plain Node (its compiled output only loads inside Metro's or Jest's own Babel
 * pipeline — see `__tests__/svgToJsx.test.js`), so this is the closest same-algorithm
 * measurement reachable without a device or a bundler.
 *
 * Run: `node scripts/benchSvgParse.js`
 */

'use strict';

const fs = require('fs');
const path = require('path');

const { parseSvgSource } = require('../svgToJsx');
const { sanitizeSvg } = require('../svgTransformer');

const SLIDE1_ROOT = path.join(__dirname, '..', 'assets', 'onboarding', 'slide1');

function walkSvgFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkSvgFiles(full, out);
    else if (entry.name.endsWith('.svg')) out.push(full);
  }
  return out;
}

// The 9 dead "*-a/-b/-c/-arm.svg" duplicates superseded by flattened `*-full.svg`
// exports (characters.tsx's comments) have been deleted, so every file under here is
// one Slide1 actually `import`s.
const live = walkSvgFiles(SLIDE1_ROOT).sort();

function bench(fileList) {
  let totalBytes = 0;
  let totalMs = 0;
  const perFile = [];

  for (const file of fileList) {
    const raw = fs.readFileSync(file, 'utf8');
    const sanitized = sanitizeSvg(raw, file);
    totalBytes += sanitized.length;

    const start = process.hrtime.bigint();
    parseSvgSource(sanitized, file);
    const elapsedMs = Number(process.hrtime.bigint() - start) / 1e6;

    totalMs += elapsedMs;
    perFile.push({ file: path.relative(SLIDE1_ROOT, file), bytes: sanitized.length, ms: elapsedMs });
  }

  return { totalBytes, totalMs, perFile };
}

// One warm-up pass so V8 has JIT-compiled the parser before the timed pass — the app's
// own mount only ever runs this once per asset per screen visit (no repeat-call
// warm-up), so report both: a single cold-ish pass (closest to what one mount pays) and
// the mean of several passes (removes run-to-run noise from the headline number).
bench(live);

const PASSES = 20;
const passTotals = [];
for (let p = 0; p < PASSES; p++) {
  passTotals.push(bench(live).totalMs);
}
passTotals.sort((a, b) => a - b);
const median = passTotals[Math.floor(PASSES / 2)];

const detailed = bench(live);
detailed.perFile.sort((a, b) => b.ms - a.ms);

console.log(`Slide1 SVG parse benchmark — ${live.length} assets`);
console.log(`Total sanitized XML: ${(detailed.totalBytes / 1024).toFixed(1)} KB`);
console.log(`Median parse time over ${PASSES} passes: ${median.toFixed(2)} ms`);
console.log(`Single-pass parse time: ${detailed.totalMs.toFixed(2)} ms`);
console.log('');
console.log('Heaviest assets (single pass):');
for (const { file, bytes, ms } of detailed.perFile.slice(0, 10)) {
  console.log(`  ${ms.toFixed(3).padStart(8)} ms  ${String(bytes).padStart(6)} B  ${file}`);
}
