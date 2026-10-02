// R10: finite rolled pressure surfaces; one shared open air cleft passes through all depth layers.
fn volume(p:vec2f,t:f32,en:f32,reduced:f32,smoke:bool)->vec4f {
 let fireLife=pow(max(0.0,1.0-t/mix(620.0,700.0,en)),1.1);
 let smokeLife=smoothstep(220.0,500.0,t)*pow(max(0.0,1.0-t/mix(1040.0,1100.0,en)),0.66);
 let life=select(fireLife,smokeLife,smoke)*smoothstep(0.0,15.0,t);
 let unfold=smoothstep(8.0,120.0,t);let transport=smoothstep(170.0,980.0,t);let motion=1.0-reduced*0.67;
 let boundary=(1.0-smoothstep(0.94,1.0,abs(p.x)))*(1.0-smoothstep(0.94,1.0,abs(p.y)));
 let cy=0.025+0.075*unfold+0.25*transport*motion;
 let airX=0.055*sin((p.y-cy)*3.0-t*0.003)*motion+0.20*(p.y-cy);
 let airWidth=select(0.065,0.080,smoke)*(0.35+0.65*unfold);
 let airGate=smoothstep(cy-0.01,cy+0.14,p.y);
 let openCleft=1.0-smoothstep(airWidth,airWidth+0.022,abs(p.x-airX));
 let sharedAir=1.0-openCleft*airGate*unfold;
 var radiance=vec3f(0.0);var transmittance=1.0;
 for(var i=0u;i<20u;i++) {
  let z=1.0-(f32(i)+0.5)*0.1;var density=0.0;var weightedColor=vec3f(0.0);
  for(var k=0u;k<2u;k++) {
   let side=select(-1.0,1.0,k==1u);let phase=f32(k)*1.6;
   let cx=side*(0.10*unfold+0.07*transport)*motion;
   let rx=select(0.31+0.25*unfold-0.06*transport,0.38+0.18*unfold+0.10*transport,smoke);
   let ry=select(0.18+0.15*unfold+0.06*transport,0.23+0.16*unfold+0.13*transport,smoke);
   let u=(p.x-cx)/rx;
   let bend=0.095*sin(u*2.4+phase-t*0.004)*(.3+.7*unfold)*motion;
   let v=(p.y-cy-bend)/ry;
   let radial=pow(pow(abs(u),4.0)+pow(abs(v),4.0),0.25);
   let skin=1.0-smoothstep(0.94,1.04,radial);
   let roll=0.63+0.37*pow(0.5+0.5*cos(u*2.6+v*3.1-t*0.004+phase),2.0);
   let layerDepth=select(0.32,-0.34,k==1u)+0.10*sin(u*2.2+v*1.8-t*0.003+phase)*motion;
   let thickness=select(0.25+0.08*unfold,0.31+0.10*transport,smoke);
   let dz=(z-layerDepth)/thickness;
   let depthSkin=1.0-smoothstep(0.82,1.05,abs(dz));
   let d=skin*roll*sharedAir*boundary*depthSkin;
   var color=vec3f(0.0);
   if(smoke) {
    let rawNormal=vec3f(u/rx+0.35*sin(v*2.1-t*0.003+phase),v/ry,dz/thickness);
    let normal=rawNormal/max(length(rawNormal),0.0001);
    let key=clamp(dot(normal,normalize(vec3f(-0.45,0.70,0.60))),0.0,1.0);
    color=mix(vec3f(0.018,0.024,0.033),vec3f(0.59,0.61,0.63),pow(key,1.15));
    color+=vec3f(0.90,0.25,0.02)*exp(-t/170.0)*exp(-pow(v+0.30,2.0));
   }else {
    let heat=exp(-t/460.0);
    let hot=exp(-pow((u+side*0.16)/0.43,2.0)-pow((v+0.36)/0.30,2.0));
    let pulse=1.0+0.80*exp(-pow((t-80.0)/65.0,2.0));
    let nearHot=select(vec3f(16.0,10.4,4.0),vec3f(13.0,4.4,0.60),k==1u);
    let crease=exp(-pow((v-0.32*sin(u*2.0-t*0.004+phase))/0.14,2.0));
    color=mix(vec3f(2.8,0.13,0.008),nearHot,hot*heat)*pulse+vec3f(7.0,2.3,0.08)*crease*heat;
   }
   density+=d;weightedColor+=d*color;
  }
  let opacity=1.0-exp(-density*select(0.48,0.47,smoke)*life);let color=weightedColor/max(density,0.00001);
  radiance+=transmittance*opacity*color;transmittance*=1.0-opacity;
 }
 return vec4f(radiance,1.0-transmittance);
}
