struct Blur { extent:vec4f, direction:vec4f }
@group(0) @binding(0) var image:texture_2d<f32>;
@group(0) @binding(1) var<uniform> u:Blur;
struct Out { @builtin(position) position:vec4f }
@vertex fn vs(@builtin(vertex_index) n:u32)->Out {var p=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3)); var o:Out; o.position=vec4f(p[n],0,1);return o;}
// Source-only separable contiguous Gaussian, radius ceil(3*sigma), sigma=2.0*DPR.
// Horizontal then vertical. No scene input, lens ghosts or sparse displaced source copies.
@fragment fn fs(@builtin(position) pixel:vec4f)->@location(0) vec4f {
  let dims=vec2i(textureDimensions(image)); let coord=vec2i(pixel.xy);
  let sigma=u.extent.z; let radius=i32(ceil(3.0*sigma)); var sum=vec3f(0); var total=0.0;
  for(var offset=-radius;offset<=radius;offset++) {
    let w=exp(-0.5*pow(f32(offset)/sigma,2.0));
    let q=coord+vec2i(u.direction.xy)*offset;
    if(all(q>=vec2i(0))&&all(q<dims)){sum+=textureLoad(image,q,0).rgb*w;}
    total+=w;
  } return vec4f(sum/total,0);
}
