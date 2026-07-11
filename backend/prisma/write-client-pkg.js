// Writes a minimal package.json into the generated Prisma client folder so the
// directory import (`../generated/prisma`) resolves to its entry file on every OS.
//
// Why: the Prisma 7 `prisma-client` generator emits raw .ts files (entry point
// `client.ts`) with no package.json and no index.ts. A bare directory import
// therefore has nothing to resolve to — Node/ts-node on Linux (Render) fails
// with MODULE_NOT_FOUND. A package.json `main` pointing at the real entry file
// resolves reliably everywhere, mirroring how `@app/shared`
// (main: ./src/index.ts) already resolves fine.
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'generated', 'prisma');
const entry = 'client.ts'; // Prisma 7 prisma-client generator entry point
if (!fs.existsSync(path.join(dir, entry))) {
  throw new Error(`Expected generated Prisma entry ${entry} not found in ${dir}`);
}
const target = path.join(dir, 'package.json');
fs.writeFileSync(target, JSON.stringify({ main: entry }, null, 2) + '\n');
console.log(`Wrote ${target} (main: ${entry})`);
