export const worldShader=/*wgsl*/`
struct Frame {viewport:vec4f,phase:vec4f,gates:vec4f,optics:vec4f,layout:vec4f,contact:vec4f,camera:vec4f,bounds:vec4f};
@group(0) @binding(0) var<uniform> frame:Frame;
@group(0) @binding(1) var actor:texture_2d<f32>;
@group(0) @binding(2) var actorSampler:sampler;
const axes=vec3f(.96,1.14,.72);
fn unit(v:vec3f)->vec3f {let len=length(v);return select(vec3f(0.,0.,1.),v/max(len,.000001),len>.000001);}
fn ease(a:f32,b:f32,t:f32)->f32{return smoothstep(a,b,t);}
fn seed(i:u32)->vec3f{return unit(select(vec3f(-.61,-.42,.67),vec3f(.48,.58,.66),i>0u));}
fn turn(a:vec3f,b:vec3f)->f32{return acos(clamp(dot(a,b),-1.,1.));}
fn registered(n:vec3f)->f32 {if(frame.phase.z<.5){return 0.;}let t=frame.phase.x;let stage=frame.phase.y;if(stage<.5){let at=.57*turn(n,seed(0u))/3.14159265;return mix(ease(at,at+.08,t),1.,ease(.645,.65,t));}if(stage>1.5&&stage<2.5){let at=.39*turn(n,unit(vec3f(0.,-.7,-.7)))/3.14159265;return 1.-ease(at,at+.09,t);}return 1.;}
fn view(p:vec3f)->vec3f{let z=-.275637356*p.x+.961261696*p.z;return vec3f(.961261696*p.x+.275637356*p.z,.992546152*p.y-.121869343*z,.121869343*p.y+.992546152*z);}
fn fromView(p:vec3f)->vec3f{let y=.992546152*p.y+.121869343*p.z;let z=-.121869343*p.y+.992546152*p.z;return vec3f(.961261696*p.x-.275637356*z,y,.275637356*p.x+.961261696*z);}
fn cell(i:u32)->vec2f{return vec2f(frame.viewport.x*select(.5,select(.25,.75,i>0u),frame.layout.x>.5),frame.viewport.y*.5);}
fn cellId(pixel:vec2f)->u32{return select(0u,1u,frame.layout.x>.5&&pixel.x>frame.viewport.x*.5);}
fn local(pixel:vec2f)->vec2f{return(pixel-cell(cellId(pixel)))/(frame.viewport.z/1.65);}
struct Focus{p:vec3f,power:f32};
fn focus(i:u32)->Focus {var s:Focus;s.p=seed(i)*axes+vec3f(frame.camera.zw,0.);s.power=0.;if(frame.phase.z<.5||frame.gates.x<.5){return s;}let t=frame.phase.x;let stage=frame.phase.y;if(stage<.5&&t<.65){let at=select(.16,.43,i>0u);s.power=exp(-pow((t-at)/.05,2.))*registered(seed(i));}if(stage>1.5&&stage<2.5&&t<.48){let at=select(.13,.34,i>0u);s.power=exp(-pow((t-at)/.036,2.))*registered(seed(i));}if(stage>2.5&&stage<3.5&&i==0u&&t<.65){s.p=select(s.p,frame.contact.xyz,frame.phase.w>.5);s.power=exp(-pow((t-.055)/.040,2.))*(1.-ease(.43,.65,t));}return s;}
struct Density{rgb:vec3f,density:f32,signal:vec2f};
fn density(p:vec3f)->Density {let q=p/axes;let n=unit(q);let t=frame.phase.x;var lift=0.;var receipt=0.;if(frame.phase.y>2.5&&frame.phase.y<3.5){let centre=select(seed(0u),unit(frame.contact.xyz/axes),frame.phase.w>.5);let angle=turn(n,centre);let pulse=ease(0.,.025,t)*(1.-ease(.12,.28,t));if(frame.phase.w>.5){lift=.12*exp(-pow(angle/.42,2.))*pulse;}let radius=.12+1.75*ease(.025,.48,t);receipt=exp(-pow((angle-radius)/.22,2.))*ease(0.,.025,t)*(1.-ease(.48,.65,t));}let band=1.-ease(.085*.62,.085,abs(length(q)-1.-lift));let a=registered(n)*band*frame.gates.x;let hue=mix(vec3f(.30,.19,1.14),mix(vec3f(.10,.52,1.18),vec3f(.35,.70,1.18),ease(.08,.26,n.y)),ease(-.20,.08,n.z));var white=vec2f(0.);for(var i=0u;i<2u;i++){let s=focus(i);let d=p-s.p;white[i]=s.power*exp(-dot(d,d)/.045);}var out:Density;out.rgb=(hue*3.6*(1.+.38*receipt)+vec3f(8.,8.,7.6)*(white.x+white.y))*a;out.density=a;out.signal=white*a;return out;}
struct Pixel{@builtin(position) position:vec4f,@location(0) uv:vec2f};
struct MRT{@location(0) scene:vec4f,@location(1) bright:vec4f,@location(2) foci:vec4f};
fn output(c:vec3f,a:f32,e:vec3f,s:vec2f)->MRT {var r:MRT;r.scene=vec4f(c,a);r.bright=vec4f(e,a);r.foci=vec4f(s,0.,a);return r;}
@vertex fn fullVS(@builtin(vertex_index) i:u32)->Pixel {let q=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));var p:Pixel;p.position=vec4f(q[i],0.,1.);p.uv=vec2f(0.);return p;}
@vertex fn fieldVS(@builtin(vertex_index)i:u32,@builtin(instance_index)id:u32)->Pixel {let q=array<vec2f,6>(vec2f(0.,0.),vec2f(1.,0.),vec2f(0.,1.),vec2f(0.,1.),vec2f(1.,0.),vec2f(1.,1.));let uv=q[i];let m=mix(frame.bounds.xy,frame.bounds.zw,uv);let pixel=cell(id)+m*frame.viewport.z/1.65;var p:Pixel;p.position=vec4f(pixel/frame.viewport.xy*vec2f(2.,-2.)+vec2f(-1.,1.),0.,1.);p.uv=uv;return p;}
@fragment fn background(p:Pixel)->MRT {let light=frame.layout.x>.5&&cellId(p.position.xy)>0u;return output(select(vec3f(.036,.045,.055),vec3f(.79,.80,.82),light),1.,vec3f(0.),vec2f(0.));}
fn layer(pixel:vec2f,front:bool)->MRT {if(frame.phase.z<.5||frame.gates.x<.5){return output(vec3f(0.),0.,vec3f(0.),vec2f(0.));}let xy=local(pixel);let step=1.55/24.;var T=1.;var c=vec3f(0.);var signals=vec2f(0.);for(var j=0u;j<24u;j++){let z=select(-1.55,0.,front)+(f32(j)+.5)*step;let d=density(fromView(vec3f(xy.x,-xy.y,z)));c+=T*d.rgb*step;signals+=T*d.signal*step;let a=1.-exp(-1.7*d.density*step*frame.gates.y);T*=1.-a;}return output(c,1.-T,c,signals);}
@fragment fn rear(p:Pixel)->MRT{return layer(p.position.xy,false);}
@fragment fn front(p:Pixel)->MRT{return layer(p.position.xy,true);}
@vertex fn bodyVS(@builtin(vertex_index)i:u32,@builtin(instance_index)id:u32)->Pixel {let q=array<vec2f,6>(vec2f(0.,0.),vec2f(1.,0.),vec2f(0.,1.),vec2f(0.,1.),vec2f(1.,0.),vec2f(1.,1.));let uv=q[i];let pixel=cell(id)+(uv-.5)*frame.viewport.z*vec2f(136./225.,1.);var p:Pixel;p.position=vec4f(pixel/frame.viewport.xy*vec2f(2.,-2.)+vec2f(-1.,1.),0.,1.);p.uv=(vec2f(62.,15.)+uv*vec2f(136.,225.))/vec2f(768.,512.);return p;}
fn linear(c:vec3f)->vec3f{return select(c/12.92,pow((c+.055)/1.055,vec3f(2.4)),c>vec3f(.04045));}
fn received(p:vec3f)->vec3f{if(frame.gates.x<.5||frame.gates.w<.5||frame.phase.z<.5){return vec3f(0.);}let directions=array<vec3f,6>(vec3f(-.61,-.42,.67),vec3f(.48,.58,.66),vec3f(-.80,.35,.40),vec3f(.80,-.35,.40),vec3f(0.,.80,.60),vec3f(0.,-.80,.60));var L=vec3f(0.);let normal=fromView(vec3f(0.,0.,1.));for(var i=0u;i<6u;i++){let s=unit(directions[i])*axes;let v=s-p;let r2=dot(v,v);let cosi=max(0.,dot(normal,unit(v)));let d=density(s);L+=d.rgb*.17*.65*cosi/(12.56637*(r2+.18));}for(var i=0u;i<2u;i++){let s=focus(i);let v=s.p-p;L+=vec3f(8.,8.,7.6)*s.power*.012*max(0.,dot(normal,unit(v)))/(dot(v,v)+.12);}return L;}
@fragment fn bodyFS(p:Pixel)->MRT {let tex=textureSample(actor,actorSampler,p.uv);let q=local(p.position.xy);let L=received(fromView(vec3f(q.x,-q.y,0.)))*tex.a;return output(linear(tex.rgb)*tex.a+L,tex.a,L,vec2f(0.));}
@vertex fn pointVS(@builtin(vertex_index)i:u32,@builtin(instance_index)instance:u32)->Pixel {let id=instance/2u;let sourceId=instance%2u;let q=array<vec2f,6>(vec2f(-1.,-1.),vec2f(1.,-1.),vec2f(-1.,1.),vec2f(-1.,1.),vec2f(1.,-1.),vec2f(1.,1.));let uv=q[i];let s=focus(sourceId);let v=view(s.p);let pixel=cell(id)+vec2f(v.x,-v.y)*frame.viewport.z/1.65+uv*.10*frame.viewport.z/1.65;var p:Pixel;p.position=vec4f(pixel/frame.viewport.xy*vec2f(2.,-2.)+vec2f(-1.,1.),0.,1.);p.uv=vec2f(f32(sourceId),v.z);return p;}
fn point(p:Pixel,front:bool)->MRT {let i=u32(p.uv.x+.1);let s=focus(i);let depth=view(s.p).z;if((depth>=0.)!=front||frame.optics.w<.5){return output(vec3f(0.),0.,vec3f(0.),vec2f(0.));}let q=local(p.position.xy);let v=view(s.p);let d=q-vec2f(v.x,-v.y);let power=exp(-dot(d,d)/.0016)*s.power;let e=vec3f(8.,8.,7.6)*power;var signal=vec2f(0.);signal[i]=power;return output(e,0.,e,signal);}
@fragment fn rearPoint(p:Pixel)->MRT{return point(p,false);}
@fragment fn frontPoint(p:Pixel)->MRT{return point(p,true);}
@vertex fn occluderVS(@builtin(vertex_index)i:u32,@builtin(instance_index)id:u32)->Pixel {let q=array<vec2f,6>(vec2f(-1.,-1.),vec2f(1.,-1.),vec2f(-1.,1.),vec2f(-1.,1.),vec2f(1.,-1.),vec2f(1.,1.));let s=view(focus(0u).p);let pixel=cell(id)+vec2f(s.x,-s.y)*frame.viewport.z/1.65+q[i]*.24*frame.viewport.z/1.65;var p:Pixel;p.position=vec4f(pixel/frame.viewport.xy*vec2f(2.,-2.)+vec2f(-1.,1.),0.,1.);p.uv=vec2f(0.);return p;}
@fragment fn occluderFS(p:Pixel)->MRT {return output(vec3f(.12,.13,.14),1.,vec3f(0.),vec2f(0.));}
`;
