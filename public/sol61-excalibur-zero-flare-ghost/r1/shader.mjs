const ABI=`struct U { viewport:vec4f, ray:vec4f, geometry:vec4f, observer:vec4f, controls:vec4f, backdrop:vec4f, reserve0:vec4f, reserve1:vec4f }; @group(0) @binding(0) var<uniform> u:U;
struct V { @builtin(position) position:vec4f, @location(0) uv:vec2f }; 
@vertex fn vs(@builtin(vertex_index) i:u32)->V {var positions=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));var o:V;o.position=vec4f(positions[i],0.,1.);o.uv=vec2f((positions[i].x+1.)*.5,(1.-positions[i].y)*.5);return o;}
fn gauss(v:f32)->f32{return exp(-v*v);}
fn envelope(t:f32)->f32 {return select(0.,min(1.,t/55.)*pow(max(0.,1.-t/1200.),.7),t>=0.&&t<1200.);}`;
export const WORLD_WGSL=ABI+`
struct W { @location(0) radiance:vec4f, @location(1) keySource:vec4f };
@fragment fn fs(v:V)->W {
 let p=v.position.xy;let hand=u.ray.xy;let dir=u.geometry.xy;let delta=p-hand;
 let x=dot(delta,dir);let y=dot(delta,vec2f(-dir.y,dir.x));let L=length(u.ray.zw-hand);let w=u.geometry.z;let t=u.viewport.z;
 let gain=envelope(t)*u.viewport.w;let front=L*(1.-pow(1.-clamp((t-45.)/475.,0.,1.),2.));
 var light=vec3f(0.);var key=vec3f(0.);
 if(x>=0.&&x<=L&&abs(y)<=w&&gain>0.) {
   let aperture=gauss(x/max(1.,w*.32))*gauss(y/max(1.,w*.18));
   key=vec3f(28.,23.,19.)*aperture*gain*u.observer.z;
   let rel=clamp(x/max(1.,front),0.,1.);let ageBehind=max(0.,front-x);
   let bent=y/w-(.18*sin(rel*5.1-t*.002)+.16*sin(rel*2.4+t*.003))*sin(rel*3.14159);
   let breadth=.24+.57*pow(max(0.,sin(rel*3.14159)),.65);
   let sheet=gauss(bent/max(.06,breadth))*gauss(ageBehind/max(w,front*.55));
   let wake=sheet*(1.-smoothstep(front-1.2,front+1.2,x))*(.58+.42*sin(rel*4.8+.6));
   let edgeY=y/w-.24*sin(t*.004+rel*3.3);
   let leading=gauss((x-front)/max(1.,w*.14))*gauss(edgeY/.7);
   let release=1.-smoothstep(560.,1100.,t);
   light=key+gain*(vec3f(.65,.35,3.9)*wake*release+vec3f(13.,9.,6.)*leading*(.35+.65*release));
 }
 var o:W;o.radiance=vec4f(light,1.);o.keySource=vec4f(key,1.);return o;
}`;
export const POST_WGSL=ABI+`
@group(0) @binding(1) var radiance:texture_2d<f32>;
@group(0) @binding(2) var keySource:texture_2d<f32>;
@group(0) @binding(3) var linearSampler:sampler;
fn readKey(p:vec2f)->vec3f {return textureSampleLevel(keySource,linearSampler,clamp(p/u.viewport.xy,vec2f(0.),vec2f(1.)),0.).rgb;}
fn diaphragm(q:vec2f,r:f32)->f32 {let a=atan2(q.y,q.x);let rho=length(q/vec2f(1.18,.86))/r;let boundary=1.+.055*cos(6.*a);return gauss((rho-boundary)/.18)*.75+gauss(rho/.7)*.12;}
@fragment fn fs(v:V)->@location(0) vec4f {
 let p=v.position.xy;let hand=u.ray.xy;let dir=u.geometry.xy;let w=u.geometry.z;let center=u.observer.xy;
 // Samples the rendered hand aperture on the supported forward half of the authoritative ray.
 let key=(readKey(hand+dir*w*.08)+readKey(hand+dir*w*.2))*.5;
 let energy=dot(key,vec3f(.2126,.7152,.0722));let response=energy*u.observer.w;
 var color=textureSampleLevel(radiance,linearSampler,v.uv,0.).rgb+u.backdrop.rgb;
 let offset=hand-center;let angleLoss=1./(1.+dot(offset,offset)/max(1.,dot(u.viewport.xy,u.viewport.xy)));
 let d=p-hand;let range=max(1.,w);
 if(response>0.) {
  let near=gauss(length(d)/(range*1.65))*response*.023*u.controls.z;
  let horizontal=gauss(d.y/max(1.,w*.065))*exp(-abs(d.x)/(range*6.5));
  let diagonal=gauss((d.y-d.x*.32)/max(1.,w*.055))*exp(-length(d)/(range*3.));
  let flare=(horizontal*.038+diagonal*.014)*response*angleLoss*u.controls.x;
  // Two chosen weak internal-reflection paths; positions follow source/optical axis.
  let g1=center-offset*.68;let g2=center+offset*.22;
  let radius=max(3.,w*(1.3+length(offset)/max(1.,u.viewport.x)*.6));
  let ghost1=diaphragm(p-g1,radius)*response*.037*angleLoss*u.controls.y;
  let ghost2=gauss(length((p-g2)/vec2f(.9,1.12))/max(2.,w*.54))*response*.019*angleLoss*u.controls.y;
  color+=vec3f(1.,.69,.49)*(near+flare)+vec3f(.41,.48,1.)*ghost1+vec3f(1.,.42,.28)*ghost2;
 }
 let mapped=vec3f(1.)-exp(-max(vec3f(0.),color)*u.backdrop.w);
 return vec4f(pow(mapped,vec3f(1./2.2)),1.);
}`;
