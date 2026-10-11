struct Shot { origin:vec4f, shape:vec4f, temporal:vec4f }
struct Params { surface:vec4f, controls:vec4f }
@group(0) @binding(0) var<uniform> u:Params;
@group(0) @binding(1) var<storage,read> shotBuffer:array<Shot>;
struct Vertex { @builtin(position) pos:vec4f }
@vertex fn vs(@builtin(vertex_index) i:u32)->Vertex{
 var points=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));var vertexOut:Vertex;vertexOut.pos=vec4f(points[i],0,1);return vertexOut;
}
fn ellipse(p:vec2f,r:vec2f)->f32{return 1-smoothstep(.82,1.0,length(p/r));}
fn rectMask(p:vec2f,r:vec2f)->f32{let d=abs(p)-r;return 1-smoothstep(-.65,.65,max(d.x,d.y));}
fn rotate(p:vec2f,a:f32)->vec2f{return vec2f(cos(a)*p.x+sin(a)*p.y,-sin(a)*p.x+cos(a)*p.y);}
struct Out { @location(0) world:vec4f,@location(1) emission:vec4f }
@fragment fn fs(v:Vertex)->Out{
 let p=v.pos.xy;var color=vec3f(0);var coverage=0.0;var radiation=vec3f(0);
 for(var j=0u;j<u32(u.controls.x);j++){
  let s=shotBuffer[j];let t=s.temporal.x;let sc=s.shape.z;let dir=s.origin.zw;let rel=p-s.origin.xy;
  let q=vec2f(dot(rel,dir),dot(rel,vec2f(-dir.y,dir.x)))/sc;
  let life=s.temporal.w;
  if(t<0||t>=life){continue;}
  let flash=pow(max(0.0,1-t/s.temporal.y),1.5)*u.controls.y;
  let gasT=clamp(t/s.temporal.z,0.0,1.0);
  let gas=pow(max(0.0,sin(gasT*3.14159265)),.7)*u.controls.y;
  let len=s.shape.x*(.35+.65*min(t/18,1.0));let wide=s.shape.y;
  // PH1: a projected participating-gas column. Density, opacity and radiance are separate.
  // The pressure jet is axial; two shorter shear streams share its muzzle origin.
  let axial=clamp(q.x/max(1.0,len),0.0,1.0);
  let centerline=wide*.065*sin(axial*3.14159265)*sin(t*.035);
  let envelope=max(.42,wide*(.18+.72*sin(axial*3.14159265))*(1-axial));
  let radial=(q.y-centerline)/envelope;
  let inlet=smoothstep(-.65,.65,q.x);
  let outlet=1-smoothstep(len*.86,len*1.08,q.x);
  let frontDensity=exp(-2.2*radial*radial)*inlet*outlet*(.72+.28*sin(axial*3.14159265));
  let branchA=rotate(q-vec2f(1.4,0),-.40);let branchB=rotate(q-vec2f(1,0),.34);
  let aFrac=clamp(branchA.x/(len*.55),0.0,1.0);let bFrac=clamp(branchB.x/(len*.48),0.0,1.0);
  let aWidth=max(.36,wide*.18*(1-aFrac));let bWidth=max(.36,wide*.16*(1-bFrac));
  let aRadial=branchA.y/aWidth;let bRadial=branchB.y/bWidth;
  let sideDensityA=exp(-2.0*aRadial*aRadial)*smoothstep(1.0,3.0,branchA.x)*(1-smoothstep(len*.47,len*.58,branchA.x));
  let sideDensityB=exp(-2.0*bRadial*bRadial)*smoothstep(1.0,3.0,branchB.x)*(1-smoothstep(len*.40,len*.51,branchB.x));
  let jetColumn=frontDensity+.46*sideDensityA+.42*sideDensityB;
  let heat=clamp(1-.72*axial-.24*min(abs(radial),2.0),0.0,1.0);
  let hue=mix(vec3f(1,.19,.018),vec3f(1,.72,.18),heat);
  let coreX=q.x/max(1.0,len*.22);let coreY=q.y/max(.6,wide*.22);
  let coreColumn=exp(-1.7*coreX*coreX-2.4*coreY*coreY)*inlet;
  // Interior path length raises radiation smoothly. The hot kernel is part of the gas, not an oval decal.
  let light=(hue*(jetColumn*.85+jetColumn*jetColumn*1.7)+vec3f(1,.93,.63)*coreColumn*2.3)*flash;
  let jetCoverage=(1-exp(-jetColumn*.65))*flash;
  radiation+=light;color+=light;coverage=max(coverage,jetCoverage);
  // PH2: transported gas has a continuous column-density profile, independent of emitted light.
  let upLocal=vec2f(-dir.y,-dir.x);
  let drift=vec2f(8+gasT*37,0)+upLocal*gasT*13;
  let sigma=vec2f(7+gasT*24,3.5+gasT*12);
  let gasQ=(q-drift)/sigma;
  let gasColumn=exp(-1.8*dot(gasQ,gasQ))*smoothstep(-1.0,2.0,q.x);
  let plume=(1-exp(-gasColumn*.48))*gas*.24;
  let gasColor=vec3f(.24,.29,.34)+hue*flash*.12;
  color=color*(1-plume)+gasColor*plume;coverage=max(coverage,plume);
  // PH3: one brass case per real cause, delayed at the breech; ballistic gravity + tumbling.
  let delay=select(16.0,select(24.0,80.0,s.shape.w>1.5),s.shape.w>.5);
  let bt=max(0.0,(t-delay)/1000);let casePos=vec2f(-22-bt*20,-3-bt*55)+upLocal*(bt*23-bt*bt*140);
  let cq=rotate(q-casePos,bt*18+s.shape.w*.6);let caseMask=rectMask(cq,vec2f(3.5,1.25))*select(0.0,1.0,t>=delay)*u.controls.y*(1-smoothstep(life-100,life,t));
  // Conductor RGB F0 and changing cylindrical normal/view/light; rough highlight, no brass self emission.
  let normal=normalize(vec3f(0,clamp(cq.y/1.3,-.95,.95),sqrt(max(.01,1-pow(clamp(cq.y/1.3,-.95,.95),2)))));
  let lightDir=normalize(vec3f(-.4,-.5,.8));let halfDir=normalize(lightDir+vec3f(0,0,1));
  let f0=vec3f(.82,.56,.2);let f=f0+(vec3f(1)-f0)*pow(1-max(dot(halfDir,vec3f(0,0,1)),0.0),5);
  let spec=pow(max(dot(normal,halfDir),0.0),12.0);let metal=f*(.17+.7*spec)+vec3f(.29,.12,.025)*.3;
  color=color*(1-caseMask)+metal*caseMask;coverage=max(coverage,caseMask);
 }
 // Preview fixture only: a geometric receiver/barrel supplies physical attachment and recoil, no character/raster.
 if(u.controls.w>0&&u.controls.x>0){
  let s=shotBuffer[u32(u.controls.x)-1u];let rel=p-s.origin.xy;let q=vec2f(dot(rel,s.origin.zw),dot(rel,vec2f(-s.origin.w,s.origin.z)))/s.shape.z;
  let t=max(0.0,s.temporal.x);let kick=(2.4+s.shape.w*1.4)*sin(min(1.0,t/35)*1.5707963)*exp(-t/85)*u.controls.y;
  let receiver=rectMask(q+vec2f(39+kick,0),vec2f(16,5));let barrel=rectMask(q+vec2f(12+kick,0),vec2f(13,2.3));
  let grip=rectMask(rotate(q+vec2f(39+kick,-8),.25),vec2f(4,8));let gun=max(receiver,max(barrel,grip));
  // PH4: finite-depth muzzle illumination on a matte face; distance and surface incidence both matter.
  // The source depth prevents a singularity. Rear receiver/grip remain mostly ambient rather than tan.
  let surfaceNormal=normalize(vec3f(0,-.12,1));
  let toMuzzle=vec3f(-q.x,-q.y,6.0);let distanceSquared=dot(toMuzzle,toMuzzle);
  let incidence=max(0.0,dot(surfaceNormal,normalize(toMuzzle)));
  let sourcePulse=pow(max(0.0,1-t/s.temporal.y),1.5)*u.controls.y;
  let irradiance=sourcePulse*2.4*(36.0/(36.0+distanceSquared))*incidence;
  let lit=vec3f(.09,.13,.16)+vec3f(1,.54,.12)*irradiance;
  color=color*(1-gun)+lit*gun;coverage=max(coverage,gun);
 }
 var result:Out;result.world=vec4f(color,coverage);result.emission=vec4f(radiation,0);return result;
}
