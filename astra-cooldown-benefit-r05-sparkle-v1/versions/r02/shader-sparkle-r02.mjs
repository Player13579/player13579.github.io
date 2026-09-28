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
fn receiverObservation(p:vec2f,source:vec2f,t:f32,begin:f32,peak:f32,end:f32,radius:f32)->vec3f {
 let sourcePixel=vec2f(128.+source.x*222.,240.-source.y*222.);
 let present=actorAlpha(sourcePixel)*u.state.w;
 return crossObservation(p,source,t,begin,peak,end,radius,vec3f(.73,1.,.84))*present;
}
fn sparkleObservations(p:vec2f,t:f32)->vec3f {
 let prismPresent=1.-smoothstep(.48,.58,t);
 var radiance=crossObservation(p,compressionSource(t,0),t,.325,.400,.510,.083,vec3f(1.,.83,.40))*prismPresent;
 radiance+=crossObservation(p,compressionSource(t,1),t,.380,.470,.570,.090,vec3f(1.,.87,.49))*prismPresent;
 radiance+=crossObservation(p,compressionSource(t,2),t,.445,.535,.580,.085,vec3f(1.,.94,.64))*prismPresent;
 radiance+=receiverObservation(p,vec2f(-.045,.07),t,.655,.715,.790,.122);
 radiance+=receiverObservation(p,vec2f(.16,.44),t,.715,.780,.865,.140);
 radiance+=receiverObservation(p,vec2f(-.14,.64),t,.780,.845,.935,.133);
 return radiance*u.screen.w;
}
`;
if(!original.includes('@fragment fn fs')||original.split(' return vec4f(c,1);').length!==2)throw Error('Adopted source structure changed');
export const shader=original.replace('@fragment fn fs',observations+'\n@fragment fn fs').replace(' return vec4f(c,1);',' c+=sparkleObservations(p,t);\n return vec4f(c,1);');
