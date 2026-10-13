// Positive normalized contiguous physical-texel aperture X; no sparse ghost taps.
struct U { view:vec4f, anchors:vec4f, phase:vec4f, flags:vec4f, color:vec4f, geometry:vec4f, optics:vec4f, identity:vec4f };
@group(0) @binding(0) var<uniform> u:U;
@vertex fn vsMain(@builtin(vertex_index) i:u32)->@builtin(position) vec4f { let p=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));return vec4f(p[i],0.,1.); }
@group(0) @binding(1) var source:texture_2d<f32>;
@fragment fn fsMain(@builtin(position) f:vec4f)->@location(0) vec4f {
 let at=vec2i(f.xy);let size=vec2i(textureDimensions(source));
 if(u.flags.x<.5||u.flags.y<.5){return vec4f(0.);}
 let sigma=max(.35,u.optics.y);let radius=i32(min(24.,ceil(3.*sigma)));
 var value=vec3f(0.);var energy=0.;
 for(var k=-24;k<=24;k++){if(abs(k)<=radius){let w=exp(-.5*pow(f32(k)/sigma,2.));value+=textureLoad(source,clamp(at+vec2i(k,0),vec2i(0),size-vec2i(1)),0).rgb*w;energy+=w;}}
 return vec4f(value/energy,0.);
}
