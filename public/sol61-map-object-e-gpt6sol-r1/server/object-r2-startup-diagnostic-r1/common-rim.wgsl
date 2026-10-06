// Generated from common-rim.mjs and caller-supplied closed visual contours.
// Linear RGBA16Float accent; no environment mapping or sRGB encoding occurs here.
struct RimParams { view:vec4f, ages:vec4f, controls:vec4f }
@group(0) @binding(0) var<uniform> params:RimParams;
struct RimVertex { @builtin(position) position:vec4f }
@vertex fn rimVertex(@builtin(vertex_index) i:u32)->RimVertex {
  let p=array<vec2f,3>(vec2f(-1.0,-1.0),vec2f(-1.0,3.0),vec2f(3.0,-1.0))[i];var o:RimVertex;o.position=vec4f(p,0.0,1.0);return o;
}
fn rimEnvelope(age:f32)->f32 {
  if(!(age>=0.0)||age>=1800.0){return 0.0;}
  return smoothstep(0.0,105.0,age)*(1.0-smoothstep(1120.0,1800.0,age));
}
fn rimSweep(age:f32,progress:f32)->f32 {
  if(!(age>=95.0)||age>=715.0||!(progress>=0.0)){return 0.0;}
  let travel=clamp((age-95.0)/540.0,0.0,1.0);
  let gate=smoothstep(95.0,125.0,age)*(1.0-smoothstep(565.0,635.0,age));
  let delta=abs(progress-travel);let circular=min(delta,1.0-delta);
  return exp(-pow(circular/0.035,2.0))*gate;
}

fn shape0Distance(p:vec2f)->f32 {
  let v=array<vec2f,16>(vec2f(493.0,108.0),vec2f(958.0,108.0),vec2f(959.0,185.0),vec2f(975.0,185.0),vec2f(975.0,224.0),vec2f(1008.0,224.0),vec2f(1013.0,298.0),vec2f(1010.0,363.0),vec2f(887.0,365.0),vec2f(884.0,299.0),vec2f(522.0,299.0),vec2f(519.0,358.0),vec2f(437.0,358.0),vec2f(426.0,297.0),vec2f(428.0,195.0),vec2f(490.0,195.0));var d=1e9;
  for(var i=0u;i<16u;i++){let a=v[i];let b=v[(i+1u)%16u];let e=b-a;let t=clamp(dot(p-a,e)/max(dot(e,e),1e-7),0.0,1.0);d=min(d,distance(p,a+e*t));}
  return d;
}
fn shape0Progress(p:vec2f)->f32 {
  let v=array<vec2f,16>(vec2f(493.0,108.0),vec2f(958.0,108.0),vec2f(959.0,185.0),vec2f(975.0,185.0),vec2f(975.0,224.0),vec2f(1008.0,224.0),vec2f(1013.0,298.0),vec2f(1010.0,363.0),vec2f(887.0,365.0),vec2f(884.0,299.0),vec2f(522.0,299.0),vec2f(519.0,358.0),vec2f(437.0,358.0),vec2f(426.0,297.0),vec2f(428.0,195.0),vec2f(490.0,195.0));let lens=array<f32,16>(465.0,77.00649323271382,16.0,39.0,33.0,74.16872656315464,65.06919393998974,123.01625908797585,66.06814663663572,362.0,59.076221950967714,82.0,61.98386886924695,102.0196059588548,62.0,87.05170877128145);var total=0.0;var best=1e9;var progress=0.0;
  for(var i=0u;i<16u;i++){let a=v[i];let b=v[(i+1u)%16u];let e=b-a;let t=clamp(dot(p-a,e)/max(dot(e,e),1e-7),0.0,1.0);let d=distance(p,a+e*t);if(d<best){best=d;progress=(total+t*lens[i])/1774.4602250108205;}total+=lens[i];}
  return progress;
}
fn shape0Inside(p:vec2f)->bool {
  let v=array<vec2f,16>(vec2f(493.0,108.0),vec2f(958.0,108.0),vec2f(959.0,185.0),vec2f(975.0,185.0),vec2f(975.0,224.0),vec2f(1008.0,224.0),vec2f(1013.0,298.0),vec2f(1010.0,363.0),vec2f(887.0,365.0),vec2f(884.0,299.0),vec2f(522.0,299.0),vec2f(519.0,358.0),vec2f(437.0,358.0),vec2f(426.0,297.0),vec2f(428.0,195.0),vec2f(490.0,195.0));var inside=false;
  for(var i=0u;i<16u;i++){let a=v[i];let b=v[(i+1u)%16u];let e=b-a;let t=clamp(dot(p-a,e)/max(dot(e,e),1e-7),0.0,1.0);if(distance(p,a+e*t)<=1e-4){return true;}if((a.y>p.y)!=(b.y>p.y)){let crossX=a.x+(b.x-a.x)*(p.y-a.y)/(b.y-a.y);if(p.x<crossX){inside=!inside;}}}
  return inside;
}

