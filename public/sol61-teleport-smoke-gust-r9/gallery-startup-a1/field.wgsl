fn field(q:vec3f)->f32 {
 if(q.z<0.0 || q.x<p.supportXDepth.x || q.x>p.supportXDepth.y || q.y<p.supportXDepth.z || q.y>p.supportXDepth.w || q.z<p.supportHeight.x || q.z>p.supportHeight.y){return 0.0;}
 var wake=0.0;
 for(var i=0u;i<6u;i++){
  let a=lobes[i];let b=lobes[i+1u];let metric=(a.radiusPad.xyz+b.radiusPad.xyz)*0.5;
  let d=(b.centerDensity.xyz-a.centerDensity.xyz)/metric;let v=(q-a.centerDensity.xyz)/metric;let h=clamp(dot(v,d)/max(0.000001,dot(d,d)),0.0,1.0);
  let n=(q-mix(a.centerDensity.xyz,b.centerDensity.xyz,h))/mix(a.radiusPad.xyz,b.radiusPad.xyz,h);let phase=mix(a.radiusPad.w,b.radiusPad.w,h);
  let wave=0.5+0.5*cos(2.6*n.z-1.5*n.x+0.8*n.y+phase);
  wake=max(wake,mix(a.centerDensity.w,b.centerDensity.w,h)*(1.0-smoothstep(0.20,1.0,dot(n,n)))*(0.24+0.28*wave));
 }
 var roll=0.0;var air=0.0;
 for(var j=0u;j<2u;j++){
  let row=lobes[2u+2u*j];let d=q-row.centerDensity.xyz;let k=f32(j);
  let xx=d.x/(0.23+0.025*k);let zz=d.z/(0.22+0.025*k);let r=sqrt(xx*xx+zz*zz);let nx=xx/max(0.000001,r);let nz=zz/max(0.000001,r);let phase=row.radiusPad.w;
  let irregular=1.0+0.13*((nx*nx-nz*nz)*cos(phase)+2.0*nx*nz*sin(phase));let radial=(r-irregular)/0.48;let depth=d.y/(0.22+0.02*k);
  let facing=nx*cos(phase)+nz*sin(phase);let throat=1.0-0.82*smoothstep(0.42,0.86,facing);let fold=0.70+0.30*(0.5+0.5*cos(2.4*depth+phase+nx*1.4));
  roll=max(roll,row.centerDensity.w*exp(-2.2*(radial*radial+depth*depth))*throat*fold);
  let nd=d/vec3f(0.15+0.02*k,0.25,0.14+0.02*k);air=max(air,0.86*exp(-3.0*dot(nd,nd)));
 }
 return max(wake*(1.0-air),roll);
}
