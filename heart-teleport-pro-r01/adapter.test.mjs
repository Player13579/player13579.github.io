import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const root = new URL('./', import.meta.url);
const html = readFileSync(new URL('index.html', root), 'utf8');
const js = readFileSync(new URL('preview.mjs', root), 'utf8');
const css = readFileSync(new URL('preview.css', root), 'utf8');

test('r0.1 preview uses the assigned path and preserved source modules', () => {
  assert.match(html, /preview\.mjs/);
  assert.match(js, /\.\/source\/src\/core\.mjs/);
  assert.match(js, /\.\/source\/src\/gpu\.mjs/);
});

test('r0.1 preview is controls-free, H64 dark/light, and silent in verify mode', () => {
  assert.match(html, /id="dark"/);
  assert.match(html, /id="light"/);
  assert.doesNotMatch(html, /<button\b|<select\b|<input\b|<details\b|<summary\b/);
  assert.match(js, /get\('verify'\) === '1'/);
  assert.match(js, /no audio module or audio resources created/);
  assert.match(js, /audio module is connected/);
  assert.match(js, /h: 64 \* dpr/);
  assert.doesNotMatch(js + css, /getContext\(['"]2d['"]\)|CanvasRenderingContext2D/);
});

test('r0.1 state reports replay, errors, provenance, and unaccepted quality/game/SFX', () => {
  for (const text of ['receiptCount', 'lastReceipt', 'errors', 'SOURCE_ZIP_SHA256', 'unreviewed; no artistic/quality acceptance', 'SFX and real listening expressly unaccepted', 'DVA game integration and authentication expressly unaccepted']) assert.ok(js.includes(text), text);
  assert.match(js, /fixture ID/);
});
