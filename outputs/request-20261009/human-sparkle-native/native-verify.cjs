'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const http = require('node:http');
const https = require('node:https');
const { chromium } = require('C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const PINS = Object.freeze({
  r5Manifest: '2d4eccd78bc79fcb3f27bd99f187b67e2b20c5581e2da106bda8c9bf4b7948b3',
  r6Manifest: '5d2b0227669016ea7d229623272d714ea98f50bc194576efde2e8b27b590f4e7',
  r6Ready: '8da5863a6a2aef8f3f74be09fc7286ac896db128680e964449ca2ffbab5d54a0',
  r6Seal: 'e4e13985d608b01f8419655dcfb540f4b6096553a89fd4eb78c5613aaca17c40',
});
const R5_BASE = 'https://player13579.github.io/public/sol61-human-transmutation/r5/';
const R5_MANIFEST_URL = `${R5_BASE}package-manifest.json?verify=1`;
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PLAYWRIGHT_PACKAGE = 'C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json';
const WIDTH = 980;
const VIEWPORT_HEIGHT = 480;
const HEIGHTS = [64, 128];
const PHASES = [450, 650, 850, 1050];

function arg(name) { const i = process.argv.indexOf(name); return i < 0 ? null : process.argv[i + 1] ?? null; }
function sha(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex'); }
function readJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function assert(condition, message) { if (!condition) throw new Error(message); }
function pngInfo(bytes) {
  assert(bytes.length >= 24 && bytes.subarray(0, 8).toString('hex') === '89504e470d0a1a0a' && bytes.subarray(12, 16).toString('ascii') === 'IHDR', 'capture is not PNG');
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}
function requestBytes(url) {
  return new Promise((resolve, reject) => {
    const client = new URL(url).protocol === 'https:' ? https : http;
    client.get(url, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve({ status: response.statusCode, bytes: Buffer.concat(chunks), url }));
    }).on('error', reject);
  });
}
function safeRelativePath(root, pathname) {
  const decoded = decodeURIComponent(pathname);
  const relative = decoded.replace(/^\/+/, '');
  const target = path.resolve(root, relative);
  if (!target.startsWith(path.resolve(root) + path.sep)) throw new Error('path escapes package root');
  return { relative: relative.replaceAll('\\', '/'), target };
}

const packageRoot = path.resolve(arg('--r6-root') || '');
const outputRoot = path.resolve(arg('--output-root') || '');
assert(arg('--r6-root') && arg('--output-root'), 'usage: node native-verify.cjs --r6-root <frozen-R6-root> --output-root <owned-output-root>');
assert(fs.existsSync(path.join(packageRoot, 'package-manifest.json')), 'frozen R6 package manifest is missing');
assert(path.resolve(packageRoot) !== path.resolve(outputRoot) && !outputRoot.startsWith(packageRoot + path.sep) && !packageRoot.startsWith(outputRoot + path.sep), 'R6 source root and owned output root must be separate trees');
assert(fs.existsSync(EDGE), `Microsoft Edge executable not found: ${EDGE}`);
assert(fs.existsSync(PLAYWRIGHT_PACKAGE), 'configured Playwright runtime is unavailable');

const attemptId = crypto.randomUUID();
const attemptDir = path.join(outputRoot, 'native-attempts', attemptId);
fs.mkdirSync(attemptDir, { recursive: true });
const report = {
  schema: 'human-transmutation-native-compare/v1', attemptId, status: 'INCOMPLETE',
  expectedPins: PINS, packageRoot, outputRoot, attemptDir,
  browser: { name: 'Microsoft Edge', executable: EDGE, headless: true, launchArgs: ['--mute-audio', '--disable-background-networking', '--enable-unsafe-webgpu', '--enable-features=Vulkan', '--ignore-gpu-blocklist'], sandboxDisablingFlagSupplied: false },
  viewport: { width: WIDTH, height: VIEWPORT_HEIGHT, deviceScaleFactor: 1 },
  matrix: { actorHeights: HEIGHTS, phasesMs: PHASES, unsupportedHeightSkipped: { height: 192, reason: 'R5 and frozen R6 fixture APIs explicitly accept only H48/H64/H128.' } },
  r5: { baseUrl: R5_BASE, manifestUrl: R5_MANIFEST_URL, preflight: [], requests: [], captures: [] },
  r6: { localUrl: null, preflight: [], requests: [], captures: [] },
  browserErrors: [], pageErrors: [], gpuErrors: [], validationErrors: [], queue: [], replay: {}, cleanup: {},
};

