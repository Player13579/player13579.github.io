// Original procedural ribbon/charge shader. No image textures, sampler bindings or sprite atlas.
struct Uniforms {
  viewport: vec4f, // target width, height, physical-pixel/game-pixel scale, unused
  anchor: vec4f,   // screen origin x,y
  effect: vec4f,   // progress, radius, visible envelope, charge
  settings: vec4f,// light background, actor visible, glow amount, exposure
  dynamics: vec4f,// flux, actor age milliseconds
  camera: vec4f,  // cos tilt, sin tilt
  reserved0: vec4f,
  reserved1: vec4f,
};
@group(0) @binding(0) var<uniform> u: Uniforms;
const PI:f32=3.141592653589793;
const PACKET_START:f32={{PACKET_START}};
const LANE_DELAY:f32={{LANE_DELAY}};
const PACKET_SPACING:f32={{PACKET_SPACING}};
const PACKET_TRAVEL:f32={{PACKET_TRAVEL}};
fn sat(x:f32)->f32{return clamp(x,0.0,1.0);}
fn sm(a:f32,b:f32,x:f32)->f32{let q=sat((x-a)/(b-a));return q*q*(3.0-2.0*q);}
fn lane_point(lane:f32,s0:f32)->vec3f{
  let s=sat(s0);let theta=lane*PI/3.0+0.24+0.35*sin(PI*s);
  let h=min(u.effect.y/82.0,1.0);
  let r=u.effect.y*0.53*pow(1.0-s,1.3)+8.61*h;
  return vec3f(cos(theta)*r,(7.0+(lane%3.0)*5.0+(25.0+(lane%2.0)*5.0)*s+9.0*sin(PI*s))*h,
    sin(theta)*r*0.56+3.0*s*h);
}
fn core_point(s:f32)->vec3f{
  let h=min(u.effect.y/82.0,1.0);
  return vec3f(sin(PI*s)*1.25,17.0+29.0*s,10.0+2.0*sin(PI*s))*h;
}
fn project(p:vec3f)->vec3f{
  let xy=u.anchor.xy+vec2f(p.x,-p.y*u.camera.x+p.z*u.camera.y)*u.viewport.z;
  let depth=clamp(0.5-(p.z*u.camera.x+p.y*u.camera.y)*0.002,0.001,0.999);
  return vec3f(xy,depth);
}
fn clip(p:vec3f)->vec4f{
  return vec4f(p.x/u.viewport.x*2.0-1.0,1.0-p.y/u.viewport.y*2.0,p.z,1.0);
}
fn pulse_at(lane:f32,s:f32)->f32{
  var sum=0.0;
  for(var k=0;k<3;k++){
    let q=sat((u.effect.x-PACKET_START-lane*LANE_DELAY-f32(k)*PACKET_SPACING)/PACKET_TRAVEL);
    let pos=sm(0.0,1.0,q);let env=sm(0.0,0.1,q)*(1.0-sm(0.86,1.0,q));
    let d=(s-pos)/0.072;
    sum+=exp(-d*d)*env;
  }
  return min(sum,1.6);
}
struct Varying {
  @builtin(position) position:vec4f,
  @location(0) uv:vec2f,
  @location(1) lane:f32,
  @location(2) kind:f32,
  @location(3) extent:f32,
  @location(4) s:f32,
};
@vertex fn ribbon_vertex(@builtin(vertex_index) vertex:u32,@location(0) instance:vec4f)->Varying{
  let corners=array<vec2f,6>(vec2f(0,-1),vec2f(1,-1),vec2f(0,1),vec2f(0,1),vec2f(1,-1),vec2f(1,1));
  let c=corners[vertex];let lane=instance.x;let seg=instance.y;let kind=instance.z;
  let n=select(28.0,24.0,kind>0.5);let s0=seg/n;let s1=(seg+1.0)/n;
  var a=lane_point(lane,s0);var b=lane_point(lane,s1);
  if(kind>0.5){a=core_point(s0);b=core_point(s1);}
  let pa=project(a);let pb=project(b);let delta=pb.xy-pa.xy;
  let tangent=delta/max(length(delta),0.001);let side=vec2f(-tangent.y,tangent.x);
  let s=mix(s0,s1,c.x);let h=min(u.effect.y/82.0,1.0);
  let extent=select(5.5,8.5,kind>0.5)*h;
  let p=mix(pa,pb,c.x);let xy=p.xy+side*c.y*extent*u.viewport.z;
  var out:Varying;out.position=clip(vec3f(xy,p.z));out.uv=c;
  out.lane=lane;out.kind=kind;out.extent=extent;out.s=s;return out;
}
fn over(f:vec4f,b:vec4f)->vec4f{return f+b*(1.0-f.a);}
@fragment fn ribbon_fragment(v:Varying)->@location(0) vec4f{
  let d=abs(v.uv.y)*v.extent;let aa=max(fwidth(d)*0.7,0.2/u.viewport.z);
  let h=min(u.effect.y/82.0,1.0);let pulse=pulse_at(v.lane,v.s);
  var width=(0.65+0.42*v.s+0.62*pulse)*h;
  var energy=0.35+0.85*pulse;
  var shape_gate=sm(0.0,0.045,v.s)*(1.0-sm(0.975,1.0,v.s));
  var tint=mix(vec3f(0.69,0.32,0.075),vec3f(1.0,0.76,0.33),sat(pulse));
  if(v.kind>0.5){
    width=(0.6+2.8*sin(PI*v.s))*h;
    let filled=1.0-sm(u.effect.w-0.05,u.effect.w+0.10,v.s);
    energy=0.23+filled*(0.55+0.17*sin(v.s*19.0));
    tint=mix(vec3f(0.43,0.23,0.095),vec3f(1.0,0.64,0.17),filled);
    shape_gate=sm(0.0,0.05,v.s)*(1.0-sm(0.92,1.0,v.s));
  }
  let opacity=u.effect.z*shape_gate;
  let outline=(1.0-smoothstep(width+0.55*h-aa,width+0.55*h+aa,d))*opacity*0.76;
  let face=(1.0-smoothstep(width-aa,width+aa,d))*opacity*0.86;
  let fold=(1.0-smoothstep(0.19*h,0.19*h+aa,abs(v.uv.y*v.extent+width*0.24)))*face;
  // Shader-generated satin modulation is spatial, band-limited by width and display scale.
  let satin=0.93+0.07*sin(v.s*42.0+v.lane*2.1)*sat(u.viewport.z-0.6);
  let support=1.0-smoothstep(max(0.0,v.extent-h),v.extent,d);
  let gl=exp(-d*d/max(width*width*5.0,0.01))*opacity*energy*0.15*u.settings.z*support;
  var out=vec4f(vec3f(0.77,0.33,0.06)*gl,gl*0.45);
  out=over(vec4f(vec3f(0.073,0.095,0.115)*outline,outline),out);
  out=over(vec4f(tint*sat(energy+0.32)*satin*face,face),out);
  let highlight=fold*sat(energy)*0.82;
  out=over(vec4f(vec3f(1.0,0.94,0.71)*highlight,highlight),out);
  return out;
}
struct MeshVarying {
  @builtin(position) position:vec4f,
  @location(0) normal:vec3f,
  @location(1) color:vec3f,
  @location(2) world:vec3f,
};
@vertex fn actor_vertex(@location(0)p:vec3f,@location(1)n:vec3f,@location(2)c:vec3f)->MeshVarying{
  var o:MeshVarying;o.position=clip(project(p));o.normal=n;o.color=c;o.world=p;return o;
}
@fragment fn actor_fragment(v:MeshVarying)->@location(0)vec4f{
  let light=normalize(vec3f(-0.5,0.8,0.8));let ndl=max(dot(normalize(v.normal),light),0.0);
  let shade=0.48+select(0.10,0.36,ndl>0.40)+select(0.0,0.16,ndl>0.82);
  // Body response is localized to torso: receiver evidence, never a whole-outline halo.
  let torso=sm(15.0,22.0,v.world.y)*(1.0-sm(43.0,48.0,v.world.y));
  let inward=exp(-v.world.x*v.world.x/75.0)*sm(-2.0,5.0,v.world.z);
  let front=1.0-sm(19.0+27.0*u.effect.w,23.0+27.0*u.effect.w,v.world.y);
  let absorbed=torso*inward*front*u.effect.w*u.effect.z;
  let col=v.color*shade+vec3f(0.48,0.21,0.035)*absorbed*0.55;
  return vec4f(col,1.0);
}
