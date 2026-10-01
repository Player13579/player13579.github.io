import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.dirname(fileURLToPath(import.meta.url));
const files = [];
function visit(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a,b)=>a.name.localeCompare(b.name))) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) visit(abs);
    else {
      const rel = path.relative(root, abs).replaceAll(path.sep, '/');
      if (rel !== 'package-closure.json') files.push({ path: rel,
        sha256: crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex') });
    }
  }
}
visit(root);
const doc = { schema: 'dva-local-closure/1', package: 'sol-rpg-heavy-zero-r1', files };
fs.writeFileSync(path.join(root, 'package-closure.json'), JSON.stringify(doc, null, 2) + '\n');
console.log(`wrote local closure: ${files.length} files`);
