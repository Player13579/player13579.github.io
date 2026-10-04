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
    // Two broad compression regions travel down the supplied carrier, not independent sparks.
    let travel=s*1.75-age*.0025+anchor.w;
    let phase=fract(travel);let phaseDistance=min(phase,1.-phase);
    let movingCell=bell(phaseDistance/.16);
    let compression=mix(.48+.52*bell((s-.38)/.20),.22+.78*movingCell,motion);
    let bend=motion*1.6*sin(s*5.2-age*.0048+anchor.w)*s*s;
    // Focused throat, then an expanding lower-energy envelope. The end has no hard cap.
    let radius=(1.35+9.2*pow(s,.65)*sin(s*2.65))*(.90+.22*compression);
    let coreRadius=(.72+1.05*s)*(1.+.20*compression);
    let throat=bell(s/.16);
    let suppliedHot=throat*.95+compression*pow(1.-s,3.)*.16;
    let tail=1.-smoothstep(.70,1.,s);
    let axial=pow(1.-s,.55)*tail;
    let split=smoothstep(.46,.88,s);
    let separation=split*(1.8+3.0*s);
    var transmission=1.;var integrated=vec3f(0.);
    for(var n:u32=0u;n<16u;n++) {
     let z=-12.+(f32(n)+.5)*1.5;
     let radial=((y-bend)*(y-bend)+z*z)/(radius*radius);
     let shell=exp(-radial)*axial;
     let axis=bell((y-bend)/coreRadius)*bell(z/coreRadius)*pow(1.-s,1.5)*tail;
     let lobeA=bell((y-bend-separation)/max(1.,radius*.36))*bell(z/max(1.,radius*.45));
     let lobeB=bell((y-bend+separation)/max(1.,radius*.36))*bell(z/max(1.,radius*.45));
     let frayed=(lobeA+lobeB)*split*tail;
     let rho=shell*(.42+.46*compression)+axis*.40+frayed*.17;
     let loss=exp(-rho*.105*1.5);
     // Density is not the emission floor: the cool outer field is optically present but quiet.
     let cold=vec3f(.009,.10,.13)*shell;
     let jade=vec3f(.015,.58,.17)*shell*(.30+.95*compression)*(1.-smoothstep(.55,.98,s));
     // The white supply ends near the throat; downstream compression remains a colored carrier.
     let hot=vec3f(10.,17.,8.)*axis*suppliedHot;
     let fringe=vec3f(.008,.18,.23)*frayed*(.25+.65*compression);
     integrated+=transmission*(cold+jade+hot+fringe)*1.5*.38;
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
