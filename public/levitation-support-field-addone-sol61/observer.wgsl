// Contextual aperture Y and scene composition; scene is actual host input.
struct U { view:vec4f, anchors:vec4f, phase:vec4f, flags:vec4f, color:vec4f, geometry:vec4f, optics:vec4f, identity:vec4f };
@group(0) @binding(0) var<uniform> u:U;
@vertex fn vsMain(@builtin(vertex_index) i:u32)->@builtin(position) vec4f { let p=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));return vec4f(p[i],0.,1.); }
@group(0) @binding(1) var source:texture_2d<f32>;
@group(0) @binding(2) var apertureX:texture_2d<f32>;
@group(0) @binding(3) var scene:texture_2d<f32>;
@fragment fn fsMain(@builtin(position) f:vec4f)->@location(0) vec4f {
 let at=vec2i(f.xy);let size=vec2i(textureDimensions(source));let base=textureLoad(scene,at,0);
 if(u.flags.x<.5){return base;}
 let direct=textureLoad(source,at,0);var radiance=direct.rgb;
 if(u.flags.y>.5){let sigma=max(.35,u.optics.y);let radius=i32(min(24.,ceil(3.*sigma)));var blurred=vec3f(0.);var energy=0.;
 for(var k=-24;k<=24;k++){if(abs(k)<=radius){let w=exp(-.5*pow(f32(k)/sigma,2.));blurred+=textureLoad(apertureX,clamp(at+vec2i(0,k),vec2i(0),size-vec2i(1)),0).rgb*w;energy+=w;}}
 radiance=mix(direct.rgb,blurred/energy,clamp(u.optics.x,0.,1.));}
 return vec4f(clamp(base.rgb*(1.-direct.a)+radiance,vec3f(0.),vec3f(1.)),1.);
}
