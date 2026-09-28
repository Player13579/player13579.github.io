import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import {SCENARIOS} from '../preview/scenarios.js';
import {EventStore} from '../src/events.js';
import {EMPSound} from '../src/audio.js';
import {unlockAudioFromGesture} from '../preview/audio-control.js';

const here = new URL('../', import.meta.url);
const read = path => readFile(new URL(path, here), 'utf8');
const preview = await read('preview/main.js');
const canonical = ['charge', 'normal', 'resonance', 'cancellation', 'suppression'];

test('embedded replay visits each canonical EMP branch in authored tour order', () => {
  assert.match(preview, /const embedBranches=\['charge','normal','resonance','cancellation','suppression'\]/);
  assert.match(preview, /tour:embedMode/);
  assert.match(preview, /const keys=embedMode\?embedBranches:Object\.keys\(SCENARIOS\)/);
  assert.match(preview, /select\(keys\[\(keys\.indexOf\(state\.scene\)\+1\)%keys\.length\]\)/);

  for (const key of canonical) {
    const scenario = SCENARIOS[key];
    assert.ok(scenario, `${key} scenario exists`);
    assert.ok(scenario.duration > 0, `${key} has a finite replay duration`);
    assert.ok(scenario.commands.some(command => command.op === 'emit'), `${key} emits an authored event`);
    assert.ok(scenario.markers.cleared < scenario.duration, `${key} includes a post-clear interval`);
  }
  assert.deepEqual(canonical.map(key => SCENARIOS[key].label), [
    'チャージ / 準備保持・権威終端',
    '通常放出 / 有限長の転送列',
    '同位相 / 中点の状態転換',
    '逆位相 / 対向消去前線',
    '対象ストレージ / 継続・延長・終了',
  ]);
});

test('every canonical fixture emits its matching SFX voice by default', () => {
  const messages = [];
  const sound = new EMPSound();
  sound.node = {port: {postMessage: message => messages.push(message)}};

  for (const key of canonical) {
    const command = SCENARIOS[key].commands.find(item => item.op === 'emit' && item.kind === key);
    assert.ok(command, `${key} fixture includes its branch event`);
    assert.notEqual(command.spec.sound, false, `${key} fixture does not silence its SFX`);
    const receipt = new EventStore().add(command.kind, command.spec);
    assert.equal(receipt.accepted, true, `${key} branch event is accepted`);
    sound.emit(receipt.event);
  }

  assert.deepEqual(messages.map(message => [message.type, message.voice?.kind]), canonical.map(key => ['voice', key]));
  assert.equal(sound.stats.queued, canonical.length);
});

test('embedded audio can unlock after a gesture, while verification remains silent', async () => {
  let unlocks = 0;
  const fx = {enableAudio: async () => { unlocks++; }};
  assert.equal(await unlockAudioFromGesture(fx, false), true);
  assert.equal(unlocks, 1);
  assert.equal(await unlockAudioFromGesture(fx, true), false);
  assert.equal(unlocks, 1);
  assert.equal(await unlockAudioFromGesture(null, false), false);
  assert.match(preview, /let audioUnlocking=false,previewAudioEnabled=false/);
  assert.match(preview, /if\(previewAudioEnabled\|\|audioUnlocking\|\|!fx\|\|verifyMode\)return/);
  assert.match(preview, /if\(embedMode&&!verifyMode\)\{\$\('#vfx'\)\.tabIndex=0;\$\('#vfx'\)\.title=/);
  assert.match(preview, /addEventListener\('pointerup',enablePreviewAudio\)/);
  assert.match(preview, /e\.key==='Enter'\|\|e\.key===' '/);
});
