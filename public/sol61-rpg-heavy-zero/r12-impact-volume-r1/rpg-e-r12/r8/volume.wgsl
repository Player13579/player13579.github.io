fn retainedSmoke(p:vec2f,t:f32,en:f32,reduced:f32,smoke:bool)->vec4f {
 let fireLife=pow(max(0.0,1.0-t/mix(620.0,700.0,en)),1.1);
 let smokeLife=smoothstep(220.0,500.0,t)*pow(max(0.0,1.0-t/mix(1040.0,1100.0,en)),0.66);
 let life=select(fireLife,smokeLife,smoke)*smoothstep(0.0,15.0,t);
 let unfold=smoothstep(8.0,120.0,t);let transport=smoothstep(170.0,980.0,t);let motion=1.0-reduced*0.67;
 let boundary=(1.0-smoothstep(0.88,1.0,abs(p.x)))*(1.0-smoothstep(0.90,1.0,abs(p.y)));
 var radiance=vec3f(0.0);var transmittance=1.0;
 for(var i=0u;i<20u;i++) {
  let z=1.0-(f32(i)+0.5)*0.1;var density=0.0;var weightedColor=vec3f(0.0);
  for(var k=0u;k<2u;k++) {
   let side=select(-1.0,1.0,k==1u);let phase=f32(k)*1.6;
   let cx=side*(0.12*unfold+0.08*transport)*motion;
   let cy=0.03+0.085*unfold+0.28*transport*motion;
   let rx=select(0.32+0.22*unfold-0.06*transport,0.40+0.12*unfold+0.10*transport,smoke);
   let ry=select(0.20+0.12*unfold+0.08*transport,0.23+0.13*unfold+0.14*transport,smoke);
   let u=(p.x-cx)/rx;
   let bend=0.12*sin(u*2.4+phase-t*0.005)*(0.3+0.7*unfold)*motion;
   let v=(p.y-cy-bend)/ry;
   let envelope=exp(-pow(u,4.0)-pow(v,4.0))*boundary;
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
    let heat=exp(-t/460.0);let hot=exp(-pow(u*0.85,2.0)-pow(v+0.15,2.0));
    let pulse=1.0+0.80*exp(-pow((t-80.0)/65.0,2.0));
    let nearHot=select(vec3f(16.0,10.4,4.0),vec3f(13.0,4.4,0.60),k==1u);
    let crease=exp(-pow((v-0.28*sin(u*2.0-t*0.004+phase))/0.34,2.0));
    color=mix(vec3f(2.8,0.13,0.008),nearHot,hot*heat)*pulse+vec3f(7.0,2.3,0.08)*crease*heat;
   }
   density+=d;weightedColor+=d*color;
  }
  let opacity=1.0-exp(-density*select(0.38,0.34,smoke)*life);let color=weightedColor/max(density,0.00001);
  radiance+=transmittance*opacity*color;transmittance*=1.0-opacity;
 }
 return vec4f(radiance,1.0-transmittance);
}

// Connected3D gas volume. The pressure lip shares the material boundary.
fn volume(p:vec2f,t:f32,en:f32,reduced:f32,smoke:bool)->vec4f {
 if(smoke){return retainedSmoke(p,t,en,reduced,true);}
 let life=pow(max(0.0,1.0-t/mix(620.0,700.0,en)),1.1)*smoothstep(0.0,15.0,t);
 let expand=smoothstep(8.0,180.0,t);let roll=smoothstep(60.0,390.0,t);
 let motion=1.0-reduced*0.67;
 let boundary=(1.0-smoothstep(0.88,1.0,abs(p.x)))*(1.0-smoothstep(0.90,1.0,abs(p.y)));
 let heat=exp(-t/460.0);let pulse=1.0+0.80*exp(-pow((t-80.0)/65.0,2.0));
 let center=vec3f(0.025*roll*motion,0.015+0.11*expand+0.08*roll*motion,0.0);
 let radius=vec3f(0.12+0.39*expand,0.095+0.22*expand,0.22+0.29*expand);
 var radiance=vec3f(0.0);var transmittance=1.0;
 for(var i=0u;i<20u;i++) {
  let z=1.0-(f32(i)+0.5)*0.1;let q=vec3f(p,z);
  let central=length((q-center)/radius);
  let nearCenter=center+vec3f(0.16*expand*motion,0.08*expand,0.20*expand);
  let farCenter=center+vec3f(-0.21*expand*motion,0.015+0.12*roll,-0.23*expand);
  let nearRadius=radius*vec3f(0.70,0.83,0.80);
  let farRadius=radius*vec3f(0.76,0.72,0.86);
  let nearDistance=length((q-nearCenter)/nearRadius);
  let farDistance=length((q-farCenter)/farRadius);
  // Broad unequal folds move through3D; no repeated projected arc/tongue.
  let advected=(q-center)/radius;
  let fold=(0.060*sin(advected.x*3.1+advected.y*2.4+z*3.0-t*0.004)+0.035*sin(advected.y*3.6-z*2.7+t*0.003))*expand*motion;
  let distance=min(central,min(nearDistance,farDistance))+fold;
  let gas=1.0-smoothstep(0.72,1.04,distance);
  let lip=exp(-pow((distance-0.80)/0.16,2.0))*smoothstep(12.0,65.0,t)*(1.0-smoothstep(280.0,470.0,t));
  let pocket=exp(-pow((q.x-0.13*expand-0.25*q.y)/(0.12+0.06*expand),2.0)-pow((q.y-0.12-0.10*expand)/0.15,2.0)-pow((z-0.30)/0.29,2.0));
  let seed=exp(-pow(length(vec3f(q.x/0.115,(q.y-0.015)/0.095,z/0.28)),4.0))*(1.0-smoothstep(75.0,190.0,t))*2.0;
  let density=((gas*1.35+lip*0.8)*(1.0-0.92*pocket*roll)+seed)*boundary;
  // Existing hot maxima; peripheral material remains orange as in the parent.
  let hot=exp(-pow(central*0.85,2.0))*heat;
  let nearWeight=smoothstep(-0.35,0.40,z);
  let hotColor=mix(vec3f(13.0,4.4,0.60),vec3f(16.0,10.4,4.0),nearWeight);
  let color=(mix(vec3f(2.8,0.13,0.008),hotColor,hot)+vec3f(7.0,2.3,0.08)*lip*0.30*heat)*pulse;
  let opacity=1.0-exp(-density*0.38*life);
  radiance+=transmittance*opacity*color;transmittance*=1.0-opacity;
 }
 return vec4f(radiance,1.0-transmittance);
}
