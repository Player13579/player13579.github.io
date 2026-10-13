// R2 scene-relative positive chroma shoulder; only emitted radiance is mapped.
struct U { view:vec4f, anchors:vec4f, phase:vec4f, flags:vec4f, color:vec4f, geometry:vec4f, optics:vec4f, identity:vec4f };
@group(0) @binding(0) var<uniform> u:U;
@vertex fn vsMain(@builtin(vertex_index) i:u32)->@builtin(position) vec4f { let p=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));return vec4f(p[i],0.,1.); }
@group(0) @binding(1) var source:texture_2d<f32>;
@group(0) @binding(2) var apertureX:texture_2d<f32>;
@group(0) @binding(3) var scene:texture_2d<f32>;
fn sourceShoulder(base:vec3f,emitted:vec3f)->vec3f {
 let peak=max(emitted.r,max(emitted.g,emitted.b));
 if(peak<=.000001){return vec3f(0.);}
 let chroma=emitted/peak;let headroom=max(vec3f(0.),vec3f(1.)-base);
 var available=1000000.;
 if(chroma.r>.000001){available=min(available,headroom.r/chroma.r);}
 if(chroma.g>.000001){available=min(available,headroom.g/chroma.g);}
 if(chroma.b>.000001){available=min(available,headroom.b/chroma.b);}
 if(available<=.000001){return vec3f(0.);}
 let knee=.65*available;
 if(peak<=knee){return emitted;}
 let shoulder=.35*available;
 let mappedPeak=knee+shoulder*(1.-exp(-(peak-knee)/shoulder));
 return chroma*mappedPeak;
}
@fragment fn fsMain(@builtin(position) f:vec4f)->@location(0) vec4f {
 let at=vec2i(f.xy);let size=vec2i(textureDimensions(source));let base=textureLoad(scene,at,0);
 if(u.flags.x<.5){return base;}
 let direct=textureLoad(source,at,0);var radiance=direct.rgb;
 if(u.flags.y>.5){let sigma=max(.35,u.optics.y);let radius=i32(min(24.,ceil(3.*sigma)));var blurred=vec3f(0.);var energy=0.;
 for(var k=-24;k<=24;k++){if(abs(k)<=radius){let w=exp(-.5*pow(f32(k)/sigma,2.));blurred+=textureLoad(apertureX,clamp(at+vec2i(0,k),vec2i(0),size-vec2i(1)),0).rgb*w;energy+=w;}}
 radiance=mix(direct.rgb,blurred/energy,clamp(u.optics.x,0.,1.));}
 let transmitted=base.rgb*(1.-direct.a);
 return vec4f(transmitted+sourceShoulder(transmitted,max(radiance,vec3f(0.))),1.);
}
