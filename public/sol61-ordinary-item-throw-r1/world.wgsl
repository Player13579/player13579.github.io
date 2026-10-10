// GPT-6.1-Sol original ordinary throw R1. No item-acquisition or grenade impact.
// Runtime supplies actual successful throw source, resolved endpoint, age and duration.
struct Frame {
  view: vec4f,       // pixel width,height, world-to-pixel scale, enabled
  route: vec4f,      // projected source xy, resolved landing xy
  clock: vec4f,      // age ms,duration ms, lift px, source gain
  optics: vec4f,     // wake gain, receiver gain, source intervention, reserved
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
struct Field { color: vec3f, alpha:f32 };
fn wakeAt(p:vec2f,t:f32)->Field {
  var light=vec3f(0.);
  var opticalDepth=0.;
  let scale=max(f.view.z,.01);
  // Historical trajectory samples expire locally; no permanent whole-route line.
  for(var i=0u;i<28u;i++) {
    let lag=(f32(i)+.5)*.0065;
    let u=t-lag;
    if(u<0.) { continue; }
    let v=tangentAt(u);
    let axis=normalize(v+vec2f(.00001,0.));
    let normal=vec2f(-axis.y,axis.x);
    let relative=p-pathAt(u);
    let tail=exp(-lag/ .058)*smoothstep(0.,.06,u);
    let transverse=dot(relative,normal);
    let longitudinal=dot(relative,axis);
    let width=scale*(1.0+lag*11.);
    let density=gauss(transverse,width)*gauss(longitudinal,3.1*scale)*tail;
    // White-hot narrow centre and cyan shoulders have separate radiance profiles.
    let core=gauss(transverse,.36*scale)*gauss(longitudinal,2.0*scale)*tail;
    let edge=gauss(abs(transverse)-width*1.6,.34*scale)*gauss(longitudinal,2.5*scale)*tail;
    light+=(vec3f(.22,.82,1.0)*density*.11+vec3f(.92,1.,1.)*core*.14+
      vec3f(.06,.46,.88)*edge*.055)*f.optics.x;
    opticalDepth+=density*.012;
  }
  return Field(light,1.-exp(-opticalDepth));
}
struct Output { @location(0) color:vec4f, @location(1) emission:vec4f };
@fragment fn fragment(input:Varying)->Output {
  var result:Output;
  result.color=vec4f(0.); result.emission=vec4f(0.);
  if(f.view.w<.5 || f.optics.z<.5 || f.clock.y<=0. ||
    f.clock.x<0. || f.clock.x>=f.clock.y) { return result; }
  let t=clamp(f.clock.x/f.clock.y,0.,1.);
  let p=input.uv*f.view.xy;
  let scale=max(f.view.z,.01);
  let wake=wakeAt(p,t);
  let tip=pathAt(t);
  let v=normalize(tangentAt(t)+vec2f(.00001,0.));
  let normal=vec2f(-v.y,v.x);
  let d=p-tip;
  // Digital tracking brackets follow velocity, rather than a stationary icon.
  let along=dot(d,v); let across=dot(d,normal);
  let bracket=gauss(abs(across)-4.2*scale,.38*scale)*
    (1.-smoothstep(1.8*scale,3.5*scale,abs(along)));
  let shortEnds=gauss(abs(along)-3.0*scale,.38*scale)*
    (1.-smoothstep(2.8*scale,4.5*scale,abs(across)));
  let phase=smoothstep(0.,.045,t)*(1.-smoothstep(.88,1.,t));
  let marker=(bracket+shortEnds*.45)*phase;
  // Arrival contracts towards the collision-resolved point before terminal zero.
  let arrival=smoothstep(.84,.94,t)*(1.-smoothstep(.975,1.,t));
  let a=p-f.route.zw;
  let radius=mix(10.,2.5,smoothstep(.84,1.,t))*scale;
  let receiver=gauss(length(a)-radius,.5*scale)*arrival*f.optics.y;
  let terminalFade=1.-smoothstep(.94,1.,t);
  let hdr=(wake.color*terminalFade+vec3f(.13,.76,1.)*marker*.7+
    vec3f(.3,.9,1.)*receiver*.35)*max(f.clock.w,0.);
  let alpha=clamp(wake.alpha*terminalFade+marker*.08+receiver*.04,0.,.25);
  result.color=vec4f(hdr,alpha);
  result.emission=vec4f(hdr,alpha);
  return result;
}
