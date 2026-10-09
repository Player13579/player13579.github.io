@fragment fn fragment(@builtin(position) pixel:vec4f)->@location(0) vec4f {
 let t=f.viewport.z;
 if(f.flags.x<.5||t<0.||t>=1.25){return vec4f(0.);}
 let p=vec2f(pixel.x-f.anchor.x,f.anchor.y-pixel.y)/f.anchor.z;
 let aa=.65/f.anchor.z;
 let q=p-vec2f(0.,glyphY(t));let d=skullDistance(q);
 let coverage=1.-smoothstep(-aa,aa,d);
 // A luminous information field, not exposed bone or a metallic skull object.
 let edge=1.-smoothstep(0.,.018,abs(d));
 var light=vec3f(1.,.78,.45)*glyphFlux(t)*coverage*(.72+.28*edge);
 if(t<.18){
  let radius=.018+.142*smoothstep(0.,.18,t);
  let envelope=8.*smoothstep(0.,.012,t)*(1.-smoothstep(.025,.18,t));
  let rim=exp(-pow((length(p)-radius)/max(.009,aa),2.));
  let core=exp(-dot(p,p)/.0011)*(1.-smoothstep(.012,.055,t));
  light+=vec3f(1.,.88,.66)*envelope*(rim*.65+core);
 }
 return vec4f(light,coverage);
}
