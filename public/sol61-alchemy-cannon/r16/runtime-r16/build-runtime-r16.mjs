import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(root,'../../..');
const req=path.join(repo,'outputs','request-20261004');
const source=path.join(req,'finish-cannon-r16-creative-sol61-r1');
const priorSource=path.join(req,'finish-cannon-r15-creative-sol61-r1');
const priorRuntime=path.join(req,'finish-cannon-r15-runtime-luna-r1');
const localSource=path.join(root,'source-r16');
const adapter=path.join(root,'source-r15-adapter');
const preview=path.join(root,'preview','cannon-r16');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const read=p=>fs.readFileSync(p);
const parse=b=>JSON.parse(Buffer.from(b).toString('utf8').replace(/^\uFEFF/,''));
const json=p=>parse(read(p));
const copy=(s,d)=>{fs.mkdirSync(path.dirname(d),{recursive:true});fs.copyFileSync(s,d);};
const write=(p,b)=>{fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,b);};
const rel=(base,p)=>path.relative(base,p).split(path.sep).join('/');
const replaceOnce=(text,from,to,label=from)=>{assert.equal(text.split(from).length-1,1,`expected one ${label}`);return text.replace(from,to);};
const expected=json(path.join(source,'CHECKS.json')).pins;
const artifactPins=json(path.join(source,'ARTIFACT-PINS.json'));
for(const f of ['effect.mjs','material.mjs','audio.mjs']){
 const bytes=read(path.join(source,f));assert.equal(sha(bytes),expected[f==='effect.mjs'?'effect':f==='material.mjs'?'material':'audio'],`${f} source hash`);
}
for(const row of artifactPins){const b=read(path.join(source,row.file));assert.equal(b.length,row.bytes,row.file);assert.equal(sha(b),row.sha256,row.file);}
const actual=await import(pathToFileURL(path.join(source,'effect.mjs')).href);
assert.equal(actual.VERSION,'alchemy-cannon-new-e-sol61-r16');
assert.equal(sha(Buffer.from(actual.SHADER)),expected.shader,'actual ESM-imported SHADER');
assert.match(actual.SHADER,/for\(var i=0u;i<24u;i=i\+1u\)/);

// Exact creative inputs are copied; all execution of producer checks is from this copy.
const sourceFiles=['effect.mjs','material.mjs','audio.mjs','DESIGN-CONTRACT.md','HANDOFF.md','CHECKS.json','ARTIFACT-PINS.json','checks.mjs','build-draft.cjs','diagnose-r15.mjs','MECHANISM-DIAGNOSIS.md','R15-DIAGNOSIS.json'];
for(const f of sourceFiles)copy(path.join(source,f),path.join(localSource,f));
for(const f of sourceFiles)assert(read(path.join(localSource,f)).equals(read(path.join(source,f))),`source copy mismatch ${f}`);
for(const f of ['effect.mjs','material.mjs','audio.mjs','checks.mjs','CHECKS.json'])copy(path.join(priorSource,f),path.join(root,'test-support','finish-cannon-r15-creative-sol61-r1',f));
copy(path.join(priorRuntime,'preview','cannon-r15','main.mjs'),path.join(adapter,'main-r15.mjs'));
copy(path.join(priorRuntime,'preview','cannon-r15','gallery.html'),path.join(adapter,'gallery-r15.html'));

