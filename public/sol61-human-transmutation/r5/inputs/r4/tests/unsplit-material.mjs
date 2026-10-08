import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {inflateSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {HANDOFF_TIMING as T,MATERIAL_TRANSPORT as M,materialHandoffAt,transportExtentRatio} from '../handoff-state.mjs';
import {WORLD_WGSL,BLOOM_WGSL,PRESENT_WGSL} from '../shader.mjs';
import {WORLD_WGSL as R3_WORLD,BLOOM_WGSL as R3_BLOOM,PRESENT_WGSL as R3_PRESENT} from '../inputs/r3/shader.mjs';

// Read the actual immutable original PNG. This creates no image or rendering artifact.
const png=await readFile(new URL('../assets/philia-front-nine-v752.png',import.meta.url));
assert.equal(createHash('sha256').update(png).digest('hex'),'4f1901dfd275bfec01b6f4fd7da66f190e0b2396320de2fb36cc20a5e36490a3');
assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
let width,height,idat=[];
for(let pos=8;pos<png.length;){
  const len=png.readUInt32BE(pos),tag=png.toString('ascii',pos+4,pos+8),data=png.subarray(pos+8,pos+8+len);
  if(tag==='IHDR'){width=data.readUInt32BE(0);height=data.readUInt32BE(4);assert.equal(data[8],8);assert.equal(data[9],6);assert.equal(data[12],0);}
  if(tag==='IDAT')idat.push(data);pos+=len+12;
}
assert.equal(width,768);assert.equal(height,768);
const raw=inflateSync(Buffer.concat(idat)),stride=width*4,rgba=new Uint8Array(stride*height);
assert.equal(raw.length,(stride+1)*height);
const paeth=(a,b,c)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};
for(let y=0;y<height;y++){
  const filter=raw[y*(stride+1)];assert.ok(filter<=4);
  for(let x=0;x<stride;x++){
    const i=y*stride+x,a=x>=4?rgba[i-4]:0,b=y?rgba[i-stride]:0,c=y&&x>=4?rgba[i-stride-4]:0;
    const prediction=filter===0?0:filter===1?a:filter===2?b:filter===3?Math.floor((a+b)/2):paeth(a,b,c);
    rgba[i]=(raw[y*(stride+1)+x+1]+prediction)&255;
  }
}
const source=(x,y)=>{
  if(x<0||x>=256||y<0||y>=256)return [0,0,0,0];
  const at=(Math.round(y)*width+Math.round(x))*4;return Array.from(rgba.subarray(at,at+4));
};
const smooth=(a,b,t)=>{const u=Math.max(0,Math.min(1,(t-a)/(b-a)));return u*u*(3-2*u);};
const oldHalfCoverage=(outputX,rowY,phaseMs,H)=>{
  const arrival=T.footArrivalMs+(1-rowY)*T.bodySweepMs;
  const oldTravel=(1-smooth(arrival-T.travelMs,arrival,phaseMs))*H*T.travelMs/(1.5*T.bodySweepMs);
  const shift=oldTravel*225/H,center=127.5,aa=.7*225/H;
  return (1-smooth(center-aa,center+aa,outputX+shift))*source(outputX+shift,16+225*rowY)[3]/255+
    smooth(center-aa,center+aa,outputX-shift)*source(outputX-shift,16+225*rowY)[3]/255;
};

// The opaque original center is continuous. R3 partitions it into a vacuum while approaching.
// R4's entire translated row contains that same material, without a center ownership mask.
let oldGapCases=0,originalCenterCases=0;
for(const phaseMs of [430,440,452,464])for(const H of [48,64,128]){
  const rowY=.4,state=materialHandoffAt({rowY,phaseMs,actorHeight:H});
  assert.equal(state.onset,1);assert.equal(state.fixed,0);
  assert.equal(source(127.5,16+225*rowY)[3],255);
  assert.ok(oldHalfCoverage(127.5,rowY,phaseMs,H)<1e-6,'Counterexample reaches the actual R3 center-split path');oldGapCases++;
  const inverseShift=state.travelCSS*225/H;
  const incomingAtOriginalCenter=source(127.5+inverseShift,16+225*rowY);
  assert.equal(incomingAtOriginalCenter[3]*state.transportWeight/255,1,'No new center vacuum in R4 analytic map');originalCenterCases++;
}

