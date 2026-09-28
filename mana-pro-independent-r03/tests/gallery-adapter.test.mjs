import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const page=read('index.html');
const main=read('preview/main.mjs');
const embed=read('preview/embed.css');

test('embed route loads its isolated layout and source runtime',()=>{
  assert.match(page,/preview\/embed\.css/);
  assert.match(page,/preview\/main\.mjs/);
  assert.match(page,/has\('embed'\).*classList\.add\('embed'\)/);
  assert.match(main,/if\(embedded\)\{\$\('repeat'\)\.checked=true;play\(\);\}/);
  assert.match(main,/DURATION\+\.38/);
  assert.match(embed,/html\.embed #technical/);
});

test('verify route remains muted through replay and blocks audio unlock',()=>{
  assert.match(main,/query\.has\('verify'\)/);
  assert.match(main,/runtime\.setEnvironment\(\{verify,muted:verify\|\|\$\('mute'\)\.checked\}\)/);
  assert.match(main,/if\(verify\)return/);
  assert.match(main,/if\(verify\)\{\$\('audio'\)\.disabled=true;\$\('mute'\)\.disabled=true;\}/);
});
