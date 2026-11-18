export const VERSION='dot-fighter-parry-r2', TYPE='fighter-slash-parry', LIFE=420, HEIGHT=1.70, CSS_PX_PER_M=64/HEIGHT;
export const SOURCE_WORLD_UNITS_PER_M=100;
const cap=(x)=>Math.max(0,Math.min(1,x)), mix=(a,b,t)=>a+(b-a)*t;
const smooth=(a,b,t)=>{const s=cap((t-a)/(b-a));return s*s*(3-2*s)};
const lerp=(a,b,t)=>a.map((x,i)=>mix(x,b[i],t));
const strictNumber=(x)=>typeof x==='number'&&Number.isFinite(x);
const lightTiers={guard:0.84,'perfect-reflect':1.12,'perfect-all-reflect':1.27};
export function receipt(x, now=Date.now()) {
  if(!x||x.type!==TYPE||typeof x.id!=='string'||!x.id.startsWith('magic_')||x.id.length<7||x.id.length>180)return null;
  if(![x.x,x.y,x.targetX,x.targetY,x.at].every(strictNumber)||x.at<now-LIFE||x.at>now+125)return null;
  if(typeof x.variant!=='string'||typeof x.playerId!=='string'||!x.playerId||Math.hypot(x.targetX-x.x,x.targetY-x.y)<.25)return null;
  const tier=x.variant.slice(0,x.variant.indexOf(':')); if(!Object.hasOwn(lightTiers,tier)||x.variant.length<=tier.length+1||x.variant.length>120)return null;
  const [dx,dy]=[x.targetX-x.x,x.targetY-x.y];const len=Math.hypot(dx,dy);
  return {id:x.id,x:x.x,y:x.y,at:x.at,tier,power:lightTiers[tier],dx:dx/len,dy:dy/len,variant:x.variant,playerId:x.playerId,targetId:x.targetId??''};
}
export function fixtureReceipt(serial,tier='perfect-reflect',side='right') {
  const P=tier in lightTiers?tier:'perfect-reflect', target=side==='left'?[-158,32]:side==='above'?[125,-113]:[170,17];
  return {id:'magic_dot_parry_preview_'+serial,type:TYPE,x:0,y:0,targetX:target[0],targetY:target[1],variant:P+':physical',playerId:'fixture-defender',targetId:'fixture-attacker',radius:P==='guard'?155:P==='perfect-reflect'?180:205,at:Date.now()};
}
export function basis(ev) {
  const e=[ev.dx,ev.dy], n=[ev.dy,-ev.dx], floor=[ev.x/SOURCE_WORLD_UNITS_PER_M,ev.y/SOURCE_WORLD_UNITS_PER_M];
  const shoulder=[floor[0],floor[1]-1.14], p=[shoulder[0]+.64*e[0],shoulder[1]+.64*e[1]];
  return {e,n,floor,p,shoulder, map:(u,v)=>[p[0]+u*e[0]+v*n[0],p[1]+u*e[1]+v*n[1]], outward: e};
}
export class Mesh {
  constructor(){this.data=new Float32Array(2048);this.length=0}
  vertex(p,c,a=1,k=0){const i=this.length;if(i+8>this.data.length){const next=new Float32Array(this.data.length*2);next.set(this.data);this.data=next}this.data.set([p[0],p[1],c[0],c[1],c[2],a,k,0],i);this.length=i+8}
  tri(a,b,c,ca,cb=ca,cc=ca,aa=1,ab=aa,ac=aa,ka=0,kb=ka,kc=ka){this.vertex(a,ca,aa,ka);this.vertex(b,cb,ab,kb);this.vertex(c,cc,ac,kc)}
  quad(a,b,c,d,ca,cb=ca,cc=ca,cd=cb,aa=1,ab=aa,ac=aa,ad=ab,ka=0,kb=ka,kc=ka,kd=kb){this.tri(a,b,c,ca,cb,cc,aa,ab,ac,ka,kb,kc);this.tri(a,c,d,ca,cc,cd,aa,ac,ad,ka,kc,kd)}
  polygon(points, shade, light, normal, albedo=1){const c=points.map(p=>lit(shade,p,light,normal,albedo));for(let i=1;i<points.length-1;i++)this.tri(points[0],points[i],points[i+1],c[0],c[i],c[i+1])}
}
const ivory=[7.9,4.65,2.56], orange=[2.55,.63,.127], bronze=[.65,.14,.025], gun=[.075,.12,.16];
const ember=[3.85,1.05,.16], white=[13,8.3,4.85], warm=[1,.45,.12];
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
  const elbow=[b.shoulder[0]+.18*b.e[0],b.shoulder[1]+.18*b.e[1]+.13], glove=add(b.p,b.e,-.26);
  strip(g,add(b.shoulder,b.e,.09),elbow,.122,.100,[.125,.154,.182],lights,.72);
  strip(g,elbow,glove,.091,.064,[.083,.12,.154],lights,.71);
  disc(g,glove,.080,.075,lit([.128,.157,.181],glove,lights,b.e,1),1,0,1,8);
  const tip=b.map(-.013,.236), heel=b.map(-.142,-.058);const cut=b.map(.073,-.015), spine=b.map(-.095,.044);
  const machete=[heel,spine,tip,b.map(.043,.188),cut];
  g.polygon(machete,[.102,.139,.174],lights,b.e,.88);
  g.tri(tip,b.map(.049,.178),cut,lit([.234,.292,.319],tip,lights,b.e,.8),lit([.139,.172,.202],cut,lights,b.e,.8));
  strip(g,b.map(-.24,-.063),b.map(-.105,.013),.038,.034,[.10,.077,.053],lights,.65);
}
// Each station is [u,v,rightHalfWidth,leftHalfWidth]. Turning segments are faceted,
// not a soft spline feather; opposite material planes terminate at the shared crease.
function facets(g,b,stations,skin,intensity,alpha,rolling,reverse){
  if(intensity<.01||alpha<.006)return;
  const points=stations.map(([u,v,w0,w1],i)=>{
    const p=[u,v],lo=stations[Math.max(0,i-1)],hi=stations[Math.min(stations.length-1,i+1)];
    const n=unit(hi[1]-lo[1],lo[0]-hi[0]).map(z=>z*(reverse?-1:1));
    const pos=i/(stations.length-1), refl=Math.exp(-Math.pow((pos-rolling)/.29,2));
    const left=add(p,n,-w0),right=add(p,n,w1), lip=add(p,n,Math.min(w1*.47,.028)*(1-.34*pos));
    const env=alpha*(1-.63*smooth(.71,1,pos));
    const core=mul(lerp(skin.crease,skin.end,smooth(.13,.96,pos)),intensity*(.63+.37*refl));
    const flank=mul(lerp(skin.face,skin.end,pos*.56),intensity*(.76+.24*refl));
    const umbra=mul(lerp(skin.back,skin.end,pos*.24),.85*intensity);
    return {p:b.map(...p),left:b.map(...left),right:b.map(...right),lip:b.map(...lip),env,core,flank,umbra};
  });
  for(let i=1;i<points.length;i++){
    const a=points[i-1],z=points[i],A=a.env,B=z.env;
    g.quad(a.left,z.left,z.p,a.p,a.umbra,z.umbra,z.flank,a.flank,A,B,B,A,.06,.06,.25,.25);
    g.quad(a.lip,z.lip,z.right,a.right,a.flank,z.flank,z.umbra,a.umbra,A,B,B,A,.25,.25,.08,.08);
    g.quad(a.p,z.p,z.lip,a.lip,a.core,z.core,z.flank,a.flank,A,B,B,A,.93,.93,.25,.25);
  }
}
const compressed={back:[.19,.123,.086],face:[.58,.432,.315],crease:[2.52,1.20,.48],end:[.26,.187,.147]};
const peeled={back:[.194,.14,.098],face:[1.42,.89,.439],crease:[7.80,4.81,2.06],end:[.38,.286,.19]};
export function buildParry(g,ev,t,{reduced=false}={}) {
  if(t<0||t>=LIFE)return {p:basis(ev).p,lum:0,stage:'expired',triangles:0};
  const b=basis(ev);const from=g.length;
  const impulse=(.78+.22*smooth(0,11,t))*Math.exp(-Math.pow((t-7)/38,2));
  const deflect=reduced?.62:smooth(2,68,t), relax=smooth(112,302,t);
  const extent=(reduced?.85:.64+.36*deflect)*(1-.47*relax);
  const lowerEnergy=(.91-.20*deflect)*(1-smooth(96,249,t))*ev.power;
  const upperEnergy=(.49+.51*deflect)*(1-smooth(111,320,t))*ev.power;
  const inLength=(.87+.13*smooth(0,23,t))*(1-.44*smooth(67,244,t));
  const toward=[
    [0,0,.009,.034],
    [.171*inLength,-.055*inLength,.058,.057],
    [.348*inLength,-.139*inLength,.074,.061],
    [.544*inLength,-.197*inLength,.091,.034],
    [.611*inLength,-.254*inLength,.023,.010],
  ];
  const away=[
    [0,0,.017,.025],
    [.060*extent,.184*extent,.082,.075],
    [.156*extent,.335*extent,.119,.063],
    [.359*extent,.526*extent,.110,.084],
    [.488*extent,.608*extent,.034,.042],
    [.565*extent,.618*extent,.0,.008],
  ];
  facets(g,b,toward,compressed,lowerEnergy,.93*(1-smooth(134,281,t)),.30*(1-deflect),false);
  facets(g,b,away,peeled,upperEnergy,.97*(1-smooth(194,353,t)),.08+.57*deflect,false);
  // A non-crossed point of heat trapped by the contacting surfaces, with a slower root seam.
  const root=impulse*.87+.26*(1-smooth(37,187,t));
  if(root>.005){
    const p=b.map(0,0), a=b.map(-.074,-.025), c=b.map(.043,.101), d=b.map(.074,-.025), e=b.map(-.009,-.102);
    g.tri(a,e,p,mul(bronze,root),mul(orange,root),mul(white,root),.06,.22,1,0,.41,1);
    g.tri(e,d,p,mul(orange,root),mul(orange,root),mul(white,root),.18,.14,1,.34,.32,1);
    g.tri(d,c,p,mul(orange,root),mul(ivory,root),mul(white,root),.18,.48,1,.34,.52,1);
    g.tri(c,a,p,mul(ivory,root),mul(bronze,root),mul(white,root),.42,.16,1,.51,.17,1);
  }
  return {p:b.p,lum:(root*1.26+upperEnergy*.22)*ev.power,stage:t<20?'bite':t<140?'redirect':'quench',triangles:(g.length-from)/24};
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