const MIME = { '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.png': 'image/png', '.json': 'application/json; charset=utf-8' };
let server, browser, context, currentPage;
let r6ExpectedByPath = new Map();
let r5ExpectedByPath = new Map();

async function preflightR5() {
  const manifestResponse = await requestBytes(R5_MANIFEST_URL);
  const manifestSha = sha(manifestResponse.bytes);
  report.r5.preflight.push({ path: 'package-manifest.json', url: manifestResponse.url, status: manifestResponse.status, expectedSha256: PINS.r5Manifest, actualSha256: manifestSha, match: manifestResponse.status === 200 && manifestSha === PINS.r5Manifest });
  assert(manifestResponse.status === 200 && manifestSha === PINS.r5Manifest, 'public R5 package manifest pin mismatch');
  const manifest = JSON.parse(manifestResponse.bytes.toString('utf8'));
  assert(manifest.versionId === 'human-transmutation-sol61-r5', 'R5 manifest version identity mismatch');
  const closure = manifest.runtime?.runtimeClosure;
  assert(Array.isArray(closure) && closure.length, 'R5 manifest has no runtimeClosure');
  const pins = new Map((manifest.files || []).map(x => [x.path, x.sha256]));
  r5ExpectedByPath = pins;
  for (const rel of closure) {
    const expectedSha256 = pins.get(rel);
    assert(expectedSha256, `R5 runtime path has no manifest pin: ${rel}`);
    const got = await requestBytes(new URL(`${rel}?verify=1`, R5_BASE).href);
    const actualSha256 = sha(got.bytes);
    const entry = { path: rel, url: got.url, status: got.status, bytes: got.bytes.length, expectedSha256, actualSha256, match: got.status === 200 && actualSha256 === expectedSha256 };
    report.r5.preflight.push(entry);
    assert(entry.match, `public R5 runtime source pin mismatch: ${rel}`);
  }
  report.r5.versionId = manifest.versionId;
  report.r5.runtimeClosure = closure;
}

function validateR6Package() {
  const manifestPath = path.join(packageRoot, 'package-manifest.json');
  const readyPath = path.join(packageRoot, 'READY.json');
  const sealPath = path.join(packageRoot, 'SEAL.json');
  const manifestBytes = fs.readFileSync(manifestPath);
  const readyBytes = fs.readFileSync(readyPath);
  const sealBytes = fs.readFileSync(sealPath);
  const manifestSha = sha(manifestBytes), readySha = sha(readyBytes), sealSha = sha(sealBytes);
  assert(manifestSha === PINS.r6Manifest, `R6 immutable manifest SHA mismatch: ${manifestSha}`);
  assert(readySha === PINS.r6Ready, `R6 READY marker SHA mismatch: ${readySha}`);
  assert(sealSha === PINS.r6Seal, `R6 seal SHA mismatch: ${sealSha}`);
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  const ready = JSON.parse(readyBytes.toString('utf8'));
  const seal = JSON.parse(sealBytes.toString('utf8'));
  assert(ready.status === 'READY_FOR_PRIMARY_NATIVE_WEBGPU_VERIFICATION' && ready.immutableAfterReady === true, 'R6 READY marker does not authorize native verification');
  assert(ready.versionId === 'human-transmutation-sol61-r6' && manifest.versionId === ready.versionId && seal.versionId === ready.versionId, 'R6 version identity mismatch');
  assert(ready.packageManifestSha256 === manifestSha && seal.packageManifestSha256 === manifestSha, 'R6 manifest linkage mismatch');
  assert(manifest.runtime?.canvasCssExtent?.[0] === WIDTH && manifest.runtime?.canvasCssExtent?.[1] === VIEWPORT_HEIGHT, 'R6 embed extent differs from comparison extent');
  const closure = manifest.runtime?.runtimeClosure;
  assert(Array.isArray(closure) && closure.includes('index.html') && closure.includes('preview.mjs') && closure.includes('fixture.mjs'), 'R6 standalone native entry closure incomplete');
  assert(manifest.effectCorrection?.siteCount === 25, 'R6 25-site correction contract mismatch');
  assert(manifest.effectCorrection?.r6Optics?.rayLengthH64 === 2.2 && manifest.effectCorrection?.r6Optics?.secondaryRayLengthH64 === 1.65 && manifest.effectCorrection?.r6Optics?.rayWidthH64 === 0.22 && manifest.effectCorrection?.r6Optics?.sourceRadiusH64 === 0.45, 'R6 sparkle correction contract mismatch');
  const filePins = new Map((seal.files || []).map(x => [x.path, x]));
  assert(filePins.size === seal.contentFileCount + 1 && filePins.has('package-manifest.json'), 'R6 seal list must include the manifest plus its declared content files');
  for (const item of manifest.files || []) {
    const sealed = filePins.get(item.path);
    assert(sealed && sealed.sha256 === item.sha256 && sealed.bytes === item.bytes, `R6 manifest/seal pin disagreement: ${item.path}`);
  }
  for (const item of seal.files || []) {
    const bytes = fs.readFileSync(path.join(packageRoot, item.path));
    assert(bytes.length === item.bytes && sha(bytes) === item.sha256, `R6 sealed content mismatch: ${item.path}`);
  }
  r6ExpectedByPath = new Map((manifest.files || []).map(x => [x.path, x.sha256]));
  for (const rel of closure) assert(r6ExpectedByPath.has(rel), `R6 closure lacks source pin: ${rel}`);
  const fixtureText = fs.readFileSync(path.join(packageRoot, 'fixture.mjs'), 'utf8');
  const allowed = fixtureText.match(/\[([^\]]+)\]\.includes\(height\)/)?.[1]?.split(',').map(x => Number(x.trim()));
  assert(allowed && allowed.includes(64) && allowed.includes(128) && !allowed.includes(192), 'R6 fixture height contract differs from H64/H128 and unsupported H192 matrix');
  report.r6.versionId = manifest.versionId;
  report.r6.manifestSha256 = manifestSha;
  report.r6.readySha256 = readySha;
  report.r6.sealSha256 = sealSha;
  report.r6.runtimeClosure = closure;
  report.r6.fixtureHeights = allowed;
  return manifest;
}

