import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');

const cases = [
  ['v1', '../preview.js'],
  ['v2', '../../headshot-pro-v02/embed.mjs'],
  ['v3', '../../headshot-pro-v03/preview.mjs'],
];

for (const [version, path] of cases) {
  test(`${version} exposes gesture-only SFX and rejects verification audio`, async () => {
    const source = await read(path);
    assert.match(source, /ContactAudio/);
    assert.match(source, /sound:\s*verifyMode\s*\?\s*null\s*:/);
    assert.match(source, /soundButton\.hidden\s*=\s*verifyMode/);
    assert.match(source, /soundButton\.addEventListener\('click'/);
    assert.match(source, /if\s*\(verifyMode\)\s*return/);
    assert.match(source, /await\s+(?:audioContext|context)\.resume\(\)/);
  });
}

test('v4 embed exposes a child-frame gesture control and strictly keeps verify silent', async () => {
  const app = await read('../../headshot-pro-v04/preview/app.mjs');
  const wrapper = await read('../../headshot-pro-v04/embed.html');
  const v1Html = await read('../index.html');
  const v2Html = await read('../../headshot-pro-v02/index.html');
  const v3Html = await read('../../headshot-pro-v03/index.html');
  const v4Html = await read('../../headshot-pro-v04/index.html');
  assert.match(wrapper, /sourceUrl\.searchParams\.set\('embed',\s*'1'\)/);
  assert.match(wrapper, /has\('verify'\).*sourceUrl\.searchParams\.set\('verify',\s*'1'\)/s);
  assert.match(wrapper, /has\('galleryRelease'\).*sourceUrl\.searchParams\.set\('galleryRelease'/s);
  for (const html of [v1Html, v2Html, v3Html, v4Html]) assert.match(html, /headshotSfx=20260928-v40/);
  assert.match(app, /sound:\s*verifyMode\s*\?\s*null\s*:/);
  assert.match(app, /if\(verifyMode\)return false/);
  assert.match(app, /embedMode&&!verifyMode/);
  assert.match(app, /embedAudio\.addEventListener\('click'/);
  assert.match(app, /await context\.resume\(\)/);
  assert.match(app, /player\.controls=!verifyMode/);
  assert.match(app, /player\.muted=verifyMode/);
  assert.match(app, /player\.volume=verifyMode\?0/);
  assert.match(app, /if\(verifyMode\)\{\$\('audio'\)\.hidden=true;\$\('volume'\)\.disabled=true/);
  assert.match(app, /verify · audio muted/);
});
