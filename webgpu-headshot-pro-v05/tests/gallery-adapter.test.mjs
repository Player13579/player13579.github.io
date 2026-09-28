import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { audioAllowed, isVerifyMode, previewUrl } from '../preview/gallery-adapter.mjs';

test('gallery adapter forwards verify and gallery release to same-origin preview', () => {
  const url = previewUrl('https://example.test/webgpu-headshot-pro-v05/embed.html?verify=1&galleryRelease=20260928');
  assert.equal(url.origin, 'https://example.test');
  assert.equal(url.pathname, '/webgpu-headshot-pro-v05/index.html');
  assert.equal(url.searchParams.get('embed'), '1');
  assert.equal(url.searchParams.get('verify'), '1');
  assert.equal(url.searchParams.get('galleryRelease'), '20260928');
});

test('gallery-only stylesheet shows enlarged H64 projections and hides H32 diagnostics', () => {
  const css = readFileSync(new URL('../preview/embed.css', import.meta.url), 'utf8');
  assert.match(css, /\.native-cell:nth-child\(n \+ 3\)\s*\{[^}]*display:\s*none/s);
  assert.match(css, /\.native-cell canvas\[width="64"\]\s*\{[^}]*width:\s*min\(/s);
  assert.match(css, /header, footer, main > \.controls\s*\{[^}]*display:\s*none/s);
});

test('verification mode is opt-in and detects the query parameter', () => {
  assert.equal(isVerifyMode('?verify=1'), true);
  assert.equal(isVerifyMode('?verify'), true);
  assert.equal(isVerifyMode('?galleryRelease=20260928'), false);
  assert.equal(audioAllowed('?verify=1'), false);
  assert.equal(audioAllowed('?galleryRelease=20260928'), true);
});
