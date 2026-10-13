// Sol current-series R2: pressure core + broad interfaces + circulating mantle.
struct U { view:vec4f, anchors:vec4f, phase:vec4f, flags:vec4f, color:vec4f, geometry:vec4f, optics:vec4f, identity:vec4f };
@group(0) @binding(0) var<uniform> u:U;
@vertex fn vsMain(@builtin(vertex_index) i:u32)->@builtin(position) vec4f { let p=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));return vec4f(p[i],0.,1.); }

fn density(p:vec3f)->vec2f {
 let collapse=1.-.18*u.phase.y;let x=p.x/collapse;let z=p.z/collapse;
 let bedCenter=-.12+.06*u.phase.y;
 let q=length(vec3f(x/.64,(p.y-bedCenter)/.16,z/.36));
 let bedGate=1.-smoothstep(.95,1.09,q);
 let core=.28*max(0.,1.-q*q)*bedGate;
 let compression=.62*exp(-pow((q-.64)/.20,2.))*bedGate;
 let boundaryLayer=.40*exp(-pow((q-.92)/.095,2.))*bedGate;
 let radial=length(vec2f(x,z));let radius=.34-.075*clamp(p.y,0.,1.);
 let mantleGate=smoothstep(.025,.20,p.y)*(1.-smoothstep(.82,1.02,p.y));
 let wall=exp(-pow((radial-radius)/.11,2.))*mantleGate;
 let theta=atan2(z,x);
 // Low-frequency material transport stays positive, closed and source-clock-owned.
 let circulation=.67+.33*cos(2.*theta+3.6*p.y-u.phase.w);
 let angularResponse=.72+.28*(.5+.5*cos(theta+.6));
 let mantle=.52*wall*circulation*angularResponse*u.phase.x;
 let rho=(core+compression+boundaryLayer+mantle)*u.phase.z;
 let interfaceLight=(compression*.42+boundaryLayer*.76+mantle*.62)*u.phase.z;
 return vec2f(rho,interfaceLight);
}
@fragment fn fsMain(@builtin(position) frag:vec4f)->@location(0) vec4f {
 if(u.flags.x<.5||u.phase.z<=0.){return vec4f(0.);}
 let up=normalize(u.anchors.zw-u.anchors.xy);let right=vec2f(-up.y,up.x);
 let relative=(frag.xy-u.anchors.xy)/u.geometry.x;
 let pxy=vec2f(dot(relative,right),dot(relative,up));
 if(abs(pxy.x)>.83||pxy.y<-.36||pxy.y>1.13){return vec4f(0.);}
 var transmittance=1.;var light=vec3f(0.);let ds=u.geometry.z/48.;
 for(var i=0u;i<48u;i++){
  let z=-u.geometry.z*.5+(f32(i)+.5)*ds;
  let field=density(vec3f(pxy,z));let absorbed=1.-exp(-field.x*u.geometry.y*ds);
  // Colored pressure boundary; no broad white substitution for material depth.
  let chroma=mix(u.color.rgb,vec3f(.42,.90,.98),clamp(field.y/max(field.x,.00001)*.40,0.,.40));
  light+=transmittance*absorbed*chroma*u.color.w;transmittance*=1.-absorbed;
 }
 return vec4f(light,1.-transmittance);
}
