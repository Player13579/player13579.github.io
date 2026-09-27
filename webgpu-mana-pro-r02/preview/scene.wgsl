// Preview-only dummy and foreground. Never imported by the integration API.
struct Globals { view:vec4<f32>, origin:vec4<f32>, mode:vec4<f32> };
@group(0) @binding(0) var<uniform> g:Globals;
@vertex fn vs(@builtin(vertex_index) i:u32)->@builtin(position) vec4<f32>{let p=array<vec2<f32>,3>(vec2<f32>(-1,-1),vec2<f32>(3,-1),vec2<f32>(-1,3));return vec4<f32>(p[i],0,1);}
fn box(p:vec2<f32>,h:vec2<f32>,r:f32)->f32{let q=abs(p)-h+vec2<f32>(r);return length(max(q,vec2<f32>(0)))+min(max(q.x,q.y),0.0)-r;}
fn linear(c:vec3<f32>)->vec3<f32>{return select(pow((c+vec3<f32>(0.055))/1.055,vec3<f32>(2.4)),c/12.92,c<=vec3<f32>(0.04045));}
@fragment fn fs(@builtin(position) v:vec4<f32>)->@location(0) vec4<f32>{
 let p=(v.xy/g.view.w-g.origin.xy)/g.view.z;
 if(g.mode.x<0.5){
  let base=mix(vec3<f32>(0.034,0.073,0.105),vec3<f32>(0.90,0.935,0.92),g.mode.y);
  return vec4<f32>(linear(base),1);
 }
 if(g.mode.x<1.5){
  if(g.mode.z<0.5){discard;}
  let head=length(p-vec2<f32>(0,-56))-8.0;
  let torso=box(p-vec2<f32>(0,-35),vec2<f32>(10.5,16),4);
  let arms=box(vec2<f32>(abs(p.x)-13.8,p.y+33),vec2<f32>(3.2,13),3);
  let legs=box(vec2<f32>(abs(p.x)-5.3,p.y+10),vec2<f32>(4,10),2.5);
  let d=min(min(head,torso),min(arms,legs));let aa=max(fwidth(d),0.2);
  let a=1-smoothstep(-aa,aa,d);let inner=smoothstep(0.4,1.3,-d);
  var c=mix(vec3<f32>(0.075,0.102,0.122),vec3<f32>(0.44,0.48,0.49),inner);
  // Faceted upper chest gives an existing occluder and contact surface, not a costume/logo.
  if(abs(p.x)<7.0 && p.y< -32.0 && p.y> -44.0){c=mix(c,vec3<f32>(0.54,0.57,0.56),0.32);}
  return vec4<f32>(linear(c)*a,a);
 }
 if(g.mode.w<0.5){discard;}
 let d=box(p-vec2<f32>(7,-30),vec2<f32>(9,15),1.5);let aa=max(fwidth(d),0.15);let a=1-smoothstep(-aa,aa,d);
 let c=mix(vec3<f32>(0.12,0.16,0.21),vec3<f32>(0.32,0.37,0.40),smoothstep(0.4,1.4,-d));return vec4<f32>(linear(c)*a,a);
}
