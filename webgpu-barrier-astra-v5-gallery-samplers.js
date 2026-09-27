(()=>{'use strict';
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
window.BarrierV3SamplerBase={REVISION,MAP,resolve,phase,surface,frame,sfx};
})();(()=>{'use strict';
// Barrier v3 r2: 単一楕円を棄却した、厚い主面・返し羽根・下部接合源の新設計。
// 各shellを別meshとして返す。半面・層間を跨ぐtriangleを作らない。
const {resolve,sfx:baseSfx}=window.BarrierV3SamplerBase;
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
window.BarrierV3R2={REVISION,phase,profile,mantlePoint,vanePoint,material,shell,frame,sfx};
})();(()=>{'use strict';
// Astra r3: broad continuous protective canopy + broad rear load plate.
// No central wall/seam in create/absorb. Split geometry exists only on loss events.
const {resolve}=window.BarrierV3SamplerBase;
const {sfx:priorSfx}=window.BarrierV3R2;
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
window.BarrierV3R3={REVISION,phase,width,canopy,leaf,plate,material,mesh,frame,sfx};
})();(()=>{'use strict';
// GPT-6-Astra independent r5. Analytic single enclosure, no saddle, visor or leaf pair.
// Only event resolution and previously settled audio semantics are reused.
const {resolve}=window.BarrierV3SamplerBase;
const {sfx:semanticSfx}=window.BarrierV3R3;
const REVISION='barrier-v5-enclosing-field-20260927-r0';
const TAU=2*Math.PI,clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
const ramp=(t,a,b)=>smooth((t-a)/(b-a));
const bell=(t,a,b,c)=>ramp(t,a,b)*(1-ramp(t,b,c));
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const normalize=a=>{const k=1/Math.hypot(...a);return a.map(x=>x*k);};
const VIEW=normalize([-.28,-.07,1]),LIGHT=normalize([-.50,.40,.77]);
const HALF=normalize(VIEW.map((x,i)=>x+LIGHT[i]));
function phase(e,now,state={}){
 const r=resolve(e),t=now-e.startedAtMs;
 if(!Number.isFinite(now))throw Error('finite now required');
 const active=t>=0&&t<r.durationMs&&state.visible!==false&&state.alive!==false&&!state.inVent&&!state.ejected;
 return {...r,t,active,reduced:!!state.reducedMotion,
  tail:active?1-ramp(t,r.durationMs===650?500:330,r.durationMs):0,
  closure:ramp(t,15,285),load:r.branch==='absorb'?bell(t,0,85,315):0,
  transfer:r.branch==='absorb'?bell(t,60,180,410):0,
  loss:r.branch==='fracture'?ramp(t,25,240):0,
  rearLoss:r.branch==='fracture'?ramp(t,115,295):0,
  release:r.branch==='bust'?ramp(t,20,285):0};
}
// v is [-1,1]; u is actual angle, not screen X. Analytic differential, one eval/vertex.
function sample(u,v,p,sector=null){
 const motion=p.reduced?.35:1,twist=p.branch==='bust'?.22*p.release*motion:0;
 u+=twist*v;
 const sn=Math.sin(u),cs=Math.cos(u),cv=Math.cos(v*Math.PI/2),sv=Math.sin(v*Math.PI/2);
 const gv=Math.exp(-Math.pow(v/.70,2)),gvd=-2*v/.49*gv;
 const front=Math.max(0,sn)**2,back=Math.max(0,-sn)**2;
 let radial=.76+.055*cv,rv=-.055*Math.PI/2*sv,ru=0;
 if(p.branch==='create'){
  const scale=1-.22*motion*(1-p.closure);radial*=scale;rv*=scale;
 }
 if(p.branch==='absorb'){
  const k=motion*(-.14*p.load*front+.095*p.transfer*back);
  radial+=k*gv;rv+=k*gvd;
  ru+=motion*(sn>0?-.28*p.load*sn*cs:.19*p.transfer*sn*cs)*gv;
 }
 if(p.branch==='bust'){radial+=.19*p.release*motion*(.8+.2*cv);rv-=.038*p.release*motion*Math.PI/2*sv;}
 const x=radial*cs+.11*v,z=.72*radial*sn;
 const xu=ru*cs-radial*sn,zu=.72*(ru*sn+radial*cs);
 const yu=.22*zu+.04*Math.cos(u+.6)*(1-v*v);
 let xv=rv*cs+.11+twist*xu,zv=.72*rv*sn+twist*zu;
 let yv=.86+.22*(zv-twist*zu)-.08*v*Math.sin(u+.6)+twist*yu;
 const point=[x,.54+.86*v+.22*z+.04*Math.sin(u+.6)*(1-v*v),z];
 if(sector){
  const d=sector.rear?p.rearLoss:p.loss;
  point[0]+=.16*d*Math.cos(sector.center)*motion;
  point[1]+=.16*d*Math.sin(sector.center+.4)*motion;
  point[2]+=.12*d*Math.sin(sector.center)*motion;
 }
 const normal=normalize(cross([xv,yv,zv],[xu,yu,zu]));
 // Upper/lower field dissolves into space: no cap, collar, visor or hard floor ring.
 let coverage=ramp(v,-1,-.78)*(1-ramp(v,.76,1));
 let sweep=0;
 if(p.branch==='create'){
  const dist=Math.acos(clamp((Math.cos(u-1.5*Math.PI)+1)/2)*2-1);
  const frontier=(Math.PI+.14)*p.closure;
  coverage*=ramp(frontier-dist,-.14,.14)*ramp(p.t,0,38);
  sweep=Math.exp(-Math.pow((dist-frontier)/.34,2))*(1-ramp(p.t,245,310));
 }
 const material=optical(u,v,normal,p,coverage,sweep);
 if(sector)material.edge.alpha*=sector.rear?p.rearLoss:p.loss;
 const thickness=.052;
 return {point,innerPoint:point.map((x,i)=>x-thickness*normal[i]),normal,s:u/Math.PI-1,u,v,coverage,material};
}
function optical(u,v,n,p,coverage,sweep){
 const nv=Math.max(.28,Math.abs(dot(n,VIEW))),front=.5+.5*Math.sin(u);
 // Reflect the interface facing the viewer, while retaining the actual enclosure normal.
 const nf=dot(n,VIEW)<0?n.map(x=>-x):n;
 const reflection=Math.max(0,dot(nf,HALF))**5;
 const vertical=.60+.40*Math.exp(-Math.pow((v-.12)/.65,2));
 const strain=p.load*Math.max(0,Math.sin(u))**2*Math.exp(-Math.pow(v/.72,2));
 const transfer=p.transfer*Math.max(0,-Math.sin(u))**2*Math.exp(-Math.pow(v/.80,2));
 const emission=.80+.28*reflection+.48*strain+.42*transfer+.40*sweep;
 const density=.14+.05*strain,alpha=1-Math.exp(-density/nv),vis=coverage*p.tail;
 const rgb=[.025+.060*(1-front),.28+.16*front+.18*reflection,.49+.12*front+.15*reflection];
 const pe=[(.048-.030*front)*vertical*emission*vis,
  (.105+.045*front)*vertical*emission*vis,
  (.215-.015*front)*vertical*emission*vis];
 // No near-white all-face core. Broad local colored load is already in strain/reflection.
 return {outer:{rgb,emission:.5,alpha:alpha*vis,premultipliedEmission:pe},
  inner:{rgb:[.035,.20+.10*front,.40],emission:.5,alpha:.055*vis},
  edge:{rgb:[.045,.37,.53],emission:.5,alpha:.30*vis},
  core:{rgb:[0,0,0],emission:0},density,
  optical:{nDotView:nv,reflection,strain,transfer,transmission:Math.exp(-density/nv)}};
}
const topologyCache=new Map();
function topology(nu,nv,open){
 const key=nu+':'+nv+':'+open;if(topologyCache.has(key))return topologyCache.get(key);
 const triangles=[],wallEdges=[];
 for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){
  const a=j*(nu+1)+i,b=a+1,c=a+nu+1,d=c+1;
  triangles.push(Object.freeze([a,c,b]),Object.freeze([b,c,d]));
 }
 for(let i=0;i<nu;i++){wallEdges.push(Object.freeze([i+1,i]));const a=nv*(nu+1)+i;wallEdges.push(Object.freeze([a,a+1]));}
 if(open)for(let j=0;j<nv;j++){const a=j*(nu+1),b=a+nu;wallEdges.push(Object.freeze([a,a+nu+1]),Object.freeze([b+nu+1,b]));}
 const result=Object.freeze({triangles:Object.freeze(triangles),wallEdges:Object.freeze(wallEdges)});topologyCache.set(key,result);return result;
}
function mesh(id,p,start,span,nu=64,sector=null){
 const nv=16,vertices=[];
 for(let j=0;j<=nv;j++){const v=-1+2*j/nv;for(let i=0;i<=nu;i++)vertices.push(sample(start+span*i/nu,v,p,sector));}
 const topo=topology(nu,nv,span<TAU-1e-7);
 return {id,componentId:id,role:'enclosure',vertices,...topo,thickness:.052};
}
function frame(e,now,state={}){
 const p=phase(e,now,state);if(!p.active)return {...p,revision:REVISION,components:[]};
 let components;
 if(p.branch==='fracture'){
  // Three large azimuthal areas: delayed rear area; no horizontal visor cut.
  components=[Math.PI/6,5*Math.PI/6,1.5*Math.PI].map((center,i)=>{
   const rear=i===2,d=rear?p.rearLoss:p.loss,gap=.24*d;
   return mesh('loss-sector-'+i,p,center-Math.PI/3+gap,2*Math.PI/3-2*gap,24,{center,rear});
  });
 }else if(p.branch==='bust'){
  // One connected field unwraps; never two doors/leaves. Retained arc stays broad.
  const span=TAU-2.65*p.release,center=1.5*Math.PI-.43*p.release;
  components=[mesh('unbinding-field',p,center-span/2,span,64)];
 }else components=[mesh('protective-enclosure',p,0,TAU,64)];
 return {...p,revision:REVISION,components,keystone:null,
  projection:{x:'x+.28*z',y:'y+.07*z',H:state.charH??64,yConvention:'up; positive clip Y'},
  observation:{actorWarp:false,backgroundWarp:false,microVariation:'none',glowGain:0,glowRadiusH:0},
  colorContract:'premul=rgb*(.50+emission)*alpha+premultipliedEmission; alpha once; PE only outer; exposure1; no extra light/tone-map',
  stage:p.branch==='create'?(p.t<285?'enclosing-sweep':'established-space'):
   p.branch==='absorb'?(p.t<60?'front-compression':p.t<315?'opposite-wall-transfer':'recovery'):
   p.branch==='fracture'?(p.t<115?'front-area-cohesion-loss':'rear-area-late-loss'):'continuous-unbinding'};
}
function sfx(e){return {...semanticSfx(e),revision:REVISION};}
window.BarrierV5={REVISION,resolve,phase,sample,optical,mesh,frame,sfx};
})();(()=>{'use strict';
// GPT-6-Astra independent r5r1. Broad oblique returning field, no planar tube rims.
// Only event resolution and previously settled audio semantics are reused.
const {resolve}=window.BarrierV3SamplerBase;
const {sfx:semanticSfx}=window.BarrierV3R3;
const REVISION='barrier-v5-oblique-returning-field-20260927-r1';
const REST_SPAN=5.25,REST_CENTER=1.30*Math.PI;
const TAU=2*Math.PI,clamp=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
const ramp=(t,a,b)=>smooth((t-a)/(b-a));
const bell=(t,a,b,c)=>ramp(t,a,b)*(1-ramp(t,b,c));
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const normalize=a=>{const k=1/Math.hypot(...a);return a.map(x=>x*k);};
const VIEW=normalize([-.28,-.07,1]),LIGHT=normalize([-.50,.40,.77]);
const HALF=normalize(VIEW.map((x,i)=>x+LIGHT[i]));
function phase(e,now,state={}){
 const r=resolve(e),t=now-e.startedAtMs;
 if(!Number.isFinite(now))throw Error('finite now required');
 const active=t>=0&&t<r.durationMs&&state.visible!==false&&state.alive!==false&&!state.inVent&&!state.ejected;
 return {...r,t,active,reduced:!!state.reducedMotion,
  tail:active?1-ramp(t,r.durationMs===650?500:330,r.durationMs):0,
  closure:ramp(t,15,285),load:r.branch==='absorb'?bell(t,0,85,315):0,
  transfer:r.branch==='absorb'?bell(t,60,180,410):0,
  loss:r.branch==='fracture'?ramp(t,25,240):0,
  rearLoss:r.branch==='fracture'?ramp(t,115,295):0,
  release:r.branch==='bust'?ramp(t,20,285):0};
}
// v is [-1,1]; u is actual angle, not screen X. Analytic differential, one eval/vertex.
function sample(u,v,p,sector=null){
 const motion=p.reduced?.35:1,twist=.38+(p.branch==='bust'?.12*p.release*motion:0);
 u+=twist*v;
 const sn=Math.sin(u),cs=Math.cos(u);
 const gv=Math.exp(-Math.pow((v-.05)/.68,2)),gvd=-2*(v-.05)/(.68*.68)*gv;
 const front=Math.exp(2*(Math.cos(u-2.25)-1)),back=Math.exp(2*(Math.cos(u-4.35)-1));
 let radial=.68+.18*(1-v*v)+.12*v*Math.sin(u-.75),rv=-.36*v+.12*Math.sin(u-.75),ru=.12*v*Math.cos(u-.75);
 if(p.branch==='create'){
  const scale=1-.22*motion*(1-p.closure);radial*=scale;rv*=scale;ru*=scale;
 }
 if(p.branch==='absorb'){
  const k=motion*(-.30*p.load*front+.15*p.transfer*back);
  radial+=k*gv;rv+=k*gvd;
  ru+=motion*(.60*p.load*Math.sin(u-2.25)*front-.30*p.transfer*Math.sin(u-4.35)*back)*gv;
 }
 if(p.branch==='bust'){radial+=.19*p.release*motion*(1-.20*v*v);rv-=.076*p.release*motion*v;}
 const x=radial*cs+.10*v,z=.80*radial*sn;
 const xu=ru*cs-radial*sn,zu=.80*(ru*sn+radial*cs);
 const yu=.25*Math.cos(u+.45)-.26*Math.sin(2*u-.3)*(1-v*v)+.14*zu;
 const xv=rv*cs+.10+twist*xu,zv=.80*rv*sn+twist*zu;
 const yv=.72-.26*v*Math.cos(2*u-.3)+.14*(zv-twist*zu)+twist*yu;
 const point=[x,.54+.72*v+.25*Math.sin(u+.45)+.13*Math.cos(2*u-.3)*(1-v*v)+.14*z,z];
 if(sector){
  const d=sector.rear?p.rearLoss:p.loss;
  point[0]+=.16*d*Math.cos(sector.center)*motion;
  point[1]+=.16*d*Math.sin(sector.center+.4)*motion;
  point[2]+=.12*d*Math.sin(sector.center)*motion;
 }
 const normal=normalize(cross([xv,yv,zv],[xu,yu,zu]));
 // Upper/lower field dissolves into space: no cap, collar, visor or hard floor ring.
 let coverage=ramp(v,-1,-.67)*(1-ramp(v,.66,1));
 let sweep=0;
 if(p.branch==='create'){
  const dist=Math.acos(clamp((Math.cos(u-1.5*Math.PI)+1)/2)*2-1);
  const frontier=(Math.PI+.14)*p.closure;
  coverage*=ramp(frontier-dist,-.14,.14)*ramp(p.t,0,38);
  sweep=Math.exp(-Math.pow((dist-frontier)/.34,2))*(1-ramp(p.t,245,310));
 }
 const material=optical(u,v,normal,p,coverage,sweep);
 if(sector)material.edge.alpha*=sector.rear?p.rearLoss:p.loss;
 const thickness=.065;
 return {point,innerPoint:point.map((x,i)=>x-thickness*normal[i]),normal,s:u/Math.PI-1,u,v,coverage,material};
}
function optical(u,v,n,p,coverage,sweep){
 const nv=Math.max(.28,Math.abs(dot(n,VIEW))),front=.5+.5*Math.sin(u);
 const reflection=Math.max(0,dot(n,HALF))**7;
 const field=.18+.82*Math.exp(-Math.pow((v-.34*Math.cos(u+.4))/.54,2));
 const strain=p.load*Math.exp(2*(Math.cos(u-2.25)-1))*Math.exp(-Math.pow((v-.05)/.68,2));
 const transfer=p.transfer*Math.exp(2*(Math.cos(u-4.35)-1))*Math.exp(-Math.pow((v-.05)/.68,2));
 const emission=.85+.32*reflection+.70*strain+.70*transfer+.42*sweep;
 const density=.11+.03*Math.pow(v*Math.sin(u-.5),2)+.075*strain,alpha=1-Math.exp(-density/nv),vis=coverage*p.tail;
 const rgb=[.025+.045*(1-front),.25+.15*front+.25*reflection,.46+.10*front+.24*reflection];
 const pe=[(.055-.040*front)*field*emission*vis,
  (.12+.07*front)*field*emission*vis,
  .25*field*emission*vis];
 // No near-white all-face core. Broad local colored load is already in strain/reflection.
 return {outer:{rgb,emission:.5,alpha:alpha*vis,premultipliedEmission:pe},
  inner:{rgb:[.035,.20+.10*front,.40],emission:.5,alpha:.055*vis},
  edge:{rgb:[.045,.37,.53],emission:.5,alpha:.30*vis},
  core:{rgb:[0,0,0],emission:0},density,
  optical:{nDotView:nv,reflection,strain,transfer,transmission:Math.exp(-density/nv)}};
}
const topologyCache=new Map();
function topology(nu,nv,open){
 const key=nu+':'+nv+':'+open;if(topologyCache.has(key))return topologyCache.get(key);
 const triangles=[],wallEdges=[];
 for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){
  const a=j*(nu+1)+i,b=a+1,c=a+nu+1,d=c+1;
  triangles.push(Object.freeze([a,c,b]),Object.freeze([b,c,d]));
 }
 for(let i=0;i<nu;i++){wallEdges.push(Object.freeze([i+1,i]));const a=nv*(nu+1)+i;wallEdges.push(Object.freeze([a,a+1]));}
 if(open)for(let j=0;j<nv;j++){const a=j*(nu+1),b=a+nu;wallEdges.push(Object.freeze([a,a+nu+1]),Object.freeze([b+nu+1,b]));}
 const result=Object.freeze({triangles:Object.freeze(triangles),wallEdges:Object.freeze(wallEdges)});topologyCache.set(key,result);return result;
}
function mesh(id,p,start,span,nu=64,sector=null){
 const nv=16,vertices=[];
 for(let j=0;j<=nv;j++){const v=-1+2*j/nv;for(let i=0;i<=nu;i++)vertices.push(sample(start+span*i/nu,v,p,sector));}
 const topo=topology(nu,nv,span<TAU-1e-7);
 return {id,componentId:id,role:'enclosure',vertices,...topo,thickness:.065};
}
function frame(e,now,state={}){
 const p=phase(e,now,state);if(!p.active)return {...p,revision:REVISION,components:[]};
 let components;
 if(p.branch==='fracture'){
  // Three large azimuthal areas: delayed rear area; no horizontal visor cut.
  components=[0,1,2].map(i=>{
   const center=REST_CENTER-REST_SPAN/2+REST_SPAN*(i+.5)/3;
   const rear=i>0,d=rear?p.rearLoss:p.loss,gap=.22*d;
   return mesh('loss-area-'+i,p,center-REST_SPAN/6+gap,REST_SPAN/3-2*gap,24,{center,rear});
  });
 }else if(p.branch==='bust'){
  // One connected field unwraps; never two doors/leaves. Retained arc stays broad.
  const span=REST_SPAN-1.90*p.release,center=REST_CENTER+.47*p.release;
  components=[mesh('unbinding-field',p,center-span/2,span,64)];
 }else components=[mesh('oblique-returning-field',p,REST_CENTER-REST_SPAN/2,REST_SPAN,64)];
 return {...p,revision:REVISION,components,keystone:null,
  projection:{x:'x+.28*z',y:'y+.07*z',H:state.charH??64,yConvention:'up; positive clip Y'},
  observation:{actorWarp:false,backgroundWarp:false,microVariation:'none',glowGain:0,glowRadiusH:0},
  colorContract:'premul=rgb*(.50+emission)*alpha+premultipliedEmission; alpha once; PE only outer; exposure1; no extra light/tone-map',
  stage:p.branch==='create'?(p.t<285?'enclosing-sweep':'established-space'):
   p.branch==='absorb'?(p.t<60?'front-compression':p.t<315?'opposite-wall-transfer':'recovery'):
   p.branch==='fracture'?(p.t<115?'front-area-cohesion-loss':'rear-area-late-loss'):'continuous-unbinding'};
}
function sfx(e){return {...semanticSfx(e),revision:REVISION};}
window.BarrierV5R1={REVISION,resolve,phase,sample,optical,mesh,frame,sfx};
})();(()=>{'use strict';
// GPT-6-Astra r5r2: open pressure membrane + displaced counterfield.
// Prior file supplies event clock and SFX semantics only; no prior geometry executes.
const SEM=window.BarrierV5;
const REVISION='barrier-v5-open-pressure-field-20260927-r2';
const sat=x=>Math.max(0,Math.min(1,x)),sm=x=>{x=sat(x);return x*x*(3-2*x);};
const ramp=(t,a,b)=>sm((t-a)/(b-a)),bell=(t,a,b,c)=>ramp(t,a,b)*(1-ramp(t,b,c));
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=a=>{const k=1/Math.hypot(...a);return a.map(x=>x*k);},dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const VIEW=norm([-.28,-.07,1]),LIGHT=norm([-.48,.52,.71]),HALF=norm(VIEW.map((x,i)=>x+LIGHT[i]));
const phase=SEM.phase,resolve=SEM.resolve;
function rotateZ(a,t){const c=Math.cos(t),s=Math.sin(t);return [c*a[0]-s*a[1],s*a[0]+c*a[1],a[2]];}

// Square-to-disc map is nonsingular at all mesh vertices; no collapsed poles.
// The front is an open two-curvature sheet. The rear is spatially displaced and concave.
function sample(role,s,v,p,side=0){
 const motion=p.reduced?.35:1,ux=Math.sqrt(1-.5*v*v),uy=Math.sqrt(1-.5*s*s);
 const q=s*s+v*v-s*s*v*v;
 const a=role==='front'?.86:.53,b=role==='front'?.92:.74;
 let point=[a*s*ux+(role==='front'?.10*v:.56+.07*v),.55+b*v*uy+(role==='front'?.06*s:-.13*s),
  role==='front'?.12+.55*(1-.62*s*s-.48*v*v)+.14*s*v-.08*v:-.62+.20*(s*s-.30*v*v)+.06*s*v];
 let ds=[a*ux,(role==='front'?.06:-.13)-.5*b*v*s/uy,role==='front'?-.682*s+.14*v:.40*s+.06*v];
 let dv=[(role==='front'?.10:.07)-.5*a*s*v/ux,b*uy,role==='front'?-.528*v+.14*s-.08:-.12*v+.06*s];
 const gv=Math.exp(-Math.pow(v/.42,2));
 const local=Math.exp(-Math.pow(s/.70,2)-Math.pow(v/.65,2));
 const ls=-2*s/.49*local,lv=-2*v/.4225*local;
 const waveRadius=.20+.85*ramp(p.t,60,300),rho2=s*s/.81+v*v/.5625,band=2*waveRadius*.22;
 const wave=Math.exp(-Math.pow((rho2-waveRadius*waveRadius)/band,2));
 const wavetime=p.branch==='absorb'?bell(p.t,45,160,355):0;
 const waveD=-2*(rho2-waveRadius*waveRadius)/(band*band)*wave;
 const ws=waveD*2*s/.81,wv=waveD*2*v/.5625;
 if(p.branch==='create'){
  const open=ramp(p.t,role==='front'?30:0,role==='front'?265:155),scale=1-.18*motion*(1-open);
  point[0]*=scale;ds[0]*=scale;dv[0]*=scale;
  point[2]-=(role==='front'?.20:.10)*motion*(1-open);
 }
 if(p.branch==='absorb'&&role==='front'){
  // A visible waist compression changes the projected contour, not just hidden vertices.
  const pinch=1-.22*motion*p.load*gv,pinchV=.44*motion*p.load*v/(.42*.42)*gv;
  dv[0]=dv[0]*pinch+point[0]*pinchV;ds[0]*=pinch;point[0]*=pinch;
  point[2]+=motion*(-.62*p.load*local+.14*wavetime*wave);
  ds[2]+=motion*(-.62*p.load*ls+.14*wavetime*ws);
  dv[2]+=motion*(-.62*p.load*lv+.14*wavetime*wv);
 }
 if(p.branch==='absorb'&&role==='rear'){
  const expand=1+.18*motion*p.transfer;
  point[0]=.56+(point[0]-.56)*expand;ds[0]*=expand;dv[0]*=expand;
  point[2]-=.20*motion*p.transfer*local;ds[2]-=.20*motion*p.transfer*ls;dv[2]-=.20*motion*p.transfer*lv;
 }
 if(p.branch==='fracture'){
  if(role==='front'){
   point[0]+=side*.19*motion*p.loss;point[1]+=side*.12*motion*p.loss;
   point[2]-=(side<0?.10:.26)*motion*p.loss;
   const angle=side*.18*motion*p.loss,center=[0,.55,.12];
   point=rotateZ(point.map((x,i)=>x-center[i]),angle).map((x,i)=>x+center[i]);ds=rotateZ(ds,angle);dv=rotateZ(dv,angle);
  }else{const d=p.rearLoss;point[2]-=.24*motion*d;point[0]+=.12*motion*d;}
 }
 if(p.branch==='bust'){
  const d=role==='front'?p.release:ramp(p.t,115,285);
  if(role==='front'){
   const scale=1-.30*motion*d;point[0]*=scale;ds[0]*=scale;dv[0]*=scale;
   point[0]-=.34*motion*d;point[2]+=.38*motion*d*s;ds[2]+=.38*motion*d;
   const angle=-.22*motion*d,center=[0,.55,.12];
   point=rotateZ(point.map((x,i)=>x-center[i]),angle).map((x,i)=>x+center[i]);ds=rotateZ(ds,angle);dv=rotateZ(dv,angle);
  }else point[2]-=.20*motion*d;
 }
 const normal=norm(cross(ds,dv));
 let coverage=1-ramp(q,.70,1); // Every visible boundary dissolves; no vessel lip.
 let forming=0;
 if(p.branch==='create'){
  const t0=role==='front'?30:0,t1=role==='front'?265:155,progress=ramp(p.t,t0,t1);
  const coordinate=(v+.38*s)/1.38,edge=-1.20+2.4*progress;
  coverage*=ramp(edge-coordinate,-.18,.18)*ramp(p.t,t0,t0+35);
  forming=Math.exp(-Math.pow((coordinate-edge)/.30,2))*(1-ramp(p.t,t1-15,t1+45));
 }
 if(role==='rear'&&(p.branch==='fracture'||p.branch==='bust'))coverage*=1-ramp(p.t,115,300);
 if(p.branch==='bust'&&role==='front')coverage*=1-.38*p.release;
 const thickness=role==='front'?.065:.045;
 const material=optical(role,s,v,q,normal,p,coverage,local,wave*wavetime,forming);
 return {point,innerPoint:point.map((x,i)=>x-thickness*normal[i]),normal,s,v,coverage,material};
}

function optical(role,s,v,q,n,p,coverage,local,wave,forming){
 const nv=Math.max(.30,Math.abs(dot(n,VIEW))),reflection=Math.max(0,dot(n,HALF))**9;
 // The broad optical window passes the protected air; it is not a physical hole.
 const window=Math.exp(-Math.pow((s+.16-.25*v)/.45,2)-Math.pow((v+.05)/.72,2));
 const shoulder=Math.exp(-Math.pow((s-.48+.28*v)/.47,2)-Math.pow((v-.10)/.85,2));
 const other=Math.exp(-Math.pow((s+.60+.15*v)/.30,2)-Math.pow((v-.14)/.70,2));
 const strain=p.branch==='absorb'?p.load*local:0,transfer=p.branch==='absorb'?p.transfer*local:0;
 const visibility=coverage*p.tail;
 const density=role==='front'?.025+.13*(1-window)+.08*strain+.06*wave:.075+.025*local;
 const alpha=(1-Math.exp(-density/nv))*visibility;
 const light=role==='front'?(.16+.64*shoulder+.34*other)*(1-.82*window):.30+.70*Math.exp(-Math.pow((s-.05)/.8,2)-Math.pow((v+.10)/.80,2));
 const energy=role==='front'?1+.75*strain+.60*wave+.35*forming:1+.85*transfer+.45*forming;
 const pe=role==='front'?[.022*light,.24*light,.34*light]:[.045*light,.085*light,.215*light];
 const reflectionColor=role==='front'?[.055,.78,.92]:[.13,.34,.64];
 const base=role==='front'?[.025,.29,.48]:[.065,.15,.37];
 const rgb=base.map((x,i)=>x+reflectionColor[i]*reflection*.95+(role==='front'?[.01,.14,.17][i]*(strain+wave):[.025,.13,.19][i]*transfer));
 return {outer:{rgb,emission:.5,alpha,premultipliedEmission:pe.map(x=>x*energy*visibility)},
  inner:{rgb:role==='front'?[.025,.22,.37]:[.05,.12,.28],emission:.5,alpha:(role==='front'?.025+.035*(1-window):.035)*visibility},
  edge:{rgb:[.04,.42,.60],emission:.5,alpha:.28*visibility},core:{rgb:[0,0,0],emission:0},density,
  optical:{nDotView:nv,reflection,window,shoulder,strain,wave,transfer,transmission:1-alpha}};
}
const topoCache=new Map();
function topology(n=24){if(topoCache.has(n))return topoCache.get(n);const triangles=[],wallEdges=[];
 for(let j=0;j<n;j++)for(let i=0;i<n;i++){const a=j*(n+1)+i,b=a+1,c=a+n+1,d=c+1;triangles.push(Object.freeze([a,b,c]),Object.freeze([b,d,c]));}
 for(let i=0;i<n;i++){wallEdges.push(Object.freeze([i,i+1]),Object.freeze([n*(n+1)+i+1,n*(n+1)+i]));}
 for(let j=0;j<n;j++){const a=j*(n+1),b=a+n;wallEdges.push(Object.freeze([a+n+1,a]),Object.freeze([b,b+n+1]));}
 const t=Object.freeze({triangles:Object.freeze(triangles),wallEdges:Object.freeze(wallEdges)});topoCache.set(n,t);return t;
}
function mesh(role,p,side=0){const n=24,vertices=[];
 for(let j=0;j<=n;j++){const v=-1+2*j/n;for(let i=0;i<=n;i++){
  const a=-1+2*i/n,cut=.22*v,gap=.16*p.loss;
  const s=!side?a:side<0?-1+(a+1)/2*(cut-gap+1):cut+gap+(a+1)/2*(1-cut-gap);
  const vert=sample(role,s,v,p,side);
  if(side){const distance=Math.abs(s-cut)-gap;const seam=p.loss>0?ramp(distance,0,.14*p.loss):1;for(const m of [vert.material.outer,vert.material.inner,vert.material.edge]){m.alpha*=seam;if(m.premultipliedEmission)m.premultipliedEmission=m.premultipliedEmission.map(x=>x*seam);}vert.coverage*=seam;}
  vertices.push(vert);
 }}
 const id=role+(side?'-loss-'+side:'');return {id,componentId:id,role,vertices,...topology(n),thickness:role==='front'?.065:.045};
}
function frame(e,now,state={}){const p=phase(e,now,state);if(!p.active)return {...p,revision:REVISION,components:[]};
 const components=p.branch==='fracture'?[mesh('front',p,-1),mesh('front',p,1)]:[mesh('front',p)];
 components.push(mesh('rear',p));
 return {...p,revision:REVISION,components,keystone:null,projection:{x:'x+.28*z',y:'y+.07*z',H:state.charH??64,yConvention:'up; positive clip Y'},
  observation:{actorWarp:false,backgroundWarp:false,microVariation:'none',glowGain:0,glowRadiusH:0},
  colorContract:'premul=rgb*(.50+emission)*alpha+PE; straight RGB pack must be multiplied by alpha exactly once in fragment; PE outer only',
  stage:p.branch==='create'?(p.t<155?'counterfield-source-and-primary-reveal':p.t<285?'broad-membrane-establishes':'open-protected-space'):
   p.branch==='absorb'?(p.t<60?'contour-compression':p.t<315?'one-pressure-wave-and-counterfield':'recovery'):
   p.branch==='fracture'?(p.t<115?'primary-cohesion-loss':'counterfield-dissipates'):'field-retraction'};
}
function sfx(e){return {...SEM.sfx(e),revision:REVISION};}
window.BarrierV5R2={REVISION,resolve,phase,sample,optical,mesh,frame,sfx};
})();
