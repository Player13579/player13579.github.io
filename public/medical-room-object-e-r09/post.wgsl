// OBS01有限source bloom / OBS02同sourceのレンズ反射。floor receiverは入力しない。
struct Frame{view:vec4f,rect:vec4f,state:vec4f,image:vec4f,obs:vec4f,kernel:vec4f};
@group(0) @binding(0)var<uniform> f:Frame;
@group(0) @binding(1)var scene:texture_2d<f32>;
@group(0) @binding(2)var blurSource:texture_2d<f32>;
@group(0) @binding(3)var smp:sampler;
struct V{@builtin(position)position:vec4f,@location(0)uv:vec2f};
@vertex fn vertex(@builtin(vertex_index)i:u32)->V{let q=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));var v:V;v.position=vec4f(q[i],0.,1.);v.uv=q[i]*vec2f(.5,-.5)+vec2f(.5);return v;}
fn linearToSrgb(c:vec3f)->vec3f{return select(c*12.92,1.055*pow(max(c,vec3f(0.)),vec3f(1./2.4))-.055,c>vec3f(.0031308));}
fn roomMask(p:vec2f)->f32{return smoothstep(143.,147.,p.x)*(1.-smoothstep(1020.,1024.,p.x))*smoothstep(57.,61.,p.y)*(1.-smoothstep(1252.,1256.,p.y));}
fn compose(uv:vec2f)->vec4f{
 let base=textureSampleLevel(scene,smp,uv,0.);let pixel=uv*f.view.xy;let p=(pixel-f.rect.xy)/f.rect.zw*f.image.xy;
 let bloom=textureSampleLevel(blurSource,smp,uv,0.).rgb*f.obs.z;
 let srcUv=(f.rect.xy+f.image.zw/f.image.xy*f.rect.zw)/f.view.xy;
 let src=textureSampleLevel(blurSource,smp,srcUv,0.).rgb;
 let center=mix(f.image.zw,f.obs.xy,f.kernel.w);let d=(p-center)/f.kernel.yz;
 let ghost=src*exp(-.5*dot(d,d))*f.obs.w;
 return vec4f(base.rgb+(bloom+ghost)*f.state.z*roomMask(p),base.a);
}
// host mainはこれをlinear HDR sceneへ合成して共有final encode。gallery単独はfinalEncodedのみ。
@fragment fn linearComposite(v:V)->@location(0)vec4f{return compose(v.uv);}
@fragment fn finalEncoded(v:V)->@location(0)vec4f{let c=compose(v.uv);return vec4f(linearToSrgb(c.rgb),c.a);}

