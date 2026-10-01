'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const base = path.resolve(__dirname, '../public/sol61-vibe-coding/r1');
const html = fs.readFileSync(path.join(base, 'index.html'), 'utf8');
const runtime = fs.readFileSync(path.join(base, 'runtime-host.mjs'), 'utf8');

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} exists`);
  const brace = source.indexOf('{', source.indexOf(')', start));
  let depth = 0;
  for (let i = brace; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`unterminated ${name}`);
}

function statusRig() {
  const errorNode = { textContent: '', hidden: true };
  const statusNode = { textContent: '' };
  const state = { errors: [], errorGeneration: 0 };
  const logged = [];
  const context = vm.createContext({ state, errorNode, statusNode,
    console: { error: (...values) => logged.push(values) }, String });
  vm.runInContext(`${extractFunction(runtime, 'setStatus')}
    ${extractFunction(runtime, 'clearRuntimeError')}
    ${extractFunction(runtime, 'stageError')}`, context);
  return { context, errorNode, statusNode, state, logged };
}

test('embed preview exposes child failures outside the controls row', () => {
  const stage = html.match(/<main id="stage">([\s\S]*?)<\/main>/)?.[1] || '';
  assert.match(stage, /<pre id="error"[^>]*role="alert"[^>]*hidden><\/pre>/);
  assert.ok(html.indexOf('</main>') < html.indexOf('<div id="controls">'),
    'error surface is outside the controls container');
  assert.match(html, /html\.embed #controls \{ display:none; \}/);
  assert.match(runtime, /document\.querySelector\('#error'\)/);
  assert.match(html, /src="\.\/runtime-host\.mjs\?v=vibe-display-20261001-r2"/);
});

test('HTML bootstrap reports module-load failures before runtime-host starts', () => {
  const inline = html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
  assert.ok(inline, 'classic bootstrap listener is present before the module script');
  const moduleScript = {};
  const errorNode = { textContent: '', hidden: true };
  const listeners = new Map();
  const context = vm.createContext({
    document: { getElementById: id => id === 'error' ? errorNode : null,
      querySelector: selector => selector === 'script[type="module"]' ? moduleScript : null },
    window: { addEventListener: (name, listener) => listeners.set(name, listener) },
    String
  });
  vm.runInContext(inline, context);
  listeners.get('error')({ target: moduleScript, error: new Error('module import rejected') });
  assert.equal(errorNode.hidden, false);
  assert.match(errorNode.textContent, /module import rejected/);
  errorNode.hidden = true;
  listeners.get('unhandledrejection')({ reason: new Error('module evaluation failed') });
  assert.equal(errorNode.hidden, false);
  assert.match(errorNode.textContent, /module evaluation failed/);
});

test('startup and runtime errors are routed through the mirrored error surface', () => {
  assert.match(runtime, /await initialize\(\);\s*\} catch\(error\) \{ stageError\(error\); \}/);
  assert.match(runtime, /\}\)\.catch\(stageError\);/,
    'asynchronous frame and submitted-work failures use the same handler');
  assert.match(runtime, /unlockAudio\(\)\.catch\(stageError\)/);
  const rig = statusRig();
  rig.context.stageError(new Error('No WebGPU adapter'));
  assert.equal(rig.errorNode.hidden, false);
  assert.match(rig.errorNode.textContent, /No WebGPU adapter/);
  assert.match(rig.statusNode.textContent, /WebGPU error: No WebGPU adapter/);
  assert.equal(rig.state.errors.length, 1);
  assert.equal(rig.state.errorGeneration, 1);
  assert.equal(rig.logged.length, 1);
});

test('only a current successful GPU work completion clears the visible error', () => {
  const rig = statusRig();
  rig.context.stageError(new Error('render failure'));
  const failedGeneration = rig.state.errorGeneration;
  rig.context.stageError(new Error('later failure'));
  assert.equal(rig.state.errorGeneration, failedGeneration + 1);
  rig.context.clearRuntimeError();
  assert.equal(rig.errorNode.hidden, true);
  assert.equal(rig.errorNode.textContent, '');
  assert.equal(rig.state.errors.length, 2,
    'clearing the current banner preserves historical status API diagnostics');
  rig.context.stageError(new Error('GPU validation error'), true);
  rig.context.clearRuntimeError();
  assert.equal(rig.errorNode.hidden, false,
    'persistent GPU failures cannot be cleared by a successful queue completion');
  assert.equal(rig.state.persistentRuntimeError, true);
  assert.match(runtime, /const submittedErrorGeneration=state\.errorGeneration;\s*state\.device\.queue\.onSubmittedWorkDone\(\)\.then\(\(\)=>\{\s*if\(submittedErrorGeneration===state\.errorGeneration\)clearRuntimeError\(\);/);
  assert.match(runtime, /addEventListener\('uncapturederror',event=>stageError\(event\.error,true\)\)/);
  assert.match(runtime, /state\.device\.lost\.then\(info=>\{\s*if\(!state\.disposed\)stageError\(new Error\(`WebGPU device lost:/);
});

test('verification audio remains forced off and status API shape remains unchanged', () => {
  assert.match(runtime, /state\.normalMuted = VERIFY;/);
  assert.match(runtime, /if\s*\(VERIFY\)\s*state\.source\s*=\s*true;/);
  assert.match(runtime, /if\(VERIFY\)state\.audioContext=null;/);
  assert.match(runtime, /function galleryStatus\(\)\{return Object\.freeze\(/);
  assert.match(runtime, /errors:state\.errors\.length/);
  assert.match(runtime, /window\.vibeCodingR1=Object\.freeze\(\{status:\(\)=>\(/);
});
