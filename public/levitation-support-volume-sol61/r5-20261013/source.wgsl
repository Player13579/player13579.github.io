// Sol current-series R5: steady medium and meridional source-excitation transport.
struct U { view:vec4f, anchors:vec4f, phase:vec4f, flags:vec4f, color:vec4f, geometry:vec4f, optics:vec4f, identity:vec4f };
@group(0) @binding(0) var<uniform> u:U;
@vertex fn vsMain(@builtin(vertex_index) i:u32)->@builtin(position) vec4f { let p=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));return vec4f(p[i],0.,1.); }

fn density(p:vec3f)->vec3f {
 let collapse=1.-.18*u.phase.y;let x=p.x/collapse;let z=p.z/collapse;
 let bedCenter=u.optics.z+.10*u.phase.y;let halfHeight=u.optics.w*(1.-.15*u.phase.y);
 let q=length(vec3f(x/.64,(p.y-bedCenter)/halfHeight,z/.36));
 let bedGate=1.-smoothstep(.95,1.09,q);
 let core=.28*max(0.,1.-q*q)*bedGate;
 let compression=.62*exp(-pow((q-.64)/.20,2.))*bedGate;
 let boundaryLayer=.40*exp(-pow((q-.92)/.095,2.))*bedGate;
 let radial=length(vec2f(x,z));let radius=.34-.075*clamp(p.y,0.,1.);
 let mantleGate=smoothstep(.025,.20,p.y)*(1.-smoothstep(.82,1.02,p.y));
 let wall=exp(-pow((radial-radius)/.11,2.))*mantleGate;
 let theta=atan2(z,x);
 // Low-frequency material transport stays positive, closed and source-clock-owned.
 // Sustained medium mass is phase-independent; only excitation travels.
 let angularResponse=.72+.28*(.5+.5*cos(theta+.6));
 let mantle=.60*wall*.78*angularResponse*u.phase.x;
 let rho=(core+compression+boundaryLayer+mantle)*u.phase.z;
 let nearFace=clamp(.5-.5*z/.36,0.,1.);
 let interfaceLight=(compression*.42+boundaryLayer*(.52+.30*nearFace)+mantle*.62)*u.phase.z;
 let mantleShare=mantle/max(core+compression+boundaryLayer+mantle,.000001);
 return vec3f(rho,interfaceLight,mantleShare);
}
// Relative HG phase has sphere-average1; it redistributes existing emission.
// Light path: current pressure core -> this medium cell -> orthographic observer.
fn mediumResponse(p:vec3f)->f32 {
 let core=vec3f(0.,u.optics.z+.10*u.phase.y,0.);
 let lightPath=p-core;let squaredDistance=dot(lightPath,lightPath);
 let incoming=lightPath/sqrt(max(squaredDistance,.000000000001));
 let outgoingToObserver=vec3f(0.,0.,-1.);
 let cosine=clamp(dot(incoming,outgoingToObserver),-1.,1.);
 let g=clamp(u.identity.y,-.70,.70);
 let relativeHG=(1.-g*g)/pow(1.+g*g-2.*g*cosine,1.5);
 // Finite emissive core: isotropic at origin, smooth directional response outside.
 let directionalWeight=smoothstep(0.,max(.0001,u.identity.w),sqrt(squaredDistance));
 let redistributed=mix(1.,relativeHG,directionalWeight);
 return mix(1.,redistributed,clamp(u.identity.z,0.,1.));
}
// Closed meridional cells: radial/height return-flow, no velocity or game-force claim.
fn excitationResponse(p:vec3f,mantleShare:f32)->f32 {
 let radial=length(p.xz);
 let cell=vec2f((radial-.22)/.16,(p.y-.38)/.50);
 let squaredRadius=dot(cell,cell);
 if(squaredRadius<=.00000001){return 1.;}
 let angle=atan2(cell.y,cell.x);
 let loopWeight=smoothstep(0.,.25,sqrt(squaredRadius));
 let intrinsicShare=1.-clamp(u.identity.z,0.,1.);
 // Two broad excitation fronts; angle speed=source phase speed/2.
 let phase=2.*angle-u.phase.w;
 return 1.+intrinsicShare*clamp(mantleShare,0.,1.)*loopWeight*cos(phase);
}
@fragment fn fsMain(@builtin(position) frag:vec4f)->@location(0) vec4f {
 if(u.flags.x<.5||u.phase.z<=0.){return vec4f(0.);}
 let up=normalize(u.anchors.zw-u.anchors.xy);let right=vec2f(-up.y,up.x);
 let relative=(frag.xy-u.anchors.xy)/u.geometry.x;
 let pxy=vec2f(dot(relative,right),dot(relative,up));
 if(abs(pxy.x)>.83||pxy.y<-.50||pxy.y>1.13){return vec4f(0.);}
 var transmittance=1.;var light=vec3f(0.);let ds=u.geometry.z/48.;
 for(var i=0u;i<48u;i++){
  let z=-u.geometry.z*.5+(f32(i)+.5)*ds;
  let cell=vec3f(pxy,z);let field=density(cell);let absorbed=1.-exp(-field.x*u.geometry.y*ds);
  // Colored pressure boundary; no broad white substitution for material depth.
  let chroma=mix(u.color.rgb,vec3f(.42,.90,.98),clamp(field.y/max(field.x,.00001)*.40,0.,.40));
  light+=transmittance*absorbed*chroma*u.color.w*mediumResponse(cell)*excitationResponse(cell,field.z);transmittance*=1.-absorbed;
 }
 return vec4f(light,1.-transmittance);
}
