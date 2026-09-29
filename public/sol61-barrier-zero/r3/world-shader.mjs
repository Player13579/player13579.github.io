export const worldShader=/*wgsl*/`
struct U{viewport:vec4f,time:vec4f,options:vec4f,more:vec4f};
@group(0) @binding(0) var<uniform> u:U;
@group(0) @binding(1) var actor:texture_2d<f32>;
@group(0) @binding(2) var samp:sampler;
struct V{@builtin(position) clip:vec4f,@location(0) normal:vec3f,@location(1) position:vec3f,@location(2) panelUV:vec2f,@location(3) @interpolate(flat) ids:vec2f};
struct Out{@location(0) scene:vec4f,@location(1) emission:vec4f};
fn ss(a:f32,b:f32,x:f32)->f32{return smoothstep(a,b,x);}
fn rotate(p:vec3f)->vec3f{let cy=cos(.5585054);let sy=sin(.5585054);let cx=cos(.2094395);let sx=sin(.2094395);let a=vec3f(cy*p.x+sy*p.z,p.y,-sy*p.x+cy*p.z);return vec3f(a.x,cx*a.y-sx*a.z,sx*a.y+cx*a.z);}
fn center(instance:u32)->vec2f{if(u.options.w>.5){return vec2f(u.viewport.x*select(.25,.75,instance>0u),u.viewport.y*.5);}return u.viewport.xy*.5;}
@vertex fn meshVS(@location(0) position:vec3f,@location(1) normal:vec3f,@location(2) panelUV:vec2f,@location(3) ids:vec2f,@builtin(instance_index) instance:u32)->V{
 var p=position;let panel=ids.x;let t=u.time.x;let stage=u.time.y;
 if(stage<.5){let rank=f32((u32(panel)*3u)%8u);let born=ss(rank*.045,rank*.045+.2,t);p.y=-1.13+(p.y+1.13)*born;}
 if(stage>1.5&&stage<2.5){let opened=ss(.07,.36,t);let quadrant=floor(panel*.5);let axis=quadrant*1.5707963+.7853982;p+=vec3f(sin(axis),.035,cos(axis))*.4*opened;}
 let viewed=rotate(p+vec3f(0,.075,0));let pixel=center(instance)+vec2f(viewed.x,-viewed.y)*(u.viewport.z/1.65);
 var v:V;v.clip=vec4f(pixel.x/u.viewport.x*2.-1.,1.-pixel.y/u.viewport.y*2.,.5-viewed.z*.1,1.);v.normal=rotate(normal);v.position=p;v.panelUV=panelUV;v.ids=ids;return v;
}
@fragment fn meshFS(v:V)->Out{
 let stage=u.time.y;let t=u.time.x;let panel=v.ids.x;let inner=v.ids.y;let n=normalize(v.normal);let rear=select(1.,.48,n.z<0.);let side=1.-abs(n.z);
 let uv=v.panelUV;let cap=ss(.7,.9,abs(n.y));let seam=(1.-ss(.015,.075,min(uv.x,1.-uv.x)))*(1.-cap);
 let junction=exp(-pow((uv.y-.18)/.095,2.))+exp(-pow((uv.y-.84)/.095,2.));
 let powered=select(.14,1.,u32(panel)==1u||u32(panel)==5u);
 let bodyWindow=(1.-ss(.28,.55,abs(v.position.x)))*(1.-ss(.45,.8,v.position.y));
 let faceProtect=ss(.45,.85,v.position.y)*(1.-ss(.18,.48,abs(v.position.x)));
 let layer=select(1.,.56,inner>.5);
 var envelope=1.;var closing=0.;var supply=1.;
 if(stage<.5){let rank=f32((u32(panel)*3u)%8u);let local=t-rank*.045;envelope=ss(0.,.065,local);closing=exp(-pow((local-.19)/.052,2.));supply=1.+closing*1.9;}
 if(stage>1.5&&stage<2.5){envelope=1.-ss(.19,.48,t);supply=1.+.8*exp(-pow((t-.065)/.055,2.));}
 let coverage=(.18+.16*side+.035*cap)*(1.-.42*bodyWindow)*(1.-.64*faceProtect)*envelope*layer;
 let material=vec3f(.018,.29,.57)*(.68+.32*max(0.,dot(n,normalize(vec3f(-.4,.65,1.)))))+vec3f(.0,.06,.11)*side;
 // Broad panels and their actual joining boundaries receive energy; no decorative overlay grid.
 var source=(.055+.12*side+seam*.21)*envelope*layer*rear*supply;
 var core=seam*junction*powered*(.42+closing*1.7)*envelope*layer*rear;
 source+=closing*.25*envelope*layer*rear;
 if(stage>2.5&&stage<3.5){
  let hit=vec3f(.55,.16,.6);let distance=length(v.position-hit);
  let point=exp(-pow(distance/.2,2.))*exp(-pow((t-.06)/.065,2.));
  let broadResponse=exp(-pow((distance-t*2.35)/.2,2.))*(1.-ss(.30,.65,t));
  let localResponse=point*1.4+broadResponse*.55;
  let unknownResponse=(seam*.32+.12)*exp(-pow((t-.075)/.07,2.));
  source+=select(unknownResponse,localResponse,u.time.z>.5)*envelope*layer;
  core+=point*1.2*envelope*layer*select(0.,1.,u.time.z>.5);
 }
 source*=u.options.x;core*=u.options.x;
 let radiance=vec3f(.12,.88,1.85)*source+vec3f(2.4,2.44,2.48)*core;
 let alpha=coverage*u.options.z;var result:Out;result.scene=vec4f(material*alpha+radiance,alpha);result.emission=vec4f(radiance,alpha);return result;
}
@vertex fn fullVS(@builtin(vertex_index) i:u32)->@builtin(position) vec4f{var p=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));return vec4f(p[i],0,1);}
@fragment fn backgroundFS(@builtin(position) p:vec4f)->Out{var bg=vec3f(.012,.021,.036);if(u.options.w>.5&&p.x>u.viewport.x*.5){bg=vec3f(.68,.72,.76);}var r:Out;r.scene=vec4f(bg,1);r.emission=vec4f(0);return r;}
struct BodyV{@builtin(position) clip:vec4f,@location(0) uv:vec2f};
@vertex fn bodyVS(@builtin(vertex_index) i:u32,@builtin(instance_index) instance:u32)->BodyV{var pos=array<vec2f,6>(vec2f(-.5,-.5),vec2f(.5,-.5),vec2f(.5,.5),vec2f(-.5,-.5),vec2f(.5,.5),vec2f(-.5,.5));let a=pos[i];let pixel=center(instance)+a*vec2f(u.viewport.z*136./225.,u.viewport.z);var v:BodyV;v.clip=vec4f(pixel.x/u.viewport.x*2.-1.,1.-pixel.y/u.viewport.y*2.,.5,1);v.uv=vec2f((62.+(a.x+.5)*136.)/768.,(15.+(a.y+.5)*225.)/512.);return v;}
@fragment fn bodyFS(v:BodyV)->Out{let b=textureSample(actor,samp,v.uv);let rgb=pow(b.rgb,vec3f(2.2));var r:Out;r.scene=vec4f(rgb*b.a,b.a);r.emission=vec4f(0,0,0,b.a);return r;}
`;

