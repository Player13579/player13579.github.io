// Fresh ADDONE Levitation: actual measured body/feet axis, no floor or engine.
struct U { view:vec4f, anchors:vec4f, phase:vec4f, flags:vec4f, color:vec4f, geometry:vec4f, optics:vec4f, identity:vec4f };
@group(0) @binding(0) var<uniform> u:U;
@vertex fn vsMain(@builtin(vertex_index) i:u32)->@builtin(position) vec4f { let p=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));return vec4f(p[i],0.,1.); }

fn density(p:vec3f)->vec2f {
 let collapse=1.-.20*u.phase.y;let x=p.x/collapse;let z=p.z/collapse;
 let bedCenter=-.12+.06*u.phase.y;
 let q=length(vec3f(x/.64,(p.y-bedCenter)/.16,z/.36));
 let bedGate=1.-smoothstep(.90,1.08,q);
 let bedCore=.32*max(0.,1.-q*q)*bedGate;
 let pressure=.68*exp(-pow((q-.78)/.14,2.))*bedGate;
 let radial=length(vec2f(x,z));let radius=.34-.075*clamp(p.y,0.,1.);
 let mantleGate=smoothstep(.025,.20,p.y)*(1.-smoothstep(.82,1.02,p.y));
 let wall=exp(-pow((radial-radius)/.11,2.))*mantleGate;
 let theta=atan2(z,x);
 // Broad positive lobes circulate continuously within one closed support mantle.
 let circulation=.77+.23*cos(2.*theta+3.6*p.y-u.phase.w);
 let mantle=.30*wall*circulation*u.phase.x;
 let rho=(bedCore+pressure+mantle)*u.phase.z;
 let crease=(pressure*.72+mantle*.23)*u.phase.z;
 return vec2f(rho,crease);
}
@fragment fn fsMain(@builtin(position) frag:vec4f)->@location(0) vec4f {
 if(u.flags.x<.5||u.phase.z<=0.){return vec4f(0.);}
 let up=normalize(u.anchors.zw-u.anchors.xy);let right=vec2f(-up.y,up.x);
 let relative=(frag.xy-u.anchors.xy)/u.geometry.x;
 let pxy=vec2f(dot(relative,right),dot(relative,up));
 if(abs(pxy.x)>.83||pxy.y<-.36||pxy.y>1.13){return vec4f(0.);}
 var transmittance=1.;var light=vec3f(0.);
 let ds=u.geometry.z/32.;
 for(var i=0u;i<32u;i++){
  let z=-u.geometry.z*.5+(f32(i)+.5)*ds;
  let field=density(vec3f(pxy,z));let extinction=field.x*u.geometry.y;
  let opticalDepth=extinction*ds;let absorbed=1.-exp(-opticalDepth);
  let chroma=mix(u.color.rgb,vec3f(.78,.98,1.),clamp(field.y/max(field.x,.00001)*.48,0.,.48));
  light+=transmittance*absorbed*chroma*u.color.w;
  transmittance*=1.-absorbed;
 }
 return vec4f(light,1.-transmittance);
}
