struct Out {@builtin(position) pos:vec4f,@location(0) uv:vec2f};
struct Params {view:vec4f,scale:vec4f};
@group(0) @binding(0) var scene:texture_2d<f32>;
@group(0) @binding(1) var sceneSampler:sampler;
@group(0) @binding(2) var<uniform> params:Params;
@group(0) @binding(3) var emitted:texture_2d<f32>;
@vertex fn screenVS(@builtin(vertex_index) i:u32)->Out{let p=array<vec2f,3>(vec2f(-1.0,-1.0),vec2f(3.0,-1.0),vec2f(-1.0,3.0));var o:Out;o.pos=vec4f(p[i],0.0,1.0);o.uv=p[i]*vec2f(.5,-.5)+vec2f(.5,.5);return o;}
fn sourceAt(uv:vec2f)->vec3f{if(any(uv<vec2f(0.0))||any(uv>vec2f(1.0))){return vec3f(0.0);}return textureSampleLevel(emitted,sceneSampler,uv,0.0).rgb;}
fn encode(c:vec3f)->vec3f{return select(12.92*c,1.055*pow(max(c,vec3f(0.0)),vec3f(1.0/2.4))-.055,c>vec3f(.0031308));}
@fragment fn observerFS(o:Out)->@location(0) vec4f{
 let base=textureSampleLevel(scene,sceneSampler,o.uv,0.0);var halo=vec3f(0.0);var total=0.0;
 // Normalized finite Gaussian display PSF from this same frame's PH emission attachment.
 // No threshold, ghost, background compensation, fixed free-standing halo or temporal feedback.
 if(params.view.z>.5){for(var y:i32=-4;y<=4;y=y+1){for(var x:i32=-4;x<=4;x=x+1){let q=vec2f(f32(x),f32(y));let w=exp(-dot(q,q)/(2.0*1.6*1.6));halo+=sourceAt(o.uv+q*params.scale.xy/params.view.xy)*w;total+=w;}}halo=halo/max(total,.00001)*.13;}
 let coverage=max(base.a,clamp(max(halo.r,max(halo.g,halo.b))*.20,0.0,1.0));
 if(coverage<.0000001){return vec4f(0.0);}
 let straight=(base.rgb+halo)/coverage;let display=select(straight,encode(straight),params.view.w>.5);return vec4f(display*coverage,coverage);
}
