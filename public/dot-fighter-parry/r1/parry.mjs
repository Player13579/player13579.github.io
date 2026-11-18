export const VERSION='dot-fighter-parry-r1', TYPE='fighter-slash-parry', LIFE=420, HEIGHT=1.70, CSS_PX_PER_M=64/HEIGHT;
export const SOURCE_WORLD_UNITS_PER_M=100;
const cap=(x)=>Math.max(0,Math.min(1,x)), mix=(a,b,t)=>a+(b-a)*t;
const smooth=(a,b,t)=>{const s=cap((t-a)/(b-a));return s*s*(3-2*s)};
const lerp=(a,b,t)=>a.map((x,i)=>mix(x,b[i],t));
const strictNumber=(x)=>typeof x==='number'&&Number.isFinite(x);
const lightTiers={guard:0.84,'perfect-reflect':1.12,'perfect-all-reflect':1.27};
export function receipt(x, now=Date.now()) {
  if(!x||x.type!==TYPE||typeof x.id!=='string'||!x.id.startsWith('magic_')||x.id.length<7||x.id.length>180)return null;
  if(![x.x,x.y,x.targetX,x.targetY,x.at].every(strictNumber)||x.at<now-LIFE||x.at>now+3000)return null;
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
  const part=(pts,col,no,al=.975)=>g.polygon(move(pts,p),col,lights,no,al);
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
function cubic(p0,p1,p2,p3,x){
  const t=1-x,a=t*t*t,b=3*t*t*x,c=3*t*x*x,d=x*x*x;
  return [a*p0[0]+b*p1[0]+c*p2[0]+d*p3[0],a*p0[1]+b*p1[1]+c*p2[1]+d*p3[1]];
}
function fold(g,b,path,start,end,wFn,tint,power,alpha,reverse=false){
  if(end-start<.012||alpha<.004)return;
  const points=Array.from({length:23},(_,i)=>{
    const u=mix(start,end,i/22), p=path(u), h=path(u+.001), n=unit(h[1]-p[1],p[0]-h[0]);
    const w=wFn(u)*Math.sin(Math.PI*cap((u-start)/(end-start)))**.52;
    const side=reverse?-1:1, q=.71+.29*Math.cos(u*2.4);
    const lo=add(p,n,-w*side),hi=add(p,n,w*.44*side), ridge=add(p,n,w*.13*side), seam=add(p,n,(.25*w+.012)*side);
    const s=cap(u*1.48), peak=power*q*(1-.33*s);
    const sh=lerp(tint.low,tint.end,s), face=lerp(tint.face,tint.end,s);
    return {lo:b.map(...lo),hi:b.map(...hi),ridge:b.map(...ridge),seam:b.map(...seam),ph:mul(tint.peak,peak),pf:mul(face,power*q),pl:mul(sh,power),env:alpha};
  });
  for(let i=1;i<points.length;i++){
    const a=points[i-1],z=points[i], A=a.env,B=z.env;
    g.quad(a.lo,z.lo,z.ridge,a.ridge,a.pl,z.pl,z.pf,a.pf,A,B,B,A,.12,.12,.48,.48);
    g.quad(a.ridge,z.ridge,z.hi,a.hi,a.pf,z.pf,z.pl,a.pl,A,B,B,A,.48,.48,.26,.26);
    // A physical bright lip with one tapered side, not the observer blur.
    g.quad(a.ridge,z.ridge,z.seam,a.seam,a.ph,z.ph,z.pf,a.pf,A,B,B*.37,A*.37,1,1,.22,.22);
  }
}
const chips=[[.14,.79,2.26,.110,.234],[.23,.62,1.83,.068,.183],[.56,.39,1.59,.059,.161],[.73,.19,1.28,.047,.210]];
export function buildParry(g,ev,t,{reduced=false}={}) {
  if(t<0||t>=LIFE)return {p:basis(ev).p,lum:0,stage:'expired',triangles:0};
  const b=basis(ev);const from=g.length;
  const bite=(.56+.44*smooth(0,12,t))*Math.exp(-Math.pow((t-11)/39,2));
  const grow=smooth(0,56,t),travel=smooth(19,157,t), peel=smooth(85,256,t);
  const main=(.62+.38*grow)*(1-smooth(96,295,t))*ev.power;
  const tail=Math.pow(1-smooth(143,364,t),1.55);
  const foldA=[0,.001], foldB=[.048,.26+travel*.082], foldC=[.24+travel*.09,.41+travel*.14], foldD=[.69+travel*.32,.57+travel*.30];
  if(reduced){foldB[1]=.29;foldC[1]=.49;foldD[0]=.78;foldD[1]=.62}
  if(t<202){
    const w=.11*(1-.28*travel);
    const short=(u)=>cubic([0,0],[.17,-.035],[.34,-.074],[.68+grow*.16,-.18],u);
    fold(g,b,short,0,.83-.25*travel,(u)=>w*(.58+.34*(1-u)),{low:gun,face:[.82,.31,.115],end:[.16,.12,.098],peak:[2.22,.86,.31]},main*.57,1-smooth(28,170,t),true);
  }
  if(t<372){
    const start=reduced?0:peel*.35,end=reduced?.84:.38+.62*grow;
    const path=(u)=>cubic(foldA,foldB,foldC,foldD,u);
    fold(g,b,path,start,end,(u)=>(.14+.10*grow)*(.68+.5*u)*(1-.44*peel),{low:[.20,.068,.033],face:[2.45,.53,.093],end:[.73,.16,.044],peak:ivory},.89*main+.29*tail,.95*tail+.05*main);
  }
  if(bite>.007){
    const p=b.map(0,0), h=(.166+.051*grow)*(reduced?.83:1), w=.075+.018*grow;
    const pts=[b.map(-w,-h*.56),b.map(w*.78,-.037),b.map(w*1.24,h*.36),b.map(-.012,h),b.map(-w*.75,h*.54),b.map(-w*.91,.026)];
    for(let i=0;i<pts.length;i++)g.tri(p,pts[i],pts[(i+1)%pts.length],mul(white,bite*ev.power),mul(orange,bite*ev.power),mul(bronze,bite*ev.power),1,.27,.13,1,.38,.27);
    g.quad(b.map(-.028,-.065),b.map(.044,-.015),b.map(.017,.117),b.map(-.042,.051),mul(white,bite),mul(white,bite),mul(ivory,bite),mul(ivory,bite),bite,bite,bite,bite,1,1,1,1);
  }
  if(!reduced) for(let i=0;i<chips.length;i++){
    const [u,v,s,w,span]=chips[i];const elapsed=t*.001-(.021+i*.012);if(elapsed<0||elapsed>=span)continue;
    const d=elapsed*s*(1-.51*elapsed), nx=u*.13+d*u, ny=.09+v*.11+d*v-(4.905*elapsed*elapsed);
    const length=(.065+w)*Math.pow(1-elapsed/span,.78), fade=(1-smooth(.04,span,elapsed))*ev.power;
    const dir=unit(u,v-.5*elapsed), tip=b.map(nx+dir[0]*length,ny+dir[1]*length),base=b.map(nx,ny), flank=b.map(nx+dir[1]*w*.44,ny-dir[0]*w*.44),heel=b.map(nx-dir[1]*w*.34,ny+dir[0]*w*.34);
    g.quad(base,flank,tip,heel,mul(orange,fade),mul(bronze,fade),mul(ember,fade),mul(orange,fade),.5,.62,.84,.64,.4,.24,.9,.5);
  }
  return {p:b.p,lum:(bite*1.48+main*.30)*ev.power,stage:t<20?'bite':t<140?'redirect':'quench',triangles:(g.length-from)/24};
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

