import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { GLINT_SITES as S, GLINT_OPTICS as O, glintAt, rayPSF } from '../glints.mjs';
import { WORLD_WGSL, PRESENT_WGSL } from '../shader.mjs';
import { materialHandoffAt } from '../handoff-state.mjs';
import { VERSION_ID } from '../cause.mjs';
import { makeFixture, ORIGINAL_SHA256 } from '../fixture.mjs';
import { BODY_COMPLETION as C, bodyCompletionEnvelope, completionGlintPulse, contourWidthCss } from '../completion-design.mjs';

const root = process.cwd();
const here = path.dirname(fileURLToPath(import.meta.url));
const pkg = path.resolve(here, '..');
const r9 = path.resolve(root, 'outputs/request-20261009/human-small-many-r9/public/sol61-human-transmutation/r9');
const read = (base, file) => fs.readFileSync(path.join(base, file));
const hash = b => crypto.createHash('sha256').update(b).digest('hex');

function decodeRgbaPng(bytes) {
  const signature = Buffer.from([137,80,78,71,13,10,26,10]);
  assert.ok(bytes.subarray(0,8).equals(signature));
  let width=0,height=0,colorType=0,bitDepth=0;
  const idat=[];
  for(let at=8;at<bytes.length;){const n=bytes.readUInt32BE(at),type=bytes.toString('ascii',at+4,at+8),data=bytes.subarray(at+8,at+8+n);if(type==='IHDR'){width=data.readUInt32BE(0);height=data.readUInt32BE(4);bitDepth=data[8];colorType=data[9];}if(type==='IDAT')idat.push(data);at+=12+n;if(type==='IEND')break;}
  assert.equal(bitDepth,8);assert.equal(colorType,6,'source must remain RGBA8');
  const bpp=4,rowBytes=width*bpp,raw=zlib.inflateSync(Buffer.concat(idat));
  const out=Buffer.alloc(height*rowBytes);let src=0;
  const paeth=(a,b,c)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};
  for(let y=0;y<height;y++){const filter=raw[src++],row=y*rowBytes,prev=row-rowBytes;for(let x=0;x<rowBytes;x++){const v=raw[src++],a=x>=bpp?out[row+x-bpp]:0,b=y?out[prev+x]:0,c=y&&x>=bpp?out[prev+x-bpp]:0;out[row+x]=(v+(filter===0?0:filter===1?a:filter===2?b:filter===3?Math.floor((a+b)/2):filter===4?paeth(a,b,c):(()=>{throw Error('unsupported PNG filter')})()))&255;}}
  return {width,height,rgba:out};
}

function alphaCropBilinear(png, x, y) {
  // Coordinates are in the verified 256x256 original crop; samples are at texel centers.
  if(x<0||y<0||x>=256||y>=256)return 0;
  const qx=x-.5,qy=y-.5,x0=Math.max(0,Math.min(255,Math.floor(qx))),y0=Math.max(0,Math.min(255,Math.floor(qy))),x1=Math.min(255,x0+1),y1=Math.min(255,y0+1),tx=Math.max(0,Math.min(1,qx-x0)),ty=Math.max(0,Math.min(1,qy-y0));
  const a=(xx,yy)=>png.rgba[(yy*png.width+xx)*4+3]/255;
  return (a(x0,y0)*(1-tx)+a(x1,y0)*tx)*(1-ty)+(a(x0,y1)*(1-tx)+a(x1,y1)*tx)*ty;
}

