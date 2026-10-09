const COMMON=/* wgsl */`
struct U{view:vec4f,origin:vec4f,discharge:vec4f,gas:vec4f,flags:vec4f,actor:vec4f,budget:vec4f,metal:vec4f}
@group(0) @binding(0) var<uniform> u:U;
struct V{@builtin(position) position:vec4f,@location(0) uv:vec2f}
@vertex fn vs(@builtin(vertex_index) id:u32)->V{var points=array<vec2f,3>(vec2f(-1.0,-1.0),vec2f(3.0,-1.0),vec2f(-1.0,3.0));var v:V;v.position=vec4f(points[id],0.0,1.0);v.uv=points[id]*vec2f(.5,-.5)+vec2f(.5);return v;}
fn sdfCapsule(p:vec2f,a:vec2f,b:vec2f,r:f32)->f32{let ba=b-a;let pa=p-a;return length(pa-ba*clamp(dot(pa,ba)/dot(ba,ba),0.0,1.0))-r;}
fn cover(distance:f32)->f32{return 1.0-smoothstep(-.65/u.view.z,.65/u.view.z,distance);}
fn sourceIllumination(p:vec2f)->vec3f{let range=dot(p,p)+81.0;return vec3f(1.0,.88,.56)*u.discharge.x*1800.0/range;}
fn steelReflection(n:vec3f,v:vec3f,l:vec3f)->vec3f{
 let nl=max(0.0,dot(n,l));let nv=max(.0001,dot(n,v));let h=normalize(v+l);let nh=max(0.0,dot(n,h));let vh=max(0.0,dot(v,h));
 let a2=pow(u.metal.w,4.0);let d=a2/(3.14159265*pow(nh*nh*(a2-1.0)+1.0,2.0));let gv=2.0*nv/(nv+sqrt(a2+(1.0-a2)*nv*nv));let gl=2.0*nl/max(.0001,nl+sqrt(a2+(1.0-a2)*nl*nl));
 let f=u.metal.xyz+(vec3f(1.0)-u.metal.xyz)*pow(1.0-vh,5.0);return f*d*gv*gl/(4.0*nv);
}
`;
export const WORLD=COMMON+/* wgsl */`
struct O{@location(0) world:vec4f,@location(1) source:vec4f}
@fragment fn fs(v:V)->O{
 let p=(v.position.xy-u.origin.xy)/u.view.z;let t=max(0.0,u.view.w);let phenomenonActive=u.origin.w;
 var rgb=vec3f(.026,.032,.039);var radiation=vec3f(0.0);
 let radialDistance=length(p);let pressureBand=exp(-pow((radialDistance-u.discharge.z)/max(2.1,3.6*(1.0-t/230.0)),2.0))*u.discharge.w;
 // Neutral floor is a diagnostic receiver. Gas index-gradient displacement
 // samples that existing plane; pressure is not an emissive ornamental ring.
 if(u.flags.y>.5){let floorPoint=p+p/max(radialDistance,1.0)*pressureBand*1.9;let tile=abs(fract((floorPoint+vec2f(24.0))/48.0)-.5)*48.0;let seams=1.0-smoothstep(.25,.8,min(tile.x,tile.y));rgb=mix(rgb,vec3f(.037,.044,.052),seams*.32);rgb+=sourceIllumination(p)*vec3f(.18,.20,.22)/3.14159265*phenomenonActive;}
 if(phenomenonActive>.5){
  // One cylindrical casing, cold steel normal/roughness and two existing vent mouths.
  let casing=cover(sdfCapsule(p,vec2f(0.0,-4.0),vec2f(0.0,4.0),4.3));
  let nx=clamp(p.x/4.3,-.99,.99);let n=normalize(vec3f(nx,0.0,sqrt(max(.001,1.0-nx*nx))));let view=vec3f(0.0,0.0,1.0);
  let metal=vec3f(.028,.031,.035)+steelReflection(n,view,normalize(vec3f(-.4,-.6,1.0)))*.75+sourceIllumination(p)*u.metal.xyz*.08;
  rgb=mix(rgb,metal,casing*(1.0-smoothstep(120.0,260.0,t)));
  let vent=cover(sdfCapsule(p,vec2f(-2.8,-4.0),vec2f(2.8,-4.0),.85))+cover(sdfCapsule(p,vec2f(-2.8,4.0),vec2f(2.8,4.0),.85));
  let flashShape=exp(-dot(p/vec2f(7.0,10.0),p/vec2f(7.0,10.0))*1.8)*(1.0-smoothstep(22.0,24.0,length(p)));
  let discharge=vec3f(1.0,.93,.71)*(flashShape*u.discharge.x*24.0+vent*u.discharge.y*3.2);
  radiation+=discharge;rgb+=discharge;
  // Expanding/diluting hot gas: absorption optical depth separate from emission.
  let size=u.gas.y;let height=u.gas.z;
  let q0=(p-vec2f(-3.0,-height))/vec2f(size*.9,size*.65);let q1=(p-vec2f(4.5,-height-4.0))/vec2f(size*.7,size*.84);
  let puff0=exp(-dot(q0,q0)*2.0)*(1.0-smoothstep(2.75,3.0,length(q0)));let puff1=exp(-dot(q1,q1)*2.0)*(1.0-smoothstep(2.75,3.0,length(q1)));
  let density=(puff0+.65*puff1)*u.gas.x*pow(6.0/size,2.0);
  let tau=density*.86;let transmittance=exp(-tau);let smoke=vec3f(.22,.205,.185)+sourceIllumination(p)*vec3f(.085,.078,.064);
  // Smooth albedo response is visible after source loss; no noise carpet/point sprites.
  rgb=rgb*transmittance+smoke*(1.0-transmittance);
  radiation*=transmittance;
  let hot=(puff0+.35*puff1)*u.discharge.y*.7;
  let gasEmission=vec3f(1.0,.30,.055)*hot;radiation+=gasEmission;rgb+=gasEmission;
 }
 // Supplied neutral person fixture. Real actor geometry/game integration is separate.
 if(u.flags.y>.5){let q=(v.position.xy-u.actor.xy)/u.actor.z;let head=length(q-vec2f(0.0,-.863))-.105;let trunk=sdfCapsule(q,vec2f(0.0,-.63),vec2f(0.0,-.35),.15);let legs=min(sdfCapsule(q,vec2f(-.075,-.30),vec2f(-.10,-.02),.052),sdfCapsule(q,vec2f(.075,-.30),vec2f(.10,-.02),.052));let body=1.0-smoothstep(-.006,.006,min(head,min(trunk,legs)));let skin=vec3f(.22,.265,.30)+sourceIllumination(p)*vec3f(.19,.22,.24)*phenomenonActive;rgb=mix(rgb,skin,body);radiation*=1.0-body;}
 var o:O;o.world=vec4f(rgb,1.0);o.source=vec4f(radiation,0.0);return o;
}
`;
export const OPTICS=COMMON+/* wgsl */`
@group(0) @binding(1) var radiators:texture_2d<f32>;
@group(0) @binding(2) var samplerLinear:sampler;
fn sourceAt(uv:vec2f)->vec3f{if(any(uv<vec2f(0.0))||any(uv>vec2f(1.0))){return vec3f(0.0);}return textureSampleLevel(radiators,samplerLinear,uv,0.0).rgb;}
@fragment fn fs(v:V)->@location(0) vec4f{
 var result=vec3f(0.0);if(u.origin.w<.5||u.gas.w<.5||u.flags.x<.5){return vec4f(result,0.0);}
 var near=vec3f(0.0);var normNear=0.0;
 for(var y=-4;y<=4;y++){for(var x=-4;x<=4;x++){let offset=vec2f(f32(x),f32(y));let weight=exp(-dot(offset,offset)/8.0);near+=sourceAt(v.uv+offset*u.budget.w*u.view.z/u.view.xy)*weight;normNear+=weight;}}
 var streak=vec3f(0.0);var normStreak=0.0;
 // Selected analytic horizontal pupil response; no unsupported ghost/rainbow quota.
 for(var k=-12;k<=12;k++){let along=f32(k)/12.0*u.budget.z;let weight=exp(-abs(along)/5.3);streak+=sourceAt(v.uv+vec2f(along*u.view.z/u.view.x,0.0))*weight;normStreak+=weight;}
 result=near/normNear*u.budget.x+streak/normStreak*u.budget.y;return vec4f(result,0.0);
}
`;
export const POST=COMMON+/* wgsl */`
@group(0) @binding(1) var scene:texture_2d<f32>;
@group(0) @binding(2) var radiators:texture_2d<f32>;
@group(0) @binding(3) var optical:texture_2d<f32>;
@group(0) @binding(4) var samplerLinear:sampler;
fn transfer(x:vec3f)->vec3f{return select(12.92*x,1.055*pow(x,vec3f(1.0/2.4))-.055,x>vec3f(.0031308));}
@fragment fn fs(v:V)->@location(0) vec4f{
 var rgb=textureSampleLevel(scene,samplerLinear,v.uv,0.0).rgb;
 if(u.origin.w>.5&&u.gas.w>.5&&u.flags.x>.5){let source=textureSampleLevel(radiators,samplerLinear,v.uv,0.0).rgb;rgb=max(vec3f(0.0),rgb-source*(u.budget.x+u.budget.y))+textureSampleLevel(optical,samplerLinear,v.uv,0.0).rgb;}
 // A single stable exposure, common RGB compression preserves the hot color role.
 let peak=max(rgb.r,max(rgb.g,rgb.b));let compressed=rgb/(1.0+peak*.13);return vec4f(transfer(max(vec3f(0.0),compressed)),1.0);
}
`;