// Adapt only runtime identity/pins and add a truthful per-draw GPU configuration receipt.
let main=read(path.join(adapter,'main-r15.mjs')).toString('utf8');
for(const [a,b] of [
 ['R15','R16'],['r15','r16'],['alchemy-cannon-sol61-r15','alchemy-cannon-sol61-r16'],
 ['alchemy-cannon-new-e-sol61-r15','alchemy-cannon-new-e-sol61-r16'],
 ['cf3739efd6d6f26c481e084850cd14f892d59fe061eb805f552d2981152e2e80',expected.effect],
 ['4551d1f0d4ab59d3c42df221d24626cec1b7493f3cc2e7fff9bc9c44ecd34bd6',expected.material],
 ['76bfdb34522bc8bf2a1187754e2aae079c5eb0f9b6374051d1fc4c6e5b5374a3',expected.shader]
])main=main.replaceAll(a,b);
main=replaceOnce(main,"export const FRAME_VERTEX_FLOATS = 8;",`export const FRAME_VERTEX_FLOATS = 8;\nexport const MATERIAL_DEPTH_SAMPLES = 24;\nexport function createGPUConfigurationReceipt(format) {\n  if (typeof format !== 'string' || !format) throw new Error('actual preferred canvas format is missing');\n  return Object.freeze({ format, alphaMode: 'premultiplied',\n    blend: Object.freeze({ color: Object.freeze({ srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' }),\n      alpha: Object.freeze({ srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' }) }),\n    vertexStrideBytes: 32, viewUniformBytes: 16, depthSamples: MATERIAL_DEPTH_SAMPLES, depthAttachment: false,\n    depthSamplesMeaning: '24 material optical path cells; no GPU depth attachment' });\n}`,'render contract insertion');
main=replaceOnce(main,'export function createNativePulseProof({ request, frameId, sample, submittedFrames, lastDraw, queue }) {','export function createNativePulseProof({ request, frameId, sample, submittedFrames, lastDraw, queue, gpuConfiguration }) {','proof signature');
main=replaceOnce(main,'completed: true, queue: Object.freeze({ ...queue }) });','completed: true, queue: Object.freeze({ ...queue }), gpuConfiguration });','proof receipt field');
main=replaceOnce(main,"    const format = gpu.getPreferredCanvasFormat();\n    context.configure({ device, format, alphaMode: 'premultiplied' });","    const format = gpu.getPreferredCanvasFormat();\n    const gpuConfiguration = createGPUConfigurationReceipt(format);\n    context.configure({ device, format: gpuConfiguration.format, alphaMode: gpuConfiguration.alphaMode });",'actual GPU configuration');
main=replaceOnce(main,'      device, shaderMessages: shaderMessages.messages.map(message => ({ type: message.type,','      device, gpuConfiguration, shaderMessages: shaderMessages.messages.map(message => ({ type: message.type,','renderer config exposure');
main=replaceOnce(main,"fragment: { module, entryPoint: 'fs', targets: [{ format, blend: {\n          color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },\n          alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' }\n        } }] },","fragment: { module, entryPoint: 'fs', targets: [{ format: gpuConfiguration.format, blend: gpuConfiguration.blend }] },",'pipeline blend source');
main=replaceOnce(main,'      verify, audioMuted: audio.muted, submittedFrames: renderer.proof().submittedFrames,','      verify, audioMuted: audio.muted, gpuConfiguration: renderer.gpuConfiguration, submittedFrames: renderer.proof().submittedFrames,','snapshot GPU metadata');
main=replaceOnce(main,'            lastDraw: renderer.proof().lastDraw, queue });','            lastDraw: renderer.proof().lastDraw, queue, gpuConfiguration: renderer.gpuConfiguration });','native pulse actual render metadata');
write(path.join(preview,'main.mjs'),main);
let gallery=read(path.join(adapter,'gallery-r15.html')).toString('utf8').replaceAll('R15','R16').replaceAll('r15','r16');
write(path.join(preview,'gallery.html'),gallery);
for(const f of ['effect.mjs','material.mjs','audio.mjs'])copy(path.join(localSource,f),path.join(preview,f));

