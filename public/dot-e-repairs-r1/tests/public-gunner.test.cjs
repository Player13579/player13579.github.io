const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const A = require('../adapter.js');
const apis = ['original', 'repaired'].map(version => require(`../gunner-${version}/production.js`));

function gpu() {
  const counts = { writes: 0, draws: 0, submit: 0, destroyed: 0, buffers: [] };
  const pass = { setPipeline() {}, setBindGroup() {}, setScissorRect() {}, draw() { counts.draws++; }, end() {} };
  const device = {
    queue: { writeBuffer() { counts.writes++; }, submit() { counts.submit++; }, async onSubmittedWorkDone() {} },
    createShaderModule: x => ({ ...x, getCompilationInfo: async () => ({ messages: [] }) }),
    createRenderPipeline: () => ({ getBindGroupLayout: () => ({}) }), createBindGroup: () => ({}),
    createBuffer() { const buffer = { destroys: 0, destroy() { this.destroys++; } }; counts.buffers.push(buffer); return buffer; },
    createCommandEncoder: () => ({ beginRenderPass: () => pass, finish: () => ({}) }),
    pushErrorScope() {}, async popErrorScope() { return null; }, addEventListener() {},
    lost: new Promise(() => {}), destroy() { counts.destroyed++; }
  };
  return { device, counts, pass };
}

test('public source pins and input files match byte for byte', () => {
  const m = JSON.parse(fs.readFileSync(path.join(root, 'MANIFEST.json'), 'utf8'));
  assert.equal(m.publicCommit, '56d0da8f810b52e3750a37d9c52ed72790860aa2');
  for (const entry of m.productionSources) {
    const bytes = fs.readFileSync(path.join(root, entry.path));
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), entry.sha256);
    assert.equal(crypto.createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), bytes])).digest('hex'), entry.gitBlobSha1);
    assert.equal(entry.sourceVisibility, 'public');
    const input = path.resolve(root, '../../../../gunner-e-review', entry.version === 'original' ? 'original' : 'patched', 'webgpu-gunner-shot-e.js');
    if (fs.existsSync(input)) assert.deepEqual(bytes, fs.readFileSync(input));
  }
  assert.equal(m.productionSources[0].gitBlobSha1, 'ff4ce3908856d40cc0958ba71be46384d803ae09');
  assert.equal(m.productionSources[0].bytes, 11587);
  const original = fs.readFileSync(path.join(root, 'gunner-original/production.js'), 'utf8');
  const repaired = fs.readFileSync(path.join(root, 'gunner-repaired/production.js'), 'utf8');
  assert.equal(repaired, original
    .replace('1.0-smoothstep(.82,1.0,t),reduced)', '1.0-smoothstep(.82,1.0,p.detail.x),reduced)')
    .replace('length * zoom * Math.max(dprX, dprY), 0, 0, 0, 0]', 'length * zoom * Math.max(dprX, dprY), progress, 0, 0, 0]'));
});

test('new direct-effect fixture matches only the public API and covers every variant', () => {
  const expectedKeys = ['actor', 'actorVisible', 'alpha', 'anchor', 'camera', 'effect', 'now', 'phase', 'reducedMotion', 'viewerId', 'viewport', 'zoom'];
  for (const api of apis) for (const variant of A.VARIANTS) for (const reducedMotion of [false, true]) {
    const f = A.fixture({ variant, reducedMotion });
    assert.deepEqual(Object.keys(f).sort(), expectedKeys);
    assert.deepEqual(Object.keys(f.effect).sort(), ['duration', 'id', 'playerId', 'radius', 'startedAt', 'targetX', 'targetY', 'type', 'variant', 'x', 'y']);
    assert.ok(Object.isFrozen(f.effect)); assert.equal(api.plan(f).progress, .375);
    assert.equal(api.plan(A.fixture({ elapsedMs: 0 })), null);
    assert.equal(api.plan(A.fixture({ elapsedMs: 1200 })), null);
  }
});

test('production coordinate mapping and original/repaired fade differences remain intact', () => {
  const f = A.fixture({ pixelWidth: 1960, pixelHeight: 1240, reducedMotion: true, elapsedMs: 1000 });
  const a = apis[0].plan(f), b = apis[1].plan(f);
  assert.deepEqual(b.source, { x: 349, y: 318 });
  assert.equal(b.values[2], 698); assert.equal(b.values[3], 636); assert.equal(b.values[4], 1340);
  assert.equal(a.values[12], 0); assert.ok(Math.abs(b.values[12] - 5 / 6) < 1e-6);
  assert.equal(a.values[6], 1); assert.equal(b.values[6], 1);
});

