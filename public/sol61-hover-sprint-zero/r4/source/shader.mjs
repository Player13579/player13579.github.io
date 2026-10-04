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
   let L=mix(60.,50.,kind)*u.state.w;
   let emitter=bell(length(delta/vec2f(1.15,1.15)));
   let source=vec3f(20.,26.,16.)*emitter*u.state.z*u.controls.y;
   key+=source;light+=source;
   if(x>=0.&&x<L&&u.controls.x>0.) {
    let s=x/max(.1,L);let motion=1.-u.clocks.w;
    // Finite directional carrier: compression travels inside its own compact material support.
    let travel=s*1.75-age*.0025+anchor.w;
    let phase=fract(travel);let phaseDistance=min(phase,1.-phase);
    let movingCell=bell(phaseDistance/.16);
    let compression=mix(.48+.52*bell((s-.38)/.20),.22+.78*movingCell,motion);
    let bend=motion*.72*sin(s*5.2-age*.0048+anchor.w)*s*s;
    // Narrow supply, a contained expansion, then a convergent free end: no shared luminous wall.
    let radius=1.20+(1.70+.65*compression)*pow(max(0.,sin(s*3.14159265)),.70);
    let coreRadius=(.72+1.05*s)*(1.+.20*compression);
    let throat=bell(s/.16);
    let suppliedHot=throat*.95+compression*pow(1.-s,3.)*.16;
    let tail=1.-smoothstep(.78,1.,s);
    let axial=pow(1.-s,.45)*tail;
    // A broad coherent interface separates quiet dense material from the emissive compressed side.
    let fold=.32*sin(s*4.1-age*.0025*motion+anchor.w)+.28*(s-.45);
    var transmission=1.;var integrated=vec3f(0.);
    for(var n:u32=0u;n<16u;n++) {
     let z=-12.+(f32(n)+.5)*1.5;
     let radial=((y-bend)*(y-bend)+z*z)/(radius*radius);
     let support=1.-smoothstep(.45,1.,radial);
     let bulk=exp(-radial)*axial*support;
     let cross=(y-bend)/max(1.,radius);
     let quiet=1.-smoothstep(fold-.28,fold+.28,cross);
     let pressure=bell((y-bend)/(radius*.42))*bell(z/(radius*.66))*axial*support;
     let axis=bell((y-bend)/coreRadius)*bell(z/coreRadius)*pow(1.-s,1.5)*tail*support;
     // Density, emission and optical loss retain separate roles after line-of-sight integration.
     let rho=bulk*(.52+.25*quiet+.23*compression)+axis*.40;
     let loss=exp(-rho*.105*1.5);
     let cold=vec3f(.006,.09,.21)*bulk*(.10+.50*quiet);
     let jade=vec3f(.025,.88,.32)*bulk*(1.-.85*quiet)*(.10+.90*compression);
     let crest=vec3f(.70,3.0,.80)*pressure*compression*compression*(1.-.58*quiet);
     let hot=vec3f(10.,17.,8.)*axis*suppliedHot;
     let coolTail=smoothstep(.50,.86,s);
     let material=mix(jade+crest,cold*.85,coolTail);
     integrated+=transmission*(cold+material+hot)*1.5*.38;
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
   let radius=max(1.,9.5*u.viewport.z);let d=length(v.position.xy-p);
   // Actual emitter-bound local diffusion. No lens-flare claim or unrelated optical decorations.
   color+=key*.018*bell(d/radius)*u.controls.z*u.controls.w;
  }
 }
 color+=u.backdrop.rgb;
 let mapped=vec3f(1.)-exp(-max(vec3f(0.),color)*u.backdrop.w);
 return vec4f(pow(mapped,vec3f(1./2.2)),1.);
}`;