test('R10 identity and frozen R9 provenance are exact; edition ceiling is 10/10',()=>{
  const r9Manifest=JSON.parse(read(r9,'package-manifest.json')),r9Seal=JSON.parse(read(r9,'SEAL.json'));
  assert.equal(hash(read(r9,'package-manifest.json')),'c6266bedffa0588ce5c7c4ad09ed715f229d29702f63ea6fd3055980b7bf657e');
  assert.equal(hash(read(r9,'SEAL.json')),'9633466ad978bfb0080297d049c73ea8470eb1d33b0b154691fb2c302af76c44');
  assert.equal(r9Seal.packageManifestSha256,'c6266bedffa0588ce5c7c4ad09ed715f229d29702f63ea6fd3055980b7bf657e');
  const manifest=JSON.parse(read(pkg,'package-manifest.json'));
  assert.equal(VERSION_ID,'human-transmutation-sol61-r10');
  assert.equal(manifest.versionId,'human-transmutation-sol61-r10');
  assert.deepEqual(manifest.edition,{creativeEdition:10,creativeLimit:10,creativeRemaining:0,creativeIterationStopped:true});
  assert.equal(manifest.source.parentVersionId,r9Manifest.versionId);
  assert.equal(manifest.source.parentManifestSha256,'c6266bedffa0588ce5c7c4ad09ed715f229d29702f63ea6fd3055980b7bf657e');
  const seal=JSON.parse(read(pkg,'SEAL.json')),ready=JSON.parse(read(pkg,'READY.json'));
  assert.equal(seal.packageManifestSha256,hash(read(pkg,'package-manifest.json')));
  assert.equal(ready.packageSealSha256,hash(read(pkg,'SEAL.json')));
  for(const file of seal.files){const bytes=read(pkg,file.path);assert.equal(bytes.length,file.bytes,file.path);assert.equal(hash(bytes),file.sha256,file.path);}
  assert.equal(ready.status,'READY_FOR_PRIMARY_NATIVE_WEBGPU_VERIFICATION');
  assert.equal(ready.nativeVisualAcceptance,'NOT RUN');assert.equal(ready.publication,'NOT PUBLISHED');
});

test('the same 60 opaque sites, timing, optics, artwork, transport and SFX are preserved',async()=>{
  const oldG=await awaitImport('glints.mjs',r9);
  assert.deepEqual(S,oldG.GLINT_SITES);assert.equal(S.length,60);
  assert.deepEqual(O,oldG.GLINT_OPTICS);
  for(const file of ['assets/philia-front-nine-v752.png','sfx.mjs','handoff-state.mjs'])assert.equal(hash(read(pkg,file)),hash(read(r9,file)),file);
  const rootManifest=JSON.parse(read(pkg,'package-manifest.json'));
  assert.equal(rootManifest.effectCorrection.siteCount,60);assert.equal(rootManifest.effectCorrection.siteCountChange,0);
  assert.equal(rootManifest.effectCorrection.axisDegrees,17);assert.equal(rootManifest.effectCorrection.sourceRadiance,14);
});

async function awaitImport(file, base) { return import(pathToFileURL(path.join(base,file))); }

test('front arrival pulses are unchanged before completion and completion pulse is max-unioned, fixed, finite and gated',async()=>{
  const oldG=await awaitImport('glints.mjs',r9);
  for(let i=0;i<S.length;i++)for(const phaseMs of [0,200,450,650,813.999])assert.equal(glintAt({index:i,phaseMs}).flux,oldG.glintAt({index:i,phaseMs}).flux);
  assert.equal(S.length,60);
  for(let index=0;index<S.length;index++){
    const site=S[index],onset=C.beginsMs+site.staggerMs;
    assert.equal(materialHandoffAt({rowY:(site.y-16)/225,phaseMs:C.beginsMs}).fixed,1);
    assert.equal(completionGlintPulse({phaseMs:onset,staggerMs:site.staggerMs,durationMs:site.durationMs}),0);
    const riseDone=onset+C.glintRiseMs;
    assert.equal(completionGlintPulse({phaseMs:riseDone,staggerMs:site.staggerMs,durationMs:site.durationMs}),1);
    const actual=glintAt({index,phaseMs:riseDone});
    assert.equal(actual.pulse,Math.max(actual.arrivalPulse,actual.completionPulse));assert.ok(actual.completionPulse>0);
    for(const key of ['sourceEnabled','glintsEnabled','targetVisible','sourceActive'])assert.equal(glintAt({index,phaseMs:riseDone,[key]:false}).flux,0);
    assert.equal(glintAt({index,phaseMs:riseDone,sourceAlpha:0}).flux,0);
    assert.equal(completionGlintPulse({phaseMs:onset+site.durationMs,staggerMs:site.staggerMs,durationMs:site.durationMs}),0);
    assert.equal(glintAt({index,phaseMs:1200}).flux,0);
  }
  const last=Math.max(...S.map(s=>C.beginsMs+s.staggerMs+s.durationMs));assert.ok(last<1200);
  assert.deepEqual([C.beginsMs,C.riseEndMs,C.fadeBeginsMs,C.endsMs,C.glintRiseMs,C.glintFallMs,C.lifetimeMs],[814,844,890,1020,18,40,1200]);
  assert.equal(bodyCompletionEnvelope(814),0);assert.ok(bodyCompletionEnvelope(830)>0);assert.equal(bodyCompletionEnvelope(844),1);assert.equal(bodyCompletionEnvelope(890),1);assert.equal(bodyCompletionEnvelope(1020),0);assert.equal(bodyCompletionEnvelope(1200),0);
});

