import {shader as original} from './original-r05/shader-r05.mjs';
// 十字光条多数でキラキラ演出. Six source-bound observations; no independent particles.
const observations=/*wgsl*/`
fn compressionSource(t:f32,which:i32)->vec2f {
 let compress=smoothstep(.16,.48,t);let collapse=select(compress,compress*.65,u.state.y>.5);
 let h=vec3f(.34+collapse*.08,mix(.58,.027,collapse),.235*(1-collapse*.26));
 let yaw=-.56+.16*collapse;
 var local=vec3f(-h.x,h.y,h.z);
 if(which==1){local=vec3f(h.x,-h.y,h.z);}
 if(which==2){local=vec3f(0.,h.y,h.z);}
 let world=rotate(local,-yaw);
 return vec2f(world.x,world.y+.48-.28*world.z);
}
fn crossObservation(p:vec2f,source:vec2f,t:f32,begin:f32,peak:f32,end:f32,radius:f32,tint:vec3f)->vec3f {
 let pulse=smoothstep(begin,peak,t)*(1.-smoothstep(peak,end,t));
 let d=abs(p-source);
 let horizontal=pow(max(0.,1.-d.x/radius-d.y/(radius*.20)),1.4);
 let vertical=pow(max(0.,1.-d.y/(radius*1.14)-d.x/(radius*.18)),1.4);
 let arms=max(horizontal,vertical);
 let core=exp2(-dot(d,d)/(.014*.014)*2.4);
 let nearGlow=exp2(-dot(d,d)/(radius*radius*.48)*3.0);
 return (tint*arms*2.05+vec3f(1.25)*core+tint*nearGlow*.20)*pulse;
}
fn receiverObservation(p:vec2f,source:vec2f,outward:vec2f,t:f32,begin:f32,peak:f32,end:f32,radius:f32)->vec3f {
 let rise=smoothstep(begin,peak,t);
 let pulse=rise*(1.-smoothstep(peak+.016,end,t));
 if(pulse<=0. || distance(p,source)>radius+.36){return vec3f(0.);}
 let sourcePixel=vec2f(128.+source.x*222.,240.-source.y*222.);
 let present=actorAlpha(sourcePixel)*u.state.w;
 var boundary=source;
 // Last covered sample along this local outward ray ignores tiny internal alpha gaps.
 for(var i=1;i<=40;i++){
  let trial=source+outward*f32(i)*.005;
  let probe=vec2f(128.+trial.x*222.,240.-trial.y*222.);
  if(actorAlpha(probe)>=.15){boundary=trial;}
 }
 // Finite optical spread expands from the emitting body rim at activation.
 let observation=boundary+outward*(mix(1.20,3.50,rise)/u.body.z);
 let d=abs(p-observation);
 let horizontal=pow(max(0.,1.-d.x/radius-d.y/(radius*.24)),1.1);
 let vertical=pow(max(0.,1.-d.y/(radius*1.18)-d.x/(radius*.22)),1.1);
 let core=exp2(-dot(d,d)/(.023*.023)*2.4);
 let nearGlow=exp2(-dot(d,d)/(radius*radius*.35)*3.0);
 let skin=actorAlpha(vec2f(128.+p.x*222.,240.-p.y*222.));
 // New optical rays use surrounding space. Adopted face/clothing emission is untouched.
 let available=1.-smoothstep(.03,.18,skin);
 let tint=vec3f(.60,1.,.81);
 return (tint*max(horizontal,vertical)*3.4+vec3f(2.)*core+tint*nearGlow*.22)*pulse*present*available;
}
fn sparkleObservations(p:vec2f,t:f32)->vec3f {
 let prismPresent=1.-smoothstep(.48,.58,t);
 var radiance=crossObservation(p,compressionSource(t,0),t,.325,.400,.510,.083,vec3f(1.,.83,.40))*prismPresent;
 radiance+=crossObservation(p,compressionSource(t,1),t,.380,.470,.570,.090,vec3f(1.,.87,.49))*prismPresent;
 radiance+=crossObservation(p,compressionSource(t,2),t,.445,.535,.580,.085,vec3f(1.,.94,.64))*prismPresent;
 radiance+=receiverObservation(p,vec2f(-.045,.07),vec2f(0.,-1.),t,.655,.715,.805,.170);
 radiance+=receiverObservation(p,vec2f(.16,.44),vec2f(1.,0.),t,.715,.780,.880,.190);
 radiance+=receiverObservation(p,vec2f(-.14,.64),vec2f(-1.,0.),t,.780,.845,.950,.183);
 return radiance*u.screen.w;
}
`;
if(!original.includes('@fragment fn fs')||original.split(' return vec4f(c,1);').length!==2)throw Error('Adopted source structure changed');
export const shader=original.replace('@fragment fn fs',observations+'\n@fragment fn fs').replace(' return vec4f(c,1);',' c+=sparkleObservations(p,t);\n return vec4f(c,1);');