function startLocalHost() {
  server = http.createServer((req, res) => {
    try {
      const u = new URL(req.url, 'http://127.0.0.1');
      if (u.pathname === '/favicon.ico') { res.writeHead(204); return res.end(); }
      const { relative, target } = safeRelativePath(packageRoot, u.pathname === '/' ? '/index.html' : u.pathname);
      if (!r6ExpectedByPath.has(relative)) { res.writeHead(403); return res.end('path not in sealed runtime closure'); }
      const bytes = fs.readFileSync(target), actualSha256 = sha(bytes), expectedSha256 = r6ExpectedByPath.get(relative);
      const record = { path: relative, status: 200, bytes: bytes.length, actualSha256, expectedSha256, match: actualSha256 === expectedSha256 };
      report.r6.requests.push(record);
      res.writeHead(200, { 'content-type': MIME[path.extname(target)] || 'application/octet-stream', 'cache-control': 'no-store', 'content-length': bytes.length });
      res.end(bytes);
    } catch (error) {
      report.r6.requests.push({ path: req.url, status: 404, error: String(error?.message || error) });
      res.writeHead(404); res.end('not found');
    }
  });
  return new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', () => resolve(server.address())); });
}

async function preflightR6(address) {
  for (const rel of report.r6.runtimeClosure) {
    const got = await requestBytes(`http://127.0.0.1:${address.port}/${rel}`);
    const expectedSha256 = r6ExpectedByPath.get(rel), actualSha256 = sha(got.bytes);
    const entry = { path: rel, status: got.status, bytes: got.bytes.length, expectedSha256, actualSha256, match: got.status === 200 && actualSha256 === expectedSha256 };
    report.r6.preflight.push(entry);
    assert(entry.match, `local R6 served source pin mismatch: ${rel}`);
  }
  report.r6.localUrl = `http://127.0.0.1:${address.port}/index.html?verify=1&embed=1&height=64`;
}

