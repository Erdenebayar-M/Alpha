// Writes a minimal package.json into the generated Prisma client folder so the
// directory import (`../generated/prisma`) resolves to `index.ts` on every OS.
//
// Why: the Prisma 7 `prisma-client` generator emits raw .ts files with no
// package.json. Linux ts-node does NOT auto-resolve a bare directory to its
// index.ts (Windows does), so production (Render) fails with MODULE_NOT_FOUND.
// A package.json `main` pointing at a .ts file resolves reliably everywhere —
// this mirrors how `@app/shared` (main: ./src/index.ts) already resolves fine.
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'generated', 'prisma');
const target = path.join(dir, 'package.json');
fs.writeFileSync(target, JSON.stringify({ main: 'index.ts' }, null, 2) + '\n');
console.log(`Wrote ${target}`);
