// GPT-6.1-Sol 武器切替 創作5/5。linear RGB / premultiplied。
struct Uniforms { viewport:vec4<f32>, state:vec4<f32>, options:vec4<f32>, detail:vec4<f32> }
// viewport=(width,height,centerX,centerY), state=(ageSeconds,Hphysical,variant,reducedMotion)
// options=(main,dock,source,observer), detail=(extra,motionDetail,face,reserved)
struct Out { @builtin(position) pos:vec4<f32> }
@vertex fn vs(@builtin(vertex_index) n:u32)->Out {
 let vertices=array<vec2<f32>,3>(vec2<f32>(-1.,-1.),vec2<f32>(3.,-1.),vec2<f32>(-1.,3.));
 var o:Out; o.pos=vec4<f32>(vertices[n],0.,1.); return o;
}
// OBS: 9-tap source-bound near diffusion. レンズ/独立世界光ではない。
@group(0) @binding(0) var mainTex:texture_2d<f32>;
@group(0) @binding(1) var sourceTex:texture_2d<f32>;
@group(0) @binding(2) var<uniform> u:Uniforms;
fn sourceAt(p:vec2<i32>)->vec3<f32>{let d=vec2<i32>(textureDimensions(sourceTex));return textureLoad(sourceTex,clamp(p,vec2<i32>(0),d-vec2<i32>(1)),0).rgb;}
@fragment fn fs(o:Out)->@location(0) vec4<f32> {
 let px=vec2<i32>(o.pos.xy);let dim=vec2<i32>(textureDimensions(mainTex));
 let center=textureLoad(mainTex,clamp(px,vec2<i32>(0),dim-vec2<i32>(1)),0);
 // OBS専用uniform: viewport.zw=同一frameの全source支持域のunion中心、state.zw=half extent physical px。
 if(any(abs(o.pos.xy-u.viewport.zw)>u.state.zw)){return center;}
 var spread=vec3<f32>(0.);let stepPx=max(1,i32(round(u.state.y*.025)));
 for(var y:i32=-1;y<=1;y++){for(var x:i32=-1;x<=1;x++){spread+=sourceAt(px+vec2<i32>(x,y)*stepPx)/9.;}}
 let near=spread*.30*u.options.w;
 return vec4<f32>(center.rgb+near,max(center.a,clamp(max(near.r,max(near.g,near.b)),0.,1.)));
}