test('shader uses actual sampled alpha contour, shared registered CSS neighbors and the same design constants',()=>{
  assert.match(WORLD_WGSL,/let completionEnvelope=smoothstep\(814\.,844\.,time\)\*\s*\(1\.\-smoothstep\(890\.,1020\.,time\)\)/);
  assert.match(WORLD_WGSL,/let widthCSS=0\.8\*\(p\.extent\.w\/64\.\)/);
  assert.match(WORLD_WGSL,/let neighborUV=vec2f\(widthCSS\)\/p\.rect\.zw/);
  assert.match(WORLD_WGSL,/sampleOriginal\(uv-vec2f\(neighborUV\.x,0\.\)\)\.a/);
  assert.match(WORLD_WGSL,/sampleOriginal\(uv\+vec2f\(neighborUV\.x,0\.\)\)\.a/);
  assert.match(WORLD_WGSL,/sampleOriginal\(uv-vec2f\(0\.,neighborUV\.y\)\)\.a/);
  assert.match(WORLD_WGSL,/sampleOriginal\(uv\+vec2f\(0\.,neighborUV\.y\)\)\.a/);
  assert.match(WORLD_WGSL,/s\.a\*max\(0\.,s\.a-min\(min\(alphaLeft,alphaRight\),min\(alphaUp,alphaDown\)\)\)/);
  assert.match(WORLD_WGSL,/vec3f\(0\.24,1\.15,0\.72\)\*1\.65\*completionEnvelope/);
  assert.doesNotMatch(WORLD_WGSL,/closure|\(y-\.06\)\/\.075/);
  assert.match(WORLD_WGSL,/let pulse=max\(arrivalPulse,completionPulse\)/);
  assert.match(WORLD_WGSL,/let completionAge=time-814\. - info\.z/);
  assert.match(WORLD_WGSL,/smoothstep\(0\.,18\.,completionAge\)/);
  assert.match(WORLD_WGSL,/smoothstep\(info\.w-40\.,info\.w,completionAge\)/);
  assert.match(PRESENT_WGSL,/textureSampleLevel\(glints,linearSampler,sourceUV,0\.\)/);
});

test('actual R9 RGBA crop produces a supported edge signal across head, torso, arms and legs without source outside alpha',()=>{
  const png=decodeRgbaPng(read(pkg,'assets/philia-front-nine-v752.png'));
  assert.equal(hash(read(pkg,'assets/philia-front-nine-v752.png')),ORIGINAL_SHA256);
  assert.deepEqual([png.width,png.height],[768,768]);
  const H=64,actualActorHeight=225*(H/225),rectWidth=256*(H/225),stepUv=contourWidthCss(actualActorHeight)/rectWidth,stepTex=stepUv*256;
  assert.ok(Math.abs(stepTex-2.8125)<1e-10);
  const bands=[[16,55],[56,115],[116,175],[176,241]],counts=[];
  for(const [y0,y1] of bands){let count=0;for(let y=y0;y<y1;y++)for(let x=0;x<256;x++){const a=alphaCropBilinear(png,x+.5,y+.5);const l=alphaCropBilinear(png,x+.5-stepTex,y+.5),r=alphaCropBilinear(png,x+.5+stepTex,y+.5),u=alphaCropBilinear(png,x+.5,y+.5-stepTex),d=alphaCropBilinear(png,x+.5,y+.5+stepTex);const contour=a*Math.max(0,a-Math.min(l,r,u,d));if(contour>0)count++;if(a===0)assert.equal(contour,0);}counts.push(count);}
  assert.ok(counts.every(n=>n>0),`no alpha-bound emission found in body bands: ${counts}`);
  assert.equal(contourWidthCss(64),.8);assert.equal(contourWidthCss(128),1.6);
  for(const height of [64,128]){const fixture=makeFixture({height});assert.equal(fixture.sprite.scale,height/225);const actorH=fixture.sprite.alphaSupport.height*fixture.sprite.scale;const neighborUv=contourWidthCss(actorH)/(fixture.sprite.crop.width*fixture.sprite.scale);assert.ok(Math.abs(neighborUv-.8*225/(64*256))<1e-12);}
  console.log('CPU_ACTUAL_ALPHA_CONTOUR_NOT_VISUAL_ACCEPTANCE',JSON.stringify({sourceSha256:ORIGINAL_SHA256,crop:[0,0,256,256],neighborTexels:stepTex,contourCountsByYBand:counts,heights:[64,128]}));
});

