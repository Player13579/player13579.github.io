struct Frame { viewport:vec4f, anchor:vec4f, flags:vec4f, extra:vec4f }
@group(0) @binding(0) var<uniform> f:Frame;
@group(0) @binding(1) var image:texture_2d<f32>;
@vertex fn vertex(@builtin(vertex_index) i:u32)->@builtin(position) vec4f {
 let p=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));return vec4f(p[i],0.,1.);
}
fn load(p:vec2i)->vec4f {let hi=vec2i(textureDimensions(image))-vec2i(1);return textureLoad(image,clamp(p,vec2i(0),hi),0);}
fn encode(c:vec3f)->vec3f {return select(12.92*c,1.055*pow(c,vec3f(1./2.4))-.055,c>vec3f(.0031308));}
@fragment fn fragment(@builtin(position) pixel:vec4f)->@location(0) vec4f {
 let background=vec3f(.007,.012,.022);
 let rel=pixel.xy-f.anchor.xy;
 let margin=6.*max(1.,f.anchor.w);
 if(abs(rel.x)>.9*f.anchor.z+margin||rel.y < -2.*f.anchor.z-margin||rel.y>.4*f.anchor.z+margin){return vec4f(encode(1.-exp(-background)),1.);}
 let p=vec2i(pixel.xy);let source=load(p);var radiance=source.rgb;
 if(f.flags.y>.5&&f.flags.x>.5){
   var scatter=vec3f(0.);var streak=0.;
   // Finite local PSF: light spread and aperture cross from actual sparkle sources.
   for(var j=1;j<=4;j++){
     let weight=exp(-f32(j)*.75);
     let stepPx=max(1,i32(round(f.anchor.w)));
     let d=j*stepPx;
     let a=load(p+vec2i(d,0));let b=load(p-vec2i(d,0));
     let c=load(p+vec2i(0,d));let e=load(p-vec2i(0,d));
     scatter+=(a.rgb+b.rgb+c.rgb+e.rgb)*weight*.055;
     streak+=(a.a+b.a+c.a+e.a)*weight*.16;
   }
   radiance+=scatter+vec3f(1.,.9,.36)*streak;
 }
 // Display only; source HDR is retained in rgba16float, with one final sRGB encode.
 let display=1.-exp(-(background+radiance));
 return vec4f(encode(display),1.);
}
