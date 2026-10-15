export const VERSION = 'fighter-energy-charge-cleanroom-sol61-r3';
export const DURATION_MS = 1200;
export const VARIANT_COUNT = 4;
export const LOOP_GAP_MS = 600;
export const SFX_OFFSET_MS = 96;
export const SFX_DURATION_MS = 660;
export const PACKAGE_SCHEMA = 'dva-fighter-charge-cleanroom-gallery/v3';
export const SOURCE_SCHEMA = 'dva-fighter-charge-cleanroom-source/v3';
export const SEAL_SCHEMA = 'dva-fighter-charge-cleanroom-seal/v3';
export const PACKAGE_PREFIX = '/public/sol61-fighter-energy-charge/cleanroom-r3-static-bounds-a2/';
export const RUNTIME_CLOSURE = Object.freeze(['index.html', 'gallery-adapter.mjs', 'effect.mjs', 'body.png', 'host-core.mjs']);
export const RECEIPT_FIXTURES = Object.freeze([
  Object.freeze({ name:'ordinary-charge', eventTypes:Object.freeze(['fighter-energy-charge']), milestonePeak:null, destruction:false }),
  Object.freeze({ name:'cross100-resource-entitlement', eventTypes:Object.freeze(['fighter-energy-charge','fighter-energy-destruction-milestone']), milestonePeak:100, destruction:false }),
  Object.freeze({ name:'cross500-iai-charge', eventTypes:Object.freeze(['fighter-energy-charge']), milestonePeak:500, destruction:false }),
  Object.freeze({ name:'cross1000-apex-perks', eventTypes:Object.freeze(['fighter-energy-charge']), milestonePeak:1000, destruction:false })
]);

export function parsePackagePins({ search, pathname, prefix = PACKAGE_PREFIX }) {
  if (typeof pathname !== 'string' || !pathname.startsWith(prefix) || pathname.includes('..')) throw new Error('package route is outside the pinned Fighter Charge cleanroom family');
  const params = new URLSearchParams(search);
  for (const key of ['packageSchema', 'packageManifestSha256', 'packageSealSha256', 'sourceManifestSha256']) {
    if (params.getAll(key).length !== 1) throw new Error(`${key} must appear exactly once`);
  }
  const pins = Object.freeze({
    packageSchema: params.get('packageSchema'),
    packageManifestSha256: params.get('packageManifestSha256'),
    packageSealSha256: params.get('packageSealSha256'),
    sourceManifestSha256: params.get('sourceManifestSha256')
  });
  if (pins.packageSchema !== PACKAGE_SCHEMA) throw new Error('packageSchema query pin is missing or incorrect');
  for (const [key, value] of Object.entries(pins)) if (key !== 'packageSchema' && !/^[0-9a-f]{64}$/.test(value || '')) throw new Error(`${key} query pin is missing or malformed`);
  return pins;
}

function hex(buffer) { return [...new Uint8Array(buffer)].map(value => value.toString(16).padStart(2, '0')).join(''); }
function jsonBytes(bytes, name) {
  try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
  catch (error) { throw new Error(`${name} is not valid UTF-8 JSON: ${String(error?.message || error)}`); }
}
function fileMap(records, expectedPaths, label) {
  if (!Array.isArray(records)) throw new Error(`${label} files must be an array`);
  const map = new Map();
  for (const record of records) {
    if (!record || typeof record.path !== 'string' || !Number.isSafeInteger(record.bytes) || record.bytes < 0 || !/^[0-9a-f]{64}$/.test(record.sha256 || '') || map.has(record.path)) throw new Error(`${label} has an invalid or duplicate file record`);
    map.set(record.path, { path: record.path, bytes: record.bytes, sha256: record.sha256 });
  }
  const expected = [...expectedPaths].sort();
  if (map.size !== expected.length || [...map.keys()].sort().some((path, i) => path !== expected[i])) throw new Error(`${label} closure paths do not match the required runtime set`);
  return map;
}

