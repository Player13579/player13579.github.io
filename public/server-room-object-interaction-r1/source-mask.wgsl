@group(0) @binding(0) var sourceTexture:texture_2d<f32>;
@group(0) @binding(1) var actorCoverage:texture_2d<f32>;
@group(0) @binding(2) var linearSampler:sampler;
struct VOut { @builtin(position) position:vec4f, @location(0) uv:vec2f };
@vertex fn vertex(@builtin(vertex_index)i:u32)->VOut {
 let q=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.))[i];
 var o:VOut;o.position=vec4f(q,0.,1.);o.uv=vec2f((q.x+1.)*.5,(1.-q.y)*.5);return o;
}
@fragment fn fragment(in:VOut)->@location(0)vec4f {
 let source=textureSampleLevel(sourceTexture,linearSampler,in.uv,0.);
 let coverage=clamp(textureSampleLevel(actorCoverage,linearSampler,in.uv,0.).a,0.,1.);
 return vec4f(source.rgb*(1.-coverage),0.);
}
