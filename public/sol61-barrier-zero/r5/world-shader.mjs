export const worldShader=/*wgsl*/`
struct U{viewport:vec4f,time:vec4f,options:vec4f,more:vec4f,contact:vec4f};
@group(0) @binding(0) var<uniform> u:U;
@group(0) @binding(1) var actor:texture_2d<f32>;
@group(0) @binding(2) var samp:sampler;
struct Out{@location(0) scene:vec4f,@location(1) emission:vec4f};
fn inverseRotate(p:vec3f)->vec3f{let cy=cos(.4886922);let sy=sin(.4886922);let cx=cos(.13962634);let sx=sin(.13962634);let a=vec3f(p.x,cx*p.y+sx*p.z,-sx*p.y+cx*p.z);return vec3f(cy*a.x-sy*a.z,a.y,sy*a.x+cy*a.z);}
fn center(instance:u32)->vec2f{if(u.options.w>.5){return vec2f(u.viewport.x*select(.25,.75,instance>0u),u.viewport.y*.5);}return u.viewport.xy*.5;}
fn occupied()->vec2f{var radius=1.;var supply=1.;if(u.time.y<.5){radius=smoothstep(0.,.46,u.time.x);supply=smoothstep(.02,.12,u.time.x);}if(u.time.y>1.5&&u.time.y<2.5){radius=1.-smoothstep(0.,.48,u.time.x);supply=1.-smoothstep(.40,.48,u.time.x);}if(u.time.y>3.5){radius=0.;supply=0.;}return vec2f(radius,supply);}
fn sq(x:f32)->f32{return x*x;}
fn gaussian(p:vec3f,c:vec3f,width:f32)->f32{return exp(-dot(p-c,p-c)/(width*width));}
// density/blue radiance/white radiance remain separate. No shell surface, noise, panel, or normal shading.
fn field(p:vec3f)->vec3f{let state=occupied();if(state.x<.00001){return vec3f(0.);}let q=length(p/(vec3f(.94,1.02,.78)*state.x));let edge=1.-smoothstep(.82,1.,q);let core=exp(-sq((p.y-.55*p.x)/(.42*state.x)));let density=edge*(.55+.7*core)*state.y;
 var blue=(.32+.24*core)*density;var white=0.;let t=u.time.x;
 if(u.time.y<.5){let a=vec3f(.72,.38,.36)*state.x;let b=vec3f(-.66,-.30,.40)*state.x;white=45.*(gaussian(p,a,.055)*exp(-sq((t-.16)/.045))+gaussian(p,b,.055)*exp(-sq((t-.38)/.058)))*edge*state.y;blue+=.5*density*exp(-sq((q-.82)/.18))*exp(-sq((t-.3)/.19));}
 if(u.time.y>2.5&&u.time.y<3.5){let d=distance(p,u.contact.xyz);let response=exp(-sq((d-t*2.3)/.28))*exp(-t*4.)*(1.-smoothstep(.44,.65,t));let unknown=exp(-sq((t-.085)/.10));blue+=1.3*density*select(unknown,response,u.time.z>.5);if(u.time.z>.5){white+=50.*gaussian(p,u.contact.xyz,.065)*exp(-sq((t-.055)/.05))*edge;}else{white+=21.*gaussian(p,vec3f(.64,.20,.38),.06)*unknown*edge;}}
 if(u.time.y>1.5&&u.time.y<2.5){let a=vec3f(-.64,.24,.36)*state.x;let b=vec3f(.66,-.25,.32)*state.x;white+=37.*(gaussian(p,a,.055)*exp(-sq((t-.14)/.045))+gaussian(p,b,.055)*exp(-sq((t-.28)/.05)))*edge*state.y;}
 return vec3f(density,blue*u.options.x,white*u.options.x);
}
fn radiance(f:vec3f)->vec3f{return vec3f(.08,.58,1.3)*f.y+vec3f(1.05,1.02,.95)*f.z;}
struct VolumeV{@builtin(position)clip:vec4f,@location(0)viewed:vec2f};
@vertex fn volumeVS(@builtin(vertex_index)i:u32,@builtin(instance_index)instance:u32)->VolumeV{var a=array<vec2f,6>(vec2f(-1,-1),vec2f(1,-1),vec2f(1,1),vec2f(-1,-1),vec2f(1,1),vec2f(-1,1));let viewed=a[i]*1.26;let pixel=center(instance)+vec2f(viewed.x,-viewed.y)*u.viewport.z/1.65;var v:VolumeV;v.clip=vec4f(pixel.x/u.viewport.x*2.-1.,1.-pixel.y/u.viewport.y*2.,.5,1.);v.viewed=viewed;return v;}
fn volume(v:VolumeV,front:bool)->Out{let step=1.26/36.;var transmission=1.;var accumulated=vec3f(0.);var emission=vec3f(0.);for(var i=0u;i<36u;i++){let z=select(0.,1.26,front)-(f32(i)+.5)*step;let f=field(inverseRotate(vec3f(v.viewed,z)));let absorb=(1.-exp(-f.x*.26*step))*u.options.z;let source=radiance(f)*step;accumulated+=transmission*(vec3f(.012,.045,.10)*absorb+source);emission+=transmission*source;transmission*=1.-absorb;}var out:Out;out.scene=vec4f(accumulated,1.-transmission);out.emission=vec4f(emission,1.-transmission);return out;}
@fragment fn backFS(v:VolumeV)->Out{return volume(v,false);}
@fragment fn frontFS(v:VolumeV)->Out{return volume(v,true);}
@vertex fn fullVS(@builtin(vertex_index)i:u32)->@builtin(position)vec4f{var p=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));return vec4f(p[i],0,1);}
@fragment fn backgroundFS(@builtin(position)p:vec4f)->Out{var bg=vec3f(.012,.021,.036);if(u.options.w>.5&&p.x>u.viewport.x*.5){bg=vec3f(.68,.72,.76);}var out:Out;out.scene=vec4f(bg,1.);out.emission=vec4f(0.);return out;}
struct BodyV{@builtin(position)clip:vec4f,@location(0)uv:vec2f,@location(1)world:vec3f};
@vertex fn bodyVS(@builtin(vertex_index)i:u32,@builtin(instance_index)instance:u32)->BodyV{var pos=array<vec2f,6>(vec2f(-.5,-.5),vec2f(.5,-.5),vec2f(.5,.5),vec2f(-.5,-.5),vec2f(.5,.5),vec2f(-.5,.5));let a=pos[i];let pixel=center(instance)+a*vec2f(u.viewport.z*136./225.,u.viewport.z);var v:BodyV;v.clip=vec4f(pixel.x/u.viewport.x*2.-1.,1.-pixel.y/u.viewport.y*2.,.5,1.);v.uv=vec2f((62.+(a.x+.5)*136.)/768.,(15.+(a.y+.5)*225.)/512.);v.world=inverseRotate(vec3f(a.x*1.65*136./225.,-a.y*1.65,0.));return v;}
@fragment fn bodyFS(v:BodyV)->Out{let body=textureSample(actor,samp,v.uv);let rgb=pow(body.rgb,vec3f(2.2));var incident=vec3f(0.);if(u.time.w>.5&&u.more.w>.5){let offsets=array<vec3f,6>(vec3f(.18,0,.18),vec3f(-.18,0,.18),vec3f(0,.18,.18),vec3f(0,-.18,.18),vec3f(.13,.13,-.18),vec3f(-.13,-.13,-.18));for(var i=0u;i<6u;i++){incident+=radiance(field(v.world+offsets[i]))*.008;}}var out:Out;out.scene=vec4f((rgb+incident)*body.a,body.a);out.emission=vec4f(0.,0.,0.,body.a);return out;}
`;