// Every source point in a row uses one invertible translation, not a half-dependent path.
// Compare the full original RGBA cross-section at its actual translated destination.
let rgbaSamples=0;
for(const H of [48,64,128])for(const reducedMotion of [false,true])for(const phaseMs of [220,430,440,452,464,710]){
  const rowY=Math.max(0,Math.min(1,1-(phaseMs+55-T.footArrivalMs)/T.bodySweepMs));
  const state=materialHandoffAt({rowY,phaseMs,actorHeight:H,reducedMotion});assert.equal(state.onset,1);assert.equal(state.fixed,0);
  const shift=state.travelCSS*225/H;
  for(let sx=0;sx<256;sx++){
    const destinationX=sx-shift,readX=destinationX+shift;
    assert.deepEqual(source(readX,16+225*rowY),source(sx,16+225*rowY),'Whole RGBA row transported without split, recolor or density factor');rgbaSamples++;
  }
}

let motionSamples=0,maxShear=0,maxReducedShear=0;
const epsilon=.00001;
for(const H of [48,64,128])for(const reducedMotion of [false,true])for(let i=1;i<225;i++){
  const rowY=i/225,arrival=T.footArrivalMs+(1-rowY)*T.bodySweepMs;
  for(const offset of [-110,-90,-75,-55,-30,-1,0,1,12,24]){
    const phaseMs=arrival+offset,state=materialHandoffAt({rowY,phaseMs,actorHeight:H,reducedMotion});
    const a=materialHandoffAt({rowY:rowY-epsilon,phaseMs,actorHeight:H,reducedMotion});
    const b=materialHandoffAt({rowY:rowY+epsilon,phaseMs,actorHeight:H,reducedMotion});
    const shear=Math.abs(b.travelCSS-a.travelCSS)/(2*epsilon*H),limit=reducedMotion?M.reducedMaxRowShear:M.maxRowShear;
    assert.ok(shear<=limit+1e-7,'Bounded material row shear');
    if(reducedMotion)maxReducedShear=Math.max(maxReducedShear,shear);else maxShear=Math.max(maxShear,shear);
    if(phaseMs>=arrival){assert.equal(state.travelCSS,0);assert.equal(state.fixedWeight+state.transportWeight,1);}
    if(state.fixed>0)assert.equal(state.travelCSS,0);
    const later=materialHandoffAt({rowY,phaseMs:phaseMs+.1,actorHeight:H,reducedMotion});
    assert.ok(later.travelCSS<=state.travelCSS,'Single approach direction without reversal');motionSamples++;
  }
}
assert.equal(M.topology,'unsplit-row-sheet');
assert.ok(Math.abs(transportExtentRatio(true)/transportExtentRatio(false)-.4)<1e-14);
assert.match(WORLD_WGSL,/let incomingUV=uv\+vec2f\(shift,0\.\)/);
assert.match(WORLD_WGSL,/let incomingA=incoming\.a\*transportWeight/);
assert.match(WORLD_WGSL,/let combinedA=fixedA\+incomingA/);
assert.doesNotMatch(WORLD_WGSL,/leftHalf|rightHalf|leftUV|rightUV|aL\+aR/);
assert.equal(WORLD_WGSL.split('// Front emission')[1],R3_WORLD.split('// Front emission')[1],'Source radiation and scene output code unchanged');
assert.equal(BLOOM_WGSL,R3_BLOOM);assert.equal(PRESENT_WGSL,R3_PRESENT);
const core=await readFile(new URL('../core.mjs',import.meta.url),'utf8');
assert.match(core,/\[WORLD_WGSL,BLOOM_WGSL,PRESENT_WGSL\]/);
assert.match(core,/entryPoint:'reconstruct'/);
assert.match(core,/renderPass\(encoder,worldPipeline,worldBind,\[views\[0\],views\[1\]\]\)/);
console.log(JSON.stringify({status:'pass',oldGapCases,originalCenterCases,rgbaSamples,motionSamples,maxShear,maxReducedShear,checks:['actual-original-center-alpha-and-R3-counterexample','single-map-full-RGBA-cross-section','bounded-row-shear-normal-reduced','one-direction-convergence-before-fixation','actual-WORLD-path-used-by-core','source-emission-bloom-present-unchanged'],evidenceKind:'CPU-original-alpha-and-analytic-map-plus-source-path-audit',GPU:'not_run',visualQuality:'not_run',ordinarySFX:'not_run'}));
