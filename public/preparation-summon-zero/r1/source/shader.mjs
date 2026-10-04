// Original procedural world light and source-local response. No raster sampler.
export const TARGET_FORMAT = 'rgba16float';
export const WORLD_WGSL = /* wgsl */ `
struct U { viewport:vec4f, source:vec4f, gates:vec4f, reserved:vec4f };
@group(0) @binding(0) var<uniform> u:U;
struct V { @builtin(position) p:vec4f };
@vertex fn vs(@builtin(vertex_index) i:u32)->V {
 var q=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));
 var v:V; v.p=vec4f(q[i],0.,1.); return v;
}
fn bell(x:f32,w:f32)->f32 { return exp(-0.5*x*x/(w*w)); }
struct O { @location(0) radiance:vec4f, @location(1) sourceKey:vec4f };
@fragment fn fs(v:V)->O {
 var o:O; o.radiance=vec4f(0.); o.sourceKey=vec4f(0.);
 let age=u.source.z;
 if(u.gates.x<0.5 || age<0. || age>=980.) { return o; }
 let p=(v.p.xy-u.source.xy)/u.viewport.z;
 let aa=max(0.25,0.7/u.viewport.z);
 let intro=smoothstep(0.,95.,age);
 let exit=1.-smoothstep(800.,980.,age);
 let birth=smoothstep(55.,260.,age);
 let landing=bell(age-625.,90.);
 let floorEnvelope=intro*exit*(0.75+0.25*landing);
 let theta=atan2(p.y/0.42,p.x);
 let radius=length(vec2f(p.x,p.y/0.42));
 let theta01=fract((theta+3.14159265)/6.2831853);
 let reveal=select(smoothstep(theta01-0.035,theta01+0.035,birth),1.,u.gates.y>0.5);
 let rimCore=bell(radius-29.,max(0.48,aa));
 let rimBody=bell(radius-29.,1.65);
 // Six broad inward sockets make a magic circle, rather than a status gauge.
 let petals=pow(max(cos(theta*6.),0.),6.)*bell(radius-18.,4.2);
 let innerCore=bell(radius-10.5,0.55+aa*0.3);
 let innerBody=bell(radius-10.5,1.4);
 let socketCore=pow(max(cos(theta*6.),0.),15.)*bell(radius-19.,1.8);
 let coverage=1.-smoothstep(32.,34.+aa,radius);
 let core=(rimCore*reveal+innerCore*birth*0.55+socketCore*birth*0.8)*coverage;
 let body=(rimBody*reveal+innerBody*birth*0.45+petals*birth*0.75)*coverage;
 let white=vec3f(1.,0.93,0.79);
 let cyan=vec3f(0.055,0.49,0.85);
 let violet=vec3f(0.25,0.09,0.57);
 let floorLight=(white*core*18.+cyan*body*5.+violet*petals*2.5)*floorEnvelope;
 // Finite, hollow arrival mantle. Integrate a local analytic medium in depth.
 // It is a chosen fantasy light field, not simulated matter or actual teleportation.
 var mantle=vec3f(0.); var trans=1.;
 let top=select(18.+38.*smoothstep(80.,430.,age),48.,u.gates.y>0.5);
 let rise=clamp(-p.y/top,0.,1.);
 let ySupport=(1.-smoothstep(-3.,3.,p.y))*(1.-smoothstep(top-4.,top+aa,-p.y));
 let mantleEnvelope=intro*birth*(1.-smoothstep(620.,920.,age));
 let shellRadius=20.-7.*rise+2.5*sin(rise*3.14159265);
 let sheetPhase=select(age*0.016-rise*11.,0.,u.gates.y>0.5);
 let transport=select(0.55+0.45*pow(0.5+0.5*cos(sheetPhase),3.),0.72,u.gates.y>0.5);
 for(var k=0u;k<12u;k=k+1u) {
  let z=-24.+(f32(k)+0.5)*4.;
  let r=length(vec2f(p.x,z));
  let shell=bell(r-shellRadius,2.6);
  let density=shell*ySupport*mantleEnvelope*transport*0.027;
  let absorb=1.-exp(-density*4.);
  let hot=bell(r-shellRadius,0.85)*0.22;
  let material=mix(cyan,violet,rise*0.78)+white*hot;
  mantle+=trans*absorb*material*7.5;
  trans*=1.-absorb;
 }
 let radiance=(floorLight+mantle)*u.source.w;
 // Key is source radiance, not an independently pulsing painted halo.
 o.radiance=vec4f(radiance,1.-exp(-max(max(radiance.r,radiance.g),radiance.b)));
 o.sourceKey=vec4f(floorLight*u.source.w,1.);
 return o;
}`;
export const POST_WGSL = /* wgsl */ `
struct U { viewport:vec4f, source:vec4f, gates:vec4f, reserved:vec4f };
@group(0) @binding(0) var<uniform> u:U;
@group(0) @binding(1) var world:texture_2d<f32>;
@group(0) @binding(2) var key:texture_2d<f32>;
struct V { @builtin(position) p:vec4f };
@vertex fn vs(@builtin(vertex_index) i:u32)->V {
 var q=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));
 var v:V; v.p=vec4f(q[i],0.,1.); return v;
}
fn loadKey(p:vec2i)->vec3f {
 let size=vec2i(textureDimensions(key));
 if(any(p<vec2i(0)) || any(p>=size)) {return vec3f(0.);}
 return textureLoad(key,p,0).rgb;
}
@fragment fn fs(v:V)->@location(0) vec4f {
 if(u.gates.x<0.5 || u.source.z<0. || u.source.z>=980.) { return vec4f(0.); }
 let pixel=vec2i(v.p.xy); let body=textureLoad(world,pixel,0).rgb;
 var near=vec3f(0.);
 let stepPx=max(1,i32(round(3.5*u.viewport.z)));
 // Source-local 7-world-unit reach, fixed bounded convolution. No flare/ghost selected.
 for(var y=-2;y<=2;y=y+1) {
  for(var x=-2;x<=2;x=x+1) {
   let weight=exp(-0.65*f32(x*x+y*y));
   near+=loadKey(pixel+vec2i(x,y)*stepPx)*weight*0.055;
  }
 }
 let light=body+near*u.gates.z;
 let mapped=vec3f(1.)-exp(-light);
 let alpha=1.-exp(-max(max(light.r,light.g),light.b));
 // Straight alpha output. Host must use src-alpha/one-minus-src-alpha.
 return vec4f(pow(max(mapped,vec3f(0.)),vec3f(1./2.2)),alpha);
}`;
