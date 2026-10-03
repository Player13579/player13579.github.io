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

// R16: one coarse 3D flow carries bulk, density and heat; no seed ball or cap.
fn impactGasFlow(q:vec3f,phase:f32)->vec3f {
 // Curl of A=(sin(1.8y+2.1z+phase), sin(2z+1.5x-.71phase),
 // sin(1.7x+1.6y+.86phase)). Constant scaling bounds each component.
 let ax=cos(1.8*q.y+2.1*q.z+phase);
 let ay=cos(2.0*q.z+1.5*q.x-0.71*phase);
 let az=cos(1.7*q.x+1.6*q.y+0.86*phase);
 return vec3f(1.6*az-2.0*ay,2.1*ax-1.7*az,1.5*ay-1.8*ax)/3.8;
}
fn impactGasMaterial(q:vec3f,phase:f32,travel:f32)->vec3f {
 let midpoint=q-impactGasFlow(q,phase)*(0.5*travel);
 return q-impactGasFlow(midpoint,phase)*travel;
}
fn volume(p:vec2f,t:f32,en:f32,reduced:f32,smoke:bool)->vec4f {
 if(smoke){return retainedSmoke(p,t,en,reduced,true);}
 let life=pow(max(0.0,1.0-t/mix(620.0,700.0,en)),1.1)*smoothstep(0.0,15.0,t);
 let expand=smoothstep(20.0,180.0,t);let roll=smoothstep(100.0,500.0,t);
 let motion=1.0-reduced*0.67;
 let boundary=(1.0-smoothstep(0.88,1.0,abs(p.x)))*(1.0-smoothstep(0.90,1.0,abs(p.y)));
 let phase=t*0.007*motion;
 let travel=(0.28+0.44*roll)*expand*motion;
 let center=vec3f(-0.025*roll*motion,0.035+0.095*expand+0.06*roll*motion,0.0);
 let radius=vec3f(0.13+0.30*expand,0.13+0.21*expand,0.22+0.24*expand);
 let sourceMaterial=impactGasMaterial(-center/radius,phase,travel);
 let heat=exp(-t/460.0);let pulse=1.0+0.80*exp(-pow((t-80.0)/65.0,2.0));
 let sigmaT=1.0;let ds=2.0/20.0;
 let emissionRate=1.65+2.15*smoothstep(120.0,mix(620.0,700.0,en),t);
 var radiance=vec3f(0.0);var transmittance=1.0;
 for(var i=0u;i<20u;i++) {
  let z=1.0-(f32(i)+0.5)*ds;
  let reference=(vec3f(p,z)-center)/radius;
  let m=impactGasMaterial(reference,phase,travel);
  // A single thick continuum. Coarse shared flow deforms its entire contour;
  // these terms are a continuous bulk metric, never unions of body primitives.
  let r2=m.x*m.x+1.08*m.y*m.y+0.90*m.z*m.z;
  let bulk=exp(-1.55*r2*r2);
  // Broad compression/rarefaction belongs to the carried material. The floor
  // fills the troughs with gas instead of splitting them into decorative balls.
  let compression=clamp(0.5+0.5*sin(2.4*m.x+2.0*m.y+0.65*m.z-0.35*phase),0.0,1.0);
  let fold=clamp(0.5+0.5*sin(2.5*m.y-1.35*m.z+0.35*m.x+0.22*phase),0.0,1.0);
  let pressure=exp(-pow((sqrt(max(r2,0.0))-0.62)/0.40,2.0));
  let density=bulk*(0.24+2.25*pow(compression,1.6)*(0.40+0.60*fold))*(1.0+0.20*pressure)*boundary;
  // Heat occupies this same advected material, including the contact region.
  // There is no separately integrated source seed, planar front or lip color.
  let sourceDelta=(m-sourceMaterial)/vec3f(0.48,0.48,0.68);
  let contactHeat=exp(-dot(sourceDelta,sourceDelta))*exp(-t/180.0);
  let stream=exp(-pow((m.x-0.32*m.y-0.18*sin(phase))/0.66,2.0)-pow((m.y+0.14*m.z-0.24)/0.95,2.0));
  let carriedHeat=stream*(0.20+0.80*compression)*(0.48+0.52*fold);
  let temperature=clamp(0.06+0.85*carriedHeat+0.78*contactHeat,0.0,1.0)*heat;
  let hotColor=mix(vec3f(13.0,4.4,0.60),vec3f(16.0,10.4,4.0),smoothstep(-0.35,0.40,z));
  let color=mix(vec3f(2.8,0.13,0.008),hotColor,temperature)*pulse;
  let opacity=1.0-exp(-sigmaT*density*life*ds);
  radiance+=transmittance*opacity*color*(emissionRate/sigmaT);
  transmittance*=1.0-opacity;
 }
 return vec4f(radiance,1.0-transmittance);
}
