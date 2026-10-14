// GPT-6.1-Sol creative R3; single-target electrical discharge, not a quantum-physics claim.
export const DURATION_MS=1050,INSTANCE_CAPACITY=128,CREATIVE_EDITION=3;
const sat=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{x=sat(x);return x*x*(3-2*x)};
const hash=n=>{n=Math.imul(n^(n>>>16),0x7feb352d);n=Math.imul(n^(n>>>15),0x846ca68b);return ((n^(n>>>16))>>>0)/4294967296};
export function dischargeState(ageMs){
 const alive=Number.isFinite(ageMs)&&ageMs>0&&ageMs<DURATION_MS;
 if(!alive)return {alive:false,leader:0,stroke:0,returnFront:0,cooling:0,extinction:0};
 const leader=smooth((ageMs-42)/118),returnFront=smooth((ageMs-160)/60);
 return {alive:true,leader,returnFront,stroke:smooth((ageMs-160)/8)*Math.exp(-Math.max(0,ageMs-168)/125),cooling:(1-smooth((ageMs-740)/310))*Math.exp(-Math.max(0,ageMs-220)/580),extinction:smooth((ageMs-640)/410)};
}
export function dischargeChannels({ageMs,source,target,seed=1,actorHeight=64,reducedMotion=false,sourceVisible=false,targetVisible=false}={}){
 const s=dischargeState(ageMs);
 if(!s.alive||sourceVisible!==true||targetVisible!==true||!Number.isFinite(actorHeight)||actorHeight<=0||!Array.isArray(source)||!Array.isArray(target)||source.length!==2||target.length!==2||!source.every(Number.isFinite)||!target.every(Number.isFinite))return new Float32Array();
 const dx=target[0]-source[0],dy=target[1]-source[1],distance=Math.hypot(dx,dy);
 if(!Number.isFinite(distance)||distance<.01)return new Float32Array();
 const scale=actorHeight/64,t=[dx/distance,dy/distance],n=[-t[1],t[0]],rows=[],causeSeed=seed>>>0;
 const count=32,wander=Math.min(distance*.038,9*scale)*(reducedMotion?.65:1);
 const point=(u,lateral=0)=>[source[0]+dx*u+n[0]*lateral,source[1]+dy*u+n[1]*lateral];
 const knot=i=>{const u=i/count;if(i===0||i===count)return point(u);const macro=Math.sin(u*Math.PI*3+(hash(causeSeed)*2-1))*.42;const meso=(hash(causeSeed+i*199)-.5)*.92;return point(u,(macro+meso)*wander*Math.sin(Math.PI*u))};
 const add=(a,b,width,power,role)=>{const ax=Math.fround(a[0]),ay=Math.fround(a[1]),bx=Math.fround(b[0]),by=Math.fround(b[1]);const len=Math.hypot(bx-ax,by-ay);if(len<=1e-7||power<=0)return;rows.push(ax,ay,bx,by,width*scale,power*Math.min(1,len/(width*scale*2)),role,0)};
 const onset=smooth((ageMs-160)/8),charge=smooth(ageMs/24)*Math.exp(-Math.max(0,ageMs-42)/48);
 // A continuously advancing stepped leader. A slow display approximation;
 // the knot delays do not imply additional gameplay hits or charging state.
 const front=s.leader;const step=Math.floor(front*count),local=sat(front*count-step);
 const stepped=ageMs<160?(step+smooth(local))/count:1;
 for(let i=0;i<count;i++){
  const u0=i/count,u1=(i+1)/count;if(stepped<=u0)break;
  const a=knot(i),end=knot(i+1),fraction=sat((stepped-u0)/(u1-u0));
  let b=[a[0]+(end[0]-a[0])*fraction,a[1]+(end[1]-a[1])*fraction];
  const middle=(u0+Math.min(u1,stepped))*.5;
  const tip=Math.exp(-Math.pow((stepped-middle)/.07,2));
  const crest=Math.exp(-Math.pow((1-s.returnFront-middle)/.095,2));
  const coolBase=CREATIVE_EDITION>=4?.17*s.cooling:.12*s.cooling;
  let power=((.11+.94*tip)*(1-onset)+s.stroke*(.60+1.8*crest)+coolBase*onset)*7;
  let width=.53+.56*s.stroke;
  if(CREATIVE_EDITION===5){
   // Recombination contracts the already connected path from target to caster.
   // The last connected section is shortened, not teleported to a new target.
   const surviving=1-s.extinction;
   if(ageMs>640){if(u0>=surviving)continue;const f=sat((surviving-u0)/(u1-u0));b=[a[0]+(end[0]-a[0])*f,a[1]+(end[1]-a[1])*f];}
   width=(.48+.68*s.stroke)*(1-.40*s.extinction);
   power=((.11+1.03*tip)*(1-onset)+s.stroke*(.55+2.15*crest)+.22*s.cooling*onset)*7;
  }
  add(a,b,width,power,1);
  if(i%6===3&&fraction===1){
   const reached=smooth((front-u1)*count*1.3),sign=hash(causeSeed+i*89)>.5?1:-1;
   const length=(5+hash(causeSeed+i*17)*7)*scale*reached*(reducedMotion?.6:1);
   const branchPower=power*.20*reached*(1-smooth((ageMs-185)/(CREATIVE_EDITION>=4?140:210)));
   const elbow=[b[0]+t[0]*length*.32+n[0]*length*sign*.7,b[1]+t[1]*length*.32+n[1]*length*sign*.7];
   const endFork=[elbow[0]+t[0]*length*.45+n[0]*length*sign*.24,elbow[1]+t[1]*length*.45+n[1]*length*sign*.24];
   add(b,elbow,.32,branchPower,2);add(elbow,endFork,.23,branchPower*.60,2);
  }
 }
 // A small irregular source corona gives the advance a visible origin.
 for(let i=0;i<5;i++){const angle=i*Math.PI*.4+.18;const a=point(0);const radius=(4+hash(causeSeed+i*31)*4)*scale;add(a,[a[0]+Math.cos(angle)*radius,a[1]+Math.sin(angle)*radius],.46,charge*3.6,3);}
 if(ageMs>=160){
  const arrival=Math.atan2(dy,dx),terminal=s.stroke*(1-smooth((ageMs-240)/180));
  for(let i=0;i<6;i++){
   const angle=CREATIVE_EDITION>=4?arrival-Math.PI*.64+i*Math.PI*.256:i*Math.PI/3+.11;
   const r=(4+hash(causeSeed+i*97)*6)*scale;
   const elbow=[target[0]+Math.cos(angle+.16)*r*.56,target[1]+Math.sin(angle+.16)*r*.56];
   const end=[target[0]+Math.cos(angle)*r,target[1]+Math.sin(angle)*r];
   add(target,elbow,.57,terminal*4.3,4);add(elbow,end,.31,terminal*2.4,4);
  }
 }
 if(rows.length/8>INSTANCE_CAPACITY)throw RangeError('Discharge capacity exceeded');
 return Float32Array.from(rows);
}
