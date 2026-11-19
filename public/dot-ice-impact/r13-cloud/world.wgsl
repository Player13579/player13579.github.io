struct U{ time:f32, zoom:f32, width:f32,height:f32, cx:f32,cy:f32, source:f32,near:f32 };
@group(0) @binding(0) var<uniform> u:U;
@group(0) @binding(1) var<storage,read> lights:array<vec4f>;
@group(0) @binding(2) var scene:texture_2d<f32>;
struct V{@builtin(position) clip:vec4f,@location(0) p:vec3f,@location(1) n:vec3f,@location(2) info:vec4f,@location(3) local:vec3f,@location(4) eyeLocal:vec3f,@location(5) localFace:vec4f};
fn project(p:vec3f)->vec4f{let px=64.0/(1.778*.92)*u.zoom;return vec4f((p.x-u.cx)*px/(u.width*.5),(p.y*.92-p.z*.39191836-u.cy)*px/(u.height*.5),.5-(p.y*.39191836+p.z*.92)*.008,1);}
@vertex fn vs(@location(0)p:vec3f,@location(1)n:vec3f,@location(2)info:vec4f,@location(3)local:vec3f,@location(4)eyeLocal:vec3f,@location(5)localFace:vec4f)->V{var o:V;o.clip=project(p);o.p=p;o.n=n;o.info=info;o.local=local;o.eyeLocal=eyeLocal;o.localFace=localFace;return o;}
// R9: finite convex-piece exit, never an unbounded fracture plane.
fn cloudAt(p:vec3f)->f32{
 let along=p.x*.72+p.z*.69;
 let taper=1.0-smoothstep(-.04,.24,along);
 let inward=.29-p.y;
 let width=.045+.075*taper;
 let center=.033+width*.63;
 return taper*exp(-pow((inward-center)/width,2.0))*smoothstep(.018,.045,inward);
}
fn pieceExit(p:vec3f,ray:vec3f,id:u32,whole:bool)->vec2f{
 var planes=array<vec4f,14>(vec4f(1,0,0,.31),vec4f(-1,0,0,.27),vec4f(0,1,0,.29),vec4f(0,-1,0,.23),vec4f(0,0,1,.26),vec4f(0,0,-1,.22),vec4f(1,1,0,.50),vec4f(-1,1,0,.46),vec4f(0,1,1,.47),vec4f(0,1,-1,.43),vec4f(1,0,1,.48),vec4f(-1,0,-1,.41),vec4f(1,.16,.1,.02),vec4f(.1,.72,1,.045));
 planes[12]*=select(-1.0,1.0,(id%2u)==1u);
 planes[13]*=select(-1.0,1.0,id>=2u);
 var distance=100.0;var isCut=0.0;
 for(var i=0u;i<select(14u,12u,whole);i++){
  let denom=dot(planes[i].xyz,ray);
  if(denom>0.00001){let t=(planes[i].w-dot(planes[i].xyz,p))/denom;
   if(t>0.0001&&t<distance){distance=t;isCut=select(0.0,1.0,i>=12u);}
  }
 }
 return vec2f(distance,isCut);
}
@fragment fn fs(v:V)->@location(0)vec4f{if(v.info.x<-.5){return vec4f(.55,.55,.55,1);}let n=normalize(v.n);let eye=normalize(vec3f(0,.39191836,.92));let l=normalize(vec3f(-.45,.8,.7));let diffuse=.22+.78*max(0,dot(n,l));let fr=.025+.975*pow(1-abs(dot(n,eye)),5);let spec=pow(max(0,dot(reflect(-l,n),eye)),select(30.0,8.0,v.info.x>.5));
 // Approximate thickness from equal-volume diameter and incidence, not scene refraction.
 let samplingThickness=v.info.w/max(.32,abs(dot(n,eye)));
 // R13: use the first finite exit of this convex solid for absorption/scattering only.
 // At intact start / reduced motion, ignore internal partition planes.
 let opticalRay=refract(-normalize(v.eyeLocal),normalize(v.localFace.xyz),1.0/1.31);
 let opticalExit=pieceExit(v.local,opticalRay,u32(v.localFace.w)%4u,u.time<=0.0||v.localFace.w>=4.0);
 let thickness=select(samplingThickness,opticalExit.x,opticalExit.x>0.0&&opticalExit.x<2.0);
 let trans=exp(-vec3f(.52,.15,.07)*thickness);
 // Non-emissive cold scattering inside thick fracture faces. Preserve scene transmission.
 let cut=select(0.0,1.0,v.info.x>.5);
 let depthScatter=1.0-exp(-thickness*select(1.2,2.1,cut>.5));
 let faceLight=.36+.64*max(0.0,dot(n,l));
 let scatter=depthScatter*mix(vec3f(.055,.14,.20),vec3f(.13,.34,.45),cut)*faceLight;
 // Thin-screen refraction of the actual rendered floor, not fixed tint.
 let dims=vec2f(textureDimensions(scene));
 let bend=refract(-eye,n,1.0/1.31)+eye;
 let scale=64.0/(1.778*.92)*u.zoom*dims.x/u.width;
 let offset=vec2f(bend.x,-bend.y*.92+bend.z*.39191836)*samplingThickness*scale;
 let coord=clamp(vec2i(v.clip.xy+offset),vec2i(0),vec2i(dims)-vec2i(1));
 let transmitted=trans*textureLoad(scene,coord,0).rgb;
 let fresh=select(1.0,.82,v.info.x>.5);
 // Keep the same physical cloud on either side of one cut surface.
 let cloudy=cut*cloudAt(v.local);
 let opaqueScatter=1.0-exp(-cloudy*1.8);
 let milk=vec3f(.38,.47,.51)*faceLight;
 var body=mix(scatter*fresh+transmitted*(1.0-fr),milk,opaqueScatter);
 // Only one fragment carries the internal wedge; no mirrored caps added.
 if(cut<.5&&v.localFace.w<.5&&u.time>0.0){
  let ray=refract(-normalize(v.eyeLocal),normalize(v.localFace.xyz),1.0/1.31);
  let exit=pieceExit(v.local,ray,u32(v.localFace.w),false);
  if(exit.y>.5&&exit.x<2.0){
   let hit=v.local+ray*exit.x;
   let footprint=.008+.025*exit.x;
   let cloud=(cloudAt(hit)+cloudAt(hit+vec3f(0,footprint,0))+cloudAt(hit-vec3f(0,footprint,0)))/3.0;
   let internal=(1.0-exp(-cloud*1.8))*exp(-exit.x*3.4)*.62;
   body=mix(body,milk*exp(-vec3f(.52,.15,.07)*exit.x),internal);
  }
 }
 let emission=vec3f(.35,2.2,3.8)*v.info.z*v.info.x;
 let color=body+fr*vec3f(.28,.45,.57)+spec*vec3f(.65,.88,1.0)+emission;
 return vec4f(color*v.info.y,v.info.y);}
struct Q{@builtin(position)p:vec4f,@location(0)uv:vec2f};
@vertex fn quad(@builtin(vertex_index)i:u32)->Q{let p=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));var o:Q;o.p=vec4f(p[i],.99,1);o.uv=p[i];return o;}
@fragment fn ground(q:Q)->@location(0)vec4f{let px=64.0/(1.778*.92)*u.zoom;let x=q.uv.x*u.width*.5/px+u.cx;let z=-(q.uv.y*u.height*.5/px+u.cy)/.39191836;let p=vec3f(x,0,z);var lit=vec3f(0);if(u.source>.5&&u.near>.5){for(var i=0u;i<64u;i++){let a=lights[i];let d=distance(p,a.xyz);let lambert=max(.05,a.y)/max(.1,d);lit+=vec3f(.015,.18,.25)*a.w*lambert*pow(max(0.0,1.0-d/.72),2.0)/(1+d*d*4);}}return vec4f(vec3f(.004,.008,.014)+lit,1);}
