// R11: four transported compact density packets, no shared cut or extruded skin.
fn volume(p:vec2f,t:f32,en:f32,reduced:f32,smoke:bool)->vec4f {
 let fireLife=pow(max(0.0,1.0-t/mix(620.0,700.0,en)),1.1);
 let smokeLife=smoothstep(220.0,500.0,t)*pow(max(0.0,1.0-t/mix(1040.0,1100.0,en)),0.66);
 let life=select(fireLife,smokeLife,smoke)*smoothstep(0.0,15.0,t);
 let unfold=smoothstep(8.0,140.0,t);let transport=smoothstep(150.0,980.0,t);let motion=1.0-reduced*0.67;
 let boundary=(1.0-smoothstep(0.94,1.0,abs(p.x)))*(1.0-smoothstep(0.94,1.0,abs(p.y)));
 var radiance=vec3f(0.0);var transmittance=1.0;
 for(var i=0u;i<20u;i++) {
  let z=1.0-(f32(i)+0.5)*0.1;var density=0.0;var weightedColor=vec3f(0.0);
  for(var k=0u;k<4u;k++) {
   let kk=f32(k);let side=select(-1.0,1.0,k==2u);
   var center=vec3f(0.0,0.025,0.30);var radii=vec3f(0.46,0.23,0.30);var angle=0.15;var weight=1.0;
   if(k==0u){center.x=-0.08*transport*motion;center.y+=0.09*transport*motion;radii.x+=0.12*unfold;weight=1.0-0.78*smoothstep(200.0,650.0,t);}
   if(k==1u || k==2u){center=vec3f(side*(0.08+0.30*unfold+0.05*transport*motion),0.10+select(0.16,0.08,k==2u)*unfold+select(0.16,0.25,k==2u)*transport*motion,select(-0.34,0.12,k==2u));radii=vec3f(0.25+0.08*transport,0.23+0.11*transport,0.28);angle=side*(0.37+0.20*transport*motion);weight=0.88*smoothstep(20.0,100.0,t);}
   if(k==3u){center=vec3f(0.06-0.12*transport*motion,0.08+0.36*unfold+0.16*transport*motion,-0.18);radii=vec3f(0.30,0.24+0.08*transport,0.26);angle=-0.28*motion;weight=0.76*smoothstep(50.0,160.0,t);}
   if(smoke){radii+=vec3f(0.055,0.055,0.045);center.y+=0.075*transport*motion;}
   let q=vec3f(p,z)-center;let co=cos(angle);let si=sin(angle);
   let xy=vec2f(co*q.x+si*q.y,-si*q.x+co*q.y);
   let shear=0.10*sin(q.z*4.0+kk*1.7-t*0.004)*motion;
   let local=vec3f(xy.x-shear,xy.y+0.055*sin(q.z*3.0+kk-t*0.002)*motion,q.z)/radii;
   let radial2=dot(local,local);let compact=pow(max(0.0,1.0-radial2),select(2.0,1.25,smoke));
   // This moving density valley belongs to one packet/depth, never a through-volume notch.
   let channel=local.x+local.y*0.32+local.z*0.43-0.22*sin(t*0.003+kk*1.9);
   let valley=1.0-0.78*exp(-pow(channel/0.26,2.0));
   let broad=0.72+0.28*sin(local.y*2.1-local.z*2.4+kk*1.6-t*0.004);
   let d=compact*valley*broad*weight*boundary;
   var color=vec3f(0.0);
   if(smoke){
    let normal=local/max(length(local),0.0001);let key=clamp(dot(normal,normalize(vec3f(-0.45,0.70,0.60))),0.0,1.0);
    let inner=clamp(1.0-radial2,0.0,1.0);
    color=mix(vec3f(0.025,0.032,0.043),vec3f(0.67,0.69,0.71),pow(key,1.1))*(0.72+0.28*(1.0-inner));
    color+=vec3f(0.90,0.25,0.02)*exp(-t/170.0)*inner;
   }else{
    let heat=exp(-t/460.0);let hot=exp(-pow((local.x+0.18*sin(kk*1.3))/0.65,2.0)-pow((local.y+0.30)/0.55,2.0)-pow((local.z-0.24)/0.70,2.0));
    let pulse=1.0+0.80*exp(-pow((t-80.0-kk*12.0)/65.0,2.0));
    let nearHot=select(vec3f(16.0,10.4,4.0),vec3f(13.0,4.4,0.60),k==1u || k==3u);
    let crease=exp(-pow((channel-0.32)/0.18,2.0))*(0.35+0.65*max(0.0,1.0-radial2));
    color=mix(vec3f(2.8,0.13,0.008),nearHot,hot*heat)*pulse+vec3f(7.0,2.3,0.08)*crease*heat;
   }
   density+=d;weightedColor+=d*color;
  }
  let opacity=1.0-exp(-density*select(0.48,0.47,smoke)*life);let color=weightedColor/max(density,0.00001);
  radiance+=transmittance*opacity*color;transmittance*=1.0-opacity;
 }
 return vec4f(radiance,1.0-transmittance);
}
