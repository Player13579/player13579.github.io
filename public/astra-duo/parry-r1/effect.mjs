export const title = "闘士の受け流し";
export const duration = 1.0;
export const shader = `
fn parrySeg(p:vec2f,a:vec2f,b:vec2f)->f32 {
  let ab=b-a;
  return length(p-a-ab*clamp(dot(p-a,ab)/max(dot(ab,ab),0.000001),0.,1.));
}
fn parryMask(d:f32)->f32 { return 1.-smoothstep(-0.009,0.009,d); }
fn parryPaint(base:vec4f,color:vec3f,alpha:f32)->vec4f {
  return vec4f(color*alpha,alpha)+base*(1.-alpha);
}
fn effect(uv:vec2f,t:f32,size:vec2f)->vec4f {
  // Front is screen right. The blade takes a glancing load, flexes, and settles.
  let impact=0.19;
  let age=max(0.,t-impact);
  let recoil=sin(age*38.)*exp(-age*12.)*0.047;
  let p=uv;
  var out=vec4f(0.);
  let outline=vec3f(0.09,0.13,0.17);
  let cloth=vec3f(0.32,0.41,0.48);
  let skin=vec3f(0.72,0.65,0.53);
  let footA=parrySeg(p,vec2f(-0.06,0.13),vec2f(-0.23,0.45));
  let footB=parrySeg(p,vec2f(-0.04,0.14),vec2f(0.13,0.45));
  let legs=min(footA,footB);
  out=parryPaint(out,outline,parryMask(legs-0.066));
  out=parryPaint(out,cloth*0.7,parryMask(legs-0.044));
  let shoulder=vec2f(-0.08-recoil,-0.16);
  let torso=parrySeg(p,shoulder,vec2f(-0.06,0.13));
  out=parryPaint(out,outline,parryMask(torso-0.134));
  out=parryPaint(out,cloth,parryMask(torso-0.111));
  let head=length((p-vec2f(shoulder.x,-0.372))*vec2f(1.12,1.));
  out=parryPaint(out,outline,parryMask(head-0.123));
  out=parryPaint(out,skin,parryMask(head-0.102));
  let hand=vec2f(0.18-recoil,0.05);
  let dir=normalize(vec2f(0.53-recoil,-0.68));
  let side=vec2f(-dir.y,dir.x);
  let arm=parrySeg(p,shoulder+vec2f(0.025,0.05),hand);
  out=parryPaint(out,outline,parryMask(arm-0.069));
  out=parryPaint(out,cloth*1.19,parryMask(arm-0.05));
  let hilt=hand+dir*0.075;
  let blade=p-hilt;
  let axial=dot(blade,dir);
  let across=dot(blade,side);
  let width=0.048*(1.-smoothstep(0.43,0.60,axial));
  let bladeD=max(max(-axial,axial-0.60),abs(across)-width);
  out=parryPaint(out,outline,parryMask(bladeD-0.014));
  out=parryPaint(out,mix(vec3f(0.48,0.29,0.22),vec3f(0.92,0.71,0.46),smoothstep(-0.008,0.008,across)),parryMask(bladeD));
  out=parryPaint(out,vec3f(0.63,0.45,0.27),parryMask(parrySeg(p,hilt-side*0.095,hilt+side*0.095)-0.022));
  out=parryPaint(out,skin,parryMask(length(p-hand)-0.047));
  let slide=clamp(age/0.23,0.,1.);
  let contact=hilt+dir*(0.19+0.37*slide)+side*0.041;
  let approach=clamp(t/impact,0.,1.);
  let incoming=contact+vec2f(0.85,0.12)*(1.-approach);
  let fade=1.-smoothstep(0.14,0.22,age);
  // A short incident streak collapses into the cutting edge. Nothing travels back.
  let incident=parrySeg(p,incoming,incoming+vec2f(0.31,0.044)*(1.-smoothstep(0.,0.085,age)));
  out=parryPaint(out,vec3f(0.89,0.66,0.49),parryMask(incident-0.025)*fade*smoothstep(0.,0.058,t));
  let sweep=parrySeg(p,contact-dir*min(0.17,slide*0.31),contact);
  let hot=step(impact,t)*(1.-smoothstep(0.12,0.26,age));
  out=parryPaint(out,vec3f(1.,0.57,0.21),parryMask(sweep-0.049)*hot);
  out=parryPaint(out,vec3f(1.,0.94,0.75),parryMask(sweep-0.025)*hot);
  // Two chips peel tangentially away, then drop as the compressed metal cools.
  for(var i=0;i<2;i++) {
    let k=f32(i);
    let delta=age-0.052*k;
    let release=hilt+dir*(0.19+0.084*k)+side*0.042;
    let vel=dir*(1.36-0.27*k)+side*(0.39+0.40*k);
    let chip=release+vel*delta+vec2f(0.,2.0)*delta*delta;
    let tangent=normalize(vel+vec2f(0.,4.)*delta);
    let life=step(0.,delta)*(1.-smoothstep(0.10,0.36,delta));
    out=parryPaint(out,vec3f(1.,0.73,0.39),parryMask(parrySeg(p,chip,chip-tangent*0.081)-0.016)*life);
  }
  return out*(1.-smoothstep(0.81,0.995,t));
}
`;

export function playSound(ctx,dest) {
  const hit=ctx.currentTime+0.19;
  // A low struck blade, two inharmonic overtones, and a brief sliding burr.
  for (const [freq,level,decay] of [[301,0.105,0.14],[803,0.085,0.20],[1821,0.048,0.115]]) {
    const osc=ctx.createOscillator();
    const amp=ctx.createGain();
    osc.frequency.setValueAtTime(freq*1.035,hit);
    osc.frequency.exponentialRampToValueAtTime(freq,hit+0.044);
    amp.gain.setValueAtTime(0.0001,hit);
    amp.gain.exponentialRampToValueAtTime(level,hit+0.003);
    amp.gain.exponentialRampToValueAtTime(0.0001,hit+decay);
    osc.connect(amp).connect(dest);
    osc.start(hit); osc.stop(hit+decay+0.01);
    osc.onended=()=>{osc.disconnect();amp.disconnect();};
  }
  const len=Math.ceil(ctx.sampleRate*0.235);
  const grain=ctx.createBuffer(1,len,ctx.sampleRate);
  const samples=grain.getChannelData(0);
  let seed=137;
  for(let i=0;i<len;i++){
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    samples[i]=seed/2147483648-1;
  }
  const src=ctx.createBufferSource(), filter=ctx.createBiquadFilter(), gain=ctx.createGain();
  src.buffer=grain; filter.type="bandpass"; filter.Q.value=1.65;
  filter.frequency.setValueAtTime(2850,hit);
  filter.frequency.exponentialRampToValueAtTime(950,hit+0.22);
  gain.gain.setValueAtTime(0.001,hit);
  gain.gain.linearRampToValueAtTime(0.14,hit+0.009);
  gain.gain.exponentialRampToValueAtTime(0.001,hit+0.229);
  src.connect(filter).connect(gain).connect(dest);
  src.start(hit);
  src.onended=()=>{src.disconnect();filter.disconnect();gain.disconnect();};
}