// Version-bound runtime source pins and exact five browser routes.
const imported=await import(pathToFileURL(path.join(preview,'effect.mjs')).href);
assert.equal(sha(Buffer.from(imported.SHADER)),expected.shader);
const routePins={schema:'dva-cannon-r16-faithful-runtime-route-pins/v1',routes:[]};
for(const f of ['gallery.html','main.mjs','effect.mjs','material.mjs','audio.mjs']){const b=read(path.join(preview,f));routePins.routes.push({route:f,bytes:b.length,sha256:sha(b)});}
write(path.join(root,'ROUTE-PINS.json'),`${JSON.stringify(routePins,null,2)}\n`);
const copiedPins={schema:'dva-cannon-r16-faithful-runtime-source-pins/v1',status:'private faithful runtime draft; producer remains UNSEALED',source:{producerPath:'outputs/request-20261004/finish-cannon-r16-creative-sol61-r1',designOwner:'GPT-6.1-Sol',version:actual.VERSION,sourceStatus:'unsealed executable draft; no native or quality decision implied',effect:{path:'source-r16/effect.mjs',bytes:read(path.join(localSource,'effect.mjs')).length,sha256:expected.effect},material:{path:'source-r16/material.mjs',bytes:read(path.join(localSource,'material.mjs')).length,sha256:expected.material},shaderExport:{bytes:Buffer.byteLength(imported.SHADER),sha256:expected.shader,construction:'actual ESM import of effect.mjs which imports material.mjs; exact concatenated SHADER export'},audio:{path:'source-r16/audio.mjs',bytes:read(path.join(localSource,'audio.mjs')).length,sha256:expected.audio},handoffSha256:sha(read(path.join(localSource,'HANDOFF.md'))),checksSha256:sha(read(path.join(localSource,'CHECKS.json')))},adapter:{implementationOwner:'GPT-6-Luna',baseline:'settled R15 adapter preserving R13 repaired cause controls',creativeChanges:false},abi:{vertexStrideBytes:32,vertexFloats:8,viewUniformBytes:16,materialDepthSamples:24,depthAttachment:false,worldTuple:'[u, y, encodedAge, power]',newBindings:false,sourceTupleSemantics:'negative emission marker dispatches material integration; ordinary straight-RGBA path remains unchanged'},bounds:{activationMs:900,beamMs:420,reducedShapeAgeMs:210,causePreservingHeldControls:true},gpuConfiguration:{format:'read actual getPreferredCanvasFormat() at runtime and include value in every proof',alphaMode:'premultiplied',blend:'one / one-minus-src-alpha',recordedIn:'window.__alchemyCannonProof.gpuConfiguration and nativePulseProof.gpuConfiguration'},acceptance:{nativeCompile:'pending root',nativePhases:'pending root',visualQuality:'not accepted / not reviewed',ordinarySfxListening:'not run',devicePerformance:'not run',gameIntegration:'not connected',adoption:'unknown'}};
write(path.join(root,'SOURCE-PINS.json'),`${JSON.stringify(copiedPins,null,2)}\n`);
const sourceCopy={schema:'dva-cannon-r16-source-copy-check/v1',status:'pass',producerPath:'outputs/request-20261004/finish-cannon-r16-creative-sol61-r1',sourceReadOnly:true,files:sourceFiles.map(f=>({file:f,bytes:read(path.join(localSource,f)).length,sha256:sha(read(path.join(localSource,f))),matched:read(path.join(localSource,f)).equals(read(path.join(source,f)))}))};
write(path.join(root,'SOURCE-COPY-CHECK.json'),`${JSON.stringify(sourceCopy,null,2)}\n`);

