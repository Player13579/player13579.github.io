// GPT-6.1-Sol R13 UNSEALED: projected canted pressure faces and substantial supply prism; exact R12 sampler.
export const VERSION = 'alchemy-cannon-new-e-sol61-r13';
export const DURATIONS = Object.freeze({'alchemy-particle-cannon':900,'alchemy-particle-beam':420});
const finite = Number.isFinite;
const point = p => p && finite(p.x) && finite(p.y);
export function validateEvent(e, frameId) {
  if (!e || !Object.hasOwn(DURATIONS,e.type)) throw Error('unsupported-event-type');
  if (typeof e.id!=='string'||!e.id||typeof e.playerId!=='string'||!e.playerId||!finite(e.startedAt)) throw Error('invalid-event-identity-or-clock');
  if (!['continuous','gbo-tenfold'].includes(e.variant)) throw Error('unsupported-variant');
  const h=e.handWorld;
  if (!point(h)||h.eventId!==e.id||h.playerId!==e.playerId||h.frameId!==frameId||frameId==null) throw Error('event-bound-hand-world-unavailable');
  if(e.type==='alchemy-particle-cannon'&&(!finite(e.x)||!finite(e.y)||!finite(e.targetX)||!finite(e.targetY)||Math.hypot(e.targetX-e.x,e.targetY-e.y)<1e-6)) throw Error('invalid-activation-aim-projection');
  if(e.type==='alchemy-particle-beam'&&(!finite(e.targetX)||!finite(e.targetY)||Math.hypot(e.targetX-h.x,e.targetY-h.y)<1e-6)) throw Error('invalid-collision-endpoint');
  return true;
}
const smooth = t => {t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
const mix=(a,b,t)=>a+(b-a)*t;
// Explicit projected pressure prism: connected supply facet and overlapping canted head faces.
// This is an authored fantasy-energy projection, not a physical volume solver.
const parcel=(q,at,w)=>smooth(1-Math.abs((q-at)/w));
const coverage=(pts,x,y)=>{
  let d=Infinity;
  for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length],dx=b[0]-a[0],dy=b[1]-a[1];d=Math.min(d,(dx*(y-a[1])-dy*(x-a[0]))/Math.hypot(dx,dy));}
  return smooth(d/.7);
};
const headFaces=scale=>({
  rear:[[-3,-17],[40,-26],[44,-23],[-3,-11]].map(([x,y])=>[x,y*scale]),
  white:[[-3,-11],[44,-23],[88,-10],[78,8],[-3,2]].map(([x,y])=>[x,y*scale]),
  side:[[-3,2],[68,4],[79,20],[-3,14]].map(([x,y])=>[x,y*scale]),
  cap:[[62,4],[79,-14],[100,0],[79,20]].map(([x,y])=>[x,y*scale])
});
export function sampleTransportGeometry(u,ageMs,{reducedMotion=false}={}) {
  if(!finite(u)||u<0||u>1||!finite(ageMs))throw Error('invalid-material-geometry');
  const shapeAge=reducedMotion?210:Math.max(0,ageMs),front=.08+.92*smooth(shapeAge/210);
  const headWidth=Math.min(.28,front*.66),headStart=front-headWidth,headX=(u-headStart)/headWidth*100;
  const headScale=smooth(headStart/.035),q=u-1.22*shapeAge/420;
  const tailT=Math.max(0,Math.min(1,u/headStart));
  const fold=parcel(q,-.19,.13)*(1-smooth((tailT-.55)/.45));
  const axial=smooth(u/.035),width=(1-.16*fold)*axial;
  const tailCenter=(4*fold-3*smooth(tailT))*(1-smooth(tailT))*axial;
  const tail=u<=headStart,active=u>0&&u<front;
  const radius=active?(tail?15.5*width:23*headScale):0;
  const center=tail?tailCenter-1.5*width:-3*headScale;
  return {radius,center,shapeAge,front,headWidth,headStart,headX,headScale,q,tailT,fold,axial,width,tailCenter,tail,active};
}
export function sampleChargeSurfaces(u,y,ageMs,{reducedMotion=false}={}) {
  if(!finite(y))throw Error('invalid-surface-sample');
  const g=sampleTransportGeometry(u,ageMs,{reducedMotion});
  let rear=0,white=0,side=0,cap=0,light=0;
  if(g.active&&g.tail){
    rear=smooth((y-(g.tailCenter-17*g.width))/.8)*smooth((g.tailCenter+14*g.width-y)/.8);
    white=smooth((y-(g.tailCenter-11*g.width))/.8)*smooth((g.tailCenter+2*g.width-y)/.8);
    const crease=g.tailCenter+(2-6*g.fold)*g.width;
    side=smooth((y-crease)/.8)*smooth((g.tailCenter+14*g.width-y)/.8);
    light=Math.max(0,Math.min(1,(g.tailCenter+14*g.width-y)/(31*g.width)));
  }else if(g.active&&g.headScale>0){
    const faces=headFaces(g.headScale);
    rear=coverage(faces.rear,g.headX,y);white=coverage(faces.white,g.headX,y);
    side=coverage(faces.side,g.headX,y);cap=coverage(faces.cap,g.headX,y);
    light=Math.max(0,Math.min(1,(20*g.headScale-y)/(46*g.headScale)));
  }
  // Broad rear extrusion is teal; near side is cobalt; pressure face is warm.
  // None changes the white emitter; the projected faces actually hide it.
  const back=[.045,.24+.08*light,.28+.08*light];
  const near=[.025+.055*light,.10+.14*light,.22+.14*light];
  const pressure=[.50+.20*light,.12+.14*light,.025+.055*light];
  return [
    {role:'rear-extruded-contour',fold:0,depth:-1,coverage:rear,alpha:rear,color:back},
    {role:'connected-white-supply-facet',fold:1,depth:0,coverage:white,alpha:white,color:[13.58,8.22,2.56]},
    {role:'near-supply-and-head-side',fold:2,depth:1,coverage:side,alpha:side,color:near},
    {role:'canted-compression-face',fold:3,depth:2,coverage:cap,alpha:cap,color:pressure}
  ];
}
export function sampleChargeSheets(u,y,ageMs,{reducedMotion=false,spread=0}={}) {
  if(!finite(spread)||spread<0||spread>4)throw Error('invalid-sheet-sample');
  if(spread===0)return sampleChargeSurfaces(u,y,ageMs,{reducedMotion});
  const g=sampleTransportGeometry(u,ageMs,{reducedMotion});
  const a=g.active&&g.radius>0?smooth((g.radius+spread*g.axial-Math.abs(y-g.center))/(1+spread*.6)):0;
  return [{role:'observer-envelope',fold:0,depth:-2,coverage:a,alpha:.075*a,color:[.08,.86,.75]}];
}
export function sampleTransportMaterial(u,r,ageMs,{reducedMotion=false,power=1,integrate=true,steps=16}={}) {
  if(!finite(u)||!finite(r)||!finite(ageMs)||!finite(power)||u<0||u>1||Math.abs(r)>1||power<0||power>1||!Number.isInteger(steps)||steps<1||steps>512)throw Error('invalid-material-sample');
  const g=sampleTransportGeometry(u,ageMs,{reducedMotion}),{radius,center}=g,compressed=g.tail?0:1,wake=g.tail?1:0;
  if(!integrate||radius<1e-7||Math.abs(r)>=1||power===0)return {radius,center,color:[0,0,0],alpha:0,emission:0,compressed,wake};
  let rgb=[0,0,0],opacity=0;
  for(const s of sampleChargeSurfaces(u,center+r*radius,ageMs,{reducedMotion})){
    rgb=rgb.map((v,i)=>s.color[i]*2.6*s.alpha+v*(1-s.alpha));opacity=s.alpha+opacity*(1-s.alpha);
  }
  return {radius,center,color:opacity>1e-7?rgb.map(v=>v/opacity):[0,0,0],alpha:opacity*power,emission:0,compressed,wake};
}
export function sampleEvent(e, nowMs, frameId, {observation=true,reducedMotion=false}={}) {
  validateEvent(e,frameId);
  if(!finite(nowMs))throw Error('invalid-sample-clock');
  const ageMs=nowMs-e.startedAt,duration=DURATIONS[e.type],out=[];
  const beam=e.type==='alchemy-particle-beam';
  const endpoint=beam?{x:e.targetX,y:e.targetY}:null;
  let phase=beam?'transport':ageMs<180?'gather':ageMs<520?'lock':'release';
  if(ageMs<0||ageMs>=duration)return {id:e.id,type:e.type,ageMs,phase:'inactive',endpoint,vertices:new Float32Array()};
  let dx=beam?e.targetX-e.handWorld.x:e.targetX-e.x,dy=beam?e.targetY-e.handWorld.y:e.targetY-e.y;
  const length=Math.hypot(dx,dy);dx/=length;dy/=length;
  const toWorld=(x,y)=>[e.handWorld.x+dx*x-dy*y,e.handWorld.y+dy*x+dx*y];
  const emit=(x,y,c,a,em,layer)=>{const p=toWorld(x,y);out.push(p[0],p[1],...c,a,em,layer);};
  const amber=[1,.48,.12],teal=[.08,.86,.75],white=[1,.94,.69];
  // R2 continuous cross sections keep colored material shoulders and a distinct luminous core.
  // Coverage, surface color and emission are separate; no hard-edged solid beam bar.
  const channel=(at,n,color,power,layer,spread=false)=>{
    const rows=[-1,-.58,0,.58,1];
    const rowAlpha=spread?[0,.075,.12,.075,0]:[0,.55,.96,.55,0];
    const rowColor=spread?rows.map(()=>color):[
      color.map(v=>v*.18),color.map(v=>v*.46),color,color.map(v=>v*.46),color.map(v=>v*.18)];
    const sections=Array.from({length:n+1},(_,i)=>at(i/n));
    const vertex=(i,j)=>{const p=sections[i];emit(p.x,p.y+rows[j]*p.w,rowColor[j],rowAlpha[j]*power,spread?1.2:(j===2?2.7:1.4),layer);};
    for(let i=0;i<n;i++)for(let j=0;j<rows.length-1;j++){
      vertex(i,j);vertex(i+1,j);vertex(i+1,j+1);
      vertex(i,j);vertex(i+1,j+1);vertex(i,j+1);
    }
  };
  if(!beam){
    const gather=reducedMotion?1:smooth(ageMs/180),release=smooth((ageMs-520)/380),power=smooth(ageMs/55)*(1-release);
    // Open fan-shaped intake persists during lock: broad channels, not disappearing beads.
    for(let i=-1;i<=1;i++){
      const shape=u=>({x:mix(-36,19,u),y:i*mix(23,18,gather)*(1-u)**1.25,
        w:(i===0?8:7)*Math.sin(Math.PI*u)**.38*(1-.26*gather)+2.1});
      if(observation)channel(u=>{const p=shape(u);return {...p,w:p.w+5};},28,teal,power,0,true);
      channel(shape,28,i===0?teal:amber,power,1);
    }
    // A short directional throat follows supply into its finite open tip, not a spherical core.
    channel(u=>({x:mix(4,24,u),y:0,w:6*Math.sin(Math.PI*u)**.6+.2}),18,white,power,3);
  }else{
    const t=ageMs/duration,power=smooth(ageMs/28)*(1-smooth((ageMs-330)/90));

    // Semantic ABI R5: negative emission marks a GPU material tuple [u,localY,encodedAge,power].
    // The stride/locations/draw binding remain unchanged; ordinary straight-RGBA vertices are untouched.
    const encodedAge=reducedMotion?-1-ageMs:ageMs;
    const quad=spread=>{
      const bound=spread?31:27,tag=spread?-1:-2,layer=spread?0:2;
      for(const [u,y] of [[0,-bound],[1,-bound],[1,bound],[0,-bound],[1,bound],[0,bound]])
        emit(u*length,y,[u,y,encodedAge],power,tag,layer);
    };
    if(observation)quad(true);
    quad(false);
    // Strong, short hand-side throat is the supplying source. No target impact
    // or pulse audio is invented, and its axial support cannot pass the endpoint.
    const throatLength=Math.min(18,length);
    channel(u=>({x:u*throatLength,y:0,w:4*Math.sin(Math.PI*u)**.6}),12,white,power,3);
  }
  return {id:e.id,type:e.type,ageMs,phase,endpoint,vertices:new Float32Array(out)};
}
export const SHADER = /* wgsl */ `
struct View { size: vec4f, };
@group(0) @binding(0) var<uniform> view: View;
struct Output { @builtin(position) position:vec4f, @location(0) color:vec4f, @location(1) emission:f32, };
@vertex fn vs(@location(0) pos:vec2f,@location(1) color:vec4f,@location(2) params:vec2f)->Output {
 var o:Output;
 o.position=vec4f(pos.x/view.size.x*2.0-1.0,1.0-pos.y/view.size.y*2.0,0.0,1.0);
 o.color=color;o.emission=params.x;return o;
}
fn smooth01(t:f32)->f32 {let q=clamp(t,0.0,1.0);return q*q*(3.0-2.0*q);}
fn parcel(q:f32,at:f32,width:f32)->f32 {return smooth01(1.0-abs((q-at)/width));}
fn edgeDistance(a:vec2f,b:vec2f,p:vec2f)->f32 {let d=b-a;return (d.x*(p.y-a.y)-d.y*(p.x-a.x))/length(d);}
fn quad(a:vec2f,b:vec2f,c:vec2f,d:vec2f,p:vec2f)->f32 {
 let e=min(min(edgeDistance(a,b,p),edgeDistance(b,c,p)),min(edgeDistance(c,d,p),edgeDistance(d,a,p)));
 return smooth01(e/0.7);
}
fn pent(a:vec2f,b:vec2f,c:vec2f,d:vec2f,e:vec2f,p:vec2f)->f32 {
 let t=min(min(edgeDistance(a,b,p),edgeDistance(b,c,p)),min(edgeDistance(c,d,p),edgeDistance(d,e,p)));
 return smooth01(min(t,edgeDistance(e,a,p))/0.7);
}
@fragment fn fs(o:Output)->@location(0) vec4f {
 if(o.emission>=0.0){
 // Vertex color is straight; alpha multiplication occurs exactly once.
 return vec4f(o.color.rgb*(1.0+o.emission)*o.color.a,o.color.a);
 }
 // Projected pressure prism: rear contour, white facet, near side, canted face.
 let u=clamp(o.color.x,0.0,1.0);let y=o.color.y;
 if(u<=0.0||u>=1.0){return vec4f(0.0);}
 let reduced=o.color.z<0.0;let age=select(o.color.z,-1.0-o.color.z,reduced);let power=o.color.w;
 let t=select(max(0.0,age),210.0,reduced);
 let front=0.08+0.92*smooth01(t/210.0);let headWidth=min(0.28,front*0.66);let start=front-headWidth;
 if(u>=front||power<=0.0){return vec4f(0.0);}
 let hx=(u-start)/headWidth*100.0;let hs=smooth01(start/0.035);let q=u-1.22*t/420.0;
 let tt=clamp(u/start,0.0,1.0);let fold=parcel(q,-0.19,0.13)*(1.0-smooth01((tt-0.55)/0.45));
 let ax=smooth01(u/0.035);let width=(1.0-0.16*fold)*ax;
 let tc=(4.0*fold-3.0*smooth01(tt))*(1.0-smooth01(tt))*ax;
 let tail=u<=start;let radius=select(23.0*hs,15.5*width,tail);let center=select(-3.0*hs,tc-1.5*width,tail);
 if(o.emission> -1.5){
  let c=smooth01((radius+4.0*ax-abs(y-center))/3.4);let a=0.075*c*power;
  return vec4f(vec3f(0.08,0.86,0.75)*2.2*a,a);
 }
 var ar=0.0;var aw=0.0;var an=0.0;var ac=0.0;var light=0.0;
 if(tail){
  ar=smooth01((y-(tc-17.0*width))/0.8)*smooth01((tc+14.0*width-y)/0.8);
  aw=smooth01((y-(tc-11.0*width))/0.8)*smooth01((tc+2.0*width-y)/0.8);
  let crease=tc+(2.0-6.0*fold)*width;
  an=smooth01((y-crease)/0.8)*smooth01((tc+14.0*width-y)/0.8);
  light=clamp((tc+14.0*width-y)/(31.0*width),0.0,1.0);
 }else{
  let p=vec2f(hx,y);
  ar=quad(vec2f(-3.0,-17.0*hs),vec2f(40.0,-26.0*hs),vec2f(44.0,-23.0*hs),vec2f(-3.0,-11.0*hs),p);
  aw=pent(vec2f(-3.0,-11.0*hs),vec2f(44.0,-23.0*hs),vec2f(88.0,-10.0*hs),vec2f(78.0,8.0*hs),vec2f(-3.0,2.0*hs),p);
  an=quad(vec2f(-3.0,2.0*hs),vec2f(68.0,4.0*hs),vec2f(79.0,20.0*hs),vec2f(-3.0,14.0*hs),p);
  ac=quad(vec2f(62.0,4.0*hs),vec2f(79.0,-14.0*hs),vec2f(100.0,0.0),vec2f(79.0,20.0*hs),p);
  light=clamp((20.0*hs-y)/(46.0*hs),0.0,1.0);
 }
 let rear=vec3f(0.045,0.24+0.08*light,0.28+0.08*light);
 let white=vec3f(13.58,8.22,2.56);
 let near=vec3f(0.025+0.055*light,0.10+0.14*light,0.22+0.14*light);
 let cap=vec3f(0.50+0.20*light,0.12+0.14*light,0.025+0.055*light);
 var rgb=rear*2.6*ar;var opacity=ar;
 rgb=white*2.6*aw+rgb*(1.0-aw);opacity=aw+opacity*(1.0-aw);
 rgb=near*2.6*an+rgb*(1.0-an);opacity=an+opacity*(1.0-an);
 rgb=cap*2.6*ac+rgb*(1.0-ac);opacity=ac+opacity*(1.0-ac);
 return vec4f(rgb*power,opacity*power);
}`;