async function installObservationInitScript() {
  await context.addInitScript(() => {
    const state = window.__humanNativeObservation = { adapters: [], devices: [], deviceErrors: [], deviceLosses: [], validationErrors: [], shaderModules: [], queue: [], instrumentationErrors: [] };
    try {
      const gpu = navigator.gpu;
      if (!gpu) return;
      const gpuProto = Object.getPrototypeOf(gpu), requestAdapter = gpuProto.requestAdapter;
      if (typeof requestAdapter !== 'function') return;
      gpuProto.requestAdapter = async function(...args) {
        const adapter = await requestAdapter.apply(this, args);
        if (!adapter) return adapter;
        try {
          const info = adapter.info || null;
          state.adapters.push({ info: info ? { vendor: info.vendor || null, architecture: info.architecture || null, device: info.device || null, description: info.description || null } : null, isFallbackAdapter: typeof adapter.isFallbackAdapter === 'boolean' ? adapter.isFallbackAdapter : null });
          const adapterProto = Object.getPrototypeOf(adapter), requestDevice = adapterProto.requestDevice;
          if (typeof requestDevice === 'function' && !adapterProto.__humanObserved) {
            Object.defineProperty(adapterProto, '__humanObserved', { value: true });
            adapterProto.requestDevice = async function(...deviceArgs) {
              const device = await requestDevice.apply(this, deviceArgs);
              state.devices.push({ label: device.label || null });
              device.addEventListener('uncapturederror', event => state.deviceErrors.push({ name: event.error?.name || 'GPUError', message: event.error?.message || String(event.error) }));
              void device.lost.then(info => state.deviceLosses.push({ reason: info.reason, message: info.message || null })).catch(error => state.deviceLosses.push({ error: String(error) }));
              const deviceProto = Object.getPrototypeOf(device);
              const pop = deviceProto.popErrorScope;
              if (typeof pop === 'function' && !deviceProto.__humanObserved) {
                Object.defineProperty(deviceProto, '__humanObserved', { value: true });
                deviceProto.popErrorScope = async function(...popArgs) {
                  const error = await pop.apply(this, popArgs);
                  if (error) state.validationErrors.push({ name: error.name, message: error.message });
                  return error;
                };
              }
              const queue = device.queue;
              if (queue) {
                const queueProto = Object.getPrototypeOf(queue), done = queueProto.onSubmittedWorkDone;
                if (typeof done === 'function' && !queueProto.__humanObserved) {
                  Object.defineProperty(queueProto, '__humanObserved', { value: true });
                  queueProto.onSubmittedWorkDone = function(...doneArgs) {
                    const item = { started: performance.now(), settled: false, rejected: null };
                    state.queue.push(item);
                    return done.apply(this, doneArgs).then(value => { item.settled = true; item.completedAt = performance.now(); return value; }, error => { item.settled = true; item.rejected = String(error?.message || error); throw error; });
                  };
                }
              }
              return device;
            };
          }
        } catch (error) { state.instrumentationErrors.push(String(error?.message || error)); }
        return adapter;
      };
    } catch (error) { state.instrumentationErrors.push(String(error?.message || error)); }
  });
}