test('actual public production create/record APIs encode and release buffers using mock GPU', () => {
  for (const api of apis) {
    const { device, counts, pass: nativePass } = gpu(), owner = A.createOwner(device, 'rgba8unorm');
    const effectPass = api.create({ frameOwner: owner });
    for (const elapsedMs of [100, 450, 900]) {
      const frame = A.createFrame(), result = A.record(api, effectPass, A.fixture({ elapsedMs }), frame);
      assert.equal(result.drawn, 1); assert.equal(frame.commands.length, 1);
      frame.encode(nativePass, { device, format: owner.format, width: 980, height: 620 });
    }
    assert.equal(counts.draws, 3); assert.equal(counts.writes, 3); assert.equal(counts.buffers.length, 1);
    effectPass.destroy(); effectPass.destroy(); owner.dispose(); owner.dispose();
    assert.equal(owner.ownedCount, 0); assert.equal(counts.buffers[0].destroys, 1);
  }
});

function browser({ absent = false, compileError = false, version = 'repaired', holdInitialization = '' } = {}) {
  const { device, counts } = gpu(), elements = new Map(), listeners = new Map(), scheduled = new Map();
  let loseDevice;
  device.addEventListener = (type, fn) => listeners.set(`device:${type}`, fn);
  device.lost = new Promise(resolve => { loseDevice = resolve; });
  let releaseInitialization, announceHold;
  const initializationHeld = new Promise(resolve => { announceHold = resolve; });
  const hold = value => { const pending = new Promise(resolve => { releaseInitialization = () => resolve(value); }); announceHold(); return pending; };
  if (holdInitialization) {
    const create = device.createShaderModule.bind(device), pop = device.popErrorScope.bind(device);
    let checks = 0, pops = 0;
    device.createShaderModule = descriptor => { const module = create(descriptor), info = module.getCompilationInfo.bind(module);
      module.getCompilationInfo = () => { checks++; return holdInitialization === `shader${checks}` ? hold({ messages: [] }) : info(); }; return module; };
    device.popErrorScope = async () => { const value = await pop(); return ++pops === 1 && holdInitialization === 'pipeline' ? hold(value) : value; };
  }
  const contexts = [], context = { configure() {}, unconfigure() {}, getCurrentTexture: () => ({ createView: () => ({}) }) };
  if (compileError) device.createShaderModule = () => ({ getCompilationInfo: async () => ({ messages: [{ type: 'error', message: 'Injected compile error' }] }) });
  const doc = { body: { dataset: { version } }, hidden: false,
    getElementById(id) { if (!elements.has(id)) elements.set(id, { width: 980, height: 620, value: '', disabled: true,
      addEventListener(type, fn) { listeners.set(`${id}:${type}`, fn); }, getContext(type) { contexts.push(type); return context; } }); return elements.get(id); },
    addEventListener(type, fn) { listeners.set(`document:${type}`, fn); } };
  let sequence = 0;
  const box = { document: doc, navigator: absent ? {} : { gpu: { requestAdapter: async () => ({ requestDevice: async () => device }), getPreferredCanvasFormat: () => 'rgba8unorm' } },
    location: { search: '?verify=1' }, performance: { now: () => 1000 }, URLSearchParams, Float32Array,
    requestAnimationFrame(fn) { scheduled.set(++sequence, fn); return sequence; }, cancelAnimationFrame(id) { scheduled.delete(id); },
    addEventListener(type, fn) { listeners.set(`window:${type}`, fn); },
    DvaPublicGunnerPreviewAdapter: A, DvaWebGPUGunnerShotE: apis[version === 'original' ? 0 : 1] };
  box.window = box;
  vm.runInNewContext(fs.readFileSync(path.join(root, 'host.js'), 'utf8'), box);
  return { preview: box.__webgpuEPreview, counts, contexts, scheduled, listeners, doc, device, loseDevice, elements,
    initializationHeld, releaseInitialization: () => releaseInitialization() };
}

test('mock browser handles paused frame, scrubbing, repeated controls, visibility and disposal', async () => {
  const h = browser(), initial = await h.preview.ready;
  assert.equal(initial.status, 'paused'); assert.equal(initial.frames, 1); assert.equal(initial.hardMuted, true);
  assert.equal(initial.audioContextsCreated, 0); assert.deepEqual(h.contexts, ['webgpu']);
  assert.equal((await h.preview.seek(700)).elapsedMs, 700);
  assert.equal((await h.preview.setReducedMotion(true)).reducedMotion, true);
  h.preview.play(); h.preview.play(); assert.equal(h.scheduled.size, 1);
  h.doc.hidden = true; h.listeners.get('document:visibilitychange')(); assert.equal(h.scheduled.size, 0);
  h.preview.dispose(); h.preview.dispose(); assert.equal(h.preview.snapshot().status, 'disposed');
  assert.equal(h.counts.destroyed, 1); assert.ok(h.counts.buffers.every(item => item.destroys === 1));
});