fn shape1Distance(p:vec2f)->f32 {
  let v=array<vec2f,8>(vec2f(172.0,117.0),vec2f(382.0,117.0),vec2f(385.0,192.0),vec2f(397.0,377.0),vec2f(389.0,385.0),vec2f(208.0,385.0),vec2f(191.0,376.0),vec2f(168.0,195.0));var d=1e9;
  for(var i=0u;i<8u;i++){let a=v[i];let b=v[(i+1u)%8u];let e=b-a;let t=clamp(dot(p-a,e)/max(dot(e,e),1e-7),0.0,1.0);d=min(d,distance(p,a+e*t));}
  return d;
}
fn shape1Progress(p:vec2f)->f32 {
  let v=array<vec2f,8>(vec2f(172.0,117.0),vec2f(382.0,117.0),vec2f(385.0,192.0),vec2f(397.0,377.0),vec2f(389.0,385.0),vec2f(208.0,385.0),vec2f(191.0,376.0),vec2f(168.0,195.0));let lens=array<f32,8>(210.0,75.05997601918082,185.3887806745597,11.313708498984761,181.0,19.235384061671343,182.45547402037573,78.10249675906655);var total=0.0;var best=1e9;var progress=0.0;
  for(var i=0u;i<8u;i++){let a=v[i];let b=v[(i+1u)%8u];let e=b-a;let t=clamp(dot(p-a,e)/max(dot(e,e),1e-7),0.0,1.0);let d=distance(p,a+e*t);if(d<best){best=d;progress=(total+t*lens[i])/942.5558200338388;}total+=lens[i];}
  return progress;
}
fn shape1Inside(p:vec2f)->bool {
  let v=array<vec2f,8>(vec2f(172.0,117.0),vec2f(382.0,117.0),vec2f(385.0,192.0),vec2f(397.0,377.0),vec2f(389.0,385.0),vec2f(208.0,385.0),vec2f(191.0,376.0),vec2f(168.0,195.0));var inside=false;
  for(var i=0u;i<8u;i++){let a=v[i];let b=v[(i+1u)%8u];let e=b-a;let t=clamp(dot(p-a,e)/max(dot(e,e),1e-7),0.0,1.0);if(distance(p,a+e*t)<=1e-4){return true;}if((a.y>p.y)!=(b.y>p.y)){let crossX=a.x+(b.x-a.x)*(p.y-a.y)/(b.y-a.y);if(p.x<crossX){inside=!inside;}}}
  return inside;
}

fn shape2Distance(p:vec2f)->f32 {
  let v=array<vec2f,11>(vec2f(1142.0,320.0),vec2f(1158.0,308.0),vec2f(1173.0,309.0),vec2f(1174.0,326.0),vec2f(1216.0,326.0),vec2f(1227.0,449.0),vec2f(1224.0,564.0),vec2f(1157.0,567.0),vec2f(1139.0,537.0),vec2f(1132.0,489.0),vec2f(1134.0,389.0));var d=1e9;
  for(var i=0u;i<11u;i++){let a=v[i];let b=v[(i+1u)%11u];let e=b-a;let t=clamp(dot(p-a,e)/max(dot(e,e),1e-7),0.0,1.0);d=min(d,distance(p,a+e*t));}
  return d;
}
fn shape2Progress(p:vec2f)->f32 {
  let v=array<vec2f,11>(vec2f(1142.0,320.0),vec2f(1158.0,308.0),vec2f(1173.0,309.0),vec2f(1174.0,326.0),vec2f(1216.0,326.0),vec2f(1227.0,449.0),vec2f(1224.0,564.0),vec2f(1157.0,567.0),vec2f(1139.0,537.0),vec2f(1132.0,489.0),vec2f(1134.0,389.0));let lens=array<f32,11>(20.0,15.03329637837291,17.029386365926403,42.0,123.49089035228468,115.03912377969505,67.06713054842886,34.9857113690718,48.507731342539614,100.0199980003999,69.46221994724903);var total=0.0;var best=1e9;var progress=0.0;
  for(var i=0u;i<11u;i++){let a=v[i];let b=v[(i+1u)%11u];let e=b-a;let t=clamp(dot(p-a,e)/max(dot(e,e),1e-7),0.0,1.0);let d=distance(p,a+e*t);if(d<best){best=d;progress=(total+t*lens[i])/652.6354880839683;}total+=lens[i];}
  return progress;
}
fn shape2Inside(p:vec2f)->bool {
  let v=array<vec2f,11>(vec2f(1142.0,320.0),vec2f(1158.0,308.0),vec2f(1173.0,309.0),vec2f(1174.0,326.0),vec2f(1216.0,326.0),vec2f(1227.0,449.0),vec2f(1224.0,564.0),vec2f(1157.0,567.0),vec2f(1139.0,537.0),vec2f(1132.0,489.0),vec2f(1134.0,389.0));var inside=false;
  for(var i=0u;i<11u;i++){let a=v[i];let b=v[(i+1u)%11u];let e=b-a;let t=clamp(dot(p-a,e)/max(dot(e,e),1e-7),0.0,1.0);if(distance(p,a+e*t)<=1e-4){return true;}if((a.y>p.y)!=(b.y>p.y)){let crossX=a.x+(b.x-a.x)*(p.y-a.y)/(b.y-a.y);if(p.x<crossX){inside=!inside;}}}
  return inside;
}

