const common=/*wgsl*/`
struct U{viewport:vec4f,state:vec4f,options:vec4f,flags:vec4f};
@group(0) @binding(0) var<uniform> u:U;
fn ss(a:f32,b:f32,x:f32)->f32{return smoothstep(a,b,x);}
fn origin(i:u32)->vec2f{if(u.flags.w>.5){return vec2f(u.viewport.x*select(.25,.75,i>0u),u.viewport.y*.5);}return u.viewport.xy*.5;}
fn owner(p:vec2f)->u32{return select(0u,1u,u.flags.w>.5&&p.x>u.viewport.x*.5);}
fn qpoint(p:vec2f)->vec2f{return(p-origin(owner(p)))/(u.viewport.z/64.);}
fn env()->f32{return 1.-ss(1.08,1.4,u.state.x);}
fn decay()->f32{return ss(0.,.18,u.state.x)*exp(-max(0.,u.state.x-.24)/.27)*env();}
fn release()->f32{return ss(.18,.34,u.state.x)*decay();}
fn impulse(t:f32,centre:f32,width:f32)->f32{return exp(-pow((t-centre)/width,2.))*env();}
fn point(id:u32)->vec4f{var p=vec2f(12.5,9.);var t=.30;var w=.07;if(id==1u){p=vec2f(12.,-9.);t=.53;w=.085;}if(id==2u){p=vec2f(-15.,7.);t=.73;w=.09;}return vec4f(p,impulse(u.state.x,t,w)*u.options.x*u.options.z,0.);}
struct V{@builtin(position) p:vec4f,@location(0) uv:vec2f,@location(1) @interpolate(flat) id:u32};
@vertex fn full(@builtin(vertex_index) id:u32)->V{var p=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));var o:V;o.p=vec4f(p[id],0.,1.);o.uv=vec2f(0.);o.id=0u;return o;}
`;
export const worldShader=common+/*wgsl*/`
@group(0) @binding(1) var actor:texture_2d<f32>;
@group(0) @binding(2) var samp:sampler;
struct O{@location(0) colour:vec4f,@location(1) emission:vec4f};
fn output(c:vec3f,a:f32,e:vec3f)->O{var o:O;o.colour=vec4f(c,a);o.emission=vec4f(e,0.);return o;}
fn sRGB(v:vec3f)->vec3f{return select(v/12.92,pow((v+.055)/1.055,vec3f(2.4)),v>vec3f(.04045));}
@fragment fn background(v:V)->O{var col=vec3f(.022,.032,.048);if(u.flags.w>.5&&owner(v.p.xy)>0u){col=vec3f(.78,.81,.84);}return output(col,1.,vec3f(0.));}
@vertex fn bodyVS(@builtin(vertex_index) id:u32,@builtin(instance_index) instance:u32)->V{var corners=array<vec2f,6>(vec2f(0.,0.),vec2f(1.,0.),vec2f(0.,1.),vec2f(0.,1.),vec2f(1.,0.),vec2f(1.,1.));let uv=corners[id];let pixel=origin(instance)+(uv-.5)*vec2f(u.viewport.z*136./225.,u.viewport.z);var v:V;v.p=vec4f(pixel/u.viewport.xy*vec2f(2.,-2.)+vec2f(-1.,1.),0.,1.);v.uv=(vec2f(62.,15.)+uv*vec2f(136.,225.))/vec2f(768.,512.);v.id=instance;return v;}
@fragment fn bodyFS(v:V)->O{let tex=textureSample(actor,samp,v.uv);let q=qpoint(v.p.xy);let phase=ss(.26,.42,u.state.x)*(1.-ss(.68,1.08,u.state.x))*env();let forearm=exp(-dot((q-vec2f(6.,3.))/vec2f(10.,17.),(q-vec2f(6.,3.))/vec2f(10.,17.)));let reflected=vec3f(.12,.40,.32)*forearm*phase*u.options.x*u.options.w;return output((sRGB(tex.rgb)+reflected)*tex.a,tex.a,reflected*tex.a*.35);}
fn sheet(q:vec2f,rear:bool)->O{let p=q-vec2f(20.,-1.);let a=-.55;let r=vec2f(cos(a)*p.x+sin(a)*p.y,-sin(a)*p.x+cos(a)*p.y)/vec2f(22.,12.);let radius=length(r);let edge=(1.-ss(.91,1.03,radius));let open=ss(-.96,-.50,r.x);let cover=edge*open*decay();let depth=sqrt(max(0.,1.-dot(r,r)));let normal=normalize(vec3f(r,max(.12,depth)));let light=.25+.75*max(0.,dot(normal,normalize(vec3f(-.4,-.7,1.))));let excitation=vec3f(.015,.29,.26)*cover*(.45+.55*light);let frontStimulus=exp(-pow((q.x-8.5)/6.,2.)-pow((q.y-8.5)/6.,2.))*impulse(u.state.x,.27,.10);let emission=(vec3f(.56,.93,.83)*release()*cover*(.38+.62*depth)+vec3f(1.5,1.25,.91)*frontStimulus)*u.options.x;let factor=select(1.,.28,rear);let alpha=cover*.34*factor;return output((excitation*factor+emission*factor),alpha,emission*factor);}
@fragment fn back(v:V)->O{return sheet(qpoint(v.p.xy),true);}
@fragment fn front(v:V)->O{let q=qpoint(v.p.xy);var o=sheet(q,false);for(var id=0u;id<3u;id++){let source=point(id);let d=q-source.xy;let core=exp(-dot(d,d)/.8)*source.z;let e=vec3f(1.4,1.24,.88)*core;o.colour=vec4f(o.colour.rgb+e,o.colour.a);o.emission=vec4f(o.emission.rgb+e,0.);}return o;}
`;
export const postShader=common+/*wgsl*/`
@group(0) @binding(1) var input:texture_2d<f32>;
@group(0) @binding(2) var scene:texture_2d<f32>;
fn load(p:vec2i)->vec3f{let size=vec2i(textureDimensions(input));return textureLoad(input,clamp(p,vec2i(0),size-1),0).rgb;}
fn blur(p:vec2i,axis:vec2i)->vec4f{var value=load(p)*.20;for(var i=1;i<=4;i++){let weight=exp(-f32(i*i)/7.5)*.14;value+=(load(p+axis*i)+load(p-axis*i))*weight;}return vec4f(value,0.);}
@fragment fn horizontal(v:V)->@location(0) vec4f{return blur(vec2i(v.p.xy),vec2i(1,0));}
@fragment fn vertical(v:V)->@location(0) vec4f{return blur(vec2i(v.p.xy),vec2i(0,1));}
fn encode(c:vec3f)->vec3f{return select(c*12.92,1.055*pow(max(c,vec3f(0.)),vec3f(1./2.4))-.055,c>vec3f(.0031308));}
@fragment fn composite(v:V)->@location(0) vec4f{let pixel=vec2i(v.p.xy);var c=textureLoad(scene,pixel,0).rgb;let q=qpoint(v.p.xy);c+=load(pixel)*.65*u.options.y;for(var i=0u;i<3u;i++){let pointSource=point(i);let p=q-pointSource.xy;let axis=normalize(select(vec2f(.6,-.8),vec2f(-.8,-.6),i==2u));let longitudinal=dot(p,axis);let transverse=dot(p,vec2f(-axis.y,axis.x));let ray=exp(-pow(longitudinal/4.5,2.)-pow(transverse/.28,2.));c+=vec3f(.72,.81,.62)*ray*pointSource.z*u.options.y;}return vec4f(encode(c),1.);}
`;
