@fragment fn fragment(@builtin(position) pixel:vec4f)->@location(0) vec4f {
 let t=f.viewport.z;
 if(f.flags.x<.5||t<0.||t>=1.25){return vec4f(0.);}
 let p=vec2f(pixel.x-f.anchor.x,f.anchor.y-pixel.y)/f.anchor.z;
 let aa=.65/f.anchor.z;
 let q=p-vec2f(0.,glyphY(t));let d=skullDistance(q);
 let coverage=1.-smoothstep(-aa,aa,d);
 // A luminous information field, not exposed bone or a metallic skull object.
 var light=glyphRadiance(q,d,t)*coverage;
 // A short contiguous deposit joins the actual contact origin to the lower jaw.
 if(t<.145){
  let tip=transferTip(t);
  let nearest=vec2f(0.,clamp(p.y,0.,max(0.,tip)));
  let deposit=exp(-dot(p-nearest,p-nearest)/.000036);
  light+=vec3f(1.,.75,.36)*transferFlux(t)*deposit;
 }
 if(t<.18){
  let radius=.018+.142*smoothstep(0.,.18,t);
  let envelope=8.*smoothstep(0.,.012,t)*(1.-smoothstep(.025,.18,t));
  let rim=exp(-pow((length(p)-radius)/max(.009,aa),2.));
  let core=exp(-dot(p,p)/.0011)*(1.-smoothstep(.012,.055,t));
  light+=vec3f(1.,.88,.66)*envelope*(rim*.65+core);
 }
 return vec4f(light,coverage);
}
