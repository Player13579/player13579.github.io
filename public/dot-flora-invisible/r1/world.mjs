// Independent attempt 1: projected finite emissive field, never body material.
// q is world-local normalized position; t is normalized cue lifetime.
export const worldWGSL = /* wgsl */ `
fn worldRadiance(q:vec2f,t:f32,reduced:bool)->vec4f {
  if(t <= 0.0 || t >= 1.0 || abs(q.x)>1.05 || abs(q.y)>1.3){return vec4f(0.0);}
  let p=clamp(t,0.0,1.0);
  let g=select(p,0.52,reduced);
  let onset=smoothstep(0.0,0.12,p);
  let fade=1.0-smoothstep(0.64,1.0,p);
  let fold=smoothstep(0.14,0.86,g);
  let rx=mix(0.78,0.075,fold);
  let ry=mix(1.12,0.93,fold);
  let rz=mix(0.27,0.12,fold);
  var emission=vec3f(0.0); var coverage=0.0;
  for(var i=0;i<16;i=i+1){
    let z=(-0.5+(f32(i)+0.5)/16.0)*0.8;
    let bend=0.10*fold*(1.0-pow(q.y/1.2,2.0));
    let x=q.x-bend*z/rz;
    let r=length(vec3f(x/rx,q.y/ry,z/rz));
    let k=max(0.0,1.0-abs(r-1.0)/0.12);
    let density=k*k*(3.0-2.0*k);
    // Front/back transport differs with depth; no painted body reflection.
    let depth=0.70+0.30*(z/0.4+1.0)*0.5;
    let approach=smoothstep(0.48,0.93,g);
    let phase=3.14159265*approach;
    let cancellation=pow(cos(0.5*phase),2.0);
    let side=abs(x)/max(rx,0.001);
    let seam=0.75+0.25*side;
    let c=density*depth*seam*cancellation*0.17;
    let a=1.0-exp(-c);
    let color=mix(vec3f(0.20,0.68,0.82),vec3f(0.86,1.16,1.20),clamp(side,0.0,1.0));
    emission=emission+(1.0-coverage)*a*color*3.2;
    coverage=coverage+(1.0-coverage)*a;
  }
  return vec4f(emission*onset*fade,coverage*onset*fade);
}`;

const smooth=(a,b,x)=>{const k=Math.max(0,Math.min(1,(x-a)/(b-a)));return k*k*(3-2*k);};
const mix=(a,b,t)=>a+(b-a)*t;
export function evaluateWorld(qx,qy,progress,reducedMotion=false){
  if(!Number.isFinite(qx)||!Number.isFinite(qy)||!Number.isFinite(progress)||progress<=0||progress>=1||Math.abs(qx)>1.05||Math.abs(qy)>1.3)return [0,0,0,0];
  const p=progress,g=reducedMotion?0.52:p;
  const onset=smooth(0,0.12,p),fade=1-smooth(0.64,1,p),fold=smooth(0.14,0.86,g);
  const rx=mix(0.78,0.075,fold),ry=mix(1.12,0.93,fold),rz=mix(0.27,0.12,fold);
  let emission=[0,0,0],coverage=0;
  for(let i=0;i<16;i++){
    const z=(-0.5+(i+0.5)/16)*0.8,bend=0.10*fold*(1-(qy/1.2)**2),x=qx-bend*z/rz;
    const r=Math.hypot(x/rx,qy/ry,z/rz),k=Math.max(0,1-Math.abs(r-1)/0.12),density=k*k*(3-2*k);
    const depth=0.70+0.30*(z/0.4+1)*0.5,approach=smooth(0.48,0.93,g),cancellation=Math.cos(0.5*Math.PI*approach)**2;
    const side=Math.abs(x)/Math.max(rx,0.001),seam=0.75+0.25*side,c=density*depth*seam*cancellation*0.17,a=1-Math.exp(-c);
    const color=[mix(0.20,0.86,Math.min(1,side)),mix(0.68,1.16,Math.min(1,side)),mix(0.82,1.20,Math.min(1,side))];
    emission=emission.map((v,j)=>v+(1-coverage)*a*color[j]*3.2);coverage+=(1-coverage)*a;
  }
  return [...emission.map(v=>v*onset*fade),coverage*onset*fade];
}
