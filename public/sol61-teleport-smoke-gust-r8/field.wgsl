fn field(q:vec3f)->f32 {
 if(q.z<0.0 || q.x<p.supportXDepth.x || q.x>p.supportXDepth.y || q.y<p.supportXDepth.z || q.y>p.supportXDepth.w || q.z<p.supportHeight.x || q.z>p.supportHeight.y){return 0.0;}
 var rho=0.0;
 for(var i=0u;i<6u;i++){
  let a=lobes[i];let b=lobes[i+1u];let metric=(a.radiusPad.xyz+b.radiusPad.xyz)*0.5;
  let d=(b.centerDensity.xyz-a.centerDensity.xyz)/metric;let v=(q-a.centerDensity.xyz)/metric;
  let h=clamp(dot(v,d)/max(0.000001,dot(d,d)),0.0,1.0);
  let center=mix(a.centerDensity.xyz,b.centerDensity.xyz,h);let r=mix(a.radiusPad.xyz,b.radiusPad.xyz,h);let n=(q-center)/r;
  let phase=mix(a.radiusPad.w,b.radiusPad.w,h);
  let wave=0.5+0.5*cos(3.2*n.z-2.4*n.x+1.1*n.y+phase);let fold=0.32+0.68*wave*wave;
  rho=max(rho,mix(a.centerDensity.w,b.centerDensity.w,h)*(1.0-smoothstep(0.18,1.0,dot(n,n)))*fold);
 }
 var air=0.0;
 for(var j=0u;j<2u;j++){
  let row=lobes[2u+2u*j];let phase=row.radiusPad.w;let axis=vec3f(cos(phase),0.0,sin(phase));
  let delta=q-(row.centerDensity.xyz+axis*0.10);
  let u=delta.x*axis.x+delta.z*axis.z;let v=-delta.x*axis.z+delta.z*axis.x;
  let scaled=delta/vec3f(0.15,0.24,0.14);let pocket=exp(-2.8*dot(scaled,scaled));
  let mouth=exp(-3.2*((v/0.085)*(v/0.085)+(delta.y/0.24)*(delta.y/0.24)))*(1.0-smoothstep(0.12,0.31,u))*smoothstep(-0.045,0.025,u);
  air=max(air,0.94*max(pocket,mouth));
 }
 return rho*(1.0-air);
}
