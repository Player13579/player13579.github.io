export const worldShader=/*wgsl*/`
struct U{viewport:vec4f,event:vec4f,options:vec4f,gates:vec4f};
@group(0) @binding(0) var<uniform> u:U;
@group(0) @binding(1) var actor:texture_2d<f32>;
@group(0) @binding(2) var linearSampler:sampler;
struct Out{@location(0) scene:vec4f,@location(1) emission:vec4f};
fn sq(x:f32)->f32{return x*x;}
fn point(id:u32,index:u32)->vec3f{let sign=select(-1.,1.,id==1u||id==3u);if(id<2u){let p=array<vec3f,4>(vec3f(0,.02,.22),vec3f(.20,.16,.22),vec3f(.36,.06,.24),vec3f(.48,-.05,.20));return p[index]*vec3f(sign,1,1);}let p=array<vec3f,4>(vec3f(0,.02,.22),vec3f(.12,-.25,.20),vec3f(.27,-.44,.24),vec3f(.17,-.69,.20));return p[index]*vec3f(sign,1,1);}
fn field(p:vec3f)->vec3f{let age=u.event.x/max(.001,u.event.y);if(u.event.z<.5||age<0.||age>=1.){return vec3f(0.);}let establish=smoothstep(0.,.10,age);let progress=smoothstep(.10,.62,age);let supply=1.-smoothstep(.88,1.,age);var density=0.;var emission=0.;var white=0.;
 if(p.z<0.){let a=vec3f(0,-.10,-.18);let b=vec3f(0,.02,-.08);let delta=b-a;let along=clamp(dot(p-a,delta)/dot(delta,delta),0.,1.);let d=length(p-mix(a,b,along));density=(1.-smoothstep(.06,.12,d))*establish*supply;emission=density*.18;return vec3f(density,emission*u.options.x,0.);}
 let core=length((p-vec3f(0,.02,.22))/vec3f(.25,.19,.15));let coreDensity=(1.-smoothstep(.35,1.,core))*establish*supply;density=coreDensity*.65;emission=coreDensity*.28;white=17.*exp(-dot(p-vec3f(0,.02,.22),p-vec3f(0,.02,.22))/.0025)*exp(-sq((age-.075)/.032))*supply;
 for(var id=0u;id<4u;id++){var total=0.;for(var j=0u;j<3u;j++){total+=distance(point(id,j),point(id,j+1u));}var before=0.;for(var j=0u;j<3u;j++){let a=point(id,j);let b=point(id,j+1u);let delta=b-a;let len=length(delta);let along=clamp(dot(p-a,delta)/dot(delta,delta),0.,1.);let s=(before+along*len)/total;let closest=mix(a,b,along);let distanceTo=distance(p,closest);let width=select(.155,.14,id<2u)*(1.-smoothstep(.76,1.,s));let support=1.-smoothstep(width*.32,max(.003,width),distanceTo);let arrived=smoothstep(s*total/.81-.025,s*total/.81+.025,progress);let f=support*arrived*establish*supply;density=max(density,f);let head=exp(-sq((s-progress*.81/total)/.08));emission=max(emission,f*(.30+.66*head));let axis=exp(-sq(distanceTo/.042));let peak=23.*f*axis*head*(1.-smoothstep(.65,.80,age));white=max(white,peak);before+=len;}}
 return vec3f(density,emission*u.options.x,white*u.options.x);
}
fn light(f:vec3f)->vec3f{return vec3f(1.1,.43,.08)*f.y+vec3f(1.05,1.02,.98)*f.z;}
fn center(instance:u32)->vec2f{if(u.options.w>.5){return vec2f(u.viewport.x*select(.25,.75,instance>0u),u.viewport.y*.5);}return u.viewport.xy*.5;}
struct VolumeV{@builtin(position)clip:vec4f,@location(0)plane:vec2f};
@vertex fn volumeVS(@builtin(vertex_index)i:u32,@builtin(instance_index)instance:u32)->VolumeV{let points=array<vec2f,6>(vec2f(-1,-1),vec2f(1,-1),vec2f(1,1),vec2f(-1,-1),vec2f(1,1),vec2f(-1,1));let plane=points[i]*vec2f(.9,1.0);let pixel=center(instance)+vec2f(plane.x,-plane.y)*u.viewport.z/1.65;var v:VolumeV;v.clip=vec4f(pixel.x/u.viewport.x*2.-1.,1.-pixel.y/u.viewport.y*2.,.5,1.);v.plane=plane;return v;}
fn volume(v:VolumeV,front:bool)->Out{let step=.6/24.;var transmit=1.;var colour=vec3f(0.);var source=vec3f(0.);for(var i=0u;i<24u;i++){let z=select(0.,.6,front)-(f32(i)+.5)*step;let f=field(vec3f(v.plane,z));let coverage=(1.-exp(-f.x*step*1.3))*u.options.z;let ray=light(f)*step;colour+=transmit*(vec3f(.035,.009,.02)*coverage+ray);source+=transmit*ray;transmit*=1.-coverage;}var out:Out;out.scene=vec4f(colour,1.-transmit);out.emission=vec4f(source,1.-transmit);return out;}
@fragment fn frontFS(v:VolumeV)->Out{return volume(v,true);}
@fragment fn rearFS(v:VolumeV)->Out{return volume(v,false);}
@vertex fn fullVS(@builtin(vertex_index)i:u32)->@builtin(position)vec4f{let a=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));return vec4f(a[i],0,1);}
@fragment fn backgroundFS(@builtin(position)p:vec4f)->Out{var bg=vec3f(.012,.021,.036);if(u.options.w>.5&&p.x>u.viewport.x*.5){bg=vec3f(.68,.72,.76);}var out:Out;out.scene=vec4f(bg,1.);out.emission=vec4f(0.);return out;}
struct BodyV{@builtin(position)clip:vec4f,@location(0)uv:vec2f,@location(1)world:vec3f};
@vertex fn bodyVS(@builtin(vertex_index)i:u32,@builtin(instance_index)instance:u32)->BodyV{let a=array<vec2f,6>(vec2f(-.5,-.5),vec2f(.5,-.5),vec2f(.5,.5),vec2f(-.5,-.5),vec2f(.5,.5),vec2f(-.5,.5));let p=a[i];let pixel=center(instance)+p*vec2f(u.viewport.z*136./225.,u.viewport.z);var v:BodyV;v.clip=vec4f(pixel.x/u.viewport.x*2.-1.,1.-pixel.y/u.viewport.y*2.,.5,1.);v.uv=vec2f((62.+(p.x+.5)*136.)/768.,(15.+(p.y+.5)*225.)/512.);v.world=vec3f(p.x*1.65*136./225.,-p.y*1.65,.02);return v;}
@fragment fn bodyFS(v:BodyV)->Out{let original=textureSample(actor,linearSampler,v.uv);var receive=vec3f(0.);if(u.gates.w>.5){let offsets=array<vec3f,4>(vec3f(.08,0,.14),vec3f(-.08,0,.14),vec3f(0,.08,.14),vec3f(0,-.08,.14));for(var i=0u;i<4u;i++){receive+=light(field(v.world+offsets[i]))*.012;}}var out:Out;out.scene=vec4f((pow(original.rgb,vec3f(2.2))+receive)*original.a,original.a);out.emission=vec4f(0.,0.,0.,original.a);return out;}
`;
