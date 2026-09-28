import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const root = path.resolve(new URL('..', import.meta.url).pathname);
async function walk(dir) {
  const out = [];
  for (const ent of await fs.readdir(dir, { withFileTypes: true })) {
    if (ent.name === 'SHA256SUMS.txt' || ent.name === '.DS_Store') continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...await walk(full));
    else out.push(full);
  }
  return out;
}
const files = (await walk(root)).sort();
const lines = [];
for (const file of files) {
  const rel = path.relative(root, file).replaceAll('\\', '/');
  const buf = await fs.readFile(file);
  const hash = crypto.createHash('sha256').update(buf).digest('hex');
  lines.push(`${hash}  ${rel}`);
}
await fs.writeFile(path.join(root, 'SHA256SUMS.txt'), lines.join('\n') + '\n');
console.log(`SHA256SUMS.txt written (${files.length} files)`);