test('source-off, observer-off, visibility/expiry, four-pass and gallery producer/receiver contracts remain separate and intact',async()=>{
  const core=read(pkg,'core.mjs').toString(),preview=read(pkg,'preview.mjs').toString(),gallery=read(pkg,'gallery.html').toString(),index=read(pkg,'index.html').toString();
  assert.match(WORLD_WGSL,/let sourceOn=p\.controls\.y>\.5 && p\.state\.y>\.5/);
  assert.match(WORLD_WGSL,/if !sourceOn\s*\{\s*actor\s*=\s*s;\s*\}\s*else\s*\{/);
  assert.match(core,/submittedRenderPasses|passes:4/);assert.match(core,/observerEnabled/);assert.match(core,/sourceEnabled/);
  assert.match(core,/glintSource:'actual-alpha-bound-fixation-plus-completion-MRT'/);
  assert.match(gallery,/const versionId='human-transmutation-sol61-r10'/);assert.match(gallery,/const currentOwner='human-transmutation-sol61-r10'/);
  assert.match(gallery,/schema:'dva-gallery-startup\/v1'/);assert.match(gallery,/parentStartup/);assert.match(gallery,/galleryVersionId/);
  assert.match(preview,/human-r10-fixture-/);assert.match(index,/GPT-6\.1-Sol r10/);assert.match(index,/品質審査/);
  const manifest=JSON.parse(read(pkg,'package-manifest.json'));
  assert.equal(manifest.runtime.submittedRenderPasses,4);assert.equal(manifest.runtime.runtimeClosure.length,14);assert.ok(manifest.runtime.runtimeClosure.includes('completion-design.mjs'));
  for(const rel of manifest.runtime.runtimeClosure)assert.ok(fs.existsSync(path.join(pkg,rel)),`missing runtime closure member: ${rel}`);
  const pins=JSON.parse(read(pkg,'SOURCE-PINS.json'));
  assert.equal(pins.design.sha256,hash(read(root,'outputs/request-20261010/human-transmutation-r10-body-completion-design/DESIGN.md')));
  assert.equal(pins.analytic.sha256,hash(read(root,'outputs/request-20261010/human-transmutation-r10-body-completion-design/completion-design.mjs')));
  assert.equal(manifest.status.qualityAcceptance,'not reviewed');assert.equal(manifest.status.publication,'not published');assert.equal(manifest.status.adoption,'unknown/unadopted');assert.equal(manifest.status.mainGameIntegration,'not connected');
});

test('R9 front transport and unrelated presentation contracts are byte-equal except targeted edition identity and shader addition',async()=>{
  const oldH=read(r9,'handoff-state.mjs'),newH=read(pkg,'handoff-state.mjs');assert.deepEqual(newH,oldH);
  const oldCore=read(r9,'core.mjs').toString(),newCore=read(pkg,'core.mjs').toString();
  assert.equal(newCore.trimEnd(),oldCore.replaceAll('human-r9-original-verified','human-r10-original-verified').replaceAll('actual-alpha-bound-fixation-MRT','actual-alpha-bound-fixation-plus-completion-MRT').trimEnd());
  const oldS=await awaitImport('shader.mjs',r9);
  for(const invariant of ['let rowArrival=90.+(1.-y)*700.;','let completed=smoothstep(rowArrival,rowArrival+24.,time);','let frontEnvelope=onset*(1.-smoothstep(790.,865.,time));','let emissionSupport=s.a;']){
    assert.ok(WORLD_WGSL.includes(invariant),`R10 missing preserved shader term ${invariant}`);
    assert.ok(oldS.WORLD_WGSL.includes(invariant),`R9 does not pin expected shader term ${invariant}`);
  }
  assert.equal(hash(read(pkg,'sfx.mjs')),hash(read(r9,'sfx.mjs')));
});
