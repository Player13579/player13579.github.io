// Preview fixtures only. Never imported by the game-facing API.
struct Params { size: vec2f, scale:f32, light:f32, origin:vec2f, foreground:f32, grid:f32, mannequin:f32, padding:vec3f };
@group(0) @binding(0) var<uniform> scene:Params;
struct Out { @builtin(position) pos:vec4f, @location(0) uv:vec2f };
@vertex fn vs(@builtin(vertex_index) i:u32)->Out{
  var v=array<vec2f,3>(vec2f(-1.0,-1.0),vec2f(3.0,-1.0),vec2f(-1.0,3.0));var o:Out;o.pos=vec4f(v[i],0.0,1.0);o.uv=v[i]*vec2f(0.5,-0.5)+vec2f(0.5);return o;
}
fn box(p:vec2f,b:vec2f,r:f32)->f32{let q=abs(p)-b+vec2f(r);return min(max(q.x,q.y),0.0)+length(max(q,vec2f(0.0)))-r;}
fn capsule(p:vec2f,a:vec2f,b:vec2f,r:f32)->f32{let d=b-a;let t=clamp(dot(p-a,d)/dot(d,d),0.0,1.0);return length(p-a-t*d)-r;}
fn cover(d:f32)->f32 {let aa=max(fwidth(d),0.30);return 1.0-smoothstep(-aa*0.5,aa*0.5,d);}
@fragment fn background(v:Out)->@location(0) vec4f{
  let base=mix(vec3f(0.037,0.059,0.085),vec3f(0.87,0.89,0.88),scene.light);
  let p=(v.uv*scene.size-scene.origin)/scene.scale;
  let lattice=abs(fract((p+vec2f(16.0))/32.0)-0.5)*32.0;
  let line=(1.0-smoothstep(0.10,0.65,min(lattice.x,lattice.y)))*scene.grid;
  let gridcolor=mix(vec3f(0.071,0.105,0.13),vec3f(0.82,0.84,0.83),scene.light);
  let edge=1.0-smoothstep(0.15,0.72,length(v.uv-vec2f(0.5)));
  return vec4f(mix(base,gridcolor,line)+vec3f(edge*0.008),1.0);
}
@fragment fn body(v:Out)->@location(0) vec4f{
  let p=(v.uv*scene.size-scene.origin)/scene.scale;
  let head=box(p-vec2f(0.0,-55.5),vec2f(8.5,8.5),3.5);
  let bodyPos=p-vec2f(0.0,-32.0);let bodyWidth=mix(8.7,12.0,clamp((-p.y-20.0)/22.0,0.0,1.0));
  let torso=box(bodyPos,vec2f(bodyWidth,12.0),2.6);
  let neck=box(p-vec2f(0.0,-44.5),vec2f(4.5,3.0),1.0);
  let armL=capsule(p,vec2f(-13.0,-39.0),vec2f(-15.5,-22.0),3.3);
  let armR=capsule(p,vec2f(13.0,-39.0),vec2f(15.5,-22.0),3.3);
  let legL=capsule(p,vec2f(-5.1,-18.5),vec2f(-7.0,-3.0),3.0);
  let legR=capsule(p,vec2f(5.1,-18.5),vec2f(7.0,-3.0),3.0);
  let d=min(min(min(head,torso),neck),min(min(armL,armR),min(legL,legR)));
  let a=cover(d)*scene.mannequin;
  let outer=vec3f(0.092,0.133,0.18);
  let inner=mix(vec3f(0.36,0.45,0.49),vec3f(0.59,0.65,0.65),clamp((9.0-p.x)/22.0,0.0,1.0));
  var color=mix(outer,inner,(1.0-smoothstep(-1.55,-0.75,d)));
  let chestPanel=cover(box(p-vec2f(0.0,-31.0),vec2f(6.2,9.6),1.4));
  color=mix(color,vec3f(0.16,0.23,0.31),chestPanel*0.62);
  let face=cover(box(p-vec2f(0.0,-56.0),vec2f(5.0,2.2),0.75));
  color=mix(color,vec3f(0.066,0.105,0.15),face);
  let slit=cover(box(p-vec2f(-1.3,-56.5),vec2f(2.0,0.4),0.15));
  color=mix(color,vec3f(0.63,0.77,0.78),slit*0.8);
  return vec4f(color*a,a);
}
@fragment fn foreground(v:Out)->@location(0) vec4f{
  let p=(v.uv*scene.size-scene.origin)/scene.scale;
  // A deliberately simple host occluder crosses one flank and the body, ABOVE both effect passes.
  let d=box(p-vec2f(17.0,-16.0),vec2f(4.0,47.0),0.7);
  let a=cover(d)*scene.foreground;
  let c=mix(vec3f(0.23,0.28,0.30),vec3f(0.46,0.51,0.50),scene.light);
  return vec4f(c*a,a);
}
