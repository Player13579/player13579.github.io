import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { stateAt } from './design.mjs';

const folder = path.dirname(fileURLToPath(import.meta.url));
const output = path.join(folder, 'evidence');
const bootOnly = process.argv.includes('--boot-only');
const captureOnly = process.argv.includes('--capture-only');
fs.mkdirSync(output, { recursive: true });
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(folder, file))).digest('hex');
const report = {
  id: 'cooldown-clock-zero-r3',
  sourceFilesSha256: Object.fromEntries(['design.mjs', 'shaders.mjs', 'projection.mjs', 'render-contract.json', 'main.mjs',
    'audio.mjs', 'body.png', 'index.html', 'embed-check.html'].map(file => [file, hash(file)])),
  route: 'fresh owned headless hardware Chrome + real iframe; no SwiftShader',
  performanceBoundary: 'CPU scheduler/driver/GPU execution/capture overhead are unisolated; no GPU timestamp claim',
  capturePolicy: 'one warm cycle; clean 10700ms window has no CDP query/readback/screenshot; capture-adjacent cadence reported separately',
  bootOnly, captureOnly,
  quality: 'not_run visual review', actualListening: 'not_run forced-silent verify', gameIntegration: 'not_run',
  publicReplay: 'not_run', frames: []
};
const firstBootPath = path.join(output, 'first-boot.json');
const server = http.createServer((request, response) => {
  const relative = new URL(request.url, 'http://127.0.0.1').pathname;
  const file = path.resolve(folder, `.${relative}`);
  if (!file.startsWith(folder + path.sep)) { response.writeHead(403).end(); return; }
  try {
    const bytes = fs.readFileSync(file);
    response.writeHead(200, {
      'content-type': ({ '.html': 'text/html', '.mjs': 'application/javascript', '.png': 'image/png', '.wav': 'audio/wav' })[path.extname(file)] ?? 'application/octet-stream',
      'cache-control': 'no-store'
    }).end(bytes);
  } catch { response.writeHead(404).end(); }
});

await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
report.url = `http://127.0.0.1:${server.address().port}/embed-check.html?verify=1&embed=1&audit=1`;
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'clock-zero-r3-'));
let chrome, socket, debugPort;
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

