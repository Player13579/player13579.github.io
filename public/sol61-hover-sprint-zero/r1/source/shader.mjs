const interfaceWGSL=`struct U { viewport:vec4f, clocks:vec4f, state:vec4f, anchors:array<vec4f,4>, backdrop:vec4f, controls:vec4f, reserved:vec4f };
@group(0) @binding(0) var<uniform> u:U;
struct Vertex { @builtin(position) position:vec4f, @location(0) uv:vec2f };
@vertex fn vs(@builtin(vertex_index) id:u32)->Vertex {var p=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));var o:Vertex;o.position=vec4f(p[id],0.,1.);o.uv=vec2f((p[id].x+1.)*.5,(1.-p[id].y)*.5);return o;}
fn bell(v:f32)->f32 {return exp(-v*v);}`;
export const WORLD_WGSL=interfaceWGSL+`
struct Emission { @location(0) radiance:vec4f, @location(1) emitters:vec4f };
@fragment fn fs(v:Vertex)->Emission {
 var light=vec3f(0.);var key=vec3f(0.);let zoom=u.viewport.z;
 if(u.clocks.z>0.&&u.state.z>0.) {
  let outward=-u.state.xy;let side=vec2f(-outward.y,outward.x);let age=u.viewport.w;
  for(var j:u32=0u;j<4u;j++) {
   let anchor=u.anchors[j];let delta=(v.position.xy-anchor.xy)/zoom;
   let x=dot(delta,outward);let y=dot(delta,side);let kind=anchor.z;
   let L=mix(42.,35.,kind)*u.state.w;
   let emitter=bell(length(delta/vec2f(1.15,1.15)));
   let source=vec3f(20.,26.,16.)*emitter*u.state.z*u.controls.y;
   key+=source;light+=source;
   if(x>=0.&&x<L&&u.controls.x>0.) {
    let s=x/max(.1,L);let motion=1.-u.clocks.w;
    // A broad pressure cell advects away from each authoritative anchor; no random particles.
    let travel=s*1.6-age*.0014+anchor.w;
    let pressure=1.+motion*.18*cos(6.283185*travel);
    let centerline=motion*.65*sin(s*4.1-age*.006+anchor.w)*s;
    let radius=(1.45+5.1*pow(s,.8))*pressure;
    let axial=pow(1.-s,1.35)*(1.-smoothstep(.78,1.,s));
    var transmission=1.;var integrated=vec3f(0.);
    for(var n:u32=0u;n<16u;n++) {
     let z=-10.+(f32(n)+.5)*1.25;
     let rho=exp(-((y-centerline)*(y-centerline)+z*z)/(radius*radius))*axial*pressure;
     let loss=exp(-rho*.11*1.25);
     let hot=bell(s/.24)*bell((y-centerline)/max(.8,radius*.42));
     let emission=mix(vec3f(.075,.72,.58),vec3f(.45,3.1,.94),hot);
     integrated+=transmission*emission*rho*1.25*.45;
     transmission*=loss;
    }
    light+=integrated*u.state.z*u.controls.x;
   }
  }
 }
 var result:Emission;result.radiance=vec4f(light,1.);result.emitters=vec4f(key,1.);return result;
}`;
export const POST_WGSL=interfaceWGSL+`
@group(0) @binding(1) var radiance:texture_2d<f32>;
@group(0) @binding(2) var emitters:texture_2d<f32>;
@group(0) @binding(3) var filteringSampler:sampler;
fn sourceAt(p:vec2f)->vec3f {return textureSampleLevel(emitters,filteringSampler,clamp(p/u.viewport.xy,vec2f(0.),vec2f(1.)),0.).rgb;}
@fragment fn fs(v:Vertex)->@location(0) vec4f {
 var color=textureSampleLevel(radiance,filteringSampler,v.uv,0.).rgb;
 if(u.controls.w>0.&&u.controls.z>0.&&u.clocks.z>0.) {
  for(var j:u32=0u;j<4u;j++) {
   let p=u.anchors[j].xy;let key=sourceAt(p);
   let radius=max(1.,8.5*u.viewport.z);let d=length(v.position.xy-p);
   // Local source-dependent diffusion only. No lens flare, ghost, screen streak or global bloom.
   color+=key*.014*bell(d/radius)*u.controls.z*u.controls.w;
  }
 }
 color+=u.backdrop.rgb;
 let mapped=vec3f(1.)-exp(-max(vec3f(0.),color)*u.backdrop.w);
 return vec4f(pow(mapped,vec3f(1./2.2)),1.);
}`;
