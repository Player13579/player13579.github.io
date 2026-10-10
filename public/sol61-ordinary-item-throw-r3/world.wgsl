// GPT-6.1-Sol R3 draft. Shared successful-throw tracking light, not an item mesh.
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
  return mix(f.route.xy,f.route.zw,t)-vec2f(0.,f.clock.z*sin(3.14159265*t));
}
fn tangentAt(t:f32)->vec2f {
  return f.route.zw-f.route.xy-vec2f(0.,f.clock.z*3.14159265*cos(3.14159265*t));
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
    let tail=exp(-lagMs/38.)*smoothstep(0.,20.,u*f.clock.y);
    let transverse=dot(relative,normal);
    let longitudinal=dot(relative,axis);
    let width=scale*(1.9+lagMs*.017);
    let density=gauss(transverse,width)*gauss(longitudinal,4.6*scale)*tail;
    let core=gauss(transverse,.8*scale)*gauss(longitudinal,3.1*scale)*tail;
    // Two carrier shoulders broaden with age, retaining a single leading head.
    let edge=gauss(abs(transverse)-width*1.35,.55*scale)*gauss(longitudinal,3.6*scale)*tail;
    light+=(vec3f(.08,.52,.86)*density*.23+vec3f(.64,.96,1.)*core*.34+
      vec3f(.06,.70,1.)*edge*.13)*f.optics.x;
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
  let lower=min(f.route.xy,f.route.zw)-vec2f(40.*scale,max(f.clock.z,0.)+40.*scale);
  let upper=max(f.route.xy,f.route.zw)+vec2f(40.*scale,max(-f.clock.z,0.)+40.*scale);
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
  let hdr=(wake.color*terminal+head*envelope)*max(f.clock.w,0.);
  let alpha=clamp(wake.alpha*terminal+(headCore*.09+headShoulder*.035)*envelope,0.,.30);
  result.color=vec4f(hdr,alpha);
  result.emission=vec4f(hdr,alpha);
  return result;
}
