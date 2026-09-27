import {ManaAcquireSystem, ManaAudio, ManaRenderer, requestManaDevice} from '../src/index.js';
import {PreviewScene, createScenePipelines} from './scene.js';

const canvas = document.querySelector('#stage');
const status = document.querySelector('#status');
const params = new URLSearchParams(location.search);
const verifyMode = params.has('verify');
if (params.get('embed') === '1') document.body.classList.add('embed');
if (verifyMode) document.body.classList.add('verify');

const beneficiary = {x: 0, y: 0, heightPx: 64, alive: true, present: true, inVent: false, invisible: false};
const audio = new ManaAudio();
if (verifyMode) audio.setMuted(true);
const soundButton = document.querySelector('#sound');
async function enableSoundFromGesture() {
  if (verifyMode) return;
  try {
    await audio.unlock();
    audio.setMuted(false);
    soundButton.textContent = 'Mute sound';
  } catch (error) {
    status.hidden = false;
    status.textContent = `Sound unavailable: ${error.message}`;
  }
}
soundButton.addEventListener('click', async () => {
  if (audio.node) {
    audio.setMuted(!audio.muted);
    soundButton.textContent = audio.muted ? 'Enable sound' : 'Mute sound';
    return;
  }
  await enableSoundFromGesture();
});
if (params.get('embed') === '1') canvas.addEventListener('pointerdown', enableSoundFromGesture);
let device, scene, system, actorTime = 0, previous = performance.now(), nextGain = 0, sequence = 0;
let failed = false;

function fail(error) {
  failed = true;
  status.hidden = false;
  status.textContent = `WebGPU replay unavailable: ${error.message}`;
  console.error(error);
}

function emitGain() {
  const startedAtActorMs = actorTime;
  system.emit({
    eventId: `mana-replay-${++sequence}`,
    sessionId: system.sessionId,
    beneficiaryPlayerId: 'mana-replay-beneficiary',
    actorPlayerId: 'mana-replay-actor',
    manaDelta: 12,
    committed: true,
    route: 'preview-committed-gain',
    startedAtActorMs,
  });
  nextGain = actorTime + 2100;
}

async function init() {
  try {
    const gpu = await requestManaDevice();
    ({device} = gpu);
    const pipelines = await createScenePipelines(device, gpu.format);
    const master = await ManaRenderer.create({device, format: gpu.format});
    scene = await PreviewScene.create(device, gpu.format, canvas, 3, 0, pipelines, master.pipeline);
    scene.grid = true;
    scene.mannequin = true;
    system = new ManaAcquireSystem({
      sessionId: 'mana-pro-r01-replay',
      getActorClock: () => ({timeMs: actorTime, rate: 1}),
      getBeneficiary: () => beneficiary,
      audio,
    });
    status.textContent = 'WebGPU replay running';
    emitGain();
    previous = performance.now();
    requestAnimationFrame(frame);
  } catch (error) {
    fail(error);
  }
}

function frame(now) {
  if (failed || !scene) return;
  actorTime += Math.max(0, now - previous);
  previous = now;
  if (actorTime >= nextGain) emitGain();
  scene.draw(system.update());
  requestAnimationFrame(frame);
}

window.addEventListener('pagehide', () => {
  system?.dispose();
  audio.dispose();
  scene?.dispose();
  device?.destroy();
});
init();
