/** Analytic material ribbons tessellated into triangles. No image/texture sampling. */
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
const mix=(a,b,t)=>a+(b-a)*t;
function curve(points,t){
  const n=points.length-1, u=t*n, k=Math.min(n-1,Math.floor(u)), f=u-k;
  const b=points[k],c=points[k+1];
  // Straight facets, explicit fold vertices; no sinusoidal cable/particle topology.
  return [mix(b[0],c[0],f),mix(b[1],c[1],f)];
}
function ribbon(out,points,width,env,palette,mode,project,{from=0,to=1,steps=30,luma=1}={}){
  if(env<=.001||to<=from)return;
  const at=(t,v)=>{
    const p=curve(points,t),p0=curve(points,Math.max(0,t-.003)),p1=curve(points,Math.min(1,t+.003));
    const dx=p1[0]-p0[0],dy=p1[1]-p0[1],len=Math.max(.001,Math.hypot(dx,dy));
    const w=width*(.22+.78*Math.pow(Math.max(0,Math.sin(Math.PI*t)),.64));
    const q=project(p[0]-dy/len*w*v,p[1]+dx/len*w*v);
    return [q[0],q[1],t,v,mode,palette,env,luma];
  };
  for(let i=0;i<steps;i++){
    const a=mix(from,to,i/steps),b=mix(from,to,(i+1)/steps);
    const p=at(a,-1.4),q=at(a,1.4),r=at(b,-1.4),s=at(b,1.4);
    out.push(...p,...q,...r,...r,...q,...s);
  }
}
/** view = CSS-pixel dimensions, origin = target feet, scale = CSS px per game px. */
export function buildManaGeometry(effects,{width,height,scale=1,originX=width/2,originY=height*.65,cameraX=0,cameraY=0}){
  const back=[],front=[];
  const groups=new Map();for(const e of effects)groups.set(e.beneficiaryPlayerId,(groups.get(e.beneficiaryPlayerId)||0)+1);
  for(const e of effects){
    const p=clamp(e.ageMs/e.durationMs);if(p<=0||p>=1)continue;
    const b=e.beneficiary, h=b.heightPx, unit=e.radiusPx/82;
    // Radius is game-space, not scaled implicitly with the actor. Anchors follow height independently.
    const cx=originX+(b.x-cameraX+(b.manaAnchor?.x??0))*scale, cy=originY+(b.y-cameraY+(b.manaAnchor?.y??-h*.49))*scale;
    const project=(x,y)=>[(cx+x*unit*scale)/width*2-1,1-(cy+y*unit*scale)/height*2];
    const born=smooth(0,.035,p),tail=1-smooth(.86,1,p),fold=smooth(.11,.47,p),absorb=smooth(.43,.81,p);
    const envelope=born*tail;
    const multi=1/Math.pow(groups.get(e.beneficiaryPlayerId),.22);
    // Three staggered folds per side. Same topology in every background and for every acquisition route.
    for(let lane=0;lane<3;lane++)for(const side of [-1,1]){
      const lag=lane*.022+(side>0?.014:0);
      const consume=smooth(.40+lag,.82+lag,p);
      const extent=mix(mix(68,58,fold),17,consume);
      const outerY=-24+lane*22;
      const innerY=-13+lane*12;
      const asym=((e.seed%5)-2)*.4;
      const points=[
        [side*extent, mix(outerY,innerY-4,consume)+asym],
        [side*mix(52,15,consume),mix(outerY-9,innerY-6,consume)],
        [side*mix(42,12,consume),mix(outerY+9,innerY+4,consume)],
        [side*mix(23,8,consume),mix(innerY+1,innerY+1,consume)],
        [side*mix(7.0,3.0,consume),innerY]
      ];
      const width=(4.8-lane*.36)*(.62+.38*smooth(0,.14,p))*(1-.44*consume);
      const visibility=envelope*(1-smooth(.70+lag,.92+lag,p))*multi;
      ribbon(back,points,width,visibility,.14+lane*.32,0,project,{from:0,to:.76,steps:32,luma:smooth(.04+lag,.70+lag,p)});
      ribbon(front,points,width,visibility*.91,.14+lane*.32,0,project,{from:.76,to:1,steps:14,luma:smooth(.04+lag,.70+lag,p)});
    }
    // The recipient's paired rib contact channels become the dominant read during absorption.
    const contact=smooth(.04,.32,p)*(1-smooth(.84,1,p))*born;
    const anchoredProject=(x,y)=>[(cx+x*(h/64)*(b.contactScale?.x??1)*scale)/width*2-1,1-(cy+y*(h/64)*(b.contactScale?.y??1)*scale)/height*2];
    for(let row=0;row<3;row++)for(const side of [-1,1]){
      const y=-13+row*11;
      const points=[[side*11.5,y-3.0],[side*8,y-4.6],[side*5,y+.8],[side*1.7,y+2.2]];
      ribbon(front,points,1.50+absorb*.72,contact*(.67+.33*smooth(.40+row*.07,.52+row*.07,p))*multi,row*.23,1,anchoredProject,{steps:18,luma:smooth(.35,.85,p)});
    }
    // Boundary memory remains shoulder/waist-attached, not an expanding ring or an upward particle spray.
    const memory=smooth(.50,.72,p)*tail*born*multi;
    for(const side of [-1,1]){
      const pts=[[side*14,-18],[side*18,-8],[side*17,4],[side*13,17]];
      ribbon(back,pts,1.2,memory*.86,.7,1,anchoredProject,{steps:26});
    }
  }
  return {back:new Float32Array(back),front:new Float32Array(front)};
}
