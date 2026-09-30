// OBS1 local spread, OBS2 source-bound aperture streak, OBS3 selected lens ghost.
struct Observe { viewport:vec4f, anchor:vec4f, clock:vec4f, controls:vec4f, optical:vec4f };
@group(0) @binding(0) var<uniform> o:Observe;
@group(0) @binding(1) var scene:texture_2d<f32>;
@group(0) @binding(2) var emission:texture_2d<f32>;
@group(0) @binding(3) var samp:sampler;
@vertex fn fullVertex(@builtin(vertex_index)i:u32)->@builtin(position)vec4f {let q=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));return vec4f(q[i],.5,1.);}
fn ramp(a:f32,b:f32,x:f32)->f32 {let q=clamp((x-a)/(b-a),0.,1.);return q*q*(3.-2.*q);}
fn live()->bool {return o.clock.z>.5&&o.clock.w>.5&&o.clock.y>=.9&&o.clock.x>=0.&&o.clock.x<o.clock.y;}
fn photons(pixel:vec2f)->vec3f {return textureSampleLevel(emission,samp,pixel/o.viewport.xy,0.).rgb;}
fn pointPixel(i:u32)->vec2f {let p=select(vec2f(-22.,-13.5),vec2f(22.,-16.),i==1u);return o.anchor.xy+p*vec2f(o.anchor.z,1.)*o.viewport.z/64.;}
fn envelope(i:u32)->f32 {let u=o.clock.x/o.clock.y;let at=select(.62,.71,i==1u);let width=select(.055,.065,i==1u);let q=(u-at)/width;if(abs(q)>=1.){return 0.;}let a=1.-q*q;return a*a*ramp(0.,.085,u)*(1.-ramp(.84,1.,u));}
fn near(pixel:vec2f)->vec3f {var result=vec3f(0.);var sum=0.;for(var y=-2;y<=2;y++){for(var x=-2;x<=2;x++){let w=exp(-f32(x*x+y*y)/2.4);result+=photons(pixel+vec2f(f32(x),f32(y))*2.*o.viewport.z/64.)*w;sum+=w;}}return result/sum*.24;}
fn cross(pixel:vec2f,src:vec2f,amp:f32)->vec3f {let d=(pixel-src)/(o.viewport.z/64.);let axis=vec2f(.913545458*d.x+.406736643*d.y,-.406736643*d.x+.913545458*d.y);let apod=(1.-ramp(9.,10.,abs(axis.x)))*(1.-ramp(4.,5.,abs(axis.y)));let shape=(exp(-axis.x*axis.x/34.-axis.y*axis.y/.16)+.72*exp(-axis.x*axis.x/.16-axis.y*axis.y/8.))*apod;return vec3f(4.8,4.8,4.4)*shape*amp;}
fn ghost(pixel:vec2f,src:vec2f,amp:f32)->vec3f {let C=o.optical.xy;let scale=o.viewport.z/64.;let axis=normalize(C-src+vec2f(.0001,0.));let minor=vec2f(-axis.y,axis.x);let at=C+.32*(C-src);let d=(pixel-at)/scale;let q=vec2f(dot(d,axis)/6.,dot(d,minor)/3.2);let r=length(q);let aperture=1.-ramp(.70,1.30,r);let transmission=aperture*(.42+.27*exp(-dot(q,q)));let offAxis=ramp(3.,30.,length(C-src)/scale);return vec3f(.89,.76,.42)*transmission*.018*amp*offAxis;}
@fragment fn finalFragment(@builtin(position)p:vec4f)->@location(0)vec4f {let base=textureSampleLevel(scene,samp,p.xy/o.viewport.xy,0.).rgb;var response=vec3f(0.);if(live()){response+=near(p.xy)*o.controls.x;if(o.controls.w>.5){for(var i=0u;i<2u;i++){let src=pointPixel(i);let radiation=photons(src);let energy=dot(radiation,vec3f(.2126,.7152,.0722));let survival=ramp(.15,.7,energy);let amp=envelope(i)*survival;response+=cross(p.xy,src,amp)*o.controls.y;response+=ghost(p.xy,src,energy*amp)*o.controls.z;}}}return vec4f(pow(max(base+response,vec3f(0.)),vec3f(1./2.2)),1.);}
