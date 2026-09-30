import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {ROOM,LAMPS,STEAM,PURGE,stateAt,fitRoom,uniformsAt,validRoomEvent} from './scene.mjs';
import {supportRects,projectedSupports,postSupports} from './projection.mjs';
import {drawPlan} from './draw-plan.mjs';import {SAMPLE_RATE,SCORE,synthesize,wavBytes,CUES} from './sfx-score.mjs';import {B_CONTRACT} from './b-design.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));const report={kind:'CPU-only',quality:'not_run',GPU:'not_run',listening:'not_run',checks:{},warnings:[],wav:{}};
const digest=p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
assert.equal(digest(ROOM.bitmap),ROOM.bitmapHash);report.checks.bitmapImmutable=true;
const views=[[980,620],[930,860],[465,430],[400,300],[1200,500]];const fits=[];let points=0,finiteStates=0,maxDraws=0,maxEQuadArea=0;
for(const [cssW,cssH]of views)for(const dpr of [1,2]){const w=cssW*dpr,h=cssH*dpr;
 const f=fitRoom(w,h);assert.equal(f.extent[0]/ROOM.width,f.extent[1]/ROOM.height);assert.ok(f.offset[0]>=0&&f.offset[1]>=0);assert.ok(f.extent[0]<=w+1e-6&&f.extent[1]<=h+1e-6);
 fits.push({cssViewport:[cssW,cssH],dpr,viewport:[w,h],scale:f.scale,offset:f.offset,extent:f.extent});
 const a=projectedSupports(w,h),post=postSupports(w,h,dpr);for(const s of [...a,...post])assert.ok(s.bounds.every(Number.isFinite));
 for(let ms=0;ms<=12000;ms+=10){
  for(const reducedMotion of [false,true]){
   const state=stateAt(ms,{reducedMotion});assert.ok(Number.isFinite(state.lamp));finiteStates++;
   const ds=drawPlan(ms,{reducedMotion});maxDraws=Math.max(maxDraws,ds.length);
   let eArea=0;for(const d of ds.slice(1))eArea+=(d.bounds[2]-d.bounds[0])*(d.bounds[3]-d.bounds[1])*f.scale*f.scale;maxEQuadArea=Math.max(maxEQuadArea,eArea);
   for(const p of state.plumes){const source=STEAM.sources[p.sourceIndex],cx=source[0]+p.drift,cy=source[1]-p.rise,half=5+9*p.p,box=supportRects().filter(v=>v.id==='steam')[p.sourceIndex].bounds;
    for(const dx of [-half-3.5,half+3.5])for(const dy of [-16,16]){const x=cx+dx,y=cy+dy;assert.ok(x>=box[0]-1e-9&&x<=box[2]+1e-9&&y>=box[1]-1e-9&&y<=box[3]+1e-9);points++;}
   }
   for(const p of state.purges){assert.ok(p.flow>=0&&p.flow<=1&&p.reach>=0&&p.reach<=1&&p.tail>=0&&p.tail<=1);}
   assert.equal(uniformsAt(w,h,ms,{reducedMotion,dpr}).byteLength,96);assert.equal(uniformsAt(w,h,ms,{dpr})[15],dpr);
  }
 }
}
report.checks.fits=fits;report.checks.containmentPoints=points;report.checks.finiteStates=finiteStates;report.checks.maxWorldDraws=maxDraws;report.checks.maxEQuadAreaPx=maxEQuadArea;
assert.equal(drawPlan(12000).length,1);assert.equal(drawPlan(-1).length,1);assert.equal(drawPlan(NaN).length,1);assert.equal(drawPlan(1000,{active:false}).length,1);assert.equal(drawPlan(1000,{bitmapOnly:true}).length,1);assert.equal(stateAt(11900).plumes.length,0);report.checks.finiteExpiry=true;
assert.ok(validRoomEvent({type:'room-environment-episode',roomId:'cafeteria-room-attempt-04',causeId:'demo-1',startMs:0,active:true}));assert.ok(!validRoomEvent({type:'purchase',roomId:'cafeteria-room-attempt-04',causeId:'demo-1',startMs:0,active:true}));report.checks.demoNotGameReceipt=true;
const required=['identity','DeepStructure','PhysicalModel','ScaleRegime','OctaDomain','PerceptualReadability','GeometryConstraint','StateDynamics','Couplings','CausalityLinks','Evidence','SurroundingChanges','VisualProjection','BeautyStructureApplication','AcceptanceCriteria','FailurePatterns'];
const domains=['Thermo','Fluid','Optics','Materials','Electromagnetics','Rheology','WaveOptics','SurfaceScience'];
for(const ph of B_CONTRACT.PhenomenonSystemTemplate.PhenomenonBlock){for(const k of required)assert.ok(ph[k]);assert.deepEqual(Object.keys(ph.OctaDomain.Domains),domains);assert.equal(ph.Couplings.CausalAssessment.check_status,'hypothesis_only');for(const a of Object.values(ph.BeautyStructureApplication.axes))assert.ok(a.length>=2);}
report.checks.fullPH=5;report.checks.fullDomains=40;report.checks.structuralOnlyNotQuality=true;
for(const kind of Object.keys(SCORE)){const pcm=synthesize(kind);let peak=0,square=0;for(const x of pcm){assert.ok(Number.isFinite(x));peak=Math.max(peak,Math.abs(x));square+=x*x;}assert.equal(pcm[0],0);assert.equal(pcm.at(-1),0);assert.ok(peak>0&&peak<1);assert.equal(pcm.length,Math.round(SCORE[kind].duration*SAMPLE_RATE));fs.writeFileSync(path.join(root,`cafeteria-${kind}-r1.wav`),wavBytes(pcm));report.wav[kind]={samples:pcm.length,duration:SCORE[kind].duration,peak,rms:Math.sqrt(square/pcm.length),endpointsZero:true};}
assert.ok(CUES.every(c=>c.atMs+SCORE[c.score].duration*1000<=12000));report.checks.finiteSFX=true;report.checks.verifyAudio='runtime_not_run; pure synth has no AudioContext';
report.warnings.push('World registration is illustrative raster proxy, not reconstructed 3D/physical validation.','CPU projected supports and finite RGB/PCM do not prove rendered semantics, visual quality, or listening.','No playable runtime/compile/submit yet: Luna handoff required.');
fs.writeFileSync(path.join(root,'b-contract.json'),JSON.stringify(B_CONTRACT,null,2)+'\n');fs.mkdirSync(path.join(root,'evidence'),{recursive:true});fs.writeFileSync(path.join(root,'evidence/cpu.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
