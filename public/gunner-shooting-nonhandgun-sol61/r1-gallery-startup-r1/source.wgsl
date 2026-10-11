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
  // PH1: axial hot jet and two shorter shear tongues. Tapered tips and open channels preserve direction.
  let axial=clamp(q.x/max(1.0,len),0.0,1.0);
  let envelope=wide*(.12+.64*sin(axial*3.14159265))*(1-axial)*(.94+.06*sin(axial*13-t*.035));
  let front=(1-smoothstep(envelope-.55,envelope+.55,abs(q.y)))*smoothstep(-.5,1.0,q.x)*(1-smoothstep(len-1.0,len+.5,q.x));
  let branchA=rotate(q-vec2f(2,0),-.44);let branchB=rotate(q-vec2f(1,0),.36);
  let aFrac=clamp(branchA.x/(len*.57),0.0,1.0);let bFrac=clamp(branchB.x/(len*.49),0.0,1.0);
  let sideA=(1-smoothstep(wide*.2*(1-aFrac),wide*.2*(1-aFrac)+.55,abs(branchA.y)))*smoothstep(1.0,3.0,branchA.x)*(1-smoothstep(len*.55,len*.58,branchA.x));
  let sideB=(1-smoothstep(wide*.18*(1-bFrac),wide*.18*(1-bFrac)+.55,abs(branchB.y)))*smoothstep(1.0,3.0,branchB.x)*(1-smoothstep(len*.47,len*.5,branchB.x));
  let jet=max(front,max(sideA,sideB));
  let inner=ellipse(q-vec2f(len*.13,0),vec2f(len*.17,wide*.16));
  let temperature=clamp(q.x/max(1.0,len),0.0,1.0);
  let hue=mix(vec3f(1,.68,.16),vec3f(1,.16,.022),temperature);
  let light=(hue*jet*2.5+vec3f(1,.89,.52)*inner*2.0)*flash;
  radiation+=light;color+=light;coverage=max(coverage,jet*flash);
  // PH2: hot gas transports forward, widens and rises in calm air; zero emission after flash.
  let upLocal=vec2f(-dir.y,-dir.x);
  let drift=vec2f(12+gasT*38,0)+upLocal*gasT*13;let sigma=vec2f(8+gasT*22,4+gasT*13);
  let plume=ellipse(q-drift,sigma)*gas*.24;
  let gasColor=vec3f(.24,.29,.34)+hue*flash*.16;
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
  let lit=vec3f(.09,.13,.16)+vec3f(.7,.32,.09)*exp(-max(q.x+18,0.0)/20)*pow(max(0.0,1-t/s.temporal.y),1.5)*u.controls.y;
  color=color*(1-gun)+lit*gun;coverage=max(coverage,gun);
 }
 var result:Out;result.world=vec4f(color,coverage);result.emission=vec4f(radiation,0);return result;
}
