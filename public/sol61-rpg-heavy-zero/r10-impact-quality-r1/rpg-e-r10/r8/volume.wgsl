// R10: a finite contact core launches two open curved pressure fronts.
// Existing combustion colors/depth integration and later smoke remain.
fn volume(p:vec2f,t:f32,en:f32,reduced:f32,smoke:bool)->vec4f {
 let fireLife=pow(max(0.0,1.0-t/mix(620.0,700.0,en)),1.1);
 let smokeLife=smoothstep(220.0,500.0,t)*pow(max(0.0,1.0-t/mix(1040.0,1100.0,en)),0.66);
 let life=select(fireLife,smokeLife,smoke)*smoothstep(0.0,15.0,t);
 let unfold=smoothstep(8.0,120.0,t);let transport=smoothstep(170.0,980.0,t);let motion=1.0-reduced*0.67;
 let boundary=(1.0-smoothstep(0.88,1.0,abs(p.x)))*(1.0-smoothstep(0.90,1.0,abs(p.y)));
 let frontProgress=smoothstep(12.0,155.0,t);
 let frontReach=0.08+0.52*frontProgress*(0.45+0.55*motion);
 let frontLife=smoothstep(12.0,65.0,t)*(1.0-smoothstep(220.0,420.0,t));
 let contactLife=1.0-smoothstep(75.0,190.0,t);
 let heat=exp(-t/460.0);let pulse=1.0+0.80*exp(-pow((t-80.0)/65.0,2.0));
 var radiance=vec3f(0.0);var transmittance=1.0;
 for(var i=0u;i<20u;i++) {
  let z=1.0-(f32(i)+0.5)*0.1;var density=0.0;var weightedColor=vec3f(0.0);
  if(!smoke) {
   let contact=exp(-pow(p.x/0.115,4.0)-pow((p.y-0.015)/0.095,4.0)-pow(z/0.28,2.0))*contactLife*boundary*2.0;
   density+=contact;weightedColor+=contact*vec3f(16.0,10.4,4.0)*heat*pulse;
  }
  for(var k=0u;k<2u;k++) {
   let side=select(-1.0,1.0,k==1u);let phase=f32(k)*1.6;
   let cx=side*(0.12*unfold+0.08*transport)*motion;
   let cy=0.03+0.085*unfold+0.28*transport*motion;
   let rx=select(0.32+0.22*unfold-0.06*transport,0.40+0.12*unfold+0.10*transport,smoke);
   let ry=select(0.20+0.12*unfold+0.08*transport,0.23+0.13*unfold+0.14*transport,smoke);
   let u=(p.x-cx)/rx;
   let bend=0.12*sin(u*2.4+phase-t*0.005)*(0.3+0.7*unfold)*motion;
   let v=(p.y-cy-bend)/ry;
   let arrival=1.0-smoothstep(frontReach-0.025,frontReach+0.12,abs(p.x));
   let combustionArrival=mix(arrival,1.0,smoothstep(180.0,360.0,t));
   let envelope=exp(-pow(u,4.0)-pow(v,4.0))*boundary*select(combustionArrival,1.0,smoke);
   let fold=0.70+0.30*pow(cos(u*2.4+v*2.7-t*0.005+phase),2.0);
   let airX=0.08*sin((p.y-cy)*3.0-t*0.004)*motion;
   let airY=0.12+0.22*transport*motion;
   let cleftWidth=select(0.11,0.14,smoke);
   let cleft=exp(-pow((p.x-airX-0.24*(p.y-cy))/cleftWidth,2.0)-pow((p.y-airY)/0.31,2.0));
   let layerDepth=select(0.32,-0.34,k==1u)+0.11*sin(u*2.2+v*1.8-t*0.003+phase)*motion;
   let thickness=select(0.22+0.07*unfold,0.29+0.10*transport,smoke);
   let dz=(z-layerDepth)/thickness;
   let d=envelope*fold*(1.0-0.94*cleft*unfold)*exp(-dz*dz);
   var color=vec3f(0.0);
   if(smoke) {
    let rawNormal=vec3f(u/rx+0.24*sin(v*2.1-t*0.004+phase),v/ry,dz/thickness);
    let normal=rawNormal/max(length(rawNormal),0.0001);
    let key=clamp(dot(normal,normalize(vec3f(-0.45,0.70,0.60))),0.0,1.0);
    color=mix(vec3f(0.025,0.030,0.038),vec3f(0.50,0.52,0.55),pow(key,1.35));
    color+=vec3f(0.90,0.25,0.02)*exp(-t/170.0)*exp(-pow(v+0.30,2.0));
   }else {
    let hot=exp(-pow(u*0.85,2.0)-pow(v+0.15,2.0));
    let nearHot=select(vec3f(16.0,10.4,4.0),vec3f(13.0,4.4,0.60),k==1u);
    let crease=exp(-pow((v-0.28*sin(u*2.0-t*0.004+phase))/0.34,2.0));
    color=mix(vec3f(2.8,0.13,0.008),nearHot,hot*heat)*pulse+vec3f(7.0,2.3,0.08)*crease*heat;
    // Two curved fronts are open in y, not a stamped closed shockwave ring.
    let frontY=(p.y-(0.015+0.12*frontProgress))/(0.12+0.20*frontProgress);
    let frontX=side*(frontReach-0.15*frontY*frontY*frontProgress);
    let front=exp(-pow((p.x-frontX)/0.055,2.0)-pow(frontY,4.0)-pow((z-layerDepth)/0.26,2.0))*frontLife*boundary*1.15;
    density+=front;weightedColor+=front*mix(vec3f(7.0,2.3,0.08),nearHot,0.40)*heat*pulse;
   }
   density+=d;weightedColor+=d*color;
  }
  let opacity=1.0-exp(-density*select(0.38,0.34,smoke)*life);let color=weightedColor/max(density,0.00001);
  radiance+=transmittance*opacity*color;transmittance*=1.0-opacity;
 }
 return vec4f(radiance,1.0-transmittance);
}
