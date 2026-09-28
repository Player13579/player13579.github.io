// OBS2: linear premultipliedから表示へ。背景の既存画素には触れない。
@group(0) @binding(0) var image:texture_2d<f32>;
@vertex fn vs(@builtin(vertex_index) vi:u32)->@builtin(position) vec4<f32>{
  let p=array<vec2<f32>,3>(vec2(-1.0,-1.0),vec2(3.0,-1.0),vec2(-1.0,3.0));return vec4(p[vi],0.0,1.0);
}
fn encodeSRGB(v:vec3<f32>)->vec3<f32>{
  let c=max(v,vec3(0.0));return select(12.92*c,1.055*pow(c,vec3(1.0/2.4))-.055,c>vec3(.0031308));
}
@fragment fn fs(@builtin(position) position:vec4<f32>)->@location(0) vec4<f32>{
  let raw=textureLoad(image,vec2<i32>(position.xy),0);let alpha=clamp(raw.a,0.0,1.0);
  if(alpha<.00001){return vec4(0.0);}
  let straight=max(raw.rgb/alpha,vec3(0.0));
  let mapped=straight/(vec3(1.0)+straight); // 空間的に局所の値だけを圧縮。global露出変調なし。
  return vec4(clamp(encodeSRGB(mapped),vec3(0.0),vec3(1.0))*alpha,alpha);
}