async function runVersion({ name, url, expectedVersion }) {
  const errors = [];
  const ignoredAuxiliaryErrors = [];
  const responseTasks = [];
  currentPage = await context.newPage();
  currentPage.on('pageerror', error => { const item = { version: name, kind: 'pageerror', message: String(error) }; errors.push(item); report.pageErrors.push(item); });
  currentPage.on('console', message => { if (message.type() === 'error') {
    const locationUrl = message.location()?.url || '';
    const item = { version: name, kind: 'console', message: message.text(), locationUrl };
    if (/favicon\.ico(?:$|\?)/i.test(locationUrl) && /404/.test(message.text())) { ignoredAuxiliaryErrors.push(item); return; }
    errors.push(item); report.browserErrors.push(item);
  } });
  currentPage.on('requestfailed', request => { const item = { version: name, kind: 'requestfailed', url: request.url(), failure: request.failure()?.errorText || null }; errors.push(item); report.browserErrors.push(item); });
  currentPage.on('response', response => {
    const u = response.url();
    const urlPath = new URL(u).pathname;
    const r5PathPrefix = new URL(R5_BASE).pathname;
    const rel = name === 'r5' && urlPath.startsWith(r5PathPrefix) ? urlPath.slice(r5PathPrefix.length) : urlPath.replace(/^\//, '');
    const pins = name === 'r6' ? r6ExpectedByPath : r5ExpectedByPath;
    const expectedSha256 = pins.get(rel);
    if (expectedSha256) responseTasks.push((async () => {
      try {
        const bytes = await response.body();
        const actualSha256 = sha(bytes);
        const item = { path: rel, status: response.status(), bytes: bytes.length, expectedSha256, actualSha256, match: response.status() === 200 && actualSha256 === expectedSha256 };
        report[name].browserResponses = (report[name].browserResponses || []).concat([item]);
        if (!item.match) { errors.push({ version: name, kind: 'source-response-pin', ...item }); }
      } catch (error) { errors.push({ version: name, kind: 'source-response-body', path: rel, error: String(error?.message || error) }); }
    })());
    if (response.status() >= 400) {
      const item = { version: name, path: urlPath, status: response.status(), url: u };
      if (/favicon\.ico$/i.test(urlPath) && response.status() === 404) ignoredAuxiliaryErrors.push(item);
      else { report.browserErrors.push({ kind: 'http-response', ...item }); errors.push({ kind: 'http-response', ...item }); }
    }
  });
  const navigation = await currentPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  assert(navigation?.status() === 200, `${name} navigation failed with HTTP ${navigation?.status()}`);
  await currentPage.waitForFunction(() => window.__humanReady === true && window.__human?.getState?.().ready === true, null, { timeout: 45000 });
  const startup = await currentPage.evaluate(() => {
    const state = window.__human.getState();
    const canvas = document.querySelector('#stage'), rect = canvas?.getBoundingClientRect();
    return { url: location.href, verifyQuery: new URL(location.href).searchParams.get('verify'), embedQuery: new URL(location.href).searchParams.get('embed'), title: document.title, readyGlobal: window.__humanReady, state, canvas: canvas ? { cssWidth: rect.width, cssHeight: rect.height, context: canvas.getContext('webgpu') ? 'webgpu' : null, pixelWidth: canvas.width, pixelHeight: canvas.height } : null, observation: window.__humanNativeObservation || null };
  });
  assert(startup.verifyQuery === '1' && startup.state.verify === true, `${name} verify mode is not active`);
  assert(startup.embedQuery === '1' && startup.canvas?.context === 'webgpu', `${name} is not on the expected embed WebGPU surface`);
  assert(startup.canvas.cssWidth === WIDTH && startup.canvas.cssHeight === VIEWPORT_HEIGHT, `${name} canvas CSS extent mismatch: ${JSON.stringify(startup.canvas)}`);
  assert(startup.state.fatal === null, `${name} startup fatal: ${startup.state.fatal}`);
  assert(startup.state.audio?.verify === true && startup.state.audio?.allocated === false, `${name} verify audio mute/allocation contract failed`);
  assert(startup.state.receipt?.version === expectedVersion, `${name} exact runtime version mismatch: ${startup.state.receipt?.version}`);
  report[name].startup = startup;

  for (const height of HEIGHTS) {
    const controlState = await currentPage.evaluate(async h => window.__human.controls({ height: h, source: true, observer: true, glints: true, background: 'dark' }), height);
    assert(controlState.fatal === null, `${name} height ${height} control failed: ${controlState.fatal}`);
    for (const phaseMs of PHASES) {
      const state = await currentPage.evaluate(ms => window.__human.hold(ms), phaseMs);
      const receipt = state.receipt;
      assert(state.ready && state.fatal === null && state.verify === true, `${name} H${height} t${phaseMs} runtime state failed`);
      assert(receipt?.version === expectedVersion, `${name} phase version mismatch at H${height} t${phaseMs}`);
      assert(receipt.elapsedMs === phaseMs, `${name} phase drift at H${height} t${phaseMs}: ${receipt?.elapsedMs}`);
      assert(receipt.actualActorHeight === height, `${name} actual actor height mismatch: requested ${height}, rendered ${receipt?.actualActorHeight}`);
      assert(receipt.cssExtent?.[0] === WIDTH && receipt.cssExtent?.[1] === VIEWPORT_HEIGHT, `${name} receipt CSS extent mismatch`);
      assert(receipt.physicalExtent?.[0] === WIDTH && receipt.physicalExtent?.[1] === VIEWPORT_HEIGHT, `${name} backing extent mismatch: ${JSON.stringify(receipt.physicalExtent)}`);
      assert(receipt.submitted > 0 && receipt.completed === receipt.submitted && receipt.queueCompleted === true, `${name} queue completion receipt failed: ${JSON.stringify(receipt)}`);
      assert(receipt.passes === 4, `${name} expected four real render passes, got ${receipt.passes}`);
      const file = `${name}-h${height}-t${phaseMs}.png`, filePath = path.join(attemptDir, file);
      const screenshot = await currentPage.screenshot({ path: filePath, type: 'png', fullPage: false, animations: 'disabled' });
      const dimensions = pngInfo(screenshot);
      assert(dimensions.width === WIDTH && dimensions.height === VIEWPORT_HEIGHT, `${name} PNG dimensions mismatch: ${JSON.stringify(dimensions)}`);
      const [glints, emission] = await currentPage.evaluate(async () => Promise.all([window.__human.inspectGlints(), window.__human.inspectEmission()]));
      assert(glints.queueCompleted === true && emission.queueCompleted === true, `${name} attachment readback queue did not complete`);
      const capture = { label: file.replace('.png', ''), path: filePath, sha256: sha(screenshot), bytes: screenshot.length, png: dimensions, phaseMs, requestedActorHeight: height, actualActorHeight: receipt.actualActorHeight, receipt, glints, emission };
      report[name].captures.push(capture);
    }
  }

  const replay = await currentPage.evaluate(async () => {
    const api = window.__human, before = api.getState();
    const accepted = await api.replay();
    return { beforeLoops: before.loops, accepted: accepted.ready && accepted.fatal === null, replayState: { loops: accepted.loops, generation: accepted.generation, causeId: accepted.causeId, running: accepted.running, fatal: accepted.fatal } };
  });
  const targetLoops = replay.beforeLoops + 2;
  await currentPage.waitForFunction(target => { const s = window.__human?.getState(); return !s || s.fatal || s.loops >= target; }, targetLoops, { timeout: 9000, polling: 50 });
  const replayAfter = await currentPage.evaluate(() => {
    const s = window.__human.getState();
    return { loops: s.loops, generation: s.generation, causeId: s.causeId, running: s.running, fatal: s.fatal, receipt: s.receipt, compilationMessages: s.compilationMessages, renderer: s.renderer, observation: window.__humanNativeObservation };
  });
  assert(replay.accepted && replayAfter.fatal === null && replayAfter.running && replayAfter.loops >= targetLoops, `${name} continuous replay did not complete two new natural loops: ${JSON.stringify({ replay, replayAfter })}`);
  assert(replayAfter.receipt?.version === expectedVersion && replayAfter.receipt.queueCompleted === true && replayAfter.receipt.completed === replayAfter.receipt.submitted, `${name} final continuous replay receipt failed`);
  const compileErrors = (replayAfter.compilationMessages || []).filter(x => x.type === 'error');
  assert(compileErrors.length === 0, `${name} shader compilation errors: ${JSON.stringify(compileErrors)}`);
  assert((replayAfter.observation?.deviceErrors || []).length === 0 && (replayAfter.observation?.deviceLosses || []).length === 0, `${name} GPU device error or loss`);
  assert((replayAfter.observation?.validationErrors || []).length === 0, `${name} GPU validation errors: ${JSON.stringify(replayAfter.observation.validationErrors)}`);
  const queueEvents = replayAfter.observation?.queue || [];
  const rejectedQueueEvents = queueEvents.filter(x => x.rejected);
  const completedQueueEvents = queueEvents.filter(x => x.settled && !x.rejected);
  replayAfter.observation.queueSummary = { observed: queueEvents.length, completed: completedQueueEvents.length, rejected: rejectedQueueEvents.length, stillInFlightAtSnapshot: queueEvents.filter(x => !x.settled).length };
  assert(completedQueueEvents.length > 0 && rejectedQueueEvents.length === 0, `${name} observed a rejected or never-completed queue operation: ${JSON.stringify(replayAfter.observation.queueSummary)}`);
  await Promise.all(responseTasks);
  assert(errors.length === 0, `${name} browser errors: ${JSON.stringify(errors)}`);
  const loadedResponses = report[name].browserResponses || [];
  assert(loadedResponses.length > 0 && loadedResponses.every(x => x.match), `${name} browser-loaded runtime responses do not match pinned bytes`);
  report[name].ignoredAuxiliaryErrors = ignoredAuxiliaryErrors;
  report[name].replay = { ...replay, targetLoops, after: replayAfter };
  report[name].errors = errors;
  await currentPage.close(); currentPage = null;
}

async function main() {
  report.startedAt = new Date().toISOString();
  try {
    const manifest = validateR6Package();
    await preflightR5();
    const address = await startLocalHost();
    report.localHost = { address: `http://127.0.0.1:${address.port}`, owned: true, routeScope: 'sealed R6 runtimeClosure only' };
    await preflightR6(address);
    report.sourcePreflight = { r5Passed: report.r5.preflight.every(x => x.match), r6Passed: report.r6.preflight.every(x => x.match), r5RuntimeFiles: report.r5.preflight.length - 1, r6RuntimeFiles: report.r6.preflight.length };
    assert(report.sourcePreflight.r5Passed && report.sourcePreflight.r6Passed, 'source preflight failed');
    report.preBrowserHttpSourcePinAt = path.join(attemptDir, 'PRE-BROWSER-PREFLIGHT.json');
    fs.writeFileSync(report.preBrowserHttpSourcePinAt, JSON.stringify({ pins: PINS, sourcePreflight: report.sourcePreflight, r5: report.r5.preflight, r6: report.r6.preflight }, null, 2) + '\n');

    const playwrightVersion = readJson(PLAYWRIGHT_PACKAGE).version;
    report.browser.playwrightVersion = playwrightVersion;
    browser = await chromium.launch({ executablePath: EDGE, headless: true, timeout: 30000, args: report.browser.launchArgs });
    report.browser.actualVersion = browser.version();
    context = await browser.newContext({ viewport: { width: WIDTH, height: VIEWPORT_HEIGHT }, deviceScaleFactor: 1, acceptDownloads: false });
    await installObservationInitScript();
    const r5Url = `${R5_BASE}index.html?verify=1&embed=1&height=64`;
    await runVersion({ name: 'r5', url: r5Url, expectedVersion: 'human-transmutation-sol61-r5' });
    const r6Url = `http://127.0.0.1:${address.port}/index.html?verify=1&embed=1&height=64`;
    await runVersion({ name: 'r6', url: r6Url, expectedVersion: manifest.versionId });
    report.r6.servedPinsMatch = report.r6.requests.length > 0 && report.r6.requests.every(x => x.match !== false);
    assert(report.r6.servedPinsMatch, 'R6 local host served bytes outside the frozen manifest pins');
    report.captureSummary = { expectedPerVersion: HEIGHTS.length * PHASES.length, r5: report.r5.captures.length, r6: report.r6.captures.length, total: report.r5.captures.length + report.r6.captures.length, actualPNG: true, actualActorHeightChecked: true };
    report.status = report.captureSummary.r5 === report.captureSummary.expectedPerVersion && report.captureSummary.r6 === report.captureSummary.expectedPerVersion ? 'PASS_NATIVE_WEBGPU_REPLAY_AND_CAPTURE' : 'FAIL_INCOMPLETE_CAPTURE_MATRIX';
  } catch (error) {
    report.error = { name: error?.name || 'Error', message: String(error?.message || error), stack: error?.stack || null };
    report.status = 'FAIL_NATIVE_OR_SOURCE_PIN';
  } finally {
    if (currentPage) { try { await currentPage.close(); report.cleanup.pageClosed = true; } catch (error) { report.cleanup.pageCloseError = String(error?.message || error); } }
    if (context) { try { await context.close({ reason: 'Human Transmutation native comparison finished' }); report.cleanup.contextClosed = context.isClosed(); } catch (error) { report.cleanup.contextCloseError = String(error?.message || error); } }
    if (browser) { try { await browser.close(); report.cleanup.browserConnectedAfterClose = browser.isConnected(); } catch (error) { report.cleanup.browserCloseError = String(error?.message || error); } }
    if (server) { try { await new Promise(resolve => server.close(resolve)); report.cleanup.localServerClosed = true; } catch (error) { report.cleanup.localServerCloseError = String(error?.message || error); } }
    report.finishedAt = new Date().toISOString();
    fs.writeFileSync(path.join(attemptDir, 'EVIDENCE.json'), JSON.stringify(report, null, 2) + '\n');
    process.stdout.write(JSON.stringify({ status: report.status, attemptId, sourcePreflight: report.sourcePreflight, captures: report.captureSummary, r5Replay: report.r5?.replay ? { beforeLoops: report.r5.replay.beforeLoops, afterLoops: report.r5.replay.after?.loops, fatal: report.r5.replay.after?.fatal } : null, r6Replay: report.r6?.replay ? { beforeLoops: report.r6.replay.beforeLoops, afterLoops: report.r6.replay.after?.loops, fatal: report.r6.replay.after?.fatal } : null, error: report.error, cleanup: report.cleanup, evidence: path.join(attemptDir, 'EVIDENCE.json') }, null, 2) + '\n');
  }
}

main().catch(error => { process.stderr.write(String(error?.stack || error)); process.exitCode = 1; });
