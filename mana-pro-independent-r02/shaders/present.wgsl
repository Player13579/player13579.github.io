@group(0) @binding(0) var scene:texture_2d<f32>;
@vertex fn vertexMain(@builtin(vertex_index) i:u32)->@builtin(position) vec4<f32> {
 var p=array<vec2<f32>,3>(vec2<f32>(-1.,-1.),vec2<f32>(3.,-1.),vec2<f32>(-1.,3.));
 return vec4<f32>(p[i],0.,1.);
}
@fragment fn fragmentMain(@builtin(position) p:vec4<f32>)->@location(0) vec4<f32> {
 return textureLoad(scene,vec2<i32>(p.xy),0);
}
