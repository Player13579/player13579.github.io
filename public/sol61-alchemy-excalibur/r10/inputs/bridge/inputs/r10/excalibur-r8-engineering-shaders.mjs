// Proposed technical interface only. Neither an adopted creative revision nor GPU proof.
export function wrapObserver(authored) {
  const signature = '@fragment fn fs(v:V)->@location(0)vec4f{';
  if (authored.split(signature).length !== 2) throw Error('exact sealed observer signature required');
  return authored.replace(signature, 'fn authoredObserver(v:V)->vec4f{') + `
@group(0) @binding(4) var displayedBackdrop:texture_2d<f32>;
struct ObserverSnapshot { @location(0) observer:vec4f, @location(1) backdrop:vec4f };
@fragment fn fs(v:V)->ObserverSnapshot {
 var out:ObserverSnapshot;
 out.observer=authoredObserver(v);
 out.backdrop=textureLoad(displayedBackdrop,vec2i(v.position.xy),0);
 return out;
}
`;
}
export const TERMINAL_WGSL = /*wgsl*/`
@group(0) @binding(0) var displayedBackdrop:texture_2d<f32>;
@group(0) @binding(1) var linearHDR:texture_2d<f32>;
@vertex fn vs(@builtin(vertex_index)i:u32)->@builtin(position)vec4f {
 let p=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));return vec4f(p[i],0.,1.);
}
fn decodeSRGB(x:vec3f)->vec3f {
 return select(pow((x+vec3f(.055))/1.055,vec3f(2.4)),x/12.92,x<=vec3f(.04045));
}
fn encodeSRGB(x:vec3f)->vec3f {
 return select(1.055*pow(x,vec3f(1./2.4))-vec3f(.055),x*12.92,x<=vec3f(.0031308));
}
@fragment fn fs(@builtin(position)p:vec4f)->@location(0)vec4f {
 let b=textureLoad(displayedBackdrop,vec2i(p.xy),0);
 let e=textureLoad(linearHDR,vec2i(p.xy),0);
 var base=vec3f(0.);if(b.a>0.){base=decodeSRGB(b.rgb/b.a)*b.a;}
 let a=e.a+b.a*(1.-e.a);let rgb=e.rgb+base*(1.-e.a);
 if(a<=0.){return vec4f(0.);}
 return vec4f(encodeSRGB(rgb/a)*a,a);
}
`;
