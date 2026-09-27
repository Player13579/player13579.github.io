/* Frozen Astra Barrier sampler dependencies for the independent WebGPU gallery previews.
 * Sources: outputs/request-20260927/barrier-e-v3r4-optics1-preview/source-snapshot-review-fixes
 * Built by scripts/build-astra-barrier-samplers.cjs. Astra Barrier only.
 */
(() => {
  'use strict';
  const factories = Object.create(null);
  // barrier-v3-sampler.cjs; sha256=1b474d709896ac8f9e2c16794843807bd788a8353daaddfcd81df5870d624cd5
  factories["barrier-v3-sampler.cjs"] = function(module, exports, require) {
'use strict';
// Astra独立設計。曲面・状態・発光の数値正本。描画器／画像生成ではない。
const REVISION='barrier-e-v3-zero-design-20260927';
const MAP=Object.freeze({
  'action-stand:durability-created':{branch:'create',owner:'targetId',durationMs:650},
  'preparation-barrier-hit:durability-hit':{branch:'absorb',owner:'playerId',durationMs:650},
  'preparation-barrier-hit:durability-broken':{branch:'fracture',owner:'playerId',durationMs:480},
  'action-push:timed-bust-break':{branch:'bust',owner:'targetId',durationMs:480}
});
const clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
const ramp=(t,a,b)=>smooth((t-a)/(b-a));
const bell=(t,a,b,c)=>ramp(t,a,b)*(1-ramp(t,b,c));
const mix=(a,b,u)=>a+(b-a)*u;
function resolve(e){
  const m=MAP[e?.type+':'+e?.variant];
  if(!m)throw Error('non-barrier-event');
  if(!e.id||!e[m.owner]||!Number.isFinite(e.startedAtMs))throw Error('identity/owner/clock required');
  if(e.durationMs!=null&&e.durationMs!==m.durationMs)throw Error('lifetime changed; review contract');
  return {...m,ownerId:String(e[m.owner])};
}
function phase(e,nowMs,state={}){
  const r=resolve(e);if(!Number.isFinite(nowMs))throw Error('finite frame time required');
  const t=nowMs-e.startedAtMs,active=t>=0&&t<r.durationMs&&state.visible!==false;
  const visible=active&&state.alive!==false&&!state.ejected&&!state.inVent;
  const reduced=state.reducedMotion===true;
  const fade=1-ramp(t,r.branch==='create'?490:r.branch==='absorb'?485:325,r.durationMs);
  return {...r,revision:REVISION,tMs:t,active:visible,reducedMotion:reduced,
    entry:r.branch==='create'?ramp(t,0,230):ramp(t,0,24),
    closure:r.branch==='create'?ramp(t,15,280):1,
    compression:r.branch==='absorb'?bell(t,0,85,355):0,
    fracture:r.branch==='fracture'?ramp(t,40,290):0,
    bust:r.branch==='bust'?ramp(t,15,270):0,
    fade:visible?fade:0,
    // 充填数・耐久率を捏造しない。fractional値は表示監査用に保持するだけ。
    durability:Number.isFinite(state.barrierDurability)?state.barrierDurability:null,
    stage:r.branch==='create'?(t<280?'enclose':t<490?'established':'handoff-to-game-state'):
      r.branch==='absorb'?(t<85?'compress':t<355?'redistribute':t<485?'intact':'residual-decay'):
      r.branch==='fracture'?(t<40?'cohesion-loss':t<290?'four-shell-sections-separate':'curved-sections-extinguish'):
      t<70?'seam-unlatches':t<270?'two-halves-shear':'open-halves-extinguish'};
}

// H基準、足元原点、x右/y上/z手前。u=周方向rad、v=軸方向[-1,1]。
// 設計曲面はキャラの画像をsample/変形しない。前後はzと実アルファで決める。
function surface(e,nowMs,u,v,state={}){
  if(!Number.isFinite(u)||!Number.isFinite(v)||v < -1||v > 1)throw Error('invalid surface parameter');
  const p=phase(e,nowMs,state);
  if(!p.active)return {active:false,coverage:0,emission:0,point:[0,0,0]};
  const rho=.69*Math.sqrt(Math.max(0,1-v*v))*(1+.18*v);
  const waist=Math.exp(-Math.pow((v-.10)/.36,2));
  const dent=1-(p.reducedMotion ? .07 : .16)*p.compression*waist;
  let x=rho*Math.cos(u)*dent,y=.52+.79*v,z=.60*rho*Math.sin(u)*dent;
  let coverage=1;
  if(p.branch==='create'){
    const front=-1+2*p.closure;
    coverage=1-smooth((v-front+.08)/.16);
    const deployment=(p.reducedMotion ? .025 : .10)*(1-p.closure);
    x*=1+deployment;z*=1+deployment;
  }
  if(p.branch==='fracture'){
    const theta=((u%(2*Math.PI))+2*Math.PI)%(2*Math.PI);
    const sector=Math.floor(theta/(Math.PI/2));
    const local=theta-sector*Math.PI/2;
    const edge=Math.min(local,Math.PI/2-local);
    const gap=.025+.16*p.fracture;
    coverage*=smooth((edge-gap)/.055);
    const direction=(sector+.5)*Math.PI/2;
    const travel=(p.reducedMotion ? .09 : .29)*p.fracture;
    x+=travel*Math.cos(direction);z+=travel*.65*Math.sin(direction);
    y+=(sector%2===0?1:-1)*.08*p.fracture;
  }
  if(p.branch==='bust'){
    // 二つの大きな曲面が縦の継ぎ目から分かれる。衝突位置を推定しない。
    const side=Math.cos(u)>=0?1:-1;
    const open=(p.reducedMotion ? .12 : .30)*p.bust;
    coverage*=smooth((Math.abs(Math.cos(u))-.08*p.bust)/.10);
    x+=side*open;y+=side*(p.reducedMotion ? .04 : .13)*p.bust;
  }
  const phi=.5+.5*Math.sin(u); // front/back is geometry, not background sampling.
  const seamDistance=Math.abs(Math.sin(2*u));
  const rib=1-smooth(seamDistance/.13); // four sparse meridional junctions.
  const closingEdge=p.branch==='create'?Math.exp(-Math.pow((v-(-1+2*p.closure))/.065,2)):0;
  const stress=p.branch==='absorb'?Math.exp(-Math.pow((Math.abs(v-.10)-.72*ramp(p.tMs,60,300))/.12,2))*p.compression:0;
  const openingEdge=p.branch==='bust'?(1-smooth(Math.abs(Math.cos(u))/.19))*bell(p.tMs,0,75,300):0;
  const intensity=(.13+.21*phi+.08*(v+1)/2)*p.fade;
  const seamEnergy=(.38*rib+.95*closingEdge+1.15*stress+1.1*openingEdge)*p.fade;
  // 白い芯は接合端の局所に限定。本体全体の加算・白塗り禁止。
  const whiteCore=Math.max(closingEdge,stress*rib,openingEdge)*3.6*p.fade;
  return {active:true,point:[x,y,z],coverage,
    normalHint:[Math.cos(u),v*.55,Math.sin(u)/.60],
    body:{linearRgb:[.035,.46,.67],opacity:(.22+.17*phi)*p.fade,density:.66,
      emission:intensity},
    rib:{linearRgb:[.12,.81,.91],widthH:.026,emission:seamEnergy},
    core:{linearRgb:[.88,.99,1],widthH:.022,emission:whiteCore},
    emission:intensity+seamEnergy+whiteCore,
    expectedSourceMask:'this-surface-visible-coverage-only',branch:p.branch,stage:p.stage};
}
function frame(e,nowMs,state={}){
  const p=phase(e,nowMs,state);
  if(!p.active)return {...p,mesh:[],audio:null};
  const mesh=[];const angular=48,axial=24;
  for(let j=0;j<=axial;j++)for(let i=0;i<=angular;i++)
    mesh.push(surface(e,nowMs,i/angular*2*Math.PI,-1+2*j/axial,state));
  return {...p,mesh,topology:{angular,axial,duplicateSeam:true,
    poles:'collapse coincident vertices; omit zero-area triangles',
    normal:'analytic or derivative-based; zero-length fallback to normalHint'},
    coordinate:{unit:'H',origin:'owner-rendered-foot-anchor',charH:state.charH??64},
    observation:{glow:{radiusH:.045,gain:.11,mask:'post-occlusion emissive surface'},
      refractActor:false,warpActor:false,warpBackground:false,chromaticAberration:false,
      microVariation:'none',composite:'linear premultiplied body plus masked radiance once'},
    audio:sfx(e)};
}
function sfx(e){
  const p=resolve(e);const voice=(name,start,duration,f0,f1,gain,kind)=>({name,startMs:start,
    durationMs:duration,f0,f1,gain,kind,attackMs:7,releaseMs:35});
  const voices={
    create:[voice('membrane-tension',0,360,210,520,.12,'soft-triangle'),voice('seam-lock',210,200,810,660,.075,'inharmonic-pair')],
    absorb:[voice('load',0,155,180,95,.17,'damped-sine'),voice('elastic-return',65,340,440,710,.095,'inharmonic-pair')],
    fracture:[voice('cohesion-loss',0,140,420,140,.13,'band-noise'),voice('shell-release',55,330,640,180,.095,'inharmonic-pair')],
    bust:[voice('unlatch',0,120,880,310,.13,'band-noise'),voice('shear',65,280,240,70,.14,'damped-sine')]
  }[p.branch];
  return {causeId:e.causeId||e.id,dedupeKey:[e.causeId||e.id,p.branch,p.ownerId].join('|'),
    ownerId:p.ownerId,voices,loop:false,verifyGain:0,
    releaseOnCancelMs:35,latePolicy:'skip elapsed attacks; do not replay on reconnect'};
}
module.exports={REVISION,MAP,resolve,phase,surface,frame,sfx};

  };
  // barrier-v3r2-sampler.cjs; sha256=c46a877cf3ed3f917dd865c3e2fd37817dddce5c1c702a8994441bff0b739280
  factories["barrier-v3r2-sampler.cjs"] = function(module, exports, require) {
'use strict';
// Barrier v3 r2: 単一楕円を棄却した、厚い主面・返し羽根・下部接合源の新設計。
// 各shellを別meshとして返す。半面・層間を跨ぐtriangleを作らない。
const {resolve,sfx:baseSfx}=require('./barrier-v3-sampler.cjs');
const REVISION='barrier-v3-r2-tension-shell-20260927';
const sat=x=>Math.max(0,Math.min(1,x));
const sm=x=>{x=sat(x);return x*x*(3-2*x);};
const rp=(t,a,b)=>sm((t-a)/(b-a));
const pulse=(t,a,b,c)=>rp(t,a,b)*(1-rp(t,b,c));
const lerp=(a,b,t)=>a+(b-a)*t;
const add=(a,b)=>a.map((v,i)=>v+b[i]);
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const mul=(a,s)=>a.map(v=>v*s);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const unit=a=>{const n=Math.hypot(...a);return n>1e-10?mul(a,1/n):[0,0,1];};
function rotate(p,axis,a,pivot){p=sub(p,pivot);const c=Math.cos(a),s=Math.sin(a);
  const q=axis==='y'?[c*p[0]+s*p[2],p[1],-s*p[0]+c*p[2]]:
    [c*p[0]-s*p[1],s*p[0]+c*p[1],p[2]];return add(q,pivot);}
function phase(e,now,state={}){
  const m=resolve(e),t=now-e.startedAtMs;if(!Number.isFinite(now))throw Error('finite clock');
  const active=t>=0&&t<m.durationMs&&state.visible!==false&&state.alive!==false&&!state.ejected&&!state.inVent;
  return {...m,t,active,reduced:state.reducedMotion===true,
    tail:active?1-rp(t,m.durationMs===650?500:330,m.durationMs):0,
    load:m.branch==='absorb'?pulse(t,0,85,310):0,
    recoil:m.branch==='absorb'?pulse(t,65,175,405):0,
    loss:m.branch==='fracture'?rp(t,15,235):0,
    release:m.branch==='bust'?rp(t,20,300):0};
}
// 5つの粗い輪郭帯。楕円半径を使わず、下接合→肩の張り→冠の傾きを作る。
function profile(v){
  const x=[-1,-.58,.06,.62,1],w=[.18,.40,.61,.48,.10];
  for(let i=0;i<4;i++)if(v<=x[i+1])return lerp(w[i],w[i+1],sm((v-x[i])/(x[i+1]-x[i])));
  return w[4];
}
function mantlePoint(side,s,v,p){
  const a=(s+1)/2, width=profile(v);
  let q=[side*(.026+width*a),.58+.76*v+side*.052,
    .10+.35*Math.sin(a*Math.PI*.86)*Math.cos(v*Math.PI*.43)+side*.04];
  // 大きな折返し: 外縁が奥に巻き込み、正面と側断面の区別を作る。
  q[2]-=.22*rp(a,.72,1);
  q[0]-=side*.06*rp(a,.82,1);
  if(p.branch==='create'){
    const unfold=rp(p.t,side<0?95:135,side<0?305:345);
    q=rotate(q,'y',side*(1-unfold)*1.02,[side*.14,.02,0]);
    q=rotate(q,'z',side*(1-unfold)*.36,[side*.14,.02,0]);
    q[1]-=.32*(1-unfold);
  }
  if(p.branch==='absorb'){
    const bowl=Math.exp(-Math.pow((v-.08)/.42,2)-Math.pow((a-.55)/.46,2));
    q[2]-=(p.reduced?.10:.29)*p.load*bowl;
    q[0]-=side*.11*p.load*bowl;
  }
  if(p.branch==='fracture'){
    const top=rp(v,-.30,.35);
    q=rotate(q,'z',side*(p.reduced?.10:.31)*p.loss,[side*.15,.05,0]);
    q[0]+=side*(p.reduced?.08:.25)*p.loss*(.55+.45*top);
    q[1]-=.14*p.loss*(1-top);q[2]-=.20*p.loss;
  }
  if(p.branch==='bust'){
    // 底から冠へ解放する。局所releaseを剛体半面境界へ補間しない。
    const local=rp(p.t,20+105*(v+1)/2,150+125*(v+1)/2);
    q=rotate(q,'y',side*(p.reduced?.33:.88)*local,[side*.16,.13,.03]);
    q=rotate(q,'z',side*(p.reduced?.10:.30)*local,[side*.16,.13,.03]);
    q[0]+=side*(p.reduced?.09:.23)*local;
    q[1]+=side*.09*local;q[2]-=.07*local;
  }
  return q;
}
function vanePoint(side,s,v,p){
  const a=(s+1)/2,span=.18+.07*Math.sin((v+1)*Math.PI/2);
  const bend=.53+.22*Math.sin((v+1)*Math.PI*.60);
  let q=[side*(bend+(a-.5)*span),.52+.72*v-side*.075,
    -.18+.31*Math.sin(a*Math.PI)+.11*Math.sin(v*Math.PI)];
  const establish=p.branch==='create'?rp(p.t,side<0?25:55,side<0?205:240):1;
  q=rotate(q,'z',side*(1-establish)*.70,[side*.18,-.13,-.05]);
  q[1]-=.35*(1-establish);
  q[0]+=side*(p.reduced?.07:.17)*p.recoil;
  q[2]-=.13*p.recoil;
  if(p.branch==='fracture'){
    const fail=rp(p.t,95,290);q=rotate(q,'y',-side*.75*fail,[side*.6,.50,-.12]);
    q[0]+=side*.16*fail;q[1]-=.22*fail;
  }
  if(p.branch==='bust'){
    const fail=rp(p.t,100,315);q=rotate(q,'z',side*.32*fail,[side*.18,-.13,-.05]);
    q[2]-=.19*fail;
  }
  return q;
}
function material(role,side,s,v,n,p){
  const form=.40+.60*Math.abs(n[0]*.40+n[1]*.20+n[2]*.88);
  let gain=1,alpha=1;
  if(p.branch==='create')gain=rp(p.t,role==='mantle'?(side<0?95:135):(side<0?25:55),role==='mantle'?(side<0?155:195):(side<0?75:105));
  alpha=gain*p.tail;
  const close=p.branch==='create'?Math.exp(-Math.pow((v-(-1+2*rp(p.t,60,330)))/.17,2)):0;
  const strain=p.branch==='absorb'?Math.exp(-Math.pow((v-lerp(.08,.78,rp(p.t,65,270)))/.20,2))*p.recoil:0;
  const release=p.branch==='bust'?Math.exp(-Math.pow((v-(-1+2*rp(p.t,20,275)))/.15,2)):0;
  const emission=(role==='mantle'?.22+.52*form:.16+.32*form)*gain*p.tail;
  const localCore=(close+strain+release)*Math.exp(-Math.pow((s-(side<0?-.38:.38))/.24,2));
  return {outer:{rgb:role==='mantle'?[.025,.48,.68]:[.06,.24,.50],alpha:(role==='mantle'?.35:.55)*alpha,emission},
    inner:{rgb:[.025,.16,.27],alpha:.58*alpha,emission:emission*.34},
    edge:{rgb:[.12,.72,.78],alpha:.74*alpha,emission:emission*.95},
    core:{rgb:[.86,.99,1],emission:localCore*2.6*gain*p.tail},
    density:role==='mantle'?.60:.82};
}
function shell(id,role,side,fn,p){
  const nu=12,nv=24,thickness=role==='mantle'?.075:.095;
  const vertices=[],triangles=[],walls=[];
  for(let j=0;j<=nv;j++)for(let i=0;i<=nu;i++){
    const s=-1+2*i/nu,v=-1+2*j/nv;
    const point=fn(side,s,v,p),eps=.001;
    const ds=sub(fn(side,Math.min(1,s+eps),v,p),fn(side,Math.max(-1,s-eps),v,p));
    const dv=sub(fn(side,s,Math.min(1,v+eps),p),fn(side,s,Math.max(-1,v-eps),p));
    let normal=unit(cross(ds,dv));if(side<0)normal=mul(normal,-1);
    vertices.push({point,innerPoint:sub(point,mul(normal,thickness)),normal,s,v,
      material:material(role,side,s,v,normal,p)});
  }
  for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){
    const a=j*(nu+1)+i,b=a+1,c=a+nu+1,d=c+1;
    // fracture: 中央の広い斜め割れが開く。大きい面を保ち、微細片にしない。
    const v=-1+2*(j+.5)/nv,s=-1+2*(i+.5)/nu;
    if(role==='mantle'&&p.branch==='fracture'&&Math.abs(v-.24*side*s)<.12*p.loss)continue;
    if(side>0)triangles.push([a,b,c],[b,d,c]);
    else triangles.push([a,c,b],[b,c,d]);
  }
  // 内外面を繋ぐ厚い断面。各primitive内部だけで生成し、別shellへ繋がない。
  const edgeCount=new Map();
  for(const tri of triangles)for(let k=0;k<3;k++){
    const a=tri[k],b=tri[(k+1)%3],key=Math.min(a,b)+':'+Math.max(a,b);
    if(edgeCount.has(key))edgeCount.get(key).count++;
    else edgeCount.set(key,{count:1,edge:[a,b]});
  }
  // fractureの内部切断面も含む全境界を閉じる。薄い紙の穴にしない。
  for(const edge of edgeCount.values())if(edge.count===1)walls.push(edge.edge);
  return {id,role,componentId:id,vertices,triangles,wallEdges:walls,thickness,
    renderContract:'outer triangles + reversed inner triangles + wall quads; never bridge componentIds'};
}
function frame(e,now,state={}){
  const p=phase(e,now,state);if(!p.active)return {...p,revision:REVISION,components:[]};
  const components=[];
  for(const side of [-1,1])components.push(shell('mantle-'+side,'mantle',side,mantlePoint,p));
  for(const side of [-1,1])components.push(shell('return-vane-'+side,'vane',side,vanePoint,p));
  const keyGain=(p.branch==='create'?rp(p.t,0,45)*(1-rp(p.t,260,430)):
    p.branch==='absorb'?.16*p.recoil:1-rp(p.t,40,190))*p.tail;
  return {...p,revision:REVISION,components,
    keystone:{primitive:'extruded-concave-polygon',
      frontVertices:[[-.20,-.10,.14],[.20,-.10,.14],[.20,.08,.14],[.06,.08,.14],
        [.06,-.025,.14],[-.06,-.025,.14],[-.06,.08,.14],[-.20,.08,.14]],
      backOffset:[0,0,-.18],gain:keyGain,bodyRgb:[.04,.39,.55],edgeRgb:[.20,.80,.88],
      alpha:.55,triangulation:'ear clipping; retain .12H open hollow; sidewalls on perimeter'},
    projection:{x:'x+.28*z',y:'y+.07*z',H:state.charH??64},
    observation:{glowRadiusH:.035,glowGain:.09,sourceMask:'visible emissive surfaces only',
      microVariation:'none',actorWarp:false,backgroundWarp:false},
    stage:p.branch==='create'?(p.t<95?'keystone-to-return-vanes':p.t<345?'mantle-unfolds':p.t<500?'protected-cavity':'finite-exit'):
      p.branch==='absorb'?(p.t<85?'broad-compression':p.t<270?'load-to-side-vanes':p.t<405?'geometry-recovers':'residual-exit'):
      p.branch==='fracture'?(p.t<95?'mantle-fails':p.t<290?'supports-peel-after-mantle':'large-curved-remnants'):
      p.t<100?'attachment-unzips':p.t<315?'inner-faces-exposed':'open-shell-remnants'};
}
function sfx(e){
  const plan=baseSfx(e),branch=resolve(e).branch;
  const starts={create:{'seam-lock':300},fracture:{'shell-release':95},bust:{shear:100}};
  return {...plan,revision:REVISION,voices:plan.voices.map(v=>({...v,
    startMs:starts[branch]?.[v.name]??v.startMs}))};
}
module.exports={REVISION,phase,profile,mantlePoint,vanePoint,material,shell,frame,sfx};

  };
  // barrier-v3r3-sampler.cjs; sha256=ce904853a381d57fc7625d036a2479551a9d6c9818f488138e368bf440887417
  factories["barrier-v3r3-sampler.cjs"] = function(module, exports, require) {
'use strict';
// Astra r3: broad continuous protective canopy + broad rear load plate.
// No central wall/seam in create/absorb. Split geometry exists only on loss events.
const {resolve}=require('./barrier-v3-sampler.cjs');
const {sfx:priorSfx}=require('./barrier-v3r2-sampler.cjs');
const REVISION='barrier-v3-r3-broad-canopy-20260927';
const sat=x=>Math.max(0,Math.min(1,x)),sm=x=>{x=sat(x);return x*x*(3-2*x);};
const ramp=(t,a,b)=>sm((t-a)/(b-a)),bell=(t,a,b,c)=>ramp(t,a,b)*(1-ramp(t,b,c));
const mix=(a,b,t)=>a+(b-a)*t,sub=(a,b)=>a.map((x,i)=>x-b[i]);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=a=>{const l=Math.hypot(...a);return l>1e-10?a.map(x=>x/l):[0,0,1];};
function rotate(p,axis,angle,c){const q=sub(p,c),s=Math.sin(angle),k=Math.cos(angle);
 const v=axis==='y'?[k*q[0]+s*q[2],q[1],-s*q[0]+k*q[2]]:axis==='x'?[q[0],k*q[1]-s*q[2],s*q[1]+k*q[2]]:[k*q[0]-s*q[1],s*q[0]+k*q[1],q[2]];
 return v.map((x,i)=>x+c[i]);}
function phase(e,now,state={}){if(!Number.isFinite(now))throw Error('finite now');const m=resolve(e),t=now-e.startedAtMs;
 const active=t>=0&&t<m.durationMs&&state.visible!==false&&state.alive!==false&&!state.ejected&&!state.inVent;
 return {...m,t,active,reduced:!!state.reducedMotion,tail:active?1-ramp(t,m.durationMs===650?500:330,m.durationMs):0,
 load:m.branch==='absorb'?bell(t,0,85,315):0,transfer:m.branch==='absorb'?bell(t,60,180,410):0,
 loss:m.branch==='fracture'?ramp(t,25,240):0,release:m.branch==='bust'?ramp(t,20,285):0};}
function width(v){const x=[-1,-.65,-.05,.62,1],w=[.40,.68,.78,.74,.45];
 for(let i=0;i<4;i++)if(v<=x[i+1])return mix(w[i],w[i+1],ramp(v,x[i],x[i+1]));return w[4];}
function canopy(s,v,p){
 let q=[width(v)*s+.075*v,.53+.78*v,.10+.46*(1-s*s)*Math.sqrt(1-.40*v*v)+.075*s];
 // broad doubly-curved shield; subdued outer return, not a luminous perimeter.
 q[2]-=.07*ramp(Math.abs(s),.82,1);
 if(p.branch==='create'){const d=ramp(p.t,85,305);q[0]*=.52+.48*d;q[1]=-.25+(q[1]+.25)*(.30+.70*d);
  q=rotate(q,'x',-.70*(1-d),[0,-.25,-.05]);}
 if(p.branch==='absorb'){const bowl=Math.exp(-Math.pow(s/.68,2)-Math.pow((v-.16)/.53,2));
  q[2]-=(p.reduced?.10:.28)*p.load*bowl;q[1]-=.075*p.load*bowl;}
 if(p.branch==='fracture'){const region=v-.22*s,side=region>=0?1:-1;
  q=rotate(q,'z',side*(p.reduced?.06:.17)*p.loss,[0,.53,.10]);
  q[1]+=side*(p.reduced?.07:.18)*p.loss;q[0]+=side*.095*p.loss;q[2]-=(side>0?.14:.24)*p.loss;}
 return q;
}
function leaf(side,s,v,p){
 const a=(s+1)/2;let q=canopy(side*a,v,{...p,branch:'bust'});
 const d=ramp(p.t,20+95*(v+1)/2,165+120*(v+1)/2);
 const angle=side<0?.57:.30;
 q=rotate(q,'y',side*(p.reduced?.22:angle)*d,[side*.10,.42,.10]);
 q=rotate(q,'z',side*(p.reduced?.04:.12)*d,[side*.10,.42,.10]);
 q[0]+=side*(p.reduced?.11:.25)*d;q[1]+=side*.055*d;
 return q;
}
function plate(s,v,p){
 // compact, broad rear lower plate. Not full-height side ribs.
 const w=mix(.42,.91,ramp(v,-1,1));
 let q=[s*w-.065,.0+.32*v-.25,-.20+.17*(1-s*s)+.075*v];
 if(p.branch==='create'){const d=ramp(p.t,10,140);q=rotate(q,'x',-.50*(1-d),[0,-.25,-.20]);q[1]-=.20*(1-d);}
 q[1]-=(p.reduced?.055:.14)*p.transfer*(1-s*s);q[2]-=.12*p.transfer;
 if(p.branch==='fracture'){const d=ramp(p.t,115,300);q=rotate(q,'x',.48*d,[0,-.25,-.20]);q[1]-=.17*d;q[2]-=.13*d;}
 if(p.branch==='bust'){const d=ramp(p.t,100,300);q=rotate(q,'x',-.33*d,[0,-.25,-.20]);q[1]-=.13*d;}
 return q;
}
function material(role,s,v,n,p){
 const broad=.50+.50*Math.max(0,n[0]*-.25+n[1]*.28+n[2]*.90);
 const entry=p.branch==='create'?ramp(p.t,role==='canopy'?85:10,role==='canopy'?145:65):1;
 const a=entry*p.tail;
 const closure=p.branch==='create'?Math.exp(-Math.pow((v-mix(-1,1,ramp(p.t,90,305)))/.30,2)):0;
 const stress=p.branch==='absorb'?Math.exp(-Math.pow(s/.66,2)-Math.pow((v-.16)/.46,2))*p.load:0;
 const release=p.branch==='bust'?Math.exp(-Math.pow((v-mix(-1,1,ramp(p.t,20,285)))/.23,2)):0;
 const causal=role==='canopy'?.34*closure+.45*stress+.26*release:.45*(p.branch==='create'?bell(p.t,10,75,220):p.transfer);
 const em=(role==='canopy'?.48+.40*broad:.24+.24*broad)+causal;
 const local=role==='canopy'?(closure+release)*Math.exp(-Math.pow((s-.24)/.16,2))*.65:0;
 return {outer:{rgb:role==='canopy'?[.035,.55,.72]:[.055,.25,.54],alpha:(role==='canopy'?.64:.71)*a,emission:em},
 inner:{rgb:[.035,.27,.39],alpha:.73*a,emission:.32+.16*broad},
 edge:{rgb:[.045,.34,.47],alpha:.70*a,emission:.35+.15*broad},
 core:{rgb:[.76,.98,1],emission:local},
 density:role==='canopy'?.74:.88};
}
function mesh(id,role,fn,p,orientation=1,half=false){
 const nu=24,nv=28,thickness=role==='canopy'?.085:.12,vertices=[],triangles=[];
 for(let j=0;j<=nv;j++)for(let i=0;i<=nu;i++){const s=-1+2*i/nu,v=-1+2*j/nv,e=.0005,point=fn(s,v);
  let normal=norm(cross(sub(fn(Math.min(1,s+e),v),fn(Math.max(-1,s-e),v)),sub(fn(s,Math.min(1,v+e)),fn(s,Math.max(-1,v-e))))).map(x=>x*orientation);
  vertices.push({point,innerPoint:point.map((x,k)=>x-normal[k]*thickness),normal,s,v,material:material(role,half?orientation*(s+1)/2:s,v,normal,p)});}
 for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){const s=-1+2*(i+.5)/nu,v=-1+2*(j+.5)/nv;
  if(role==='canopy'&&p.branch==='fracture'&&Math.abs(v-.22*s)<.13*p.loss)continue;
  const a=j*(nu+1)+i,b=a+1,c=a+nu+1,d=c+1;
  const proposed=orientation>0?[[a,b,c],[b,d,c]]:[[a,c,b],[b,c,d]];
  for(const tri of proposed){
   if(role==='canopy'&&p.branch==='fracture'&&p.loss>0){const regions=tri.map(k=>vertices[k].v-.22*vertices[k].s);
    if(regions.some(r=>Math.abs(r)<.13*p.loss)||Math.min(...regions)*Math.max(...regions)<=0)continue;}
   triangles.push(tri);
  }}
 const edgeMap=new Map();for(const t of triangles)for(let k=0;k<3;k++){const a=t[k],b=t[(k+1)%3],key=[a,b].sort((a,b)=>a-b).join(':');
  if(edgeMap.has(key))edgeMap.get(key).count++;else edgeMap.set(key,{count:1,edge:[a,b]});}
 return {id,componentId:id,role,vertices,triangles,wallEdges:[...edgeMap.values()].filter(e=>e.count===1).map(e=>e.edge),thickness};
}
function frame(e,now,state={}){const p=phase(e,now,state);if(!p.active)return {...p,revision:REVISION,components:[]};
 const components=p.branch==='bust'?[-1,1].map(side=>mesh('released-leaf-'+side,'canopy',(s,v)=>leaf(side,s,v,p),p,side,true)):
  [mesh('continuous-canopy','canopy',(s,v)=>canopy(s,v,p),p)];
 components.push(mesh('rear-load-plate','plate',(s,v)=>plate(s,v,p),p));
 return {...p,revision:REVISION,components,keystone:null,
 projection:{x:'x+.28*z',y:'y+.07*z',H:state.charH??64},
 observation:{glowRadiusH:.035,glowGain:.09,actorWarp:false,backgroundWarp:false,microVariation:'none'},
 colorContract:'linear rgb=material.rgb*(0.50+material.emission)+outerOnlyCore.rgb*outerOnlyCore.emission; apply alpha once; no added Lambert; exposure/tone map fixed for all branches',
 stage:p.branch==='create'?(p.t<85?'rear-source-plate':p.t<305?'broad-canopy-unfolds':p.t<500?'protected-volume':'finite-exit'):
  p.branch==='absorb'?(p.t<85?'broad-load-bowl':p.t<315?'load-transfers-to-rear-plate':p.t<410?'whole-canopy-recovers':'residual-exit'):
  p.branch==='fracture'?(p.t<115?'broad-canopy-fails':p.t<300?'rear-support-yields':'large-face-remnants'):
  p.t<100?'release-crosses-canopy':p.t<300?'broad-leaves-open':'released-volumes'};
}
function sfx(e){const p=priorSfx(e);return {...p,revision:REVISION,voices:p.voices.map(v=>({...v,startMs:v.name==='shell-release'?115:v.startMs}))};}
module.exports={REVISION,phase,width,canopy,leaf,plate,material,mesh,frame,sfx};

  };
  // barrier-v3r4-sampler.cjs; sha256=f5d0be72375302c540046bc2425c5f21a51e37afa6a6fe1f01efe04fe1fe3f7f
  factories["barrier-v3r4-sampler.cjs"] = function(module, exports, require) {
'use strict';
// Astra r4: three real depth strata; angle/path-dependent extinction and broad reflection.
const R3=require('./barrier-v3r3-sampler.cjs');
const REVISION='barrier-v3-r4-transmitted-volume-optics1-20260927';
const sat=x=>Math.max(0,Math.min(1,x)),sm=x=>{x=sat(x);return x*x*(3-2*x);};
const ramp=(t,a,b)=>sm((t-a)/(b-a)),mix=(a,b,t)=>a+(b-a)*t;
const norm=p=>{const l=Math.hypot(...p);return p.map(x=>x/l);},dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
const V=norm([-.28,-.07,1]),L=norm([-.48,.54,.72]),HALF=norm(V.map((x,i)=>x+L[i]));
const add=(a,b)=>a.map((x,i)=>x+b[i]),mul=(a,x)=>a.map(v=>v*x);
function mainPoint(s,v,p){const q=R3.canopy(s,v,p);
 q[2]+=.095*(1-s*s)*(1-.30*v*v);
 q[1]+=.10*(1-s*s)*ramp(v,.45,1)-.05*(1-s*s)*ramp(-v,.50,1);return q;}
function leafPoint(side,s,v,p){const q=R3.leaf(side,s,v,p),a=(s+1)/2;
 q[2]+=.075*(1-a*a)*(1-.30*v*v);q[1]+=.10*(1-a*a)*ramp(v,.45,1);return q;}
function innerPoint(s,v,p){
 // Rear tension diaphragm is narrower, concave and offset, not a scaled front copy.
 const w=.43+.10*Math.cos(v*Math.PI*.65),q=[w*s-.08*v,.48+.63*v,-.43+.22*s*s+.085*v];
 if(p.branch==='create'){const d=ramp(p.t,45,225);q[1]=-.22+(q[1]+.22)*(.35+.65*d);q[0]*=.6+.4*d;}
 if(p.branch==='absorb'){q[2]-=.17*p.transfer*(1-s*s);q[1]-=.07*p.transfer;}
 if(p.branch==='fracture'){const d=ramp(p.t,115,295),side=v-.22*s>=0?1:-1;q[1]+=side*.18*d;q[0]+=side*.08*d;q[2]-=.16*d;}
 if(p.branch==='bust'){const d=ramp(p.t,115,295);q[0]*=1+.22*d;q[1]-=.15*d;q[2]-=.18*d;}
 return q;
}
function saddlePoint(s,v,p){const q=R3.plate(s,v,p);
 q[1]+=.17*s*s+.10*ramp(v,-.25,1);q[2]+=.23*s*s+.13*v*v-.13;return q;}
function optical(role,s,v,n,p){
 const nv=Math.max(.22,Math.abs(dot(n,V))),grazing=1-nv;
 const diffuse=Math.pow(Math.max(0,dot(n,L)),2);
 const broadReflection=Math.pow(Math.max(0,dot(n,HALF)),10);
 const f=.055+.38*Math.pow(grazing,3);
 const strain=p.branch==='absorb'?Math.exp(-Math.pow(s/.70,2)-Math.pow((v-.16)/.48,2))*p.load:0;
 const wave=p.branch==='create'?Math.exp(-Math.pow((v-mix(-1,1,ramp(p.t,90,305)))/.34,2)):
  p.branch==='bust'?Math.exp(-Math.pow((v-mix(-1,1,ramp(p.t,20,285)))/.28,2)):0;
 const response=role==='front'?.38*strain+.24*wave:role==='diaphragm'?.32*p.transfer:.38*p.transfer;
 const density=role==='front'?.24+.09*strain:role==='diaphragm'?.10:.17;
 const alpha=1-Math.exp(-density/nv);
 const entry=p.branch==='create'?ramp(p.t,role==='front'?85:role==='diaphragm'?45:10,role==='front'?145:role==='diaphragm'?100:65):1;
 // A declared optical field, not per-background compensation. Colored broad reflection;
 // near-white is reserved for one local causal patch.
 let radiance;
 if(role==='front')radiance=add(add(mul([.015,.23,.39],.32+1.05*diffuse),mul([.11,.87,1.04],1.15*broadReflection)),mul([.02,.48,.62],response+f));
 else if(role==='diaphragm')radiance=add(mul([.10,.18,.55],.55+.65*diffuse),mul([.05,.59,.73],.18+.75*response+.35*broadReflection));
 else radiance=add(mul([.035,.18,.42],.40+.85*diffuse),mul([.055,.60,.76],.32+.62*broadReflection+response));
 let visibility=entry*p.tail;
 // Loss events dissipate the supporting film only after primary failure/release.
 if(role==='diaphragm'&&(p.branch==='fracture'||p.branch==='bust'))visibility*=1-.72*ramp(p.t,170,330);
 const core=role==='front'?wave*Math.exp(-Math.pow((s-.27)/.14,2))*.42:0;
 // Reflection is attenuated by interface opacity; an integrated emitting volume
 // is already a premultiplied light contribution and must not be attenuated twice.
 const field=(.34+.66*Math.exp(-Math.pow(s/.90,2)-Math.pow((v+.04)/1.15,2)))*(.72+.28*diffuse);
 const source=p.branch==='create'?ramp(p.t,10,75)*(1-ramp(p.t,75,220)):0;
 const volume=role==='front'?mul([.035,.30,.42],field*(1+.55*strain+.35*wave)):
  role==='diaphragm'?mul([.075,.235,.48],field*(.44+.65*p.transfer+.18*source)):
  mul([.035,.30,.43],field*(.56+.55*p.transfer+.62*source));
 return {outer:{rgb:radiance,emission:.5,alpha:alpha*visibility,premultipliedEmission:mul(volume,visibility)},
  inner:{rgb:mul(role==='front'?[.025,.31,.46]:[.075,.19,.42],.55+.65*diffuse+.25*broadReflection),emission:.5,alpha:(role==='front'?.10:role==='diaphragm'?.055:.09)*visibility},
  edge:{rgb:add(mul([.035,.40,.57],.35+.65*diffuse),mul([.035,.44,.50],.35*broadReflection)),emission:.5,alpha:(.24+.12*grazing)*visibility},
  core:{rgb:[.82,.97,1],emission:core},
  optical:{nDotView:nv,diffuse,broadReflection,fresnel:f,opticalDepth:density/nv,transmission:Math.exp(-density/nv)},density};
}
function surface(id,role,fn,p,orientation=1,half=false){
 // R3's tested topology and exact normal-thickness extrusion only; materials replaced.
 const mesh=R3.mesh(id,role==='front'||role==='diaphragm'?'canopy':'plate',fn,p,orientation,half);
 mesh.role=role;
 for(const vert of mesh.vertices){const s=half?orientation*(vert.s+1)/2:vert.s;vert.material=optical(role,s,vert.v,vert.normal,p);}
 if(role==='diaphragm'&&p.branch==='bust'&&p.t>115){
  // Delayed dissipation of the rear film is a broad gap, never stripes.
  const released=ramp(p.t,115,295);
  mesh.triangles=mesh.triangles.filter(t=>!t.some(i=>Math.abs(mesh.vertices[i].s)<.19*released));
  const edges=new Map();for(const t of mesh.triangles)for(let k=0;k<3;k++){const a=t[k],b=t[(k+1)%3],key=[a,b].sort((a,b)=>a-b).join(':');if(edges.has(key))edges.get(key).count++;else edges.set(key,{count:1,edge:[a,b]});}
  mesh.wallEdges=[...edges.values()].filter(e=>e.count===1).map(e=>e.edge);
 }
 return mesh;
}
function frame(e,now,state={}){const p=R3.phase(e,now,state);if(!p.active)return {...p,revision:REVISION,components:[]};
 const components=p.branch==='bust'?[-1,1].map(side=>surface('released-leaf-'+side,'front',(s,v)=>leafPoint(side,s,v,p),p,side,true)):
 [surface('continuous-front','front',(s,v)=>mainPoint(s,v,p),p)];
 components.push(surface('rear-tension-diaphragm','diaphragm',(s,v)=>innerPoint(s,v,p),p));
 components.push(surface('lower-receiver-saddle','saddle',(s,v)=>saddlePoint(s,v,p),p));
 return {...p,revision:REVISION,components,keystone:null,projection:{x:'x+.28*z',y:'y+.07*z',H:state.charH??64,yConvention:'up; clip Y positive'},
 observation:{glowRadiusH:.035,glowGain:.09,actorWarp:false,backgroundWarp:false,microVariation:'none'},
 colorContract:'outputPremul=(rgb*(.50+emission)+outerOnlyCore)*alpha+premultipliedEmission; exposure1; no extra Lambert/tone-map; emission already visibility-weighted',
 stage:p.branch==='create'?(p.t<85?'source-saddle-and-rear-film':p.t<305?'curved-transmitting-front-unfolds':'protected-depth'):
 p.branch==='absorb'?(p.t<85?'front-bowl-load':p.t<315?'load-crosses-rear-film-to-saddle':'transparent-structure-recovers'):
 p.branch==='fracture'?(p.t<115?'front-fails':p.t<300?'rear-film-and-saddle-yield':'curved-transmitting-remnants'):
 p.t<115?'front-releases':p.t<300?'leaves-open-and-rear-film-releases':'released-depth'};
}
function sfx(e){return {...R3.sfx(e),revision:REVISION};}
module.exports={REVISION,phase:R3.phase,mainPoint,leafPoint,innerPoint,saddlePoint,optical,surface,frame,sfx};

  };
  // barrier-v3r4-reduced.cjs; sha256=480bece234c11bea2b59a61fde84415a143a2f36c1e9f6821c785c974ccd29d9
  factories["barrier-v3r4-reduced.cjs"] = function(module, exports, require) {
'use strict';
// Optional explicit reduced-motion adapter. Normal mode is byte-for-byte delegated.
// Does not mutate the frozen optics1 source/captures.
const R=require('./barrier-v3r4-sampler.cjs');
const mixPoint=(a,b,t)=>a.map((x,i)=>x+(b[i]-x)*t);
const restPhase=p=>({...p,branch:'hold',reduced:false,load:0,transfer:0,loss:0,release:0});
function main(s,v,p){const q=R.mainPoint(s,v,p);return p.branch==='create'?
 mixPoint(R.mainPoint(s,v,restPhase(p)),q,.35):q;}
function rear(s,v,p){return mixPoint(R.innerPoint(s,v,restPhase(p)),R.innerPoint(s,v,p),.40);}
function saddle(s,v,p){return mixPoint(R.saddlePoint(s,v,restPhase(p)),R.saddlePoint(s,v,p),.40);}
function frame(e,now,state={}){
 if(!state.reducedMotion)return R.frame(e,now,state);
 const p=R.phase(e,now,state);if(!p.active)return {...p,revision:R.REVISION+'-reduced1',components:[]};
 const metadata=R.frame(e,now,state);
 const components=p.branch==='bust'?[-1,1].map(side=>R.surface('released-leaf-'+side,'front',(s,v)=>R.leafPoint(side,s,v,p),p,side,true)):
 [R.surface('continuous-front','front',(s,v)=>main(s,v,p),p)];
 components.push(R.surface('rear-tension-diaphragm','diaphragm',(s,v)=>rear(s,v,p),p));
 components.push(R.surface('lower-receiver-saddle','saddle',(s,v)=>saddle(s,v,p),p));
 return {...metadata,revision:R.REVISION+'-reduced1',components,reducedContract:{createDisplacementScale:.35,rearDisplacementScale:.40,saddleDisplacementScale:.40,primaryAbsorbFractureBust:'existing reduced amplitudes retained',phaseAndLifetime:'unchanged'}};
}
module.exports={...R,frame,reducedMain:main,reducedRear:rear,reducedSaddle:saddle};

  };
  // barrier-v3r4-review-fixes.cjs; sha256=1841871c5ea08aff8c9fea243504730d479ab41febfc299eabe1547775b81809
  factories["barrier-v3r4-review-fixes.cjs"] = function(module, exports, require) {
'use strict';
// Bounded successor adapter: reduced amplitudes + delayed rear fracture topology.
// Frozen optics1 source remains untouched for reproducibility.
const R=require('./barrier-v3r4-sampler.cjs'),A=require('./barrier-v3r4-reduced.cjs');
const ramp=(t,a,b)=>{const x=Math.max(0,Math.min(1,(t-a)/(b-a)));return x*x*(3-2*x);};
const REVISION=R.REVISION+'-review-fixes1';
function frame(e,now,state={}){
 const result=A.frame(e,now,state);
 if(!result.active)return {...result,revision:REVISION};
 if(result.branch!=='fracture')return {...result,revision:REVISION};
 const p=R.phase(e,now,state),meshPhase={...p,loss:ramp(p.t,115,295)};
 const fn=state.reducedMotion?(s,v)=>A.reducedRear(s,v,p):(s,v)=>R.innerPoint(s,v,p);
 const rear=R.surface('rear-tension-diaphragm','diaphragm',fn,meshPhase);
 return {...result,revision:REVISION,components:result.components.map(c=>c.role==='diaphragm'?rear:c),
  causalCorrection:{primaryCutStartMs:25,rearCutStartMs:115,rearCutCompleteMs:295}};
}
module.exports={...A,REVISION,frame};

  };
  const cache = Object.create(null);
  function load(name) {
    const id = name.replace(/^\.\//, '');
    if (cache[id]) return cache[id].exports;
    if (!factories[id]) throw new Error('Unknown frozen Astra Barrier sampler: ' + id);
    const module = { exports: {} };
    cache[id] = module;
    factories[id](module, module.exports, load);
    return module.exports;
  }
  window.BarrierV3 = load('barrier-v3-sampler.cjs');
  window.BarrierV3R2 = load('barrier-v3r2-sampler.cjs');
  window.BarrierV3R3 = load('barrier-v3r3-sampler.cjs');
  window.BarrierV3R4 = load('barrier-v3r4-sampler.cjs');
  window.BarrierV3R4Reduced = load('barrier-v3r4-reduced.cjs');
  window.BarrierV3R4ReviewFixes = load('barrier-v3r4-review-fixes.cjs');
})();
