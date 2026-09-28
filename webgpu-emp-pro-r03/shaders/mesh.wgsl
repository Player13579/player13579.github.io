struct Camera { viewport:vec2f, center:vec2f, scale:f32, actorTime:f32, reserved:vec2f };
@group(0) @binding(0) var<uniform> cam:Camera;
struct In { @location(0) position:vec3f, @location(1) normal:vec3f, @location(2) color:vec3f, @location(3) material:vec3f, @location(4) uv:vec2f };
struct Out { @builtin(position) position:vec4f, @location(0) normal:vec3f, @location(1) color:vec3f, @location(2) material:vec3f, @location(3) uv:vec2f };
@vertex fn vertex_main(v:In)->Out {
 var o:Out;
 let p=(v.position.xy-cam.center)*cam.scale;
 o.position=vec4f(2.0*p.x/cam.viewport.x,2.0*p.y/cam.viewport.y,clamp(0.5-v.position.z/2048.0,0.001,0.999),1.0);
 o.normal=v.normal;o.color=v.color;o.material=v.material;o.uv=v.uv;return o;
}
@fragment fn fragment_main(v:Out)->@location(0) vec4f {
 let alpha=clamp(v.material.x,0.0,1.0);
 // Declared-field surface response, not a claim of physical metallic reflectance.
 let n=normalize(v.normal+vec3f(0.00001));
 let shade=0.30+0.28*abs(dot(n,normalize(vec3f(-0.4,0.65,0.75))));
 let radiance=v.color*(shade+v.material.y);
 return vec4f(radiance*alpha,alpha);
}
