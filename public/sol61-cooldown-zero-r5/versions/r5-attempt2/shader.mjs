const shared=/*wgsl*/`
struct U{viewport:vec4f,state:vec4f,options:vec4f,flags:vec4f};
fn ss(a:f32,b:f32,x:f32)->f32{return smoothstep(a,b,x);}
fn scale()->f32{return u.viewport.z/64.;}
fn origin(instance:u32)->vec2f{if(u.flags.w>.5){return vec2f(u.viewport.x*select(.25,.75,instance>0u),u.viewport.y*.5);}return u.viewport.xy*.5;}
fn which(p:vec2f)->u32{if(u.flags.w>.5&&p.x>u.viewport.x*.5){return 1u;}return 0u;}
fn qpoint(pixel:vec2f)->vec2f{return(pixel-origin(which(pixel)))/scale();}
fn envelope()->f32{return ss(0.,.1,u.state.x)*(1.-ss(1.1,1.4,u.state.x));}
fn sparkle(id:u32)->vec4f{
 let t=u.state.x;var p=vec2f(10.4,7.9);var peak=.53;var radius=.11;
 if(id==1u){p=vec2f(13.,8.5);peak=.78;radius=.14;}
 if(id==2u){p=vec2f(-15.5,6.5);peak=.96;radius=.13;}
 let amount=exp(-pow((t-peak)/radius,2.))*envelope()*u.options.x*u.options.z;
 return vec4f(p,amount,f32(id));
}
`;
export const worldShader=/*wgsl*/`
@group(0) @binding(0) var<uniform> u:U;
@group(0) @binding(1) var actor:texture_2d<f32>;
@group(0) @binding(2) var samp:sampler;
${shared}
struct Out{@location(0) scene:vec4f,@location(1) emission:vec4f};
@vertex fn full(@builtin(vertex_index)i:u32)->@builtin(position)vec4f{var a=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));return vec4f(a[i],0,1);}
@fragment fn background(@builtin(position)p:vec4f)->Out{var b=vec3f(.012,.021,.036);if(which(p.xy)>0u){b=vec3f(.68,.72,.76);}var o:Out;o.scene=vec4f(b,1.);o.emission=vec4f(0);return o;}
fn packet(q:vec2f,at:vec2f,colour:vec3f,fade:f32,layer:f32)->Out{
 let flow=normalize(vec2f(-.95,.31));let across=vec2f(-flow.y,flow.x);let delta=q-at;let r=vec2f(dot(delta,flow)/5.8,dot(delta,across)/11.5);
 let r2=dot(r,r);let boundary=(1.-ss(.92,1.08,r2))*ss(-.12,.08,r.x);let thickness=sqrt(max(0.,1.-r2));let n=normalize(vec3f(r, max(.08,thickness)));
 let front=ss(-.75,.65,r.x);let rearTaper=ss(-1.,-.2,r.x);let coverage=boundary*(.12+.22*thickness)*fade;
 let source=(.095*thickness+.43*pow(front,2.)*(.25+.75*thickness))*boundary*fade*layer;
 let core=exp(-pow((r.x-.57)/.23,2.)-pow(r.y/.56,2.))*boundary*fade*layer;
 let material=colour*(.28+.34*max(0.,dot(n,normalize(vec3f(.35,-.5,1.)))));
 let radiance=(colour*source+vec3f(2.3,2.35,2.4)*core*.35)*u.options.x;
 var o:Out;o.scene=vec4f(material*coverage+radiance,coverage);o.emission=vec4f(radiance,coverage);return o;
}
fn merge(a:Out,b:Out)->Out{var o:Out;o.scene=vec4f(a.scene.rgb+b.scene.rgb*(1.-a.scene.a),a.scene.a+b.scene.a*(1.-a.scene.a));o.emission=vec4f(a.emission.rgb+b.emission.rgb*(1.-a.emission.a),o.scene.a);return o;}
fn wake(q:vec2f,hand:vec2f,outward:vec2f,length:f32,fade:f32,layer:f32)->Out{
 let across=vec2f(-outward.y,outward.x);let relative=q-hand;let along=dot(relative,outward);let radial=dot(relative,across);let fraction=clamp(along/length,0.,1.);let radius=2.2+7.8*pow(fraction,.75);
 let surface=1.-ss(.85,1.05,abs(radial)/radius);let endMask=ss(-1.,1.,along)*(1.-ss(length-1.,length+1.,along));let volume=surface*endMask;let depth=sqrt(max(0.,1.-pow(radial/radius,2.)));
 let colour=mix(vec3f(1.1,.22,.59),vec3f(.39,.19,1.2),fraction);let coverage=volume*(.10+.12*depth)*fade;let radiance=colour*(.075+.07*depth)*volume*fade*layer*u.options.x;
 var o:Out;o.scene=vec4f(colour*.30*coverage+radiance,coverage);o.emission=vec4f(radiance,coverage);return o;
}
fn alphaBody(q:vec2f)->f32{let normalized=q/vec2f(64.*136./225.,64.)+vec2f(.5);if(any(normalized<vec2f(0))||any(normalized>vec2f(1))){return 0.;}let uv=vec2f((62.+normalized.x*136.)/768.,(15.+normalized.y*225.)/512.);return textureSampleLevel(actor,samp,uv,0.).a;}
fn field(pixel:vec2f,front:bool)->Out{
 let q=qpoint(pixel);let t=u.state.x;let e=envelope();let outward=normalize(vec2f(.95,-.31));let hand=vec2f(8.5,8.5);let locking=ss(.47,.69,t);
 let lead=20.*(1.-ss(.06,.69,t));let gap=mix(22.,2.5,ss(.14,.47,t));let bodyPhase=1.-ss(.69,.85,t);
 let layer=select(.3,.7,front);let carrier=wake(q,hand,outward,lead+gap+6.,e*bodyPhase,layer);let first=packet(q,hand+outward*lead,vec3f(1.1,.22,.59),e*bodyPhase,layer);let second=packet(q,hand+outward*(lead+gap),vec3f(.39,.19,1.2),e*bodyPhase*(1.-locking),layer);var o=merge(merge(first,second),carrier);
 if(front){
  let contact=exp(-pow((t-.6)/.105,2.))*e;let contactQ=q-hand;let contactPatch=exp(-dot(contactQ,contactQ)/9.);
  let atChest=ss(.65,.82,t);let atLeft=ss(.79,.95,t);let chest=exp(-pow((q.x-.0)/4.2,2.)-pow((q.y+4.5)/2.3,2.));let left=exp(-pow((q.x+11.5)/3.4,2.)-pow((q.y-6.5)/2.4,2.));let right=exp(-pow((q.x-8.5)/3.4,2.)-pow((q.y-8.5)/2.4,2.));
  let receiver=(right*ss(.56,.68,t)+chest*atChest+left*atLeft)*(1.-ss(.98,1.4,t))*u.options.w;
  let reflected=vec3f(.52,.21,.86)*receiver*alphaBody(q)*.31+vec3f(1.8,1.3,1.8)*contactPatch*contact;
  let added=reflected*u.options.x;o.scene=vec4f(o.scene.rgb+added,o.scene.a);o.emission=vec4f(o.emission.rgb+added,o.emission.a);
  for(var id=0u;id<3u;id++){let s=sparkle(id);let d=q-s.xy;let dotSource=exp(-dot(d,d)/.38)*s.z;let point=vec3f(3.3,3.2,3.6)*dotSource;o.scene=vec4f(o.scene.rgb+point,o.scene.a);o.emission=vec4f(o.emission.rgb+point,o.emission.a);}
 }
 return o;
}
@fragment fn back(@builtin(position)p:vec4f)->Out{return field(p.xy,false);}
@fragment fn front(@builtin(position)p:vec4f)->Out{return field(p.xy,true);}
struct BodyV{@builtin(position)clip:vec4f,@location(0)uv:vec2f};
@vertex fn bodyVS(@builtin(vertex_index)i:u32,@builtin(instance_index)instance:u32)->BodyV{var a=array<vec2f,6>(vec2f(-.5,-.5),vec2f(.5,-.5),vec2f(.5,.5),vec2f(-.5,-.5),vec2f(.5,.5),vec2f(-.5,.5));let xy=a[i];let p=origin(instance)+xy*vec2f(u.viewport.z*136./225.,u.viewport.z);var v:BodyV;v.clip=vec4f(p.x/u.viewport.x*2.-1.,1.-p.y/u.viewport.y*2.,.5,1);v.uv=vec2f((62.+(xy.x+.5)*136.)/768.,(15.+(xy.y+.5)*225.)/512.);return v;}
@fragment fn bodyFS(v:BodyV)->Out{let b=textureSample(actor,samp,v.uv);var o:Out;o.scene=vec4f(pow(b.rgb,vec3f(2.2))*b.a,b.a);o.emission=vec4f(0,0,0,b.a);return o;}
`;
export const postShader=/*wgsl*/`
@group(0) @binding(0) var<uniform> u:U;
@group(0) @binding(1) var source:texture_2d<f32>;
@group(0) @binding(2) var scene:texture_2d<f32>;
${shared}
@vertex fn full(@builtin(vertex_index)i:u32)->@builtin(position)vec4f{var a=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));return vec4f(a[i],0,1);}
fn blur(p:vec2i,axis:vec2i)->vec4f{let size=vec2i(textureDimensions(source));var rgb=vec3f(0);var weights=0.;for(var i=-8;i<=8;i++){let w=exp(-f32(i*i)/14.);rgb+=textureLoad(source,clamp(p+axis*i,vec2i(0),size-vec2i(1)),0).rgb*w;weights+=w;}return vec4f(rgb/weights,1);}
@fragment fn horizontal(@builtin(position)p:vec4f)->@location(0)vec4f{return blur(vec2i(p.xy),vec2i(1,0));}
@fragment fn vertical(@builtin(position)p:vec4f)->@location(0)vec4f{return blur(vec2i(p.xy),vec2i(0,1));}
@fragment fn composite(@builtin(position)p:vec4f)->@location(0)vec4f{
 let q=qpoint(p.xy);var flare=vec3f(0);for(var id=0u;id<3u;id++){let s=sparkle(id);let d=q-s.xy;var direction=normalize(vec2f(.95,-.31));if(id==2u){direction=normalize(vec2f(-11.5,11.));}let across=vec2f(-direction.y,direction.x);let a=dot(d,direction);let b=dot(d,across);let rays=exp(-abs(a)/3.6-pow(b/.36,2.))+exp(-abs(b)/1.8-pow(a/.32,2.));flare+=vec3f(2.4,2.35,2.65)*rays*s.z;}
 let pix=vec2i(p.xy);let c=textureLoad(scene,pix,0).rgb+(textureLoad(source,pix,0).rgb*.35+flare)*u.options.y;return vec4f(pow(max(c,vec3f(0)),vec3f(1./2.2)),1);
}
`;
