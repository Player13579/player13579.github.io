import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DESIGN, fixtureState, activeSnapshot, resolveEvent } from './design.mjs';
import { supports, projectedScissors } from './projection.mjs';
import { BarrierSfx, DURATIONS, synthesize } from './sfx.mjs';
import { DEFAULT_SETTINGS, deriveRuntimeState, eventAgeSeconds, resolveInputEvent, shouldSubmitCauseSfx, visibleTarget } from './runtime.mjs';

const root = new URL('.', import.meta.url), read = name => fs.readFileSync(new URL(name, root));
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const r5 = new URL('../../../r5/', root), r5Manifest = JSON.parse(fs.readFileSync(new URL('manifest.json', r5), 'utf8'));
for (const [name, expected] of Object.entries(r5Manifest.files))
  assert.equal(sha256(fs.readFileSync(new URL(name, r5))), expected, `frozen r5 file changed: ${name}`);

const runtime = read('runtime.mjs').toString(), html = read('index.html').toString(), embed = read('embed-test.html').toString();
const portContract = JSON.parse(read('render-contract.json'));
const designManifest = JSON.parse(read('design-manifest.json'));
for (const [name, expected] of Object.entries(designManifest.files)) {
  if (!fs.existsSync(new URL(name, root))) continue; // This attempted closure contains runtime inputs, not Sol's full source archive.
  const actual = read(name);
  if (name === 'world-shader.mjs' || name === 'post-shader.mjs') {
    const originalized = actual.toString().replace(/\beSmooth\b/g, 'smooth');
    assert.equal(sha256(Buffer.from(originalized)), expected, `attempt shader must differ only by the reserved-identifier rename: ${name}`);
    assert.doesNotMatch(actual.toString(), /\bsmooth\b/, `reserved identifier remains in ${name}`);
    assert.equal((actual.toString().match(/\beSmooth\b/g) ?? []).length, (originalized.match(/\bsmooth\b/g) ?? []).length);
  } else assert.equal(sha256(actual), expected, `Sol-owned r6 creative input must remain unchanged: ${name}`);
}
assert.deepEqual(portContract.LunaCandidateOwnedFiles, ['runtime.mjs','index.html','embed-test.html','verify.mjs','runtime-port-test.mjs','freeze.mjs']);
assert.equal(DESIGN.id, 'sol61-barrier-zero-r6');
assert.equal(sha256(read('body.png')), DESIGN.fixture.sha256, 'exact original body fixture');
assert.match(html, /Barrier r6/);
assert.match(html, /runtime\.mjs/);
assert.match(embed, /\?verify=1&embed=1&audit=1/);
assert.match(runtime, /createBuffer\(\{size:80,usage:GPUBufferUsage\.UNIFORM\|GPUBufferUsage\.COPY_DST\}\)/);
assert.match(runtime, /volumeVS[\s\S]*?pointVS/);
assert.match(runtime, /pointBackFS[\s\S]*?pointFrontFS/);
assert.match(runtime, /drawScissoredFullscreen\(pass,pipelines\.back,regions\.world/);
assert.match(runtime, /pipelines\.pointBack\);pass\.draw\(6,2\*count\)/);
assert.match(runtime, /pipelines\.body\);pass\.draw\(6,count\)/);
assert.match(runtime, /drawScissoredFullscreen\(pass,pipelines\.front,regions\.world/);
assert.match(runtime, /pipelines\.pointFront\);pass\.draw\(6,2\*count\)/);
assert.match(runtime, /drawScissoredFullscreen\(p,pipelines\[name\],rect,canvas\.width,canvas\.height,settings\.dual\)/);
assert.match(runtime, /\['horizontal',targets\[2\],regions\.blurX\],\['vertical',targets\[3\],regions\.blurY\]/);
assert.match(runtime, /clearValue:target\?\{r:0,g:0,b:0,a:0\}/);
assert.match(runtime, /fullScissor\(pass,canvas\.width,canvas\.height\);pass\.setPipeline\(pipelines\.body\)/);
assert.match(runtime, /device\.queue\.submit\(\[encoder\.finish\(\)\]\);frame\+\+;firstSubmitted=true;if\(shouldSubmitCauseSfx/);
for (const name of ['emit','obs','coverage','points','front','back','stars','incident']) assert.equal(DEFAULT_SETTINGS[name], true, `${name} defaults on`);

// Preserve the H64/H*dpr projection contract and every independently projected workload region.
let projectedBoxes = 0;
for (const dpr of [1, 1.25, 2]) {
  const region = supports(64, dpr);
  assert(region.worldWidthPx > 72 && region.worldHeightPx > 85);
  assert(region.blurX[0] <= region.source[0] - 8 * Math.round(dpr));
  assert(region.blurY[1] <= region.blurX[1] - 8 * Math.round(dpr));
  for (const bounds of [region.world, region.pointCore, region.blurX, region.blurY]) {
    const boxes = projectedScissors(bounds, 960 * dpr, 260 * dpr, true);
    assert.equal(boxes.length, 2, 'dual recipients receive independent projected scissors');
    for (const [x, y, width, height] of boxes) {
      assert(x >= 0 && y >= 0 && width > 0 && height > 0 && x + width <= 960 * dpr && y + height <= 260 * dpr);
      projectedBoxes++;
    }
  }
}

const owner = { id: 'target-A', alive: true, visible: true, barrierDurability: 3 };
assert(visibleTarget(owner));
assert(activeSnapshot(owner));
for (const hidden of [
  { ...owner, alive: false }, { ...owner, ejected: true }, { ...owner, inVent: true },
  { ...owner, visible: false }, { ...owner, barrierDurability: 0 }
]) {
  if (visibleTarget(hidden) && hidden.barrierDurability > 0) assert(!activeSnapshot(hidden));
}
assert.deepEqual(deriveRuntimeState(owner, null, 0), {stage:1,t:0,live:true,event:null,known:false,contact:[0,0,0],causeId:null}, 'snapshot retains stable field without synthesizing create');
assert.equal(deriveRuntimeState({ ...owner, barrierDurability: 0 }, null, 0).stage, 4);
assert.equal(deriveRuntimeState({ ...owner, alive:false }, null, 0).live, false);

const variants = [
  [{ type:'action-stand', variant:'durability-created', id:'create-1', targetId:'target-A', startedAtMs:1000, durationMs:650 }, 'create', 0, .165],
  [{ type:'preparation-barrier-hit', variant:'durability-hit', id:'hit-1', playerId:'target-A', startedAtMs:2000, durationMs:650, contactPosition:[.5,.15,.66] }, 'hit', 3, .055],
  [{ type:'preparation-barrier-hit', variant:'durability-broken', id:'break-1', playerId:'target-A', startedAtMs:3000, durationMs:480 }, 'break', 2, .14],
  [{ type:'action-push', variant:'timed-bust-break', id:'break-2', targetId:'target-A', startedAtMs:4000, durationMs:480 }, 'break', 2, .14]
];
let acceptedCauses = 0;
for (const [raw, kind, stage, offset] of variants) {
  const seen = new Set(), resolved = resolveInputEvent(raw, owner, seen);
  assert(resolved, `${kind} accepted for its authoritative owner`);
  assert.equal(resolved.kind, kind);
  assert.equal(resolveInputEvent(raw, owner, seen), null, 'repeated cause is suppressed');
  const now = raw.startedAtMs + offset * 1000;
  assert.equal(eventAgeSeconds(now - raw.startedAtMs, 1200, 1200), offset, 'wall clock age is expressed in seconds');
  const snapshot = kind === 'break' ? { ...owner, barrierDurability: 0 } : owner;
  const state = deriveRuntimeState(snapshot, resolved, offset);
  assert.equal(state.stage, stage);
  assert.equal(state.event, kind);
  assert.equal(state.causeId, raw.id);
  assert(shouldSubmitCauseSfx({ gpuReady:true, firstSubmitted:true, fixed:null, state }));
  acceptedCauses++;
}

const badSeen = new Set();
const wrongOwner = { type:'action-stand', variant:'durability-created', id:'owner-mismatch', targetId:'other', startedAtMs:0, durationMs:650 };
assert.equal(resolveInputEvent(wrongOwner, owner, badSeen), null);
assert.equal(badSeen.has(wrongOwner.id), false, 'owner mismatch does not poison future valid receipt');
assert.equal(resolveInputEvent({ ...wrongOwner, targetId:'target-A' }, owner, badSeen)?.ownerId, 'target-A');
assert.equal(resolveInputEvent({ ...variants[0][0], id:'bad-duration', durationMs:1 }, owner), null);
assert.equal(resolveInputEvent({ ...variants[0][0], id:'bad-variant', variant:'protect-kill' }, owner), null);

const hit = resolveInputEvent(variants[1][0], owner);
const localized = deriveRuntimeState(owner, hit, .055);
assert.equal(localized.known, true);
assert.deepEqual(localized.contact, [.5,.15,.66]);
const farHit = resolveInputEvent({ ...variants[1][0], id:'far-hit', contactPosition:[50,0,0] }, owner);
assert.equal(deriveRuntimeState(owner, farHit, .055).known, false, 'out-of-domain contact is an unlocalized status response');
assert.deepEqual(deriveRuntimeState(owner, farHit, .055).contact, [0,0,0]);
const unknownHit = resolveInputEvent({ ...variants[1][0], id:'unknown-hit', contactPosition:undefined }, owner);
assert.equal(deriveRuntimeState(owner, unknownHit, .055).known, false);
for (const invisible of [{ ...owner, alive:false }, { ...owner, visible:false }, { ...owner, inVent:true }, { ...owner, ejected:true }]) {
  const stopped = deriveRuntimeState(invisible, hit, .055);
  assert.equal(stopped.live, false);
  assert.equal(stopped.event, null);
}
assert.equal(deriveRuntimeState(owner, hit, DURATIONS.hit).event, null, 'event expires on wall time');
assert.equal(deriveRuntimeState({ ...owner, barrierDurability:0 }, hit, .055).event, null, 'hit cannot outlive inactive authoritative field');
assert.equal(deriveRuntimeState({ ...owner, barrierDurability:0 }, variants.length ? resolveInputEvent(variants[2][0], owner) : null, .479).event, 'break', 'break tail follows its real break event');
assert.equal(deriveRuntimeState({ ...owner, barrierDurability:0 }, resolveInputEvent(variants[2][0], owner), .480).live, false, 'break expires at its finite boundary');
assert.equal(shouldSubmitCauseSfx({gpuReady:false,firstSubmitted:true,fixed:null,state:localized}), false);
assert.equal(shouldSubmitCauseSfx({gpuReady:true,firstSubmitted:false,fixed:null,state:localized}), false);
assert.equal(shouldSubmitCauseSfx({gpuReady:true,firstSubmitted:true,fixed:165,state:localized}), false, 'fixed gallery seek does not produce event SFX');
assert.equal(shouldSubmitCauseSfx({gpuReady:true,firstSubmitted:true,fixed:null,state:{...localized,event:null}}), false, 'snapshot-only steady state is silent');

const mockVoice = () => ({ gainNode: { gain:{setTargetAtTime(){}}, connect(){return this;}, disconnect(){} }, playbackRate:{value:1}, connect(){return this;}, start(){}, stop(){}, disconnect(){} });
const normalSound = new BarrierSfx(false);
normalSound.enabled = true;
normalSound.ctx = { state:'running', currentTime:0, destination:{}, createBuffer(){return{copyToChannel(){}};}, createBufferSource:mockVoice, createGain:()=>({gain:{value:0,setTargetAtTime(){}},connect(){return this;},disconnect(){}}), close:async()=>{} };
assert.equal(normalSound.play('create','cause-create',{submitted:false,offset:.165,rate:1}),false,'no SFX before successful submit');
assert.equal(normalSound.play('create','cause-create',{submitted:true,offset:.165,rate:1}),true);
assert.equal(normalSound.play('create','cause-create',{submitted:true,offset:.165,rate:1}),false,'one SFX per cause');
assert.equal(normalSound.starts.length,1);
assert.deepEqual(normalSound.starts[0],{kind:'create',causeId:'cause-create',offset:.165,rate:1,submitted:true});
normalSound.dispose();
const verifySound = new BarrierSfx(true);
assert.equal(await verifySound.setEnabled(true), false);
assert.equal(verifySound.ctx, undefined);
assert.equal(verifySound.play('create','verify-cause',{submitted:true}), false);
assert.equal(verifySound.starts.length, 0);
verifySound.dispose();
for (const [kind, duration] of Object.entries(DURATIONS)) {
  const pcm = synthesize(kind);
  assert.equal(pcm.length, Math.round(duration * 48000));
  assert.equal(pcm[0], 0);
  assert.equal(pcm.at(-1), 0);
  assert([...pcm].every(Number.isFinite), `${kind} PCM is finite`);
}
assert.equal(fixtureState(650).stage, 1);
assert.equal(fixtureState(1800).stage, 3);
assert.equal(fixtureState(3400).stage, 2);
assert.equal(fixtureState(3880).stage, 4);

console.log(JSON.stringify({status:'pass CPU runtime contract/source port; actual WebGPU untested',r5FrozenFiles:Object.keys(r5Manifest.files).length,projectedScissorBoxes:projectedBoxes,acceptedCauseVariants:acceptedCauses,checks:['typed source/owner/cause dedupe','snapshot-only stable/inactive','wall-clock event age and finite expiry','create/hit/break event stage mapping','known/unknown/out-of-range contact','death/hidden/vent/ejected stop','submit-first once-only SFX gate','verify audio context/gain zero','finite event SFX','pipeline order and scissor/clear contracts'],actualGPU:'not_run',quality:'not_accepted'}));