test('unsupported and injected shader failures remain errors, with no claimed GPU completion', async () => {
  for (const args of [{ absent: true }, { compileError: true }]) {
    const h = browser(args), state = await h.preview.ready;
    assert.equal(state.ready, false); assert.equal(state.status, 'error'); assert.equal(state.frames, 0);
    assert.equal(state.errors.length, 1); assert.equal(h.counts.submit, 0); h.preview.dispose();
  }
});

test('pending GPU completion cannot overwrite an asynchronous error or device-loss state in either version', async () => {
  for (const version of ['original', 'repaired']) for (const kind of ['uncaptured', 'lost']) {
    const h = browser({ version }), initial = await h.preview.ready;
    let completeSubmission;
    h.device.queue.onSubmittedWorkDone = () => new Promise(resolve => { completeSubmission = resolve; });
    const pending = h.preview.seek(700);
    assert.equal(typeof completeSubmission, 'function');
    if (kind === 'uncaptured') h.listeners.get('device:uncapturederror')({ error: new Error('Injected asynchronous validation error') });
    else { h.loseDevice({ reason: 'unknown', message: 'Injected device loss' }); await Promise.resolve(); }
    assert.equal(h.preview.snapshot().status, 'error');
    completeSubmission();
    const result = await pending;
    assert.equal(result.status, 'error'); assert.equal(result.ready, false); assert.equal(result.frames, initial.frames);
    assert.match(h.elements.get('status').textContent, /WebGPU unavailable or rejected/);
    assert.doesNotMatch(h.elements.get('status').textContent, /Paused|draw submitted/);
    assert.equal(h.elements.get('play').disabled, true); assert.equal(h.counts.destroyed, 1);
    assert.ok(h.counts.buffers.every(buffer => buffer.destroys === 1));
    h.preview.play(); assert.equal(h.scheduled.size, 0); h.preview.dispose();
  }
});

test('every held initialization boundary preserves asynchronous terminal errors in both versions', async () => {
  for (const version of ['original', 'repaired']) for (const boundary of ['shader1', 'shader2', 'pipeline'])
    for (const kind of ['uncaptured', 'lost']) {
      const h = browser({ version, holdInitialization: boundary });
      await h.initializationHeld;
      if (kind === 'uncaptured') h.listeners.get('device:uncapturederror')({ error: new Error('Injected initialization validation error') });
      else { h.loseDevice({ reason: 'unknown', message: 'Injected initialization device loss' }); await Promise.resolve(); }
      h.releaseInitialization();
      const result = await h.preview.ready;
      assert.equal(result.status, 'error'); assert.equal(result.ready, false); assert.equal(result.frames, 0);
      assert.equal(h.counts.submit, 0); assert.equal(h.counts.destroyed, 1);
      assert.equal(h.elements.get('play').disabled, true);
      assert.ok(h.counts.buffers.every(buffer => buffer.destroys === 1));
      h.preview.dispose();
    }
});

test('closed gunner-only dependency graph has no audio, game mutation, or alternate canvas backend', () => {
  for (const version of ['original', 'repaired']) {
    const file = path.join(root, `gunner-${version}/index.html`), html = fs.readFileSync(file, 'utf8');
    assert.match(html, /width="980" height="620"/);
    for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
      const item = path.resolve(path.dirname(file), match[1]); assert.ok(item.startsWith(root + path.sep)); assert.ok(fs.existsSync(item));
    }
  }
  const source = ['adapter.js', 'host.js'].map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n');
  assert.doesNotMatch(source, /getContext\s*\(\s*['"]2d['"]|OffscreenCanvas|new\s+AudioContext|new\s+Audio\b/);
  assert.doesNotMatch(source, /fetch\s*\(|WebSocket|XMLHttpRequest|(?:app|game)\.js|localStorage|parent\.|top\./);
  const globals = [...source.matchAll(/window\.(Dva\w+)/g)].map(item => item[1]);
  assert.deepEqual(globals, ['DvaPublicGunnerPreviewAdapter', 'DvaWebGPUGunnerShotE']);
  for (const query of ['', '?verify', '?verify=1&muted=0', '?sound=1']) assert.equal(A.options(query).muted, true);
  assert.equal(A.options().autoplay, false); assert.equal(A.options('?autoplay=1&t=600').autoplay, false);
});
