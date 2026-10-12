struct Composite { settings:vec4f }
@group(0) @binding(0) var directImage:texture_2d<f32>;
@group(0) @binding(1) var observerImage:texture_2d<f32>;
@group(0) @binding(2) var<uniform> u:Composite;
struct Out { @builtin(position) position:vec4f }
@vertex fn vs(@builtin(vertex_index) n:u32)->Out {var p=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));var o:Out;o.position=vec4f(p[n],0,1);return o;}
@fragment fn fs(@builtin(position) pixel:vec4f)->@location(0) vec4f {
 let p=vec2i(pixel.xy); let source=textureLoad(directImage,p,0).rgb;
 let observed=textureLoad(observerImage,p,0).rgb;
 // Local display bloom responds to the same source. Source OFF zeroes every pass.
 // Render to the game's linear HDR scene before its existing display conversion.
 return vec4f(source+observed*(0.38*u.settings.x),0);
}
