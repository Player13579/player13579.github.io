export const VERSION='dot-fighter-parry-r4', TYPE='fighter-slash-parry', LIFE=420, HEIGHT=1.70, CSS_PX_PER_M=64/HEIGHT;
export const SOURCE_WORLD_UNITS_PER_M=100;
const cap=(x)=>Math.max(0,Math.min(1,x)), mix=(a,b,t)=>a+(b-a)*t;
const smooth=(a,b,t)=>{const s=cap((t-a)/(b-a));return s*s*(3-2*s)};
const lerp=(a,b,t)=>a.map((x,i)=>mix(x,b[i],t));
const strictNumber=(x)=>typeof x==='number'&&Number.isFinite(x);
const lightTiers={guard:0.84,'perfect-reflect':1.12,'perfect-all-reflect':1.27};
export function receipt(x, now=Date.now()) {
  if(!x||x.type!==TYPE||typeof x.id!=='string'||!x.id.startsWith('magic_')||x.id.length<7||x.id.length>180)return null;
  if(![x.x,x.y,x.targetX,x.targetY,x.at].every(strictNumber)||x.at<=now-LIFE||x.at>now+125)return null;
  if(typeof x.variant!=='string'||typeof x.playerId!=='string'||!x.playerId||Math.hypot(x.targetX-x.x,x.targetY-x.y)<.25)return null;
  const tier=x.variant.slice(0,x.variant.indexOf(':')); if(!Object.hasOwn(lightTiers,tier)||x.variant.length<=tier.length+1||x.variant.length>120)return null;
  const [dx,dy]=[x.targetX-x.x,x.targetY-x.y];const len=Math.hypot(dx,dy);
  return {id:x.id,x:x.x,y:x.y,at:x.at,tier,power:lightTiers[tier],dx:dx/len,dy:dy/len,variant:x.variant,playerId:x.playerId,targetId:x.targetId??''};
}
export function fixtureReceipt(serial,tier='perfect-reflect',side='right') {
  const P=tier in lightTiers?tier:'perfect-reflect', target=side==='left'?[-158,32]:side==='above'?[125,-113]:[170,17];
  return {id:'magic_dot_parry_preview_'+serial,type:TYPE,x:0,y:0,targetX:target[0],targetY:target[1],variant:P+':physical',playerId:'fixture-defender',targetId:'fixture-attacker',radius:P==='guard'?155:P==='perfect-reflect'?180:205,at:Date.now()};
}
export function basis(ev,age=null,reduced=false) {
  const e=[ev.dx,ev.dy], n=[ev.dy,-ev.dx], floor=[ev.x/SOURCE_WORLD_UNITS_PER_M,ev.y/SOURCE_WORLD_UNITS_PER_M];
  const shoulder=[floor[0],floor[1]-1.14], p=[shoulder[0]+.64*e[0],shoulder[1]+.64*e[1]];
  const twist=age==null||reduced?0:-.19*smooth(0,18,age)+.48*smooth(18,67,age)-.29*smooth(74,157,age);
  const c=Math.cos(twist),s=Math.sin(twist);
  const map=(u,v)=>[p[0]+(c*u-s*v)*e[0]+(s*u+c*v)*n[0],p[1]+(c*u-s*v)*e[1]+(s*u+c*v)*n[1]];
  return {e,n,floor,p,shoulder,map,twist,outward: [c*e[0]+s*n[0],c*e[1]+s*n[1]]};
}
export class Mesh {
  constructor(){this.data=new Float32Array(2048);this.length=0}
  vertex(p,c,a=1,k=0){const i=this.length;if(i+8>this.data.length){const next=new Float32Array(this.data.length*2);next.set(this.data);this.data=next}this.data.set([p[0],p[1],c[0],c[1],c[2],cap(a),k,0],i);this.length=i+8}
  tri(a,b,c,ca,cb=ca,cc=ca,aa=1,ab=aa,ac=aa,ka=0,kb=ka,kc=ka){this.vertex(a,ca,aa,ka);this.vertex(b,cb,ab,kb);this.vertex(c,cc,ac,kc)}
  quad(a,b,c,d,ca,cb=ca,cc=ca,cd=cb,aa=1,ab=aa,ac=aa,ad=ab,ka=0,kb=ka,kc=ka,kd=kb){this.tri(a,b,c,ca,cb,cc,aa,ab,ac,ka,kb,kc);this.tri(a,c,d,ca,cc,cd,aa,ac,ad,ka,kc,kd)}
  polygon(points, shade, light, normal, albedo=1){const c=points.map(p=>lit(shade,p,light,normal,albedo));for(let i=1;i<points.length-1;i++)this.tri(points[0],points[i],points[i+1],c[0],c[i],c[i+1])}
}
const ivory=[7.9,4.65,2.56], orange=[2.55,.63,.127], bronze=[.65,.14,.025];
const white=[13,8.3,4.85], warm=[1,.45,.12];
const add=(p,d,s)=>[p[0]+d[0]*s,p[1]+d[1]*s];
const mul=(c,q)=>[c[0]*q,c[1]*q,c[2]*q];
const unit=(x,y)=>{const d=Math.hypot(x,y)||1;return [x/d,y/d]};
const move=(arr,p)=>arr.map(q=>[q[0]+p[0],q[1]+p[1]]);
function lit(color,pos,lights,normal,albedo){
  if(!lights?.length)return color;
  let r=0;for(const light of lights){
    const u=light.p[0]-pos[0], v=light.p[1]-pos[1], d=u*u+v*v, reach=1-smooth(.04,.62,d);
    r+=light.lum*reach*Math.max(.055,(u*normal[0]+v*normal[1]+.18)/(Math.sqrt(d+.09)))/(1+14*d);
  }
  return color.map((c,i)=>c+warm[i]*r*albedo*(.14+.62*Math.sqrt(c)));
}
function disc(g,p,rx,ry,color,alpha=1,k=0,edge=.0,n=18){
  for(let i=0;i<n;i++){let a=i/n*Math.PI*2,b=(i+1)/n*Math.PI*2;g.tri(p,[p[0]+rx*Math.cos(a),p[1]+ry*Math.sin(a)],[p[0]+rx*Math.cos(b),p[1]+ry*Math.sin(b)],color,color,color,alpha,alpha*edge,alpha*edge,k)}
}
function strip(g,a,b,w1,w2,col,light,base=.85) {
  const n=unit(a[1]-b[1],b[0]-a[0]);
  const l=add(a,n,w1),r=add(a,n,-w1),s=add(b,n,-w2),t=add(b,n,w2);
  g.polygon([l,r,s,t],col,light,n,base);
}
const edgeU=(v)=>-.070*v+.16*v*v;
function guardBlade(g,b,lights,glove){
  const u=(v)=>edgeU(v), a=-.154,z=.433;
  const edge=[a,-.081,0,.160,.272,.374,z];
  const w=(v)=>.112*(1-.90*smooth(.274,z,v));
  const metal=[.106,.143,.173], steel=[.23,.271,.291], base=[.072,.096,.128];
  for(let i=1;i<edge.length;i++){
    const v0=edge[i-1],v1=edge[i],p0=b.map(u(v0),v0),p1=b.map(u(v1),v1),m0=b.map(u(v0)-w(v0)*.34,v0),m1=b.map(u(v1)-w(v1)*.34,v1);
    const f0=b.map(u(v0)-w(v0),v0),f1=b.map(u(v1)-w(v1),v1);
    g.polygon([f0,f1,m1,m0],metal,lights,b.outward,.74);
    g.polygon([m0,m1,p1,p0],lerp(steel,base,.20*Math.abs(v1-.16)),lights,b.outward,1);
  }
  const h=b.map(u(a)-.077,a);
  strip(g,glove,h,.042,.043,[.172,.114,.063],lights,.58);
  strip(g,b.map(u(a)-.148,a),b.map(u(a)+.051,a),.026,.029,[.127,.158,.180],lights,.67);
}
export function drawFixture(g,b,lights){
  const p=b.floor;
  disc(g,[p[0]-.04,p[1]-.015],.52,.16,[.006,.008,.011],.53,0,0,28);
  const face=b.e[0]<0?-1:1;
  const part=(pts,col,no,al=.975)=>g.polygon(move(pts.map(([x,y])=>[face*x,y]),p),col,lights,[face*no[0],no[1]],al);
  part([[-.29,-.65],[-.02,-.66],[-.10,-.27],[-.20,-.05],[-.48,-.01],[-.43,-.12],[-.33,-.22]],[.04,.062,.086],[-.4,.6]);
  part([[-.025,-.64],[.18,-.68],[.257,-.37],[.36,-.095],[.28,-.015],[.10,-.04],[.085,-.19],[-.064,-.37]],[.052,.076,.108],[.48,.1]);
  part([[-.41,-.12],[-.29,-.1],[-.22,-.044],[-.25,0],[-.49,0],[-.51,-.044]],[.062,.088,.115],[.25,-.6]);
  part([[.14,-.133],[.27,-.13],[.38,-.062],[.44,-.044],[.45,0],[.13,0]],[.074,.102,.133],[.45,-.4]);
  part([[-.28,-1.17],[-.43,-1.08],[-.41,-.845],[-.21,-.72],[-.16,-.92],[-.22,-1.09]],[.041,.071,.099],[-.72,-.11]);
  part([[-.205,-1.24],[.052,-1.28],[.258,-1.15],[.215,-.91],[.128,-.68],[-.15,-.67],[-.25,-.87],[-.33,-1.08]],[.06,.087,.121],[.24,-.4]);
  part([[-.24,-1.15],[.054,-1.22],[.20,-1.155],[.145,-1.005],[-.079,-.96],[-.254,-1.01]],[.114,.153,.185],[.58,-.22]);
  part([[-.12,-.99],[.138,-1.012],[.121,-.782],[-.124,-.752],[-.22,-.829]],[.077,.111,.14],[.45,.21]);
  part([[-.201,-.762],[.172,-.782],[.181,-.682],[.08,-.63],[-.093,-.64],[-.21,-.689]],[.163,.101,.062],[.36,-.43],.46);
  part([[-.196,-1.40],[-.176,-1.58],[-.059,-1.70],[.128,-1.68],[.21,-1.56],[.217,-1.405],[.112,-1.307],[-.058,-1.32]],[.085,.112,.144],[.46,-.55]);
  part([[-.175,-1.577],[-.053,-1.70],[.118,-1.68],[.174,-1.583],[-.067,-1.532]],[.16,.192,.224],[.48,-.53]);
  part([[-.068,-1.532],[.182,-1.583],[.213,-1.506],[.169,-1.462],[-.063,-1.473]],[.022,.041,.06],[.45,.2]);
  part([[.08,-1.525],[.181,-1.544],[.187,-1.516],[.089,-1.491]],[.354,.264,.18],[.44,-.5]);
  // One proximal straight fixture, not a player animation: fork position follows receipt bearing.
  const elbow=[b.shoulder[0]+.17*b.e[0],b.shoulder[1]+.17*b.e[1]+.13], glove=b.map(-.246,-.151);
  strip(g,add(b.shoulder,b.e,.09),elbow,.122,.100,[.125,.154,.182],lights,.72);
  strip(g,elbow,glove,.091,.064,[.083,.12,.154],lights,.71);
  disc(g,glove,.080,.075,lit([.128,.157,.181],glove,lights,b.e,1),1,0,1,8);
  guardBlade(g,b,lights,glove);
}
// An existing guard edge clips this compressed shape, before any tangent light
// can be emitted. The far field is bounded to a single contact patch.
function compression(g,b,t,ev){
  if(t>=69)return 0;
  const bite=(.75+.25*smooth(0,10,t))*Math.pow(1-smooth(13,69,t),1.46)*ev.power;
  const reach=.390*(1-.72*smooth(0,55,t)),spread=1+.16*smooth(0,19,t)-.34*smooth(23,61,t);
  if(bite<.003)return 0;
  // A shallow, folded pressure plane contacts the guard at two ends.
  // Its midspan stays open so the steel edge is visible through the bite.
  const high=.095*spread, low=-.103*spread;
  const inset=.073+.026*smooth(3,34,t), heel=.79-.26*smooth(8,48,t);
  const at=(u,v)=>b.map(edgeU(v)+u,v);
  const h=at(.011,high), l=at(.012,low), m=at(inset,-.004);
  const farHigh=at(reach*.52,high*.84+.018), farLow=at(reach*.70,low*1.12);
  const nose=at(reach*.91,-.044), keel=at(reach*.58,-.064);
  const bevel=at(inset*.50,high*.83);
  const rim=mul([1.73,.61,.20],bite), cap=mul([1.28,.50,.20],bite);
  const front=mul([.76,.31,.18],bite), deep=mul([.35,.17,.13],bite);
  g.tri(h,farHigh,m,rim,front,deep,.83,.55,.40,.20,.09,.015);
  g.tri(m,farHigh,keel,deep,front,cap,.40,.55,.65,.015,.09,.21);
  g.tri(m,keel,farLow,deep,cap,front,.40,.65,.49,.015,.21,.05);
  g.tri(m,farLow,l,deep,front,rim,.40,.49,.69,.015,.05,.17);
  g.tri(farHigh,nose,keel,front,deep,cap,.55,.12,.65,.09,.02,.21);
  g.tri(keel,nose,farLow,cap,deep,front,.65,.12,.49,.21,.02,.05);
  const inner=at(.028,high*.94), along=at(inset*.74,high*.76);
  g.tri(h,inner,bevel,rim,rim,cap,.96,.91,heel,.41,.36,.16);
  g.tri(inner,along,bevel,rim,cap,cap,.91,.46,heel,.36,.06,.16);
  return bite;
}
function slipTrace(g,b,t,ev,reduced){
  if(t<14||t>=302)return null;
  const drive=smooth(14,88,t), finish=smooth(86,199,t), fastGate=smooth(14,39,t);
  const length=(reduced?.64:1)*(.058+.285*drive-.111*finish);
  const gain=ev.power*fastGate*(1-smooth(106,302,t)), width=.105*(.81+.19*drive)*(1-.68*finish);
  if(gain<.008)return null;
  const edgeTemp=[1.24,.71,.31], metalCool=[.29,.26,.213], copper=[2.47,.79,.188];
  const cursor=.23+.53*drive-.42*finish, sideWidth=reduced?.76:1;
  let last=null;
  for(let i=0;i<=13;i++){
    const f=i/13,v=mix(-.012,length,f),u=edgeU(v),lowerage=smooth(.01,.21,f), fall=1-smooth(.83,1,f);
    const w=width*sideWidth*(.43+.57*Math.sin(Math.PI*f)**.75);
    const localWarm=Math.exp(-Math.pow((f-cursor)/.30,2)), temp=gain*(.57+.43*localWarm);
    const a={p:b.map(u+.004,v),i:b.map(u-.045*(.61+.39*fall),v),o:b.map(u+w,v),s:b.map(u+.028*(.61+.39*fall),v), 
      coat:mul(lerp(edgeTemp,ivory,localWarm*.81),temp),
      heat:mul(lerp(copper,metalCool,smooth(.48,1,f)),temp),
      shade:mul(metalCool,temp),cov:gain*(.69+.31*lowerage)*(.40+.60*fall)};
    if(last){
      g.quad(last.i,a.i,a.p,last.p,last.heat,a.heat,a.coat,last.coat,last.cov*.57,a.cov*.57,a.cov,last.cov,.28,.28,.89,.89);
      g.quad(last.p,a.p,a.s,last.s,last.coat,a.coat,a.heat,last.heat,last.cov,a.cov,a.cov*.77,last.cov*.77,.89,.89,.28,.28);
      g.quad(last.s,a.s,a.o,last.o,last.heat,a.heat,a.shade,last.shade,last.cov*.77,a.cov*.77,a.cov*.16,last.cov*.16,.28,.28,.05,.05);
    }
    last=a;
  }
  const mid=mix(-.012,length,cursor);
  return {p:b.map(edgeU(mid),mid),lum:gain*.60,progress:mid};
}
export function buildParry(g,ev,t,{reduced=false}={}) {
  if(t<0||t>=LIFE)return {p:basis(ev).p,lum:0,stage:'expired',triangles:0};
  const b=basis(ev,t,reduced),from=g.length,load=compression(g,b,t,ev),slip=slipTrace(g,b,t,ev,reduced);
  const root=load*.42+.22*ev.power*(1-smooth(32,86,t));
  if(root>.004){
    const p=b.map(0,0);
    const a=b.map(-.040,-.038),c=b.map(.018,.071),d=b.map(.024,-.035),e=b.map(-.022,-.064);
    g.tri(a,e,p,mul(bronze,root),mul(orange,root),mul(white,root),.09,.31,1,0,.39,1);
    g.tri(e,d,p,mul(orange,root),mul(orange,root),mul(white,root),.22,.14,1,.34,.32,1);
    g.tri(d,c,p,mul(orange,root),mul(ivory,root),mul(white,root),.18,.55,1,.34,.52,1);
    g.tri(c,a,p,mul(ivory,root),mul(bronze,root),mul(white,root),.48,.13,1,.51,.17,1);
  }
  const along=slip?.lum??0, weight=along/(root*1.4+along+.0001), p=slip?lerp(b.p,slip.p,weight):b.p;
  return {p,contact:b.p,progress:slip?.progress??0,lum:root*1.40+along,stage:t<20?'bite':t<140?'redirect':'quench',triangles:(g.length-from)/24};
}
export function fillSfx(rate,tier='guard',seed=1) {
  const len=Math.round(.31*rate), data=new Float32Array(len), mult=lightTiers[tier]??.84;
  let pr=seed>>>0||1, low=0, middle=0, max=0;
  for(let i=0;i<len;i++){
    const t=i/rate;pr^=pr<<13;pr^=pr>>>17;pr^=pr<<5;const raw=(pr>>>0)/2147483648-1;
    low+=.074*(raw-low);middle+=.39*(raw-middle);
    const strike=(raw-low)*Math.exp(-t*420)*.31*Math.min(1,t/.0008);
    const knock=Math.sin(2*Math.PI*(298*t-66*t*t))*Math.exp(-t*121)*.26;
    const modes=[ [1531,.154,42],[2329,.115,48],[3407,.079,63],[5271,.034,82],[6731,.019,124] ];
    const ring=modes.reduce((a,[f,m,d],j)=>a+Math.sin(6.283185*f*t+j*.71)*m*Math.exp(-t*d),0)*Math.min(1,t/.002);
    const slide=cap((t-.008)/.012)*(1-smooth(.058,.153,t));
    const pressure=1+.36*Math.sin(t*419)+.21*Math.sin(t*787);
    const grit=(middle-low)*slide*pressure*.21 + (raw-middle)*slide*.042;
    data[i]=(strike+knock+ring+grit)*Math.min(1,t/.001)*(1-smooth(.242,.306,t))*.83*mult;
    max=Math.max(max,Math.abs(data[i]));
  }
  return {data,max};
}

