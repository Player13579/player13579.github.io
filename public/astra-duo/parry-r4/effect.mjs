export const title = "闘士の受け流し";
export const duration = 0.70;
export const shader = `
fn parrySeg(p:vec2f,a:vec2f,b:vec2f)->f32 {
  let ab=b-a;
  return length(p-a-ab*clamp(dot(p-a,ab)/max(dot(ab,ab),0.000001),0.,1.));
}
fn parryMask(d:f32)->f32 { return 1.-smoothstep(-0.009,0.009,d); }
fn parryPaint(base:vec4f,color:vec3f,alpha:f32)->vec4f {
  return vec4f(color*alpha,alpha)+base*(1.-alpha);
}
struct ParryPose {
  hand:vec2f,
  hilt:vec2f,
  dir:vec2f,
  side:vec2f,
  shoulder:vec2f,
}
fn parryPose(t:f32)->ParryPose {
  // The braced wrist and shoulder absorb the load while the rigid blade pivots.
  let recoil=sin(t*26.)*exp(-t*9.);
  let hand=vec2f(0.18,0.05)+vec2f(-0.245,0.102)*recoil;
  let shoulder=vec2f(-0.08,-0.16)+vec2f(-0.105,0.034)*recoil;
  let angle=-0.909-0.86*recoil;
  let dir=vec2f(cos(angle),sin(angle));
  return ParryPose(hand,hand+dir*0.075,dir,vec2f(-dir.y,dir.x),shoulder);
}
fn parryBladeWidth(axial:f32)->f32 {
  return 0.048*(1.-smoothstep(0.43,0.60,axial));
}
fn parryScrapeDistance(t:f32)->f32 {
  let remaining=1.-clamp(t/0.215,0.,1.);
  return 0.19+0.35*(1.-remaining*remaining);
}
fn parryEdge(pose:ParryPose,axial:f32)->vec2f {
  return pose.hilt+pose.dir*axial+pose.side*parryBladeWidth(axial);
}
fn effect(uv:vec2f,t:f32,size:vec2f)->vec4f {
  if (t<0. || t>=0.70) { return vec4f(0.); }
  // A local illustration of the already-resolved guard. The entry has no attack direction.
  let pose=parryPose(t);
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
  let shoulder=pose.shoulder;
  let torso=parrySeg(p,shoulder,vec2f(-0.06,0.13));
  out=parryPaint(out,outline,parryMask(torso-0.134));
  out=parryPaint(out,cloth,parryMask(torso-0.111));
  let head=length((p-(shoulder+vec2f(0.,-0.212)))*vec2f(1.12,1.));
  out=parryPaint(out,outline,parryMask(head-0.123));
  out=parryPaint(out,skin,parryMask(head-0.102));
  let hand=pose.hand;
  let dir=pose.dir;
  let side=pose.side;
  let upperArm=shoulder+vec2f(0.025,0.047);
  let elbow=mix(upperArm,hand,0.42)+vec2f(-0.047,0.097);
  let arm=min(parrySeg(p,upperArm,elbow),parrySeg(p,elbow,hand));
  out=parryPaint(out,outline,parryMask(arm-0.069));
  out=parryPaint(out,cloth*1.19,parryMask(arm-0.05));
  let hilt=pose.hilt;
  let blade=p-hilt;
  let axial=dot(blade,dir);
  let across=dot(blade,side);
  let width=parryBladeWidth(axial);
  let bladeD=max(max(-axial,axial-0.60),abs(across)-width);
  out=parryPaint(out,outline,parryMask(bladeD-0.014));
  out=parryPaint(out,mix(vec3f(0.48,0.29,0.22),vec3f(0.92,0.71,0.46),smoothstep(-0.008,0.008,across)),parryMask(bladeD));
  out=parryPaint(out,vec3f(0.63,0.45,0.27),parryMask(parrySeg(p,hilt-side*0.095,hilt+side*0.095)-0.022));
  out=parryPaint(out,skin,parryMask(length(p-hand)-0.047));
  // A contact glint travels along the narrowing edge, leaving a short-lived scrape.
  let contact=parryEdge(pose,parryScrapeDistance(t));
  let trailing=parryEdge(pose,parryScrapeDistance(max(0.,t-0.065)));
  let sweep=parrySeg(p,trailing,contact);
  let hot=1.-smoothstep(0.10,0.235,t);
  out=parryPaint(out,vec3f(1.,0.57,0.21),parryMask(sweep-0.049)*hot);
  out=parryPaint(out,vec3f(1.,0.94,0.75),parryMask(sweep-0.025)*hot);
  // Reconstruct each release pose at its own fixed time. Gravity acts after separation.
  for(var i=0;i<2;i++) {
    let k=f32(i);
    let releaseTime=0.020+0.015*k;
    let elapsed=t-releaseTime;
    let lifetime=0.325+0.020*k;
    if (elapsed<0. || elapsed>=lifetime) { continue; }
    let atRelease=parryPose(releaseTime);
    let origin=parryEdge(atRelease,parryScrapeDistance(releaseTime));
    // One shaving runs up the cutting edge, the other peels outward across it.
    let along=select(4.55,-1.25,i==1);
    let acrossEdge=select(0.21,4.20,i==1);
    let velocity=atRelease.dir*along+atRelease.side*acrossEdge;
    let gravity=vec2f(0.,1.75);
    let tailTime=max(0.,elapsed-0.032);
    let tipTravel=(1.-exp(-4.6*elapsed))/4.6;
    let tailTravel=(1.-exp(-4.6*tailTime))/4.6;
    let tip=origin+velocity*tipTravel+gravity*elapsed*elapsed;
    let tail=origin+velocity*tailTravel+gravity*tailTime*tailTime;
    let cooling=smoothstep(0.165,lifetime,elapsed);
    let radius=(0.036-0.003*k)*(1.-0.35*cooling);
    let tint=mix(vec3f(1.,0.78,0.41),vec3f(0.84,0.36,0.15),cooling);
    out=parryPaint(out,tint,parryMask(parrySeg(p,tip,tail)-radius)*(1.-cooling));
    let core=parryMask(length(p-tip)-radius*0.67);
    out=parryPaint(out,vec3f(1.,0.94,0.74),core*(1.-cooling)*(1.-cooling));
  }
  return out*(1.-smoothstep(0.43,0.70,t));
}
`;

export function playSound(ctx,dest) {
  const hit=ctx.currentTime;
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
