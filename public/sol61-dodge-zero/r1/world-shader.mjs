export const worldShader=String.raw`
struct Frame{viewport:vec4f,actor:vec4f,time:vec4f,gates:vec4f,crop:vec4f,optics:vec4f};
@group(0) @binding(0)var<uniform> f:Frame;
@group(0) @binding(1)var bodyAtlas:texture_2d<f32>;
@group(0) @binding(2)var smp:sampler;
struct VertexOut{@builtin(position)position:vec4f,@location(0)pixel:vec2f};
@vertex fn vertex(@builtin(vertex_index)i:u32)->VertexOut{let corners=array<vec2f,6>(vec2f(-1.,-1.),vec2f(1.,-1.),vec2f(-1.,1.),vec2f(-1.,1.),vec2f(1.,-1.),vec2f(1.,1.));let p=f.actor.xy+corners[i]*(f.actor.zw*.5+vec2f(f.optics.z));var o:VertexOut;o.position=vec4f(p/f.viewport.xy*vec2f(2.,-2.)+vec2f(-1.,1.),0.,1.);o.pixel=p;return o;}
fn alpha(uv:vec2f)->f32{if(any(uv<vec2f(0.))||any(uv>vec2f(1.))){return 0.;}return textureSampleLevel(bodyAtlas,smp,f.crop.xy+uv*f.crop.zw,0.).a;}
fn body(uv:vec2f)->vec3f{if(any(uv<vec2f(0.))||any(uv>vec2f(1.))){return vec3f(0.);}let c=textureSampleLevel(bodyAtlas,smp,f.crop.xy+uv*f.crop.zw,0.).rgb;return select(c/12.92,pow((c+.055)/1.055,vec3f(2.4)),c>vec3f(.04045));}
fn registration(row:f32)->f32{if(f.time.z<.5){return 0.;}if(f.time.z<1.5){let a=.18*row/7.;return smoothstep(a,a+.045,f.time.x);}if(f.time.z<2.5){return .66+.34*(.5+.5*cos(6.283185307*(f.time.y/.42-row/8.)));}let a=.10*(7.-row)/7.;return 1.-smoothstep(a,a+.05,f.time.x);}
struct Output{@location(0)scene:vec4f,@location(1)sourceSignal:vec4f};
@fragment fn fragment(v:VertexOut)->Output{let uv=(v.pixel-f.actor.xy)/f.actor.zw+vec2f(.5);let a=alpha(uv)*f.gates.y;let px=f.viewport.z/64.;let step=vec2f(1.35*px)/f.actor.zw;let near=max(max(alpha(uv+vec2f(step.x,0.)),alpha(uv-vec2f(step.x,0.))),max(alpha(uv+vec2f(0.,step.y)),alpha(uv-vec2f(0.,step.y))));let far=min(min(alpha(uv+vec2f(step.x,0.)),alpha(uv-vec2f(step.x,0.))),min(alpha(uv+vec2f(0.,step.y)),alpha(uv-vec2f(0.,step.y))));let edge=max(near-a,a-far)*f.gates.y;let y=clamp(uv.y,0.,.999999)*8.;let row=floor(y);let local=fract(y)*8.;let domain=smoothstep(.7,1.0,local)*(1.-smoothstep(7.,7.3,local))*registration(row)*f.gates.x;let radiance=(vec3f(.18,.72,1.5)*a+vec3f(1.2,3.1,4.7)*edge)*domain;let sourceMask=exp(-dot((uv-vec2f(.5,.38))*vec2f(5.,8.),(uv-vec2f(.5,.38))*vec2f(5.,8.)))*a*domain;let source=sourceMask*f.time.w*f.gates.z;let emission=radiance+vec3f(8.,8.,7.6)*source;let receiver=body(uv)*a*(.08*domain+.16*source);var o:Output;o.scene=vec4f(emission+receiver,clamp(max(a,edge)*domain*.48,0.,.64));o.sourceSignal=vec4f(emission,source);return o;}
`;