export async function verifyPackageClosure({ pins, packageManifestBytes, sealBytes, sourceManifestBytes, runtimeFiles, cryptoApi = globalThis.crypto }) {
  if (!cryptoApi?.subtle) throw new Error('Web Crypto SHA-256 is unavailable');
  const digest = async bytes => hex(await cryptoApi.subtle.digest('SHA-256', bytes));
  if (await digest(packageManifestBytes) !== pins.packageManifestSha256) throw new Error('package manifest hash does not match URL pin');
  if (await digest(sealBytes) !== pins.packageSealSha256) throw new Error('package seal hash does not match URL pin');
  if (await digest(sourceManifestBytes) !== pins.sourceManifestSha256) throw new Error('source manifest hash does not match URL pin');
  const pkg = jsonBytes(packageManifestBytes, 'package manifest');
  const seal = jsonBytes(sealBytes, 'package seal');
  const source = jsonBytes(sourceManifestBytes, 'source manifest');
  if (pkg.schema !== PACKAGE_SCHEMA || seal.schema !== SEAL_SCHEMA || source.schema !== SOURCE_SCHEMA) throw new Error('package/source/seal schema mismatch');
  if (pkg.versionId !== VERSION || seal.versionId !== VERSION || source.versionId !== VERSION) throw new Error('package closure version mismatch');
  if (pkg.entry !== 'index.html') throw new Error('package entry must be index.html');
  if (pkg.sourceManifestSha256 !== pins.sourceManifestSha256 || seal.packageSchema !== PACKAGE_SCHEMA ||
      seal.packageManifestSha256 !== pins.packageManifestSha256 || seal.sourceManifestSha256 !== pins.sourceManifestSha256) throw new Error('package seal/source bindings mismatch');
  const runtimeExpected = RUNTIME_CLOSURE;
  const sourceFiles = fileMap(source.files, runtimeExpected, 'source manifest');
  const pkgFiles = fileMap(pkg.files, [...runtimeExpected, 'source-manifest.json'], 'package manifest');
  const sealFiles = fileMap(seal.files, runtimeExpected, 'package seal');
  const sourceManifestRecord = pkgFiles.get('source-manifest.json');
  if (sourceManifestRecord.bytes !== sourceManifestBytes.byteLength || sourceManifestRecord.sha256 !== pins.sourceManifestSha256) throw new Error('package manifest source-manifest record mismatch');
  const runtimeMap = new Map();
  for (const file of runtimeFiles) {
    if (!RUNTIME_CLOSURE.includes(file.path) || runtimeMap.has(file.path)) throw new Error('actual runtime closure has an unexpected or duplicate path');
    const actual = { path: file.path, bytes: file.bytes.byteLength, sha256: await digest(file.bytes) };
    runtimeMap.set(file.path, actual);
    for (const [label, map] of [['source manifest', sourceFiles], ['package manifest', pkgFiles], ['package seal', sealFiles]]) {
      const expected = map.get(file.path);
      if (!expected || expected.bytes !== actual.bytes || expected.sha256 !== actual.sha256) throw new Error(`${label} does not bind actual ${file.path} bytes`);
    }
  }
  if (runtimeMap.size !== runtimeExpected.length) throw new Error('actual runtime closure is incomplete');
  return Object.freeze({ status: 'PACKAGE_CLOSURE_VERIFIED', versionId: VERSION,
    packageSchema: PACKAGE_SCHEMA, packageManifestSha256: pins.packageManifestSha256,
    packageSealSha256: pins.packageSealSha256, sourceManifestSha256: pins.sourceManifestSha256,
    files: Object.freeze([...runtimeMap.values()]) });
}

export function parseStartupIdentity({ search, origin, parentIsSelf }) {
  const params = new URLSearchParams(search);
  if (['galleryStartupToken', 'galleryVersionId', 'galleryAttemptEpoch'].some(key => params.getAll(key).length !== 1)) return null;
  const token = params.get('galleryStartupToken');
  const versionId = params.get('galleryVersionId');
  const attemptEpoch = Number(params.get('galleryAttemptEpoch'));
  if (parentIsSelf || !/^[0-9a-f]{32}$/i.test(token || '') ||
      versionId !== VERSION || !Number.isSafeInteger(attemptEpoch) || attemptEpoch <= 0) return null;
  return Object.freeze({ token, versionId, attemptEpoch, origin });
}

export function validateRetireMessage(event, identity, lastSequence) {
  const d = event?.data;
  return Boolean(identity && event?.origin === identity.origin && d?.schema === 'dva-gallery-startup/v1' &&
    d.action === 'retire' && d.token === identity.token && d.versionId === identity.versionId &&
    d.attemptEpoch === identity.attemptEpoch && (d.sequence === undefined ||
      Number.isSafeInteger(d.sequence) && d.sequence > lastSequence));
}