try {
  chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [
    '--headless=new', '--enable-unsafe-webgpu', '--no-first-run', '--no-default-browser-check',
    '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--force-device-scale-factor=1',
    '--window-size=640,320', report.url
  ], { windowsHide: true, stdio: 'ignore' });
  report.pid = chrome.pid;
  for (let attempt = 0; attempt < 80; attempt++) {
    const file = path.join(profile, 'DevToolsActivePort');
    if (fs.existsSync(file)) { debugPort = Number(fs.readFileSync(file, 'utf8').split('\n')[0]); break; }
    await pause(100);
  }
  assert(debugPort, 'owned Chrome startup timeout');
  const tabs = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
  const tab = tabs.find(candidate => candidate.url === report.url);
  assert(tab, 'owned verification tab missing');
  report.tabId = tab.id;
  socket = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let nextId = 0;
  const responses = new Map();
  socket.onmessage = event => {
    const answer = JSON.parse(event.data);
    if (answer.id) { responses.get(answer.id)?.(answer); responses.delete(answer.id); }
  };
  const command = (method, params = {}) => new Promise(resolve => {
    const id = ++nextId;
    responses.set(id, resolve);
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => (await command('Runtime.evaluate', {
    expression, awaitPromise: true, returnByValue: true
  })).result?.result?.value;

  let ready, firstProbe = null;
  for (let attempt = 0; attempt < 80; attempt++) {
    ready = await evaluate(`({ready:Boolean(window.__clockAudit?.ready),compiled:Boolean(window.__clockAudit?.compiled),
      faults:window.__clockAudit?.faults||[],gpu:Boolean(navigator.gpu),documentState:document.readyState,
      audioHook:Boolean(window.__gallerySfx)})`);
    if (attempt === 0) {
      firstProbe = { at: new Date().toISOString(), elapsedMs: 0, ...ready };
      fs.writeFileSync(firstBootPath, JSON.stringify({ status: 'first-browser-probe', ...firstProbe }, null, 2));
      console.log(`CLOCK_R3_FIRST_BOOT ${JSON.stringify(firstProbe)}`);
    }
    if (ready?.ready || ready?.faults?.length) break;
    if (attempt > 0 && attempt % 10 === 0) {
      const poll = { status: 'bootstrap-in-progress', at: new Date().toISOString(), elapsedMs: attempt * 100,
        ...ready };
      fs.writeFileSync(firstBootPath, JSON.stringify(poll, null, 2));
      console.log(`CLOCK_R3_BOOT_POLL ${JSON.stringify(poll)}`);
    }
    if (chrome.exitCode !== null || chrome.signalCode !== null) break;
    await pause(100);
  }
  assert(ready?.ready, JSON.stringify(ready));
  report.compile = ready.compiled;
  report.adapter = await evaluate('window.__clockAudit.adapter');
  const verifyGuard = await evaluate('window.__gallerySfx.activateFromGesture().then(()=>window.__gallerySfx.snapshot())');
  report.verifyGuard = verifyGuard;
  assert.equal(verifyGuard.audioGain, 0);
  assert.equal(verifyGuard.audioState, 'not-created');

  const captureBootFrame = async () => {
    await evaluate('window.__clockAudit.seek(120)');
    await pause(100);
    const shot = await command('Page.captureScreenshot', { format: 'png' });
    if (!shot.result?.data) throw Error(`first boot capture failed: ${JSON.stringify(shot)}`);
    const file = 'first-boot-h64-dark-light.png';
    fs.writeFileSync(path.join(output, file), Buffer.from(shot.result.data, 'base64'));
    const snapshot = await evaluate('window.__clockAudit.snapshot()');
    report.frames.push({ file, wallMs: 120, actorMs: 'not_used wall-basis E', fixture: true,
      bodyHeight: snapshot.bodyHeight, dpr: snapshot.dpr, dual: snapshot.dual,
      darkAndLightRecipients: snapshot.dual ? 2 : 1, submittedFrames: snapshot.frames });
    const diagnostic = { status: 'compiled-and-first-frame-captured', at: new Date().toISOString(),
      ready: ready.ready, compiled: ready.compiled, adapter: ready.adapter, verifyGuard,
      canvas: { width: snapshot.width, height: snapshot.height, bodyHeight: snapshot.bodyHeight,
        dpr: snapshot.dpr, dual: snapshot.dual }, faults: snapshot.faults, frame: report.frames.at(-1) };
    fs.writeFileSync(firstBootPath, JSON.stringify(diagnostic, null, 2));
    report.firstBootDiagnostic = diagnostic;
    console.log(`CLOCK_R3_FIRST_FRAME ${JSON.stringify(diagnostic)}`);
  };
  await captureBootFrame();

  if (!bootOnly) {

  if (!captureOnly) {
    // Warm a complete finite-effect cycle without screenshots or intermediate reads.
    await pause(3600);
    await evaluate('window.__clockAudit.beginClean()');
    // No CDP query/readback/screenshot occurs during this clean cadence window.
    await pause(10700);
    const clean = await evaluate('window.__clockAudit.snapshot()');
    assert(clean.cyclesStarted >= 4, 'clean interval must cover three complete cycles');
    assert(clean.frames > 100);
    assert.equal(clean.faults.length, 0);
    const cleanIntervals = clean.cleanIntervals;
    assert(cleanIntervals.length > 100);
    report.cleanCadence = {
      frames: clean.frames, completeCycles: clean.cyclesStarted - 1,
      intervalMs: { count: cleanIntervals.length,
        mean: cleanIntervals.reduce((sum, item) => sum + item.ms, 0) / cleanIntervals.length,
        max: Math.max(...cleanIntervals.map(item => item.ms)),
        above50: cleanIntervals.filter(item => item.ms > 50).length },
      faults: clean.faults, measurement: 'capture-free scheduler intervals, not GPU time'
    };
  } else {
    report.cleanCadence = { status: 'not-run-capture-only-mode; no timed cadence interference' };
  }

  await evaluate('window.__clockAudit.beginCapture()');
  const capture = async (name, ms) => {
    await evaluate(`window.__clockAudit.seek(${ms})`);
    await pause(75);
    const shot = await command('Page.captureScreenshot', { format: 'png' });
    if (!shot.result?.data) throw Error(`capture failed: ${JSON.stringify(shot)}`);
    fs.writeFileSync(path.join(output, name), Buffer.from(shot.result.data, 'base64'));
    const snapshot = await evaluate('window.__clockAudit.snapshot()');
    report.frames.push({ file: name, wallMs: ms, actorMs: 'not_used wall-basis E', fixture: true,
      bodyHeight: snapshot.bodyHeight, dpr: snapshot.dpr, dual: snapshot.dual,
      darkAndLightRecipients: snapshot.dual ? 2 : 1, submittedFrames: snapshot.frames });
  };
  for (const ms of [30, 120, 220, 290, 310, 510, 700, 740, 900, 1059, 1100, 1191, 1250, 1440,
    1550, 1750, 1900, 2100, 2390, 2460]) {
    await capture(`h64-${String(ms).padStart(4, '0')}.png`, ms);
  }
  await evaluate('Object.assign(window.__clockAudit.controls,{observations:false,sparkle:false})');
  for (const ms of [30, 120, 220, 290, 310, 510, 700, 740, 900, 1059, 1100, 1191, 1250, 1440,
    1550, 1750, 1900, 2100, 2390, 2460]) {
    await capture(`main-h64-${String(ms).padStart(4, '0')}.png`, ms);
  }
  const reset = 'Object.assign(window.__clockAudit.controls,{emission:true,observations:true,sparkle:true,receiver:true,clock:true,connection:true,rear:true,front:true})';
  for (const [name, ms, code] of [
    ['source-off', 700, 'emission=false'], ['obs-off', 700, 'observations=false'], ['clock-off', 700, 'clock=false'],
    ['connection-off', 800, 'connection=false'], ['sparkle-off', 1100, 'sparkle=false'],
    ['receiver-off', 1550, 'receiver=false'], ['front-only', 800, 'rear=false'], ['rear-only', 800, 'front=false']
  ]) {
    await evaluate(`${reset};window.__clockAudit.controls.${code}`);
    await capture(`${name}.png`, ms);
  }
  const handSamples = [];
  for (const ms of [310, 510, 700]) {
    await evaluate(`${reset};window.__clockAudit.seek(${ms})`);
    await pause(75);
    const onName = `clock-hands-on-${ms}.png`;
    const onShot = await command('Page.captureScreenshot', { format: 'png' });
    if (!onShot.result?.data) throw Error(`clock hand capture failed: ${JSON.stringify(onShot)}`);
    fs.writeFileSync(path.join(output, onName), Buffer.from(onShot.result.data, 'base64'));
    const offName = `clock-hands-off-${ms}.png`;
    await evaluate('window.__clockAudit.controls.clock=false');
    await pause(75);
    const offShot = await command('Page.captureScreenshot', { format: 'png' });
    if (!offShot.result?.data) throw Error(`clock-off reference capture failed: ${JSON.stringify(offShot)}`);
    fs.writeFileSync(path.join(output, offName), Buffer.from(offShot.result.data, 'base64'));
    const frame = stateAt(ms);
    handSamples.push({ ms, files: { clockOn: onName, clockOffReference: offName },
      expectedScreenConvention: 'x right, y down, positive unwrapped angle clockwise from 12 o’clock',
      expectedCurrentAngle: frame.currentAngle, expectedEndAngle: frame.endAngle,
      expectedUnwrappedDeltaFromPreviousSample: handSamples.length ? {
        current: frame.currentAngle - handSamples.at(-1).expectedCurrentAngle,
        end: frame.endAngle - handSamples.at(-1).expectedEndAngle
      } : null, expectedRemainingGap: frame.remainingGap });
    await evaluate('window.__clockAudit.controls.clock=true');
  }
  report.handAngleSamples = handSamples;
  const captured = await evaluate('window.__clockAudit.snapshot()');
  const adjacent = captured.captureIntervals;
  report.captureAdjacentCadence = {
    intervals: adjacent.length,
    pausedFrames: adjacent.filter(item => item.paused).length,
    unpausedFrames: adjacent.filter(item => !item.paused).length,
    intervalMs: adjacent.length ? {
      mean: adjacent.reduce((sum, item) => sum + item.ms, 0) / adjacent.length,
      max: Math.max(...adjacent.map(item => item.ms))
    } : null,
    note: 'capture-adjacent only; includes paused frames and is never combined with clean cadence'
  };
  report.replay = captureOnly
    ? 'pass hardware WebGPU compile/submit and full-life H64 dark/light captures; clean cadence deferred'
    : 'pass hardware WebGPU compile/submit, clean 3-cycle cadence, separate captures, verify audio gain 0';
  } else {
    report.replay = 'pass hardware WebGPU compile/submit and first H64 dark/light dual capture; full cadence/captures deferred';
  }
  await evaluate('window.__clockAudit.close()');
  await fetch(`http://127.0.0.1:${debugPort}/json/close/${tab.id}`);
  report.ownedTabClosed = true;
} catch (error) {
  report.error = error.stack;
  report.replay = 'failed';
  process.exitCode = 1;
} finally {
  socket?.close();
  if (chrome && chrome.exitCode === null && chrome.signalCode === null) {
    chrome.kill();
    await new Promise(resolve => chrome.once('exit', resolve));
  }
  report.ownedChromeExited = !chrome || chrome.exitCode !== null || chrome.signalCode !== null;
  await new Promise(resolve => server.close(resolve));
  report.ownedServerClosed = true;
  const resolved = path.resolve(profile), temp = path.resolve(os.tmpdir());
  assert(resolved.startsWith(temp + path.sep) && path.basename(resolved).startsWith('clock-zero-r3-'));
  fs.rmSync(resolved, { recursive: true, force: true, maxRetries: 8, retryDelay: 250 });
  report.checkedProfileRemoved = true;
  fs.writeFileSync(path.join(output, 'gpu.json'), JSON.stringify(report, null, 2));
  if (report.replay === 'failed' && !fs.existsSync(firstBootPath))
    fs.writeFileSync(firstBootPath, JSON.stringify({ status: 'startup-failed', at: new Date().toISOString(), error: report.error }, null, 2));
  console.log(JSON.stringify(report));
}
