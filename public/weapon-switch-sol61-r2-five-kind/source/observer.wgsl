// OBS1: source-bound 9-tap near diffusion; not a lens model / flare.
struct Uniforms { viewport: vec4<f32>, state: vec4<f32>, options: vec4<f32> }
@group(0) @binding(0) var src:texture_2d<f32>;
@group(0) @binding(1) var<uniform> u:Uniforms;
struct Out {@builtin(position) pos:vec4<f32>}
@vertex fn vs(@builtin(vertex_index)n:u32)->Out {
 let a=array<vec2<f32>,3>(vec2<f32>(-1.,-1.),vec2<f32>(3.,-1.),vec2<f32>(-1.,3.));
 var o:Out;o.pos=vec4<f32>(a[n],0.,1.);return o;
}
fn fetch(p:vec2<i32>)->vec4<f32>{let dim=vec2<i32>(textureDimensions(src));return textureLoad(src,clamp(p,vec2<i32>(0),dim-vec2<i32>(1)),0);}
@fragment fn fs(o:Out)->@location(0)vec4<f32>{
 let t=u.state.x;if(t<0. || t>=.78){return vec4<f32>(0.);}
 let p=(o.pos.xy-u.viewport.zw)/u.state.y;
 if(any(abs(p)>vec2<f32>(.92,.52))){return vec4<f32>(0.);}
 let px=vec2<i32>(o.pos.xy);let tap=max(1,i32(round(u.state.y*.025)));
 let center=fetch(px);var spread=vec3<f32>(0.);
 for(var y:i32=-1;y<=1;y++){for(var x:i32=-1;x<=1;x++){
   let sample=fetch(px+vec2<i32>(x,y)*tap);
   spread+=max(sample.rgb-vec3<f32>(.18),vec3<f32>(0.))/9.;
 }}
 let near=spread*.30*u.options.w;
 let rgb=center.rgb+near;
 let alpha=max(center.a,clamp(max(near.r,max(near.g,near.b)),0.,1.));
 return vec4<f32>(rgb,alpha);
}