export class EpisodeClock{constructor({durationForVariant,variantCount=VARIANT_COUNT,gapMs=LOOP_GAP_MS}={}){if(typeof durationForVariant!=='function'||!Number.isSafeInteger(variantCount)||variantCount<1||!Number.isFinite(gapMs)||gapMs<=0)throw TypeError('valid duration profile required');this.durationForVariant=durationForVariant;this.variantCount=variantCount;this.gapMs=gapMs;this.loop=0;this.variantIndex=0;this.durationMs=this.#duration(0);this.elapsedMs=0;this.lastNow=null;this.gapElapsedMs=0;this.held=false}#duration(i){const d=this.durationForVariant(i);if(!Number.isFinite(d)||d<=0)throw RangeError('variant duration must be positive finite');return d}#selectLoop(i){this.loop=i;this.variantIndex=i%this.variantCount;this.durationMs=this.#duration(this.variantIndex);this.elapsedMs=0;this.gapElapsedMs=0}start(now){if(!Number.isFinite(now))throw TypeError('clock time must be finite');this.lastNow=now}tick(now){if(!Number.isFinite(now))throw TypeError('clock time must be finite');if(this.lastNow===null)this.lastNow=now;let remaining=now-this.lastNow;if(remaining<0)throw RangeError('monotonic clock moved backwards');if(!this.held)while(remaining>0){if(this.elapsedMs<this.durationMs){const n=Math.min(remaining,this.durationMs-this.elapsedMs);this.elapsedMs+=n;remaining-=n}else{const n=Math.min(remaining,this.gapMs-this.gapElapsedMs);this.gapElapsedMs+=n;remaining-=n;if(this.gapElapsedMs>=this.gapMs)this.#selectLoop(this.loop+1)}}this.lastNow=now;return this.snapshot()}hold(age,now){if(!Number.isFinite(age)||age<0||age>this.durationMs)throw RangeError('held source age out of range');if(!Number.isFinite(now))throw TypeError('clock time must be finite');this.held=true;this.elapsedMs=age;this.gapElapsedMs=0;this.lastNow=now;return this.snapshot()}resume(now){if(!Number.isFinite(now))throw TypeError('clock time must be finite');this.held=false;this.lastNow=now;return this.snapshot()}replay(now){if(!Number.isFinite(now))throw TypeError('clock time must be finite');this.#selectLoop(this.loop+1);this.held=false;this.lastNow=now;return this.snapshot()}snapshot(){return Object.freeze({elapsedMs:this.elapsedMs,loop:this.loop,variantIndex:this.variantIndex,durationMs:this.durationMs,inGap:this.elapsedMs>=this.durationMs,gapElapsedMs:this.gapElapsedMs,held:this.held})}}
export function completionStillCurrent({ generation, currentGeneration, disposed, retired, hidden,
  connected, surfaceCurrent, sourceOn, mainOn, active, ageMs, durationMs = DURATION_MS }) {
  return generation === currentGeneration && !disposed && !retired && !hidden && connected &&
    surfaceCurrent && sourceOn && mainOn && active && Number.isFinite(ageMs) &&
    ageMs >= 0 && Number.isFinite(durationMs) && durationMs > 0 && ageMs < durationMs;
}

export class AudioVoiceGate{constructor({verify=false,context=null,buffers=null,buffer=null,offsetMs=SFX_OFFSET_MS,durationMs=SFX_DURATION_MS}={}){this.verify=verify;this.context=context;this.buffers=buffers instanceof Map?buffers:new Map([[0,buffer]]);this.offsetMs=offsetMs;this.durationMs=durationMs;this.seenCauses=new Set();this.voices=new Map();this.lastSkip=null;this.disposed=false}activateFromGesture(){if(this.verify)return Object.freeze({state:'silent',reason:'verification mode'});if(this.disposed||!this.context)return Object.freeze({state:'unsupported',reason:'audio unavailable'});try{const r=this.context.state==='running'?Promise.resolve():this.context.resume();return Promise.resolve(r).then(()=>this.context.state==='running'?Object.freeze({state:'active'}):Object.freeze({state:'unsupported',reason:'audio context is not running'}))}catch(e){return Promise.resolve(Object.freeze({state:'unsupported',reason:String(e?.message||e)}))}}acceptCompletedCause({causeId,variantIndex=0,sourcePositive,sourceOn,mainOn,active,ageMs,generationCurrent,hidden=false,disposed=false,retired=false}){if(!causeId||this.seenCauses.has(causeId))return false;this.seenCauses.add(causeId);const reject=r=>{this.lastSkip=Object.freeze({causeId,variantIndex,reason:r});return false};if(this.verify)return reject('verification-hard-muted');if(this.disposed||disposed||retired)return reject('retired-or-disposed');if(hidden)return reject('hidden');if(!generationCurrent)return reject('stale-generation');if(!sourcePositive||!sourceOn||!mainOn||!active)return reject('nonpositive-or-inactive-source');if(!Number.isFinite(ageMs)||ageMs<0||ageMs>=this.offsetMs)return reject('completion-after-onset-window');const buffer=this.buffers.get(variantIndex);if(!this.context||this.context.state!=='running'||!buffer)return reject('audio-not-unlocked-before-onset');try{const node=this.context.createBufferSource();node.buffer=buffer;node.connect(this.context.destination);const when=this.context.currentTime+(this.offsetMs-ageMs)/1000,voice={causeId,variantIndex,node,when,stopped:false};this.voices.set(causeId,voice);node.onended=()=>{this.voices.delete(causeId);try{node.disconnect()}catch{}};node.start(when);return true}catch(e){try{this.voices.get(causeId)?.node?.disconnect?.()}catch{}this.voices.delete(causeId);this.lastSkip=Object.freeze({causeId,variantIndex,reason:'voice-scheduling-failed',detail:String(e?.message||e)});return false}}stopCause(id,reason='cause-stopped'){const v=this.voices.get(id);if(!v)return false;this.voices.delete(id);v.stopped=true;try{v.node.stop()}catch{}try{v.node.disconnect()}catch{}this.lastSkip=Object.freeze({causeId:id,variantIndex:v.variantIndex,reason});return true}stopAll(reason='host-stopped'){for(const id of [...this.voices.keys()])this.stopCause(id,reason)}dispose(){this.stopAll('disposed');this.disposed=true}snapshot(){return Object.freeze({verify:this.verify,hardMuted:this.verify,seenCauseCount:this.seenCauses.size,activeVoices:this.voices.size,lastSkip:this.lastSkip,disposed:this.disposed,contextState:this.context?.state||'absent'})}}