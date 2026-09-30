export const worldShader=/*wgsl*/`
struct U{viewport:vec4f,time:vec4f,options:vec4f,more:vec4f,contact:vec4f};
@group(0) @binding(0) var<uniform> u:U;
@group(0) @binding(1) var actor:texture_2d<f32>;
@group(0) @binding(2) var samp:sampler;
struct V{@builtin(position) clip:vec4f,@location(0) normal:vec3f,@location(1) position:vec3f,@location(2) uv:vec2f,@location(3) @interpolate(flat) ids:vec2f};
struct Out{@location(0) scene:vec4f,@location(1) emission:vec4f};
fn rotate(p:vec3f)->vec3f{let cy=cos(.4886922);let sy=sin(.4886922);let cx=cos(.13962634);let sx=sin(.13962634);let a=vec3f(cy*p.x+sy*p.z,p.y,-sy*p.x+cy*p.z);return vec3f(a.x,cx*a.y-sx*a.z,sx*a.y+cx*a.z);}
fn inverseRotate(p:vec3f)->vec3f{let cy=cos(.4886922);let sy=sin(.4886922);let cx=cos(.13962634);let sx=sin(.13962634);let a=vec3f(p.x,cx*p.y+sx*p.z,-sx*p.y+cx*p.z);return vec3f(cy*a.x-sy*a.z,a.y,sy*a.x+cy*a.z);}
fn center(instance:u32)->vec2f{if(u.options.w>.5){return vec2f(u.viewport.x*select(.25,.75,instance>0u),u.viewport.y*.5);}return u.viewport.xy*.5;}
fn life(id:f32)->vec2f{let stage=u.time.y;let t=u.time.x;var occupied=1.;var peak=0.;if(stage<.5){let local=t-id*.028;occupied=smoothstep(0.,.12,local);peak=exp(-pow((local-.075)/.026,2.))*occupied;}if(stage>1.5&&stage<2.5){let local=t-(17.-id)*.022;occupied=1.-smoothstep(.025,.095,local);peak=.7*exp(-pow((local-.025)/.021,2.))*occupied;}if(stage>3.5){occupied=0.;}return vec2f(occupied,peak);}
fn source(id:f32,p:vec3f,uv:vec2f)->vec3f{let alive=life(id);let middle=exp(-pow((uv.x-.40)/.46,2.)-pow((uv.y-.55)/.44,2.));let node=exp(-pow((uv.x-.75)/.14,2.)-pow((uv.y-.30)/.12,2.));var blue=(.055+.135*middle)*alive.x;var white=2.7*node*alive.y;
 if(u.time.y>2.5&&u.time.y<3.5){let t=u.time.x;let contact=u.contact.xyz;let distance=length(p-contact);let direct=exp(-pow(distance/.18,2.))*exp(-pow((t-.055)/.045,2.));let address=floor(id/3.);let response=exp(-pow((t-(.09+address*.032))/.10,2.))*(1.-smoothstep(.4,.65,t));let unknown=exp(-pow((t-.085)/.07,2.));blue+=.46*middle*select(unknown,response,u.time.z>.5)*alive.x;let selected=select(0.,1.,u32(id)==1u||u32(id)==7u||u32(id)==13u);white+=select(node*selected*1.9*unknown,direct*3.0,u.time.z>.5)*alive.x;}
 return vec3f(alive.x,blue*u.options.x,white*u.options.x);
}
@vertex fn meshVS(@location(0) position:vec3f,@location(1) normal:vec3f,@location(2) uv:vec2f,@location(3) ids:vec2f,@builtin(instance_index) instance:u32)->V{let viewed=rotate(position);let pixel=center(instance)+vec2f(viewed.x,-viewed.y)*(u.viewport.z/1.65);var v:V;v.clip=vec4f(pixel.x/u.viewport.x*2.-1.,1.-pixel.y/u.viewport.y*2.,.5-viewed.z*.1,1.);v.normal=rotate(normal);v.position=position;v.uv=uv;v.ids=ids;return v;}
@fragment fn meshFS(v:V)->Out{let id=v.ids.x*3.+v.ids.y;let field=source(id,v.position,v.uv);let density=field.x*(.65+.35*exp(-pow((v.uv.x-.4)/.46,2.)-pow((v.uv.y-.55)/.44,2.)));let coverage=(1.-exp(-density*.18))*u.options.z;
 // 単境界のsource carrier、normal/view/specular/Lambert材質応答なし。
 let radiance=vec3f(.12,.78,1.5)*field.y+vec3f(1.05,1.02,.95)*field.z;
 let material=vec3f(.018,.08,.14)*coverage;var out:Out;out.scene=vec4f(material+radiance,coverage);out.emission=vec4f(radiance,coverage);return out;}
@vertex fn fullVS(@builtin(vertex_index)i:u32)->@builtin(position)vec4f{var p=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));return vec4f(p[i],0,1);}
@fragment fn backgroundFS(@builtin(position)p:vec4f)->Out{var bg=vec3f(.012,.021,.036);if(u.options.w>.5&&p.x>u.viewport.x*.5){bg=vec3f(.68,.72,.76);}var out:Out;out.scene=vec4f(bg,1.);out.emission=vec4f(0.);return out;}
struct BodyV{@builtin(position)clip:vec4f,@location(0)uv:vec2f,@location(1)world:vec3f};
@vertex fn bodyVS(@builtin(vertex_index)i:u32,@builtin(instance_index)instance:u32)->BodyV{var pos=array<vec2f,6>(vec2f(-.5,-.5),vec2f(.5,-.5),vec2f(.5,.5),vec2f(-.5,-.5),vec2f(.5,.5),vec2f(-.5,.5));let a=pos[i];let pixel=center(instance)+a*vec2f(u.viewport.z*136./225.,u.viewport.z);var v:BodyV;v.clip=vec4f(pixel.x/u.viewport.x*2.-1.,1.-pixel.y/u.viewport.y*2.,.5,1.);v.uv=vec2f((62.+(a.x+.5)*136.)/768.,(15.+(a.y+.5)*225.)/512.);v.world=inverseRotate(vec3f(a.x*1.65*136./225.,-a.y*1.65,0.));return v;}
fn boundaryPoint(side:u32,uv:vec2f,row:u32)->vec3f{let xz=array<vec2f,6>(vec2f(-.64,.66),vec2f(.64,.66),vec2f(.93,0.),vec2f(.64,-.66),vec2f(-.64,-.66),vec2f(-.93,0.));let ranges=array<vec2f,3>(vec2f(-1.,-.36),vec2f(-.28,.36),vec2f(.44,1.02));let a=mix(xz[side],xz[(side+1u)%6u],.08+.84*uv.x);return vec3f(a.x,mix(ranges[row].x,ranges[row].y,uv.y),a.y);}
@fragment fn bodyFS(v:BodyV)->Out{let b=textureSample(actor,samp,v.uv);let rgb=pow(b.rgb,vec3f(2.2));var incident=vec3f(0.);if(u.time.w>.5){for(var side=0u;side<6u;side++){for(var row=0u;row<3u;row++){let p=boundaryPoint(side,vec2f(.75,.30),row);let field=source(f32(side*3u+row),p,vec2f(.75,.30));let d=distance(v.world,p);incident+=(vec3f(.12,.78,1.5)*field.y+vec3f(1.05,1.02,.95)*field.z)*exp(-d*d*5.)*.035;}}}var out:Out;out.scene=vec4f((rgb+incident)*b.a,b.a);out.emission=vec4f(0.,0.,0.,b.a);return out;}
`;
