export const worldShader=/*wgsl*/`
struct U{viewport:vec4f,time:vec4f,options:vec4f,more:vec4f,contact:vec4f};
@group(0) @binding(0) var<uniform> u:U;
@group(0) @binding(1) var actor:texture_2d<f32>;
@group(0) @binding(2) var samp:sampler;
struct Out{@location(0) scene:vec4f,@location(1) emission:vec4f};
fn result(rgb:vec3f,alpha:f32,emission:vec3f)->Out{var o:Out;o.scene=vec4f(rgb,alpha);o.emission=vec4f(emission,alpha);return o;}
fn view(p:vec3f)->vec3f{let cy=.961261696;let sy=.275637356;let cx=.992546152;let sx=.121869343;let z=-sy*p.x+cy*p.z;return vec3f(cy*p.x+sy*p.z,cx*p.y-sx*z,sx*p.y+cx*z);}
fn world(p:vec3f)->vec3f{let cy=.961261696;let sy=.275637356;let cx=.992546152;let sx=.121869343;let y=cx*p.y+sx*p.z;let z=-sx*p.y+cx*p.z;return vec3f(cy*p.x-sy*z,y,sy*p.x+cy*z);}
fn center(i:u32)->vec2f{return vec2f(u.viewport.x*select(.5,select(.25,.75,i>0u),u.options.w>.5),u.viewport.y*.5);}
fn eSmooth(a:f32,b:f32,t:f32)->f32{return smoothstep(a,b,t);}
fn norm(p:vec3f)->f32{let q=p/vec3f(.86,1.06,.70);let q2=q*q;return sqrt(sqrt(dot(q2,q2)));}
fn supply()->f32{let t=u.time.x;if(u.time.y>3.5||u.time.w<.5){return 0.;}if(u.time.y<.5){return eSmooth(.015,.085,t);}if(u.time.y>1.5&&u.time.y<2.5){return 1.-eSmooth(.43,.48,t);}return 1.;}
fn registered(p:vec3f)->f32{let a=p.x+.45*p.y;let t=u.time.x;if(u.time.y<.5){let f=-1.45+2.9*eSmooth(0.,.52,t);return 1.-eSmooth(f-.12,f+.12,a);}if(u.time.y>1.5&&u.time.y<2.5){let f=-1.45+2.9*eSmooth(0.,.44,t);return eSmooth(f-.12,f+.12,a);}return 1.;}
fn contactKnown()->bool{return u.time.z>.5&&norm(u.contact.xyz)<=1.10;}
fn cut(p:vec3f,c:vec2f,h:vec2f)->f32{return 1.-eSmooth(.90,1.03,max(abs((p.x-c.x)/h.x),abs((p.y-c.y)/h.y)));}
fn field(p:vec3f)->vec4f{let q=norm(p);if(q>=1.02||supply()<=0.){return vec4f(0.);}let shell=eSmooth(.68,.79,q)*(1.-eSmooth(.96,1.02,q));let opening=1.-eSmooth(.12,.32,p.z)*max(cut(p,vec2f(-.35,.35),vec2f(.22,.25)),cut(p,vec2f(.31,-.43),vec2f(.22,.23)));let a=p.x+.45*p.y;let level=select(.62,select(1.12,.82,a>.18),a>=-.24);let density=shell*opening*registered(p)*supply()*level;var response=0.;let t=u.time.x;if(u.time.y>2.5&&u.time.y<3.5&&t>=0.&&t<.65){if(contactKnown()){let delta=abs(p-u.contact.xyz);let metric=dot(delta,vec3f(1.,.65,.55));let f=.1+2.6*t;response=(1.-eSmooth(f-.12,f+.12,metric))*eSmooth(0.,.025,t)*(1.-eSmooth(.43,.65,t))*1.65;}else{let a0=(t-.07)/.07;let a1=(t-.24)/.12;response=(exp(-a0*a0)+exp(-a1*a1)*select(.55,select(1.1,.85,a>.18),a>=-.24))*eSmooth(0.,.025,t)*(1.-eSmooth(.43,.65,t));}}let colour=mix(vec3f(.16,.23,1.05),vec3f(.09,1.10,1.2),eSmooth(-.34,.34,p.z));return vec4f(colour*density*(.48+response)*u.options.x,density);}
struct VolumeV{@builtin(position)clip:vec4f,@location(0)viewed:vec2f};
@vertex fn volumeVS(@builtin(vertex_index)i:u32,@builtin(instance_index)id:u32)->VolumeV{let corners=array<vec2f,6>(vec2f(-1,-1),vec2f(1,-1),vec2f(1,1),vec2f(-1,-1),vec2f(1,1),vec2f(-1,1));let q=corners[i]*vec2f(1.05,1.19);let pixel=center(id)+vec2f(q.x,-q.y)*u.viewport.z/1.65;var v:VolumeV;v.clip=vec4f(pixel/u.viewport.xy*vec2f(2.,-2.)+vec2f(-1.,1.),.5,1.);v.viewed=q;return v;}
fn integrate(v:VolumeV,front:bool)->Out{let step=1.05/24.;var transmission=1.;var rgb=vec3f(0.);var emission=vec3f(0.);for(var i=0u;i<24u;i++){let z=select(0.,1.05,front)-(f32(i)+.5)*step;let f=field(world(vec3f(v.viewed,z)));let coverage=(1.-exp(-f.w*.30*step))*u.options.z;let e=f.xyz*step;rgb+=transmission*(vec3f(.015,.055,.09)*coverage+e);emission+=transmission*e;transmission*=1.-coverage;}return result(rgb,1.-transmission,emission);}
@fragment fn backFS(v:VolumeV)->Out{return integrate(v,false);}
@fragment fn frontFS(v:VolumeV)->Out{return integrate(v,true);}
fn node(index:u32)->vec3f{return select(vec3f(-.58,-.47,.48),vec3f(.62,.55,.42),index>0u);}
fn point(index:u32)->vec4f{let t=u.time.x;var p=node(index);var gain=0.;if(u.time.w>.5){if(u.time.y<.5&&t>=0.&&t<.65){let at=select(.165,.415,index>0u);let width=select(.05,.065,index>0u);let a=(t-at)/width;gain=exp(-a*a);}if(u.time.y>1.5&&u.time.y<2.5&&t>=0.&&t<.48){let at=select(.14,.35,index>0u);let a=(t-at)/.04;gain=exp(-a*a)*(1.-eSmooth(.40,.48,t));}if(u.time.y>2.5&&u.time.y<3.5&&index==0u&&t>=0.&&t<.65){p=select(node(0u),u.contact.xyz,contactKnown());let a=(t-.055)/.045;gain=exp(-a*a)*(1.-eSmooth(.40,.65,t));}}gain*=eSmooth(0.,.01,t);if(u.time.y<.5){gain*=1.-eSmooth(.60,.65,t);}return vec4f(p,gain*u.options.x);}
struct PointV{@builtin(position)clip:vec4f,@location(0)uv:vec2f,@location(1)gain:f32,@location(2)side:f32};
@vertex fn pointVS(@builtin(vertex_index)i:u32,@builtin(instance_index)instance:u32)->PointV{let corners=array<vec2f,6>(vec2f(-1,-1),vec2f(1,-1),vec2f(1,1),vec2f(-1,-1),vec2f(1,1),vec2f(-1,1));let src=point(instance%2u);let p=view(src.xyz);let q=corners[i];let pixel=center(instance/2u)+vec2f(p.x,-p.y)*u.viewport.z/1.65+q*.07*u.viewport.z/1.65;var v:PointV;v.clip=vec4f(pixel/u.viewport.xy*vec2f(2.,-2.)+vec2f(-1.,1.),.5,1.);v.uv=q;v.gain=src.w;v.side=p.z;return v;}
fn pointLight(v:PointV)->Out{let radius=length(v.uv);let e=vec3f(7.2,7.2,7.0)*exp(-dot(v.uv,v.uv)/.18)*(1.-eSmooth(.85,1.,radius))*v.gain;return result(e,0.,e);}
@fragment fn pointBackFS(v:PointV)->Out{if(v.side>=0.){return result(vec3f(0.),0.,vec3f(0.));}return pointLight(v);}
@fragment fn pointFrontFS(v:PointV)->Out{if(v.side<0.){return result(vec3f(0.),0.,vec3f(0.));}return pointLight(v);}
@vertex fn fullVS(@builtin(vertex_index)i:u32)->@builtin(position)vec4f{let q=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));return vec4f(q[i],0.,1.);}
@fragment fn backgroundFS(@builtin(position)p:vec4f)->Out{return result(select(vec3f(.012,.021,.036),vec3f(.68,.72,.76),u.options.w>.5&&p.x>u.viewport.x*.5),1.,vec3f(0.));}
struct BodyV{@builtin(position)clip:vec4f,@location(0)uv:vec2f,@location(1)world:vec3f};
@vertex fn bodyVS(@builtin(vertex_index)i:u32,@builtin(instance_index)id:u32)->BodyV{let q=array<vec2f,6>(vec2f(-.5,-.5),vec2f(.5,-.5),vec2f(.5,.5),vec2f(-.5,-.5),vec2f(.5,.5),vec2f(-.5,.5));let a=q[i];let pixel=center(id)+a*vec2f(u.viewport.z*136./225.,u.viewport.z);var v:BodyV;v.clip=vec4f(pixel/u.viewport.xy*vec2f(2.,-2.)+vec2f(-1.,1.),.5,1.);v.uv=(vec2f(62.,15.)+(a+vec2f(.5))*vec2f(136.,225.))/vec2f(768.,512.);v.world=world(vec3f(a.x*1.65*136./225.,-a.y*1.65,0.));return v;}
@fragment fn bodyFS(v:BodyV)->Out{let tex=textureSample(actor,samp,v.uv);var incident=vec3f(0.);if(u.time.w>.5&&u.more.w>.5){let offsets=array<vec3f,4>(vec3f(.22,0.,.20),vec3f(-.22,0.,.20),vec3f(0.,.24,.20),vec3f(0.,-.24,.20));for(var i=0u;i<4u;i++){incident+=field(v.world+offsets[i]).xyz*.013;}}return result((pow(tex.rgb,vec3f(2.2))+incident)*tex.a,tex.a,incident*tex.a*.20);}
`;