// Exact cause-preserving controls regression tests, derived from settled R15 runtime tests.
let tests=read(path.join(priorRuntime,'tests','runtime-r15.test.mjs')).toString('utf8');
for(const [a,b] of [['R15','R16'],['r15','r16'],['alchemy-cannon-sol61-r15','alchemy-cannon-sol61-r16'],['alchemy-cannon-new-e-sol61-r15','alchemy-cannon-new-e-sol61-r16'],['cf3739efd6d6f26c481e084850cd14f892d59fe061eb805f552d2981152e2e80',expected.effect],['4551d1f0d4ab59d3c42df221d24626cec1b7493f3cc2e7fff9bc9c44ecd34bd6',expected.material],['76bfdb34522bc8bf2a1187754e2aae079c5eb0f9b6374051d1fc4c6e5b5374a3',expected.shader]])tests=tests.replaceAll(a,b);
tests=tests.replace("import {section,opticalSample,MATERIAL_WGSL} from '../preview/cannon-r16/material.mjs';","import {section,opticalSample,MATERIAL_WGSL} from '../preview/cannon-r16/material.mjs';\nimport {MATERIAL_DEPTH_SAMPLES,createGPUConfigurationReceipt} from '../preview/cannon-r16/main.mjs';");
tests=tests.replace(/^test\('R16 material witnesses are finite and bounded without asserting visual acceptance',[^\n]*\n/m,`test('R16 optical witnesses stay finite within the declared material support',()=>{\n for(const age of [0,28,100,150,210,220,330,420])for(const u of [.001,.1,.5,.9,.999]){const s=section(u,age);for(const n of ['bodyY','coreY','nearY','bodyR','coreR','nearR','nearWeight'])assert(Number.isFinite(s[n]));assert(s.bodyR>=0&&s.coreR>=0&&s.nearR>=0)}\n const u=1.5*220/420-.25,p=opticalSample(u,-12,9,220);assert(Number.isFinite(p.extinction));assert(p.extinction>=0);assert(p.emission.every(Number.isFinite));\n});\n`);
assert.match(tests,/R16 optical witnesses stay finite/);
tests+=`\ntest('R16 reports material optical samples separately from GPU depth and records actual format contract',()=>{\n assert.equal(MATERIAL_DEPTH_SAMPLES,24);assert.match(MATERIAL_WGSL,/i<24u/);\n const r=createGPUConfigurationReceipt('rgba8unorm');assert.equal(r.format,'rgba8unorm');assert.equal(r.alphaMode,'premultiplied');\n assert.deepEqual(r.blend.color,{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'});\n assert.deepEqual(r.blend.alpha,{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'});\n assert.equal(r.vertexStrideBytes,32);assert.equal(r.viewUniformBytes,16);assert.equal(r.depthSamples,24);assert.equal(r.depthAttachment,false);\n});\n`;
write(path.join(root,'tests','runtime-r16.test.mjs'),tests);

// Preserve the copied R15 source adapter and exact reused R15 producer reference for authorship.
const r15Files=['effect.mjs','material.mjs','audio.mjs','checks.mjs','CHECKS.json'];
for(const f of r15Files)copy(path.join(priorSource,f),path.join(root,'test-support','finish-cannon-r15-creative-sol61-r1',f));
for(const f of ['main.mjs','main-runtime-r14.mjs','gallery-r14.html','gallery-base.html'])copy(path.join(priorRuntime,'source-r14-adapter',f),path.join(adapter,f));
for(const f of ['main-r15.mjs','gallery-r15.html']){} // already copied before adaptation

const testRun=spawnSync(process.execPath,['--test',path.join(root,'tests','runtime-r16.test.mjs')],{cwd:repo,encoding:'utf8'});
const testOut=(testRun.stdout||'')+(testRun.stderr||'');assert.equal(testRun.status,0,`copied runtime tests failed:\n${testOut}`);
const count=Number(testOut.match(/ℹ tests (\d+)/)?.[1]),passed=Number(testOut.match(/ℹ pass (\d+)/)?.[1]),failed=Number(testOut.match(/ℹ fail (\d+)/)?.[1]);
assert.equal(count,6);assert.equal(passed,6);assert.equal(failed,0);
write(path.join(root,'TEST-RUN.json'),`${JSON.stringify({status:'pass',command:'node --test tests/runtime-r16.test.mjs',tests:count,passed,failed,exitCode:testRun.status,stdoutAndSummary:testOut},null,2)}\n`);

// Author CPU checks mutate CHECKS.json, so run only from private copies with the R15 baseline in place.
for(const f of ['effect.mjs','material.mjs','audio.mjs','checks.mjs','CHECKS.json'])copy(path.join(localSource,f),path.join(root,'test-support','producer-r16',f));
const copiedCheck=spawnSync(process.execPath,[path.join(root,'test-support','producer-r16','checks.mjs')],{cwd:repo,encoding:'utf8'});
assert.equal(copiedCheck.status,0,`copied authored checks failed:\n${copiedCheck.stdout}\n${copiedCheck.stderr}`);
const checkResult=parse(read(path.join(root,'test-support','producer-r16','CHECKS.json')));
assert.equal(checkResult.samplerChecks,104);assert.equal(checkResult.boundChecks,240);
write(path.join(root,'COPIED-AUTHORED-CHECK-RESULT.json'),`${JSON.stringify({status:'pass',samplerChecks:checkResult.samplerChecks,boundChecks:checkResult.boundChecks,sourcePins:checkResult.pins,sourceCHECKSRewrittenOnlyInCopy:true,shaderCompile:'not_run',nativeMaterial:'not_run'},null,2)}\n`);

const testResults={schema:'dva-cannon-r16-runtime-tests/v1',status:'pass',tests:{focused:{status:'pass',passed:count,failed:0},authored:{status:'pass',samplerChecks:104,boundChecks:240}},actualImportedShader:'pass',materialModuleFetchPin:'pass',browserRoutes:5,actualHTTPRouteAndMIME:'pending host start',nativeGPUCompile:'pending root',nativeVisualReview:'pending root',quality:'not reviewed',ordinarySfxListening:'not run'};
write(path.join(root,'TEST-RESULTS.json'),`${JSON.stringify(testResults,null,2)}\n`);
write(path.join(root,'README.md'),`# Cannon R16 faithful runtime\n\nPrivate native-review runtime only. Creative files remain UNSEALED and were copied byte-for-byte into source-r16/. The effect's concatenated SHADER is dynamically imported and hash-checked; its material.mjs dependency is a pinned fifth route. Runtime changes are limited to R16 identity/source pins and actual GPU receipt metadata.\n\nThe adapter preserves the R13 cause-preserving held/expiry/restart controls and R15 route/ABI. ABI is 32-byte vertex tuple and View16; no new bindings or depth attachment. The R16 material uses 24 optical path cells (metadata is depthSamples=24; this is not a GPU depth buffer). On native proof, the actual preferred canvas format, premultiplied alpha, and one / one-minus-src-alpha blend are recorded from the configuration used by WebGPU.\n\nThe native review URL is verify=1 and is hard-muted. It starts idle; use window.__alchemyCannonNativeReview.capturePulsePhase({phaseMs:220,causeId:'cannon-r16-root-review'}) for the matched OFF220/ON220 held gate. Source stays ON and reduced motion OFF. OFF/ON must use the same cause, requested phase, fixture frame, CSS/backing/DPR, and completed queue. Expiry at 420 is optional later and is not full-life evidence.\n\nTests: copied focused runtime suite 6/6; copied creative checks 104 sampler parity and 240 support bounds. These are not native compile or visual acceptance. Ordinary motion/SFX, device performance, game integration and adoption remain unverified.\n`);
write(path.join(root,'RUNTIME-READY.json'),`${JSON.stringify({schema:'dva-cannon-r16-runtime-ready/v1',status:'faithful-runtime-built-and-focused-checks-pass; native review host pending',runtimeRoot:rel(repo,root),version:actual.VERSION,versionId:'alchemy-cannon-sol61-r16',sourcePins:copiedPins.source,routeCount:5,routePins:'ROUTE-PINS.json',testResults:'TEST-RESULTS.json',focusedTests:{status:'pass',tests:count,passed,failed},authorChecks:{status:'pass',samplerChecks:104,boundChecks:240},gpuReceiptContract:{formatReceiptImplementation:'ready; reads actual getPreferredCanvasFormat() and returns configuration used',actualNativeFormatReceipt:'not run; appears only after root native capture',alphaMode:'premultiplied',blend:'one / one-minus-src-alpha',materialDepthSamples:24,gpuDepthAttachment:false},qualityAcceptance:'not claimed',nativeCompile:'pending root',host:'not started'},null,2)}\n`);
console.log(JSON.stringify({status:'runtime-built-tests-pass',root:rel(repo,root),sourcePins:copiedPins.source,routeCount:routePins.routes.length,tests:count,authorChecks:{samplerChecks:104,boundChecks:240},gpuReceiptContract:{format:'actual at runtime',alphaMode:'premultiplied',blend:'one / one-minus-src-alpha',materialDepthSamples:24,depthAttachment:false}},null,2));
