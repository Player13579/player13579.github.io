// R6: finite bent combustion sheets; the same carrier evolves into transported smoke.
fn volume(p:vec2f,t:f32,en:f32,reduced:f32,smoke:bool)->vec4f {
 let fireLife=pow(max(0.0,1.0-t/mix(620.0,700.0,en)),1.1);
 let smokeLife=smoothstep(220.0,500.0,t)*pow(max(0.0,1.0-t/mix(1040.0,1100.0,en)),0.66);
 let life=select(fireLife,smokeLife,smoke)*smoothstep(0.0,15.0,t);
 let opening=smoothstep(20.0,280.0,t);let travel=smoothstep(260.0,1000.0,t);let motion=1.0-reduced*0.67;
 var radiance=vec3f(0.0);var transmittance=1.0;
 for(var i=0u;i<20u;i++) {
  let z=1.0-(f32(i)+0.5)*0.1;var density=0.0;var weightedColor=vec3f(0.0);
  for(var k=0u;k<3u;k++) {
   // Actual near/rear separation, without an enclosing spherical emissive shell.
   let lateral=array<f32,3>(-0.29,0.29,-0.015)[k];let height=array<f32,3>(0.03,0.17,0.42)[k];let depth=array<f32,3>(0.46,-0.40,0.02)[k];
   let drift=array<f32,3>(-0.10,0.12,0.045)[k];let phase=f32(k)*1.7;
   let cx=lateral*opening+drift*travel*motion+0.035*sin(t*0.003+phase)*opening*motion;
   let cy=height*opening+0.26*travel*motion;
   let rx=select(0.105+0.11*opening,0.22+0.085*travel,smoke);let ry=select(0.13+0.19*opening,0.26+0.13*travel,smoke);
   let v=(p.y-cy)/ry;let bend=(0.065*sin(v*2.8-t*0.004+phase)+0.025*sin(v*4.1+t*0.002+phase))*opening*motion;
   let width=rx*(0.83-0.31*smoothstep(-0.15,1.0,v));let x=(p.x-cx-bend)/width;
   let envelope=exp(-pow(x,4.0)-pow(v,4.0));
   let sheetZ=depth+0.09*sin(v*2.2+t*0.002+phase)+0.08*x;
   let thickness=select(0.14+0.045*opening,0.24+0.11*travel,smoke);
   let dz=(z-sheetZ)/thickness;var d=envelope*exp(-dz*dz);
   var color=vec3f(0.0);
   if(smoke) {
    // Broad entrainment clefts cross the medium depth; no painted dark decal.
    let airX=-0.04+0.08*sin(t*0.003+v*1.2);let airY=0.38+0.20*travel*motion;
    let air=exp(-pow((p.x-airX)/0.105,2.0)-pow((p.y-airY)/0.25,2.0));
    let roll=0.66+0.34*pow(sin(v*2.5-x*1.2-t*0.003+phase),2.0);
    d*=roll*(1.0-0.78*air);
    let rawNormal=vec3f(x/width+0.20*sin(v*2.5-t*0.003+phase),v/ry,dz/thickness);let normal=rawNormal/max(length(rawNormal),0.0001);
    let key=clamp(dot(normal,normalize(vec3f(-0.45,0.70,0.60))),0.0,1.0);
    color=mix(vec3f(0.026,0.034,0.047),vec3f(0.48,0.50,0.53),pow(key,1.5));
    color+=vec3f(0.70,0.16,0.025)*exp(-t/150.0)*exp(-pow(v+0.35,2.0));
   }else {
    let heat=exp(-t/430.0);let core=pow(clamp(1.0-abs(v)*0.65-abs(x)*0.35,0.0,1.0),0.55);
    let nearHot=array<vec3f,3>(vec3f(14.0,9.4,4.0),vec3f(10.0,3.2,0.35),vec3f(12.0,6.1,1.6))[k];
    // A finite hotter fold lies in emitting material, not in the surrounding air.
    let fold=exp(-pow((x-0.32*sin(v*2.0-t*0.003+phase))/0.45,2.0));
    color=mix(vec3f(1.5,0.055,0.004),nearHot,core*heat)+vec3f(7.0,2.5,0.20)*fold*heat;
   }
   density+=d;weightedColor+=d*color;
  }
  let opacity=1.0-exp(-density*select(0.72,0.60,smoke)*life);let color=weightedColor/max(density,0.00001);
  radiance+=transmittance*opacity*color;transmittance*=1.0-opacity;
 }
 return vec4f(radiance,1.0-transmittance);
}
