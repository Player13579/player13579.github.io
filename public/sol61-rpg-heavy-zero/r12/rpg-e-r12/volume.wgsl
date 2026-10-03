// R12: coupled pressure-front / entrained interior transport, not isolated kernel wisps.
fn volume(p:vec2f,t:f32,en:f32,reduced:f32,smoke:bool)->vec4f {
 let fireLife=pow(max(0.0,1.0-t/mix(620.0,700.0,en)),1.1);
 let smokeLife=smoothstep(220.0,500.0,t)*pow(max(0.0,1.0-t/mix(1040.0,1100.0,en)),0.66);
 let life=select(fireLife,smokeLife,smoke)*smoothstep(0.0,15.0,t);
 let unfold=smoothstep(8.0,180.0,t);let transport=smoothstep(150.0,980.0,t);let motion=1.0-reduced*0.67;
 let boundary=(1.0-smoothstep(0.94,1.0,abs(p.x)))*(1.0-smoothstep(0.94,1.0,abs(p.y)));
 var radiance=vec3f(0.0);var transmittance=1.0;
 for(var i=0u;i<20u;i++) {
  let z=1.0-(f32(i)+0.5)*0.1;var density=0.0;var weightedColor=vec3f(0.0);
  for(var k=0u;k<4u;k++) {
   let kk=f32(k);let advance=smoothstep(8.0+kk*28.0,180.0+kk*28.0,t);
   // Each front expands from a shared seed, then carries the same smoke parcel.
   var center=vec3f(0.0,0.04,0.30);var radii=vec3f(0.25,0.20,0.30);var angle=0.0;var weight=1.0;
   if(k==0u){center=vec3f(-0.10*unfold,0.04+0.17*transport*motion,0.32);radii=vec3f(0.25+0.34*advance,0.20+0.22*advance,0.36);angle=-0.16;weight=1.0-0.52*smoothstep(350.0,900.0,t);}
   if(k==1u){center=vec3f(-0.27*advance-0.04*transport*motion,0.08+0.28*advance+0.13*transport*motion,-0.36);radii=vec3f(0.22+0.18*advance,0.23+0.22*advance,0.38);angle=-0.36;weight=0.90;}
   if(k==2u){center=vec3f(0.25*advance+0.06*transport*motion,0.04+0.18*advance+0.26*transport*motion,0.10);radii=vec3f(0.23+0.18*advance,0.22+0.23*advance,0.37);angle=0.38;weight=0.94;}
   if(k==3u){center=vec3f(0.02-0.10*transport*motion,0.10+0.40*advance+0.11*transport*motion,-0.08);radii=vec3f(0.22+0.18*advance,0.22+0.15*advance,0.40);angle=-0.10;weight=0.82;}
   if(smoke){radii+=vec3f(0.065,0.065,0.055);center.y+=0.045*transport*motion;}
   let q=vec3f(p,z)-center;let co=cos(angle);let si=sin(angle);
   let xy=vec2f(co*q.x+si*q.y,-si*q.x+co*q.y);
   // A turning three-dimensional parcel maps density inward/outward, never a whole-volume cut.
   let turn=q.z*3.4+kk*1.3-t*0.0035;
   let local=vec3f(xy.x-0.075*sin(turn)*motion,xy.y+0.080*cos(turn+xy.x*3.0)*motion,q.z)/radii;
   let radial2=dot(local,local);let compact=1.0-smoothstep(select(0.05,0.18,smoke),1.0,radial2);
   let front=local.y+0.38*local.z-(-0.65+1.2*smoothstep(20.0+kk*30.0,280.0+kk*30.0,t));
   let ridge=exp(-pow(front/0.28,2.0));
   let roll=0.62+0.38*sin(local.y*3.0-local.z*3.5+kk*1.4-t*0.005);
   // Interconnected smoke interior persists behind the moving pressure front.
   let material=select(0.28+0.72*ridge,0.70+0.30*roll,smoke);
   let d=compact*material*weight*boundary;
   var color=vec3f(0.0);
   if(smoke){
    let normal=local/max(length(local),0.0001);let key=clamp(dot(normal,normalize(vec3f(-0.45,0.70,0.60))),0.0,1.0);
    let inner=clamp(1.0-radial2,0.0,1.0);
    color=mix(vec3f(0.025,0.032,0.043),vec3f(0.67,0.69,0.71),pow(key,1.1))*(0.72+0.28*(1.0-inner));
    color+=vec3f(0.90,0.25,0.02)*exp(-t/170.0)*inner;
   }else{
    let heat=exp(-t/460.0);let hot=ridge*exp(-pow((local.z-0.24)/0.70,2.0));
    let pulse=1.0+0.80*exp(-pow((t-80.0-kk*28.0)/65.0,2.0));
    let nearHot=select(vec3f(16.0,10.4,4.0),vec3f(13.0,4.4,0.60),k==1u || k==3u);
    color=mix(vec3f(2.8,0.13,0.008),nearHot,hot*heat)*pulse+vec3f(7.0,2.3,0.08)*ridge*heat;
   }
   density+=d;weightedColor+=d*color;
  }
  let opacity=1.0-exp(-density*select(0.48,0.47,smoke)*life);let color=weightedColor/max(density,0.00001);
  radiance+=transmittance*opacity*color;transmittance*=1.0-opacity;
 }
 return vec4f(radiance,1.0-transmittance);
}
