struct Uniforms { viewport:vec4f, anchor:vec4f, gates:vec4f, reserve:vec4f }
@group(0) @binding(0) var<uniform> u:Uniforms;
@group(0) @binding(1) var source:texture_2d<f32>;
struct VertexOut { @builtin(position) position:vec4f }
@vertex fn vs(@builtin(vertex_index) index:u32)->VertexOut {
  var positions=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));
  var result:VertexOut; result.position=vec4f(positions[index],0.,1.); return result;
}
@fragment fn fs(in:VertexOut)->@location(0) vec4f {
  if(u.gates.x<.5 || u.viewport.w<0. || u.viewport.w>=u.anchor.z){return vec4f(0.);}
  let local=in.position.xy-u.anchor.xy;
  if(local.x<-.5*u.viewport.z-4. || local.x>.5*u.viewport.z+4. || local.y<-.45*u.viewport.z-4. || local.y>.16*u.viewport.z+4.){return vec4f(0.);}
  let pixel=vec2i(in.position.xy);
  let dimensions=vec2i(textureDimensions(source));
  let direct=textureLoad(source,clamp(pixel,vec2i(0),dimensions-vec2i(1)),0);
  if(u.gates.y<.5){return direct;}
  var blurred=vec3f(0.); var weightSum=0.;
  // Contiguous normalized Gaussian PSF: adjacent taps cover all support; no separated image copies.
  let sigma=clamp(u.viewport.z/64.*1.15,1.15,2.3);
  for(var y=-4;y<=4;y+=1){for(var x=-4;x<=4;x+=1){
    let offset=vec2i(x,y);
    let weight=exp(-f32(x*x+y*y)/(2.*sigma*sigma));
    let coord=pixel+offset;
    if(all(coord>=vec2i(0)) && all(coord<dimensions)) {blurred+=textureLoad(source,coord,0).rgb*weight;}
    weightSum+=weight;
  }}
  let response=blurred/weightSum*.32;
  return vec4f(direct.rgb+response,max(direct.a,clamp(max(response.r,max(response.g,response.b))*.16,0.,.3)));
}
