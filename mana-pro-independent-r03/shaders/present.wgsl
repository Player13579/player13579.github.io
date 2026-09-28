@group(0) @binding(0) var frameImage:texture_2d<f32>;
@vertex fn vertex(@builtin(vertex_index) i:u32)->@builtin(position) vec4f {
  var p=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));return vec4f(p[i],0,1);
}
@fragment fn fragment(@builtin(position) position:vec4f)->@location(0) vec4f {
  return textureLoad(frameImage,vec2i(position.xy),0);
}
