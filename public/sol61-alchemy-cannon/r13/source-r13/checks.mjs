import fs from 'node:fs';import crypto from 'node:crypto';import assert from 'node:assert/strict';
import * as current from './effect.mjs';import * as prior from '../finish-cannon-r12-creative-sol61-r1/effect.mjs';
const read=p=>fs.readFileSync(new URL(p,import.meta.url)),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
for(const [r,pin] of [[9,'ed8d2c2f8a926dd660c56c96b12bf8c9916f461680ce55b01d9b24d71f055bdd'],[10,'a532bbefe31fa73c04c3f8bb66ce1d8dc83e21a61423c4d7b5bc33c56b1cc3b4'],[11,'73054d8a0c87963e7664528344c226171f048e2e3515f22a34120d732c39689a'],[12,'a083818c5c4c09c90c56c727b9e893329cf8e1bb13f873569585c7a88fa1eb59']])assert.equal(sha(read('../finish-cannon-r'+r+'-creative-sol61-r1/effect.mjs')),pin);
assert.equal(sha(Buffer.from(prior.SHADER)),'c6b03455df10f3006c0a3754d974071180ccde451a5314cd61e341d6963e1aa4');
assert.equal(sha(read('./audio.mjs')),'683e0e333e7608f81b5255e3b9bd50dd5f88e143fbb6e78627d770546e4f170a');
const block=(s,a,b)=>s.slice(s.indexOf(a),s.indexOf(b,s.indexOf(a))),now=read('./effect.mjs').toString(),old=read('../finish-cannon-r12-creative-sol61-r1/effect.mjs').toString();
assert.equal(block(now,'export function validateEvent','const smooth'),block(old,'export function validateEvent','const smooth'));
assert.equal(block(now,'export function sampleEvent','export const SHADER'),block(old,'export function sampleEvent','export const SHADER'));
assert.equal(block(now,'struct View','fn parcel'),block(old,'struct View','fn parcel'));
assert.equal(block(now,'@fragment fn fs',' // Projected pressure'),block(old,'@fragment fn fs',' // Finite advancing'));
const sm=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
const p=(q,a,w)=>sm(1-Math.abs((q-a)/w));
const polygon=(vertices,x,y)=>{let distance=Infinity;for(let i=0;i<vertices.length;i++){const a=vertices[i],b=vertices[(i+1)%vertices.length],dx=b[0]-a[0],dy=b[1]-a[1];distance=Math.min(distance,(dx*(y-a[1])-dy*(x-a[0]))/Math.sqrt(dx*dx+dy*dy));}return sm(distance/.7);};
// Literal WGSL equations independently evaluated on CPU Float64; not shader-driver parity.
function equation(u,y,age,reduced,power,observer=false){
 if(u<=0||u>=1)return {rgb:[0,0,0],alpha:0};
 const t=reduced?210:Math.max(0,age),front=.08+.92*sm(t/210),hw=Math.min(.28,front*.66),start=front-hw;
 if(u>=front||power<=0)return {rgb:[0,0,0],alpha:0};
 const hx=(u-start)/hw*100,hs=sm(start/.035),q=u-1.22*t/420,tt=Math.max(0,Math.min(1,u/start));
 const fold=p(q,-.19,.13)*(1-sm((tt-.55)/.45)),ax=sm(u/.035),w=(1-.16*fold)*ax,tc=(4*fold-3*sm(tt))*(1-sm(tt))*ax;
 const tail=u<=start,r=tail?15.5*w:23*hs,c=tail?tc-1.5*w:-3*hs;
 if(observer){const a=.075*sm((r+4*ax-Math.abs(y-c))/3.4)*power;return {rgb:[.08,.86,.75].map(v=>v*2.2*a),alpha:a};}
 let ar=0,aw=0,an=0,ac=0,light=0;
 if(tail){
  ar=sm((y-(tc-17*w))/.8)*sm((tc+14*w-y)/.8);aw=sm((y-(tc-11*w))/.8)*sm((tc+2*w-y)/.8);
  an=sm((y-(tc+(2-6*fold)*w))/.8)*sm((tc+14*w-y)/.8);light=Math.max(0,Math.min(1,(tc+14*w-y)/(31*w)));
 }else{
  const v=pts=>pts.map(([x,y])=>[x,y*hs]);
  ar=polygon(v([[-3,-17],[40,-26],[44,-23],[-3,-11]]),hx,y);
  aw=polygon(v([[-3,-11],[44,-23],[88,-10],[78,8],[-3,2]]),hx,y);
  an=polygon(v([[-3,2],[68,4],[79,20],[-3,14]]),hx,y);
  ac=polygon(v([[62,4],[79,-14],[100,0],[79,20]]),hx,y);
  light=Math.max(0,Math.min(1,(20*hs-y)/(46*hs)));
 }
 const colors=[[.045,.24+.08*light,.28+.08*light],[13.58,8.22,2.56],[.025+.055*light,.10+.14*light,.22+.14*light],[.50+.20*light,.12+.14*light,.025+.055*light]];
 let rgb=[0,0,0],alpha=0;for(const [i,a] of [ar,aw,an,ac].entries()){rgb=rgb.map((v,k)=>colors[i][k]*2.6*a+v*(1-a));alpha=a+alpha*(1-a);}
 return {rgb:rgb.map(v=>v*power),alpha:alpha*power};
}
let sampler=0,support=0,material=0,parity=0,front=0,reduced=0,witness=0,whitePath=0,maxMain=0,maxObs=0,error=0,minTailThickness=Infinity;
const base={id:'r13-test',playerId:'p',startedAt:70,x:180,y:270,targetX:760,targetY:270,handWorld:{x:180,y:270,eventId:'r13-test',playerId:'p',frameId:7}};
for(const type of Object.keys(prior.DURATIONS))for(const variant of ['continuous','gbo-tenfold'])for(const observation of [true,false])for(const reducedMotion of [true,false])for(const age of [-1,0,28,100,150,220,280,330,419,420,520,899,900])for(const end of [[760,270],[181,270],[180,800],[50,90]]){
 const e={...base,type,variant,targetX:end[0],targetY:end[1]};assert.deepEqual(current.sampleEvent(e,70+age,7,{observation,reducedMotion}),prior.sampleEvent(e,70+age,7,{observation,reducedMotion}));sampler++;
}
let last=-1;
for(let age=0;age<=420;age++){
 const g=current.sampleTransportGeometry(.4,age),oldg=prior.sampleTransportGeometry(.4,age);assert.equal(g.front,oldg.front);assert(g.front>=last);last=g.front;
 assert.equal(current.sampleTransportGeometry(g.front,age).radius,0);if(g.front<1)assert.equal(current.sampleTransportGeometry((1+g.front)/2,age).radius,0);front++;
}
for(const reducedMotion of [false,true])for(const age of [0,10,28,55,100,150,210,220,280,330,419])for(let i=0;i<=200;i++){
 const u=i/200,g=current.sampleTransportGeometry(u,age,{reducedMotion});assert(g.radius>=0);assert([g.radius,g.center,g.front,g.headWidth,g.headScale,g.fold].every(Number.isFinite));
 if(g.active){maxMain=Math.max(maxMain,Math.abs(g.center)+g.radius);maxObs=Math.max(maxObs,Math.abs(g.center)+g.radius+4*g.axial);assert(maxMain<27&&maxObs<31);}
 if(g.active&&g.tail&&u>=.035){minTailThickness=Math.min(minTailThickness,31*g.width);assert(31*g.width>=26.04-1e-10);}
 support++;
 for(const r of [-1,-.95,-.8,-.65,-.5,-.3,-.1,0,.15,.3,.5,.7,.85,.95,1]){
  const y=g.center+r*g.radius,c=current.sampleTransportMaterial(u,r,age,{reducedMotion});assert(c.color.every(Number.isFinite));assert(c.alpha>=0&&c.alpha<=1);
  for(const power of [0,.5,1]){
   const a=equation(u,y,age,reducedMotion,power),b=current.sampleTransportMaterial(u,r,age,{reducedMotion,power});
   const e=[Math.abs(a.alpha-b.alpha),...a.rgb.map((v,k)=>Math.abs(v-b.color[k]*b.alpha))];error=Math.max(error,...e);assert(e.every(v=>v<1e-11));parity++;
  }
  const a=equation(u,y,age,reducedMotion,1,true),b=current.sampleChargeSheets(u,y,age,{reducedMotion,spread:4})[0];assert(Math.abs(a.alpha-b.alpha)<1e-12);parity++;material++;
 }
}
// Explicit broad visible faces and genuine overlap; not just separate named colors.
for(const age of [28,55,100,150,210,220,280,330]){
 const g=current.sampleTransportGeometry(.4,age);
 const at=(x,y)=>{const u=g.headStart+x/100*g.headWidth;return {u,y:y*g.headScale,s:current.sampleChargeSurfaces(u,y*g.headScale,age)};};
 const cap=at(80,0);assert.equal(cap.s[1].alpha,1);assert.equal(cap.s[3].alpha,1);
 const cc=current.sampleTransportMaterial(cap.u,(cap.y-current.sampleTransportGeometry(cap.u,age).center)/current.sampleTransportGeometry(cap.u,age).radius,age);assert(cc.color[0]<2&&cc.color[1]<1&&cc.color[2]<.3);
 const side=at(58,4.5);assert.equal(side.s[1].alpha,1);assert.equal(side.s[2].alpha,1);assert.equal(side.s[3].alpha,0);
 const rear=at(35,-23);assert.equal(rear.s[0].alpha,1);assert.equal(rear.s[1].alpha,0);assert.equal(rear.s[2].alpha,0);assert.equal(rear.s[3].alpha,0);
 const white=at(45,-15);assert.equal(white.s[1].alpha,1);assert.equal(white.s[2].alpha,0);assert.equal(white.s[3].alpha,0);
 const cw=current.sampleTransportMaterial(white.u,(white.y-current.sampleTransportGeometry(white.u,age).center)/current.sampleTransportGeometry(white.u,age).radius,age);assert(cw.color[0]>35&&cw.color[1]>21&&cw.color[2]>6.5);witness+=4;
 // A sampled connected white corridor: source tail midpoint to unoccluded head top,
 // ending at cap junction rather than requiring the colored tip itself be white.
 for(let i=0;i<=120;i++){
  const u=.035+(g.headStart+.60*g.headWidth-.035)*i/120,h=current.sampleTransportGeometry(u,age);
  if(u>=g.front)continue;let found=false;
  for(let yi=-52;yi<=40;yi++){const y=yi*.5,s=current.sampleChargeSurfaces(u,y,age);if(s[1].alpha>.99&&s[2].alpha<.01&&s[3].alpha<.01){found=true;break;}}
  assert(found,'connected white section u='+u+' age='+age);whitePath++;
 }
}
for(const u of [.1,.3,.5,.7,.9])for(const r of [-.8,-.4,0,.4,.8])for(const age of [0,100,220,419]){assert.deepEqual(current.sampleTransportMaterial(u,r,age,{reducedMotion:true}),current.sampleTransportMaterial(u,r,210,{reducedMotion:true}));reduced++;}
assert.throws(()=>current.sampleTransportGeometry(.2,NaN));assert.throws(()=>current.sampleChargeSheets(.2,0,220,{spread:5}));assert.throws(()=>current.sampleTransportMaterial(.2,0,220,{power:1.1}));
const report={status:'pass',samplerByteAndSemanticParity:sampler,supportSamples:support,materialSamples:material,cpuLiteralWgslEquationComparisons:parity,maxEquationError:error,unchangedMonotonicFrontAndEmptyAheadChecks:front,broadRearWhiteNearCapWitnesses:witness,sampledWhiteCorridorSections:whitePath,reducedFreezeSamples:reduced,maxMainSupportWorld:maxMain,maxObserverSupportWorld:maxObs,minSettledTailThicknessWorld:minTailThickness,effectSha256:sha(read('./effect.mjs')),shaderSha256:sha(Buffer.from(current.SHADER)),audioSha256:sha(read('./audio.mjs')),limitations:'CPU/source contract only. Corridor sections establish sampled visibility, not a GPU pixel connected-component proof. Local overlap and explicit polygons are not perceived thickness acceptance. WGSL compile/native/normal motion/SFX/device/performance/game remain pending.'};
fs.writeFileSync(new URL('./CPU-CHECKS.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));

