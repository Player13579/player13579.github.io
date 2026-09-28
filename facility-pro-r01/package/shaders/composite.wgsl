// OBS2/3: receiver-masked local illumination + highlight-only shoulder。
// LUT/underlay/receiverは数値データ。外部画像素材は使っていない。
struct Params { bloom:f32, proxy:f32, alive:f32, pad:f32 };
@group(0) @binding(0) var<uniform> u:Params;
@group(0) @binding(1) var body:texture_2d<f32>;
@group(0) @binding(2) var emission:texture_2d<f32>;
@group(0) @binding(3) var blurred:texture_2d<f32>;
@group(0) @binding(4) var light:texture_2d<f32>;
@group(0) @binding(5) var underlay:texture_2d<f32>;
@group(0) @binding(6) var receiver:texture_2d<f32>;
@group(0) @binding(7) var linearClamp:sampler;
struct V{@builtin(position)p:vec4f,@location(0)uv:vec2f};
@vertex fn vs(@builtin(vertex_index)i:u32)->V{let q=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));var o:V;o.p=vec4f(q[i],0.,1.);o.uv=vec2f(q[i].x*.5+.5,.5-q[i].y*.5);return o;}
fn linear(c:vec3f)->vec3f{return select(c/12.92,pow((c+.055)/1.055,vec3f(2.4)),c>vec3f(.04045));}
fn srgb(c:vec3f)->vec3f{return select(c*12.92,1.055*pow(max(c,vec3f(0.)),vec3f(1./2.4))-.055,c>vec3f(.0031308));}
fn shoulder(c:vec3f)->vec3f{let peak=max(c.r,max(c.g,c.b));if(peak<=.78){return c;}let peakOut=.78+.21*(1.-exp(-(peak-.78)/.42));return c*(peakOut/peak);}
@fragment fn fs(v:V)->@location(0)vec4f {
 let base=linear(textureSampleLevel(underlay,linearClamp,v.uv,0.).rgb);
 let b=textureSampleLevel(body,linearClamp,v.uv,0.);let source=textureSampleLevel(emission,linearClamp,v.uv,0.).rgb;
 let gloss=textureSampleLevel(light,linearClamp,v.uv,0.).rgb;
 let mask=textureSampleLevel(receiver,linearClamp,v.uv,0.).r;
 let bg=base*(vec3f(1.)+gloss*mask*2.5);
 let rad=bg*(1.-b.a)+b.rgb+source;
 let edge=(1.-smoothstep(.45,.493,abs(v.uv.x-.5)))*(1.-smoothstep(.41,.485,abs(v.uv.y-.5)));
 let bloom=textureSampleLevel(blurred,linearClamp,v.uv,0.).rgb*u.bloom*edge;
 // 未発火時はunderlayを厳密保持。発火中も全体露光を下げない。
 let support=clamp(b.a+dot(source+bloom+gloss*mask,vec3f(4.)),0.,1.);
 let result=select(base,mix(base,shoulder(rad+bloom),support),u.alive>.5);
 return vec4f(srgb(result),1.);
}

