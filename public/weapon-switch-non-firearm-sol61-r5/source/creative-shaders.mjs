import{PROFILES}from'./creative-model.mjs';
const colors=PROFILES.map(p=>`vec3f(${p.rgb.map(n=>String(n).includes('.')?n:n+'.0').join(',')})`).join(',');
const seats=PROFILES.map(p=>String(p.seat)).join(',');
const header=/*wgsl*/`
struct U{view:vec4f,state:vec4f,controls:vec4f,detail:vec4f};
@group(0) @binding(0) var<uniform> u:U;
struct V{@builtin(position)position:vec4f};
@vertex fn vs(@builtin(vertex_index)i:u32)->V{let p=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));var o:V;o.position=vec4f(p[i],0.,1.);return o;}
`;
export const WORLD_WGSL=header+/*wgsl*/`
const COLORS=array<vec3f,6>(${colors});
const SEATS=array<f32,6>(${seats});
fn box(p:vec2f,c:vec2f,r:vec2f)->f32{let d=abs(p-c)-r;return length(max(d,vec2f(0.)))+min(max(d.x,d.y),0.);}
fn segment(p:vec2f,a:vec2f,b:vec2f)->f32{let d=b-a;return length(p-a-d*clamp(dot(p-a,d)/dot(d,d),0.,1.));}
fn cross2(a:vec2f,b:vec2f)->f32{return a.x*b.y-a.y*b.x;}
fn tri(p:vec2f,a:vec2f,b:vec2f,c:vec2f)->f32{let z=vec3f(cross2(b-a,p-a),cross2(c-b,p-b),cross2(a-c,p-c));let d=min(segment(p,a,b),min(segment(p,b,c),segment(p,c,a)));return select(d,-d,all(z>=vec3f(0.))||all(z<=vec3f(0.)));}
fn shape(p:vec2f,v:u32)->f32{
 if(v==0u){return min(tri(p,vec2f(-.045,.14),vec2f(.045,.14),vec2f(0.,-.48)),min(box(p,vec2f(0.,.14),vec2f(.17,.025)),min(box(p,vec2f(0.,.28),vec2f(.027,.13)),length(p-vec2f(0.,.42))-.04)));}
 if(v==1u){return min(box(p,vec2f(-.02,0.),vec2f(.37,.09)),min(box(p,vec2f(-.43,0.),vec2f(.07,.15)),min(box(p,vec2f(.36,0.),vec2f(.065,.13)),min(box(p,vec2f(-.10,.155),vec2f(.035,.08)),box(p,vec2f(-.32,.12),vec2f(.08,.04))))));}
 if(v==2u){return min(segment(p,vec2f(0.,-.27),vec2f(0.,.31))-.055,min(tri(p,vec2f(0.,-.50),vec2f(-.065,-.26),vec2f(.065,-.26)),min(tri(p,vec2f(0.,.19),vec2f(-.18,.38),vec2f(0.,.31)),min(tri(p,vec2f(0.,.19),vec2f(.18,.38),vec2f(0.,.31)),min(tri(p,vec2f(0.,-.05),vec2f(-.12,.06),vec2f(0.,.02)),tri(p,vec2f(0.,-.05),vec2f(.12,.06),vec2f(0.,.02)))))));}
 if(v==3u){return min(box(p,vec2f(-.26,.02),vec2f(.10,.12)),min(box(p,vec2f(.10,-.13),vec2f(.34,.025)),min(box(p,vec2f(.10,.13),vec2f(.34,.025)),min(box(p,vec2f(-.27,.21),vec2f(.045,.09)),min(box(p,vec2f(-.17,0.),vec2f(.025,.13)),box(p,vec2f(.27,0.),vec2f(.020,.13)))))));}
 if(v==4u){return min(box(p,vec2f(-.23,0.),vec2f(.18,.11)),min(abs(length(p-vec2f(.18,0.))-.17)-.04,min(box(p,vec2f(-.04,0.),vec2f(.07,.06)),box(p,vec2f(-.29,.18),vec2f(.05,.08)))));}
 return min(tri(p,vec2f(-.11,.05),vec2f(.11,.05),vec2f(0.,-.52)),min(box(p,vec2f(0.,.10),vec2f(.22,.025)),min(tri(p,vec2f(-.25,.10),vec2f(-.09,.07),vec2f(-.18,.17)),min(tri(p,vec2f(.25,.10),vec2f(.09,.07),vec2f(.18,.17)),min(box(p,vec2f(0.,.30),vec2f(.035,.17)),length(p-vec2f(0.,.48))-.05)))));
}
fn project(p:vec2f,v:u32,t:f32)->vec3f{
 let a=smoothstep(.07,SEATS[v],t);let travel=select(1.,.22,u.state.w>.5);var q=p;var mask=1.;
 if(v==0u){let front=.46-1.05*a;mask=smoothstep(front-.015,front+.015,p.y);}
 if(v==1u){q.x-=sign(p.x)*.22*(1.-a)*travel;}
 if(v==2u){q.y-=sign(p.y)*.24*(1.-a)*travel;}
 if(v==3u){q.y-=sign(p.y)*.18*(1.-a)*travel;}
 if(v==4u){let angle=sign(p.y)*.24*(1.-a)*travel;let c=cos(angle);let s=sin(angle);q=vec2f(c*p.x+s*p.y,-s*p.x+c*p.y);}
 if(v==5u){q.x-=sign(p.x)*.17*(1.-a)*travel;}
 if(v==1u||v==5u){mask*=mix(smoothstep(.003,.018,abs(p.x)),1.,a);}
 if(v==2u||v==3u||v==4u){mask*=mix(smoothstep(.003,.018,abs(p.y)),1.,a);}
 return vec3f(q,mask);
}
struct F{@location(0)main:vec4f,@location(1)radiance:vec4f};
@fragment fn fs(v:V)->F{
 var out:F;out.main=vec4f(0.);out.radiance=vec4f(0.);
 let t=u.state.x;if(u.controls.w<.5||u.controls.x<.5||u.controls.y<.5||t<0.||t>=.78||u.state.y<=0.){return out;}
 let p=(v.position.xy-u.view.zw)/u.state.y;if(any(abs(p)>vec2f(.78))){return out;}
 let kind=u32(clamp(round(u.state.z),0.,5.));let q=project(p,kind,t);let d=shape(q.xy,kind);
 let aa=max(1./u.state.y,.002);let envelope=smoothstep(.02,.085,t)*(1.-smoothstep(.52,.78,t));
 let inside=(1.-smoothstep(-aa,aa,d))*q.z*envelope;
 let edge=(1.-smoothstep(aa,aa+.015,abs(d)))*q.z*envelope;
 let seat=SEATS[kind];let contact=smoothstep(seat-.02,seat,t)*(1.-smoothstep(seat+.045,seat+.12,t));
 // Confirmation light stays inside the selected schema: no muzzle flash,
 // projectile, beam, stored charge, cast circle or performance indication.
 let registration=exp(-pow((q.y+(.45-.90*smoothstep(.07,seat,t)))/.055,2.))*inside;
 let rgb=COLORS[kind]*(inside*.16+edge*(.85+2.8*contact)+registration*.60);
 let alpha=1.-exp(-(inside*.40+edge*.90)*1.6);
 out.main=vec4f(rgb,alpha);out.radiance=vec4f(rgb,0.);return out;
}`;
export const OBSERVER_WGSL=header+/*wgsl*/`
@group(0) @binding(1) var mainTexture:texture_2d<f32>;
@group(0) @binding(2) var sourceTexture:texture_2d<f32>;
@group(0) @binding(3) var linearSampler:sampler;
fn sourceAt(px:vec2f)->vec3f{let uv=px/u.view.xy;if(any(uv<vec2f(0.))||any(uv>vec2f(1.))){return vec3f(0.);}return textureSampleLevel(sourceTexture,linearSampler,uv,0.).rgb;}
fn psf(px:vec2f,r:f32)->vec3f{let offsets=array<vec2f,9>(vec2f(-1.,-1.),vec2f(0.,-1.),vec2f(1.,-1.),vec2f(-1.,0.),vec2f(0.),vec2f(1.,0.),vec2f(-1.,1.),vec2f(0.,1.),vec2f(1.,1.));let weights=array<f32,9>(1.,2.,1.,2.,4.,2.,1.,2.,1.);var sum=vec3f(0.);for(var i=0u;i<9u;i++){sum+=sourceAt(px+offsets[i]*r)*weights[i]/16.;}return sum;}
@fragment fn fs(v:V)->@location(0)vec4f{
 if(u.controls.w<.5||u.controls.x<.5||u.controls.y<.5||u.state.x<0.||u.state.x>=.78){return vec4f(0.);}
 let px=v.position.xy;let main=textureSampleLevel(mainTexture,linearSampler,px/u.view.xy,0.);var halo=vec3f(0.);
 if(u.controls.z>.5){let r=max(1.,u.state.y*.018);halo=psf(px,r)*.20+psf(px,r*2.4)*.08;}
 let alpha=main.a+(1.-main.a)*(1.-exp(-dot(halo,vec3f(.2126,.7152,.0722))));
 // Linear HDR emission and premultiplied alpha; shared final composite
 // encodes once. No lens ghost is selected for this modest digital cue.
 return vec4f(main.rgb+halo,alpha);
}`;
