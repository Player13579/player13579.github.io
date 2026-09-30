const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
function functionSource(name) {
  const start = app.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `missing ${name}`);
  const end = app.indexOf('\n}', start);
  assert.notEqual(end, -1, `unterminated ${name}`);
  return app.slice(start, end + 2);
}

const sourceCapture = functionSource('captureWebGPUMainAppLateMagicScene');
const resetAt = sourceCapture.indexOf('webgpuRetainedHeadMarkerFailureDetails = [];');
const phaseGateAt = sourceCapture.indexOf('if (!["playing", "meeting"].includes(data.phase))');
assert.ok(resetAt > 0 && phaseGateAt > resetAt,
  'valid capture clears previous marker details before examining the current phase');
const markerBranchAt = sourceCapture.indexOf("reason: 'retained-head-marker-source-or-actor-unavailable'");
const markerRecordAt = sourceCapture.lastIndexOf('recordRetainedHeadMarkerFailure(', markerBranchAt);
assert.ok(markerRecordAt >= 0 && markerRecordAt < markerBranchAt,
  'the existing unavailable branch records details before retaining its unsupported result');

const sandbox = {
  webgpuRetainedHeadMarkerFailureDetails: [],
  state: { data: { roomId: 'current-room', phase: 'playing', map: { id: 'station', width: 5000, height: 4000 } },
    textures: {}, frameNow: 4321 },
  webgpuMainApp: { presentationPendingAt: 4000, lastFrameStage: 'late-magic',
    driver: { state: 'ready' } },
  document: { body: { dataset: { webgpuMainPending: 'frame', webgpuMainIncomplete: '' } },
    scripts: [], hidden: false, activeElement: { matches: () => false } },
  window: { navigator: { gpu: {} }, isSecureContext: true, innerWidth: 1280,
    innerHeight: 720, visualViewport: { width: 1280, height: 720, scale: 1 },
    devicePixelRatio: 1 },
  els: { webgpuMainCanvas: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 1280, height: 720 }) },
    canvas: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 1280, height: 720 }) } },
  independentGameplayViewportRootSize: () => ({ width: 1280, height: 720 }),
  performance: { now: () => 4500 }
};
const runtime = vm.runInNewContext(`let webgpuRetainedHeadMarkerFailureDetails = [];
${functionSource('recordRetainedHeadMarkerFailure')}
${functionSource('captureWebGPUMainFailureDiagnostic')}
({ recordRetainedHeadMarkerFailure, captureWebGPUMainFailureDiagnostic,
  retained: () => webgpuRetainedHeadMarkerFailureDetails })`, sandbox);

function record({ effect = {}, type = 'fighter-energy-charge', playerId = 'actor-1',
  data = { roomId: 'room-a' }, sourcePlayer = { id: playerId }, scene = null,
  marker = null, markerSelection = null, sceneActor = null, frameNow = 4321 } = {}) {
  return runtime.recordRetainedHeadMarkerFailure(effect, type, playerId, data,
    sourcePlayer, scene, marker, sceneActor, frameNow);
}

test('normal retained marker failure captures bounded source, scene, key and actor evidence', () => {
  const scene = { presentation: { nonCredits: [{ type: 'fighter-energy-charge',
    instanceKey: 'fighter-ec:instance-7', sourceEffect: { id: 'other-effect' } }] } };
  const detail = record({ effect: { id: 'ec-1', eClockRoomId: 'room-a',
    _headMarkerInstanceKey: 'instance-7' }, scene, sceneActor: { alive: true, ejected: false, inVent: false } });
  assert.deepEqual(JSON.parse(JSON.stringify({ effectId: detail.effectId, effectType: detail.effectType,
    playerId: detail.playerId, sourceRoom: detail.sourceRoom, currentRoom: detail.currentRoom,
    effectKey: detail.effectKey, sourceActorExists: detail.sourceActorExists,
    sceneExists: detail.sceneExists, markerExists: detail.markerExists,
    sceneActor: detail.sceneActor, frameNow: detail.frameNow })), {
    effectId: 'ec-1', effectType: 'fighter-energy-charge', playerId: 'actor-1',
    sourceRoom: 'room-a', currentRoom: 'room-a', effectKey: 'instance-7',
    sourceActorExists: true, sceneExists: true, markerExists: false,
    sceneActor: { alive: true, ejected: false, inVent: false }, frameNow: 4321
  });
  assert.equal(detail.selectedCandidateKeys.length, 1);
  assert.match(detail.selectedCandidateKeys[0], /fighter-energy-charge:fighter-ec:instance-7:other-effect/);
});