fn shape3Distance(p:vec2f)->f32 {
  let v=array<vec2f,8>(vec2f(1099.0,570.0),vec2f(1226.0,570.0),vec2f(1236.0,690.0),vec2f(1214.0,847.0),vec2f(1077.0,847.0),vec2f(1068.0,736.0),vec2f(1077.0,625.0),vec2f(1090.0,572.0));var d=1e9;
  for(var i=0u;i<8u;i++){let a=v[i];let b=v[(i+1u)%8u];let e=b-a;let t=clamp(dot(p-a,e)/max(dot(e,e),1e-7),0.0,1.0);d=min(d,distance(p,a+e*t));}
  return d;
}
fn shape3Progress(p:vec2f)->f32 {
  let v=array<vec2f,8>(vec2f(1099.0,570.0),vec2f(1226.0,570.0),vec2f(1236.0,690.0),vec2f(1214.0,847.0),vec2f(1077.0,847.0),vec2f(1068.0,736.0),vec2f(1077.0,625.0),vec2f(1090.0,572.0));let lens=array<f32,8>(127.0,120.41594578792294,158.5339080449353,137.0,111.36426715962351,111.36426715962351,54.571054598569006,9.219544457292889);var total=0.0;var best=1e9;var progress=0.0;
  for(var i=0u;i<8u;i++){let a=v[i];let b=v[(i+1u)%8u];let e=b-a;let t=clamp(dot(p-a,e)/max(dot(e,e),1e-7),0.0,1.0);let d=distance(p,a+e*t);if(d<best){best=d;progress=(total+t*lens[i])/829.4689872079672;}total+=lens[i];}
  return progress;
}
fn shape3Inside(p:vec2f)->bool {
  let v=array<vec2f,8>(vec2f(1099.0,570.0),vec2f(1226.0,570.0),vec2f(1236.0,690.0),vec2f(1214.0,847.0),vec2f(1077.0,847.0),vec2f(1068.0,736.0),vec2f(1077.0,625.0),vec2f(1090.0,572.0));var inside=false;
  for(var i=0u;i<8u;i++){let a=v[i];let b=v[(i+1u)%8u];let e=b-a;let t=clamp(dot(p-a,e)/max(dot(e,e),1e-7),0.0,1.0);if(distance(p,a+e*t)<=1e-4){return true;}if((a.y>p.y)!=(b.y>p.y)){let crossX=a.x+(b.x-a.x)*(p.y-a.y)/(b.y-a.y);if(p.x<crossX){inside=!inside;}}}
  return inside;
}
@fragment fn rimFragment(input:RimVertex)->@location(0) vec4f {
  let point=input.position.xy*vec2f(1340.0,1174.0)/max(params.view.xy,vec2f(1.0))-params.view.zw;
  let sourceGate=select(0.0,1.0,params.controls.x>0.5&&params.controls.z>0.5);
  let observerGate=select(0.0,1.0,params.controls.y>0.5);
  let mode=params.controls.w;let sourceMode=select(1.0,0.0,mode==1.0||mode==3.0);
  let observerMode=select(1.0,0.0,mode==1.0||mode==2.0);
  if(sourceGate==0.0||mode==1.0||(observerGate==0.0&&sourceMode==0.0)){return vec4f(0.0);}
  let anyActiveAge=(params.ages[0]>=0.0&&params.ages[0]<1800.0)||(params.ages[1]>=0.0&&params.ages[1]<1800.0)||(params.ages[2]>=0.0&&params.ages[2]<1800.0)||(params.ages[3]>=0.0&&params.ages[3]<1800.0);
  if(!anyActiveAge){return vec4f(0.0);}
  var result=vec3f(0.0);let baseRgb=vec3f(0.3,0.72,1.0);
  let sweepRgb=vec3f(0.55,0.9,1.0);
  
  {let age=params.ages[0];if(age>=0.0&&age<1800.0){let d=shape0Distance(point);let dOut=max(0.0,d-1.7);let env=rimEnvelope(age);let sweep=rimSweep(age,shape0Progress(point));
   let core=(1.0-smoothstep(1.7,2.5,d))*env*sourceGate*sourceMode;
   let shoulder=(1.0-smoothstep(4.3,5.4,d))*env*sourceGate*sourceMode;
   let sweepLine=(1.0-smoothstep(2.7,4.9,d))*sweep*sourceGate*sourceMode;
   let receiver=select(0.0,1.0,shape0Inside(point)&&d<=5.0)*env*sourceGate*sourceMode;
   let halo=exp(-pow(dOut/11.0,2.0))*(1.0-smoothstep(11.0,12.0,dOut))*env*sourceGate*observerGate*observerMode;
   result+=baseRgb*(4.8*core+0.96*shoulder+0.32*(receiver+halo));
   result+=sweepRgb*3.36*sweepLine;}}

  {let age=params.ages[1];if(age>=0.0&&age<1800.0){let d=shape1Distance(point);let dOut=max(0.0,d-1.7);let env=rimEnvelope(age);let sweep=rimSweep(age,shape1Progress(point));
   let core=(1.0-smoothstep(1.7,2.5,d))*env*sourceGate*sourceMode;
   let shoulder=(1.0-smoothstep(4.3,5.4,d))*env*sourceGate*sourceMode;
   let sweepLine=(1.0-smoothstep(2.7,4.9,d))*sweep*sourceGate*sourceMode;
   let receiver=select(0.0,1.0,shape1Inside(point)&&d<=5.0)*env*sourceGate*sourceMode;
   let halo=exp(-pow(dOut/11.0,2.0))*(1.0-smoothstep(11.0,12.0,dOut))*env*sourceGate*observerGate*observerMode;
   result+=baseRgb*(4.8*core+0.96*shoulder+0.32*(receiver+halo));
   result+=sweepRgb*3.36*sweepLine;}}

  {let age=params.ages[2];if(age>=0.0&&age<1800.0){let d=shape2Distance(point);let dOut=max(0.0,d-1.7);let env=rimEnvelope(age);let sweep=rimSweep(age,shape2Progress(point));
   let core=(1.0-smoothstep(1.7,2.5,d))*env*sourceGate*sourceMode;
   let shoulder=(1.0-smoothstep(4.3,5.4,d))*env*sourceGate*sourceMode;
   let sweepLine=(1.0-smoothstep(2.7,4.9,d))*sweep*sourceGate*sourceMode;
   let receiver=select(0.0,1.0,shape2Inside(point)&&d<=5.0)*env*sourceGate*sourceMode;
   let halo=exp(-pow(dOut/11.0,2.0))*(1.0-smoothstep(11.0,12.0,dOut))*env*sourceGate*observerGate*observerMode;
   result+=baseRgb*(4.8*core+0.96*shoulder+0.32*(receiver+halo));
   result+=sweepRgb*3.36*sweepLine;}}

  {let age=params.ages[3];if(age>=0.0&&age<1800.0){let d=shape3Distance(point);let dOut=max(0.0,d-1.7);let env=rimEnvelope(age);let sweep=rimSweep(age,shape3Progress(point));
   let core=(1.0-smoothstep(1.7,2.5,d))*env*sourceGate*sourceMode;
   let shoulder=(1.0-smoothstep(4.3,5.4,d))*env*sourceGate*sourceMode;
   let sweepLine=(1.0-smoothstep(2.7,4.9,d))*sweep*sourceGate*sourceMode;
   let receiver=select(0.0,1.0,shape3Inside(point)&&d<=5.0)*env*sourceGate*sourceMode;
   let halo=exp(-pow(dOut/11.0,2.0))*(1.0-smoothstep(11.0,12.0,dOut))*env*sourceGate*observerGate*observerMode;
   result+=baseRgb*(4.8*core+0.96*shoulder+0.32*(receiver+halo));
   result+=sweepRgb*3.36*sweepLine;}}
  return vec4f(max(result,vec3f(0.0)),0.0);
}