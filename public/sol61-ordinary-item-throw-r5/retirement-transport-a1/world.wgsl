// GPT-6.1-Sol R5 creative revision. Shared successful-throw tracking light, not an item mesh.
// Authoritative endpoints and finite event time are supplied by the runtime.
struct Frame {
  view: vec4f,
  route: vec4f,
  clock: vec4f,
  optics: vec4f,
};
@group(0) @binding(0) var<uniform> f: Frame;
struct Varying { @builtin(position) position: vec4f, @location(0) uv: vec2f };
@vertex fn vertex(@builtin(vertex_index) i: u32) -> Varying {
  let q = array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));
  var o: Varying;
  o.position = vec4f(q[i],0.,1.);
  o.uv = q[i]*vec2f(.5,-.5)+.5;
  return o;
}
fn gauss(x:f32, s:f32)->f32 { return exp(-.5*x*x/max(s*s,.0001)); }
fn pathAt(t:f32)->vec2f {
  return mix(f.route.xy,f.route.zw,t)-vec2f(0.,4.*f.clock.z*t*(1.-t));
}
fn tangentAt(t:f32)->vec2f {
  return f.route.zw-f.route.xy-vec2f(0.,4.*f.clock.z*(1.-2.*t));
}
struct Field { color:vec3f, alpha:f32 };
fn wakeAt(p:vec2f,t:f32)->Field {
  var light=vec3f(0.);
  var opticalDepth=0.;
  let scale=max(f.view.z,.01);
  // A recent finite history follows the source; no future destination light.
  for(var i=0u;i<48u;i++) {
    let lagMs=(f32(i)+.5)*2.25;
    let u=t-lagMs/f.clock.y;
    if(u<0.) { continue; }
    let axis=normalize(tangentAt(u)+vec2f(.00001,0.));
    let normal=vec2f(-axis.y,axis.x);
    let relative=p-pathAt(u);
    let onset=smoothstep(0.,20.,u*f.clock.y);
    let transverse=dot(relative,normal);
    let longitudinal=dot(relative,axis);
    // Center-filled history: older supply broadens and dissipates, never two edge emitters.
    let localSpeed=length(tangentAt(u))/f.clock.y/scale;
    let pressure=clamp(localSpeed/.95,.35,1.5);
    let bodyWidth=scale*(3.2*sqrt(pressure)+lagMs*.032);
    let mantleWidth=bodyWidth*1.50;
    let coreWidth=scale*(1.15+lagMs*.005);
    let bodyAge=exp(-lagMs/48.)*onset;
    let coreAge=exp(-lagMs/24.)*onset;
    let mantleAge=exp(-lagMs/58.)*(1.-exp(-lagMs/24.))*onset;
    // Width-normalized amplitudes preserve the same history response at each display scale.
    let density=gauss(transverse,bodyWidth)*gauss(longitudinal,4.6*scale)*bodyAge*(2.8*scale/bodyWidth);
    let core=gauss(transverse,coreWidth)*gauss(longitudinal,3.1*scale)*coreAge*(1.0*scale/coreWidth);
    let mantle=gauss(transverse,mantleWidth)*gauss(longitudinal,4.6*scale)*mantleAge*(4.2*scale/mantleWidth);
    light+=(vec3f(.06,.62,.94)*density*.23+vec3f(.64,.96,1.)*core*.34+
      vec3f(.025,.32,.76)*mantle*.13)*f.optics.x;
    opticalDepth+=density*.016;
  }
  return Field(light,1.-exp(-opticalDepth));
}
struct Output { @location(0) color:vec4f, @location(1) emission:vec4f };
@fragment fn fragment(input:Varying)->Output {
  var result:Output;
  result.color=vec4f(0.); result.emission=vec4f(0.);
  if(f.view.w<.5 || f.optics.z<.5 || f.clock.y<=0. ||
    f.clock.x<0. || f.clock.x>=f.clock.y) { return result; }
  let t=f.clock.x/f.clock.y;
  let p=input.uv*f.view.xy;
  let scale=max(f.view.z,.01);
  // Six-sigma-plus conservative support bounds spare empty screen fragments.
  let lower=min(f.route.xy,f.route.zw)-vec2f(60.*scale,max(f.clock.z,0.)+60.*scale);
  let upper=max(f.route.xy,f.route.zw)+vec2f(60.*scale,max(-f.clock.z,0.)+60.*scale);
  if(any(p<lower) || any(p>upper)) { return result; }
  let wake=wakeAt(p,t);
  let axis=normalize(tangentAt(t)+vec2f(.00001,0.));
  let normal=vec2f(-axis.y,axis.x);
  let relative=p-pathAt(t);
  let along=dot(relative,axis);
  let across=dot(relative,normal);
  let onset=smoothstep(0.,16.,f.clock.x);
  let terminal=1.-smoothstep(.97,1.,t);
  let envelope=onset*terminal;
  // Resolved luminous head joins directly to the recent wake without a bracket icon.
  let headCore=gauss(across,1.25*scale)*gauss(along,3.6*scale);
  let headShoulder=gauss(across,2.8*scale)*gauss(along,5.4*scale);
  let head=vec3f(.90,1.,1.)*headCore*2.1+vec3f(.05,.68,1.)*headShoulder*.48;
  // Departure slip is local, follows the initial momentum, and never lights the endpoint.
  let initialAxis=normalize(tangentAt(0.)+vec2f(.00001,0.));
  let initialNormal=vec2f(-initialAxis.y,initialAxis.x);
  let releaseRelative=p-f.route.xy;
  let releaseAlong=dot(releaseRelative,initialAxis);
  let releaseAcross=dot(releaseRelative,initialNormal);
  let releaseAge=f.clock.x;
  let releaseEnvelope=smoothstep(0.,12.,releaseAge)*(1.-smoothstep(24.,72.,releaseAge));
  let release=gauss(releaseAlong+3.*scale,3.4*scale)*gauss(releaseAcross,4.8*scale)*releaseEnvelope;
  // Motion-compressed filled leading cap, physically joined to the finite wake.
  let localSpeed=length(tangentAt(t))/f.clock.y/scale;
  let pressure=clamp(localSpeed/.95,.35,1.5);
  let cap=gauss(across,3.6*scale*sqrt(pressure))*gauss(along-1.8*scale,4.8*scale);
  let compression=vec3f(.08,.72,1.)*cap*.72*envelope*pressure;
  let hdr=(wake.color*terminal+head*envelope+compression+vec3f(.35,.86,1.)*release*.85)*max(f.clock.w,0.);
  let alpha=clamp(wake.alpha*terminal+(headCore*.09+headShoulder*.035+cap*.045)*envelope+release*.045,0.,.30);
  result.color=vec4f(hdr,alpha);
  result.emission=vec4f(hdr,alpha);
  return result;
}