test('actor missing, selected-key missing, and room mismatch remain explicit diagnosis states', () => {
  const actorMissing = record({ effect: { id: 'ec-actor', eClockRoomId: 'room-a' },
    sourcePlayer: null, scene: null, sceneActor: null });
  assert.equal(actorMissing.sourceActorExists, false);
  assert.equal(actorMissing.sceneExists, false);
  assert.equal(actorMissing.markerExists, false);
  assert.equal(actorMissing.sceneActor, null);

  const keyMissing = record({ effect: { id: 'ec-key', _headMarkerInstanceKey: 'wanted' },
    scene: { presentation: { nonCredits: [{ type: 'fighter-energy-charge',
      instanceKey: 'selected-other', sourceEffect: { id: 'other' } }] } },
    sceneActor: { alive: true, ejected: false, inVent: false } });
  assert.equal(keyMissing.markerExists, false);
  assert.match(keyMissing.selectedCandidateKeys[0], /selected-other:other/);

  const roomMismatch = record({ effect: { id: 'ec-room', eClockRoomId: 'old-room' },
    data: { roomId: 'new-room' } });
  assert.equal(roomMismatch.sourceRoom, 'old-room');
  assert.equal(roomMismatch.currentRoom, 'new-room');
});

test('failure payload retains only the latest four bounded records and is exposed by copy diagnostic', () => {
  for (let i = 0; i < 6; i++) record({ effect: { id: `effect-${i}`.repeat(50),
    _headMarkerInstanceKey: `key-${i}`.repeat(50) }, scene: { presentation: { nonCredits:
      Array.from({ length: 12 }, (_, j) => ({ type: 'fighter-energy-charge',
        instanceKey: `candidate-${j}`, sourceEffect: { id: `source-${j}` } })) } } });
  const payload = runtime.captureWebGPUMainFailureDiagnostic('frame stopped');
  assert.equal(payload.retainedHeadMarkerFailures.length, 4);
  assert.equal(payload.retainedHeadMarkerFailures[0].effectId.length, 120);
  assert.equal(payload.retainedHeadMarkerFailures.at(-1).selectedCandidateKeys.length, 8);
  assert.equal(payload.retainedHeadMarkerFailures.at(-1).selectedCandidatesTruncated, true);
  assert.ok(JSON.stringify(payload).length < 12_000);
});

function topLevel(name) { return functionSource(name); }
const bodyClockSandbox = {
  state: { data: { roomId: 'VD4J' } },
  performance: { now: () => 124700 },
  eVisualTime: () => 115016,
  isDesireRenkiMarker: () => false,
  clamp: (value, min, max) => Math.max(min, Math.min(max, value))
};
const clockRuntime = vm.runInNewContext(`
${topLevel('isCreditHeadMarkerEffect')}
${topLevel('isBodyStaminaGainEffect')}
${topLevel('isBodyHealGainEffect')}
${topLevel('isBodyOverhealGainEffect')}
${topLevel('isBodyManaGainEffect')}
${topLevel('isBodyAccelerationGainEffect')}
${topLevel('isSharedHeadMarkerEffect')}
${topLevel('eEffectNow')}
${topLevel('nonCreditHeadMarkerSemanticKey')}
${topLevel('coalesceNonCreditHeadMarkerEffects')}
${topLevel('selectHeadMarkerPresentation')}
({ isSharedHeadMarkerEffect, isCreditHeadMarkerEffect, eEffectNow,
  selectHeadMarkerPresentation })`, bodyClockSandbox);

test('shared UI markers and credits use wall time; body-benefit E keeps actor time', () => {
  const data = { roomId: 'VD4J', phase: 'playing', players: [{ id: 'p1' }] };
  const actorClockEffect = type => ({ id: type, type, playerId: 'p1',
    startedAt: 121699, duration: 1200, eClockStartedAt: 114649,
    eClockRoomId: 'VD4J', effectKind: type.slice(5) });
  const wallOwned = [actorClockEffect('gain-luckBoost'),
    actorClockEffect('fighter-energy-charge'), actorClockEffect('enhance-activation'),
    actorClockEffect('gain-credits')];
  for (const effect of wallOwned) {
    assert.equal(clockRuntime.eEffectNow(effect, data, 124700), 124700, effect.type);
    assert.ok(clockRuntime.isSharedHeadMarkerEffect(effect) ||
      clockRuntime.isCreditHeadMarkerEffect(effect), effect.type);
  }
  for (const kind of ['mana', 'stamina', 'acceleration', 'overheal', 'heal']) {
    const effect = actorClockEffect(`gain-${kind}`);
    assert.equal(clockRuntime.isSharedHeadMarkerEffect(effect), false, effect.type);
    assert.equal(clockRuntime.eEffectNow(effect, data, 124700),
      121699 + (115016 - 114649), effect.type);
  }
});

test('expired marker is excluded consistently by main retention clock and selector', () => {
  const actor = { id: 'bot-1', alive: true, ejected: false };
  const data = { roomId: 'VD4J', phase: 'playing', players: [actor] };
  const effect = { id: 'magic_d6', type: 'fighter-energy-charge', playerId: actor.id,
    startedAt: 121699, duration: 1200, eClockStartedAt: 114649,
    eClockRoomId: 'VD4J', _headMarkerInstanceKey: 'magic_d6' };
  const wallNow = 124700;
  const mainRetentionNow = clockRuntime.eEffectNow(effect, data, wallNow);
  const activeByMainRetention = mainRetentionNow < effect.startedAt ||
    mainRetentionNow - effect.startedAt < effect.duration;
  const selection = clockRuntime.selectHeadMarkerPresentation(actor, data, [effect], wallNow, null);
  assert.equal(activeByMainRetention, false);
  assert.equal(selection.nonCredits.length, 0);
});
