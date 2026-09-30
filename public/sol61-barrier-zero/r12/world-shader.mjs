export const worldShader=/*wgsl*/`
struct Frame {viewport:vec4f,phase:vec4f,gates:vec4f,optics:vec4f,frameLayout:vec4f,contact:vec4f,camera:vec4f,bounds:vec4f};
@group(0) @binding(0) var<uniform> frame:Frame;
@group(0) @binding(1) var actor:texture_2d<f32>;
@group(0) @binding(2) var actorSampler:sampler;

const axes=vec3f(1.04,1.20,.80);
const createD=array<u32,72>(2u,3u,4u,5u,6u,6u,5u,4u,3u,2u,1u,1u,2u,3u,4u,5u,6u,5u,4u,3u,2u,1u,0u,1u,2u,3u,4u,5u,6u,6u,5u,4u,3u,2u,1u,1u,3u,4u,5u,6u,7u,6u,5u,4u,3u,2u,2u,2u,3u,4u,5u,6u,7u,7u,6u,5u,4u,3u,3u,3u,4u,5u,6u,7u,8u,7u,6u,5u,4u,4u,4u,4u);
const releaseD=array<u32,72>(6u,5u,4u,3u,2u,1u,0u,1u,2u,3u,4u,5u,6u,5u,4u,3u,2u,1u,1u,2u,3u,4u,5u,6u,7u,6u,5u,4u,3u,2u,2u,2u,3u,4u,5u,6u,7u,6u,5u,4u,3u,3u,3u,3u,4u,5u,6u,7u,8u,7u,6u,5u,4u,4u,4u,4u,4u,5u,6u,7u,8u,7u,6u,5u,5u,5u,5u,5u,5u,6u,7u,8u);
fn unit(v:vec3f)->vec3f{return v/max(length(v),.000001);}
fn ease(a:f32,b:f32,t:f32)->f32{return smoothstep(a,b,t);}
fn wrap12(v:f32)->f32{return v-12.*floor((v+6.)/12.);}
fn centre(id:u32)->vec3f{let row=id/12u;let col=id%12u;let y=-.80+f32(row)*.32;let theta=(f32(col)+.5*f32(row%2u))*.5235987756;let r=sqrt(1.-y*y);return vec3f(r*sin(theta),y,r*cos(theta));}
fn seed(i:u32)->vec3f{return centre(select(22u,49u,i>0u));}
struct Tile{id:u32,metric:f32};
fn tileAt(n:vec3f)->Tile{let angle=atan2(n.x,n.z)/.5235987756;let nearRow=i32(clamp(round((n.y+.80)/.32),0.,5.));var best:Tile;best.id=0u;best.metric=100.;for(var dr=-1;dr<=1;dr++){let row=nearRow+dr;if(row<0||row>5){continue;}let parity=f32(row%2);let nearCol=i32(round(angle-.5*parity));for(var dc=-1;dc<=1;dc++){let col=((nearCol+dc)%12+12)%12;let u=wrap12(angle-f32(col)-.5*parity);let v=(n.y-(-.80+f32(row)*.32))/.32;let metric=max(2.*abs(u),abs(u)+1.5*abs(v));if(metric<best.metric){best.id=u32(row*12+col);best.metric=metric;}}}return best;}
fn distance(a:u32,b:u32)->f32{let ra=i32(a/12u);let rb=i32(b/12u);let dr=ra-rb;var best=100;for(var k=-1;k<=1;k++){let dq=i32(a%12u)-i32(b%12u)+k*12-ra/2+rb/2;best=min(best,max(abs(dq),max(abs(dr),abs(dq+dr))));}return f32(best);}
fn registration(id:u32)->f32{if(frame.phase.z<.5||frame.phase.y>3.5){return 0.;}let t=frame.phase.x;if(frame.phase.y<.5){let at=.50*f32(createD[id])/8.;return ease(at,at+.06,t);}if(frame.phase.y>1.5&&frame.phase.y<2.5){let at=.36*f32(releaseD[id])/8.;return 1.-ease(at,at+.09,t);}return 1.;}
const HIT_STATE_ENABLED=true;
fn hitPulse(group:u32)->f32{if(!HIT_STATE_ENABLED||frame.phase.z<.5||frame.phase.y<2.5||frame.phase.y>3.5||frame.phase.x<0.||frame.phase.x>=.65||group>2u){return 0.;}let onsets=array<f32,3>(0.,.125,.255);let at=onsets[group];return ease(at,at+.030,frame.phase.x)*(1.-ease(at+.120,at+.210,frame.phase.x));}
fn routeIndex(id:u32,seed:u32)->u32{let direction=select(12,-12,seed/12u>=2u);if(id==seed){return 0u;}if(i32(id)==i32(seed)+direction){return 1u;}if(i32(id)==i32(seed)+2*direction){return 2u;}return 99u;}
fn response(id:u32)->f32{let hitId=select(22u,u32(frame.contact.w),frame.phase.w>.5);return hitPulse(routeIndex(id,hitId));}
fn registered(n:vec3f)->f32{return registration(tileAt(n).id);}

fn view(p:vec3f)->vec3f{let z=-.275637356*p.x+.961261696*p.z;return vec3f(.961261696*p.x+.275637356*p.z,.992546152*p.y-.121869343*z,.121869343*p.y+.992546152*z);}
fn fromView(p:vec3f)->vec3f{let y=.992546152*p.y+.121869343*p.z;let z=-.121869343*p.y+.992546152*p.z;return vec3f(.961261696*p.x-.275637356*z,y,.275637356*p.x+.961261696*z);}
fn cell(i:u32)->vec2f{return vec2f(frame.viewport.x*select(.5,select(.25,.75,i>0u),frame.frameLayout.x>.5),frame.viewport.y*.5);}
fn cellId(pixel:vec2f)->u32{return select(0u,1u,frame.frameLayout.x>.5&&pixel.x>frame.viewport.x*.5);}
fn local(pixel:vec2f)->vec2f{return(pixel-cell(cellId(pixel)))/(frame.viewport.z/1.65);}
struct Focus{p:vec3f,power:f32};
fn focus(i:u32)->Focus {var s:Focus;s.p=seed(i)*axes+vec3f(frame.camera.zw,0.);s.power=0.;if(frame.phase.z<.5||frame.gates.x<.5){return s;}let t=frame.phase.x;let stage=frame.phase.y;if(stage<.5&&t<.65){let at=select(.14,.42,i>0u);s.power=exp(-pow((t-at)/.045,2.))*registered(seed(i));}if(stage>1.5&&stage<2.5&&t<.48){let at=select(.08,.22,i>0u);s.power=exp(-pow((t-at)/.030,2.))*registered(seed(i));}if(stage>2.5&&stage<3.5&&i==0u&&t<.65){s.p=select(s.p,frame.contact.xyz,frame.phase.w>.5);s.power=exp(-pow((t-.055)/.040,2.))*(1.-ease(.43,.65,t));}return s;}
struct Density{rgb:vec3f,density:f32,signal:vec2f};
fn density(p:vec3f)->Density{let q=p/axes;let n=unit(q);let tile=tileAt(n);let state=registration(tile.id);let pulse=response(tile.id);let band=1.-ease(.035,.055,abs(length(q)-1.));let outer=1.-ease(.955,1.,tile.metric);let rim=ease(.76,.91,tile.metric)*outer;let inner=1.-ease(.73,.79,tile.metric);let contour=0.;let coverage=band*state*outer*frame.gates.x;let hue=vec3f(.18,.58,1.20);let brightness=.27+.84*rim+.42*inner;var white=vec2f(0.);for(var i=0u;i<2u;i++){let s=focus(i);let d=p-s.p;white[i]=s.power*exp(-dot(d,d)/.035);}var out:Density;out.rgb=(hue*4.2*brightness+vec3f(8.,8.,7.6)*(white.x+white.y))*coverage;out.density=coverage;out.signal=white*coverage;return out;}

struct Pixel{@builtin(position) position:vec4f,@location(0) uv:vec2f};
struct MRT{@location(0) scene:vec4f,@location(1) bright:vec4f,@location(2) foci:vec4f};
fn output(c:vec3f,a:f32,e:vec3f,s:vec2f)->MRT {var r:MRT;r.scene=vec4f(c,a);r.bright=vec4f(e,a);r.foci=vec4f(s,0.,a);return r;}
@vertex fn fullVS(@builtin(vertex_index) i:u32)->Pixel {let q=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));var p:Pixel;p.position=vec4f(q[i],0.,1.);p.uv=vec2f(0.);return p;}
@vertex fn fieldVS(@builtin(vertex_index)i:u32,@builtin(instance_index)id:u32)->Pixel {let q=array<vec2f,6>(vec2f(0.,0.),vec2f(1.,0.),vec2f(0.,1.),vec2f(0.,1.),vec2f(1.,0.),vec2f(1.,1.));let uv=q[i];let m=mix(frame.bounds.xy,frame.bounds.zw,uv);let pixel=cell(id)+m*frame.viewport.z/1.65;var p:Pixel;p.position=vec4f(pixel/frame.viewport.xy*vec2f(2.,-2.)+vec2f(-1.,1.),0.,1.);p.uv=uv;return p;}
@fragment fn background(p:Pixel)->MRT {let light=frame.frameLayout.x>.5&&cellId(p.position.xy)>0u;return output(select(vec3f(.036,.045,.055),vec3f(.79,.80,.82),light),1.,vec3f(0.),vec2f(0.));}
fn layer(pixel:vec2f,front:bool)->MRT {if(frame.phase.z<.5||frame.gates.x<.5){return output(vec3f(0.),0.,vec3f(0.),vec2f(0.));}let xy=local(pixel);let step=1.65/32.;var T=1.;var c=vec3f(0.);var signals=vec2f(0.);for(var j=0u;j<32u;j++){let z=select(-1.65,0.,front)+(f32(j)+.5)*step;let d=density(fromView(vec3f(xy.x,-xy.y,z)));c+=T*d.rgb*step;signals+=T*d.signal*step;let a=1.-exp(-1.35*d.density*step*frame.gates.y);T*=1.-a;}return output(c,1.-T,c,signals);}
@fragment fn rear(p:Pixel)->MRT{return layer(p.position.xy,false);}
@fragment fn front(p:Pixel)->MRT{return layer(p.position.xy,true);}
// Analytic raised receiving face. Geometry moves radially; it is not integrated as a brightness carpet.
fn hitSurface(pixel:vec2f,front:bool)->MRT {
 if(!HIT_STATE_ENABLED||frame.phase.z<.5||frame.gates.x<.5||frame.phase.y<2.5||frame.phase.y>3.5){return output(vec3f(0.),0.,vec3f(0.),vec2f(0.));}
 let xy=local(pixel);let o=fromView(vec3f(xy.x,-xy.y,0.))/axes;let ray=fromView(vec3f(0.,0.,1.))/axes;let a=dot(ray,ray);let b=2.*dot(o,ray);let hitId=select(22u,u32(frame.contact.w),frame.phase.w>.5);var c=vec3f(0.);var T=1.;
 for(var ring=0u;ring<3u;ring++){
  let pulse=hitPulse(ring);if(pulse<=0.){continue;}let radius=1.+.10*pulse;let q=dot(o,o)-radius*radius;let disc=b*b-4.*a*q;if(disc<=0.){continue;}
  let roots=vec2f((-b-sqrt(disc))/(2.*a),(-b+sqrt(disc))/(2.*a));
  for(var root=0u;root<2u;root++){
   let z=roots[root];if((z>=0.)!=front){continue;}let p=fromView(vec3f(xy.x,-xy.y,z));let tile=tileAt(unit(p/axes));if(routeIndex(tile.id,hitId)!=ring){continue;}
   let band=ease(.38,.48,tile.metric)*(1.-ease(.88,.98,tile.metric));let amount=pulse*registration(tile.id)*band;
   let e=vec3f(1.8,4.8,7.6)*amount;let opacity=.12*amount*frame.gates.y;c+=T*e;T*=1.-opacity;
  }
 }
 return output(c,1.-T,c,vec2f(0.));
}
@fragment fn rearHit(p:Pixel)->MRT{return hitSurface(p.position.xy,false);}
@fragment fn frontHit(p:Pixel)->MRT{return hitSurface(p.position.xy,true);}

@vertex fn bodyVS(@builtin(vertex_index)i:u32,@builtin(instance_index)id:u32)->Pixel {let q=array<vec2f,6>(vec2f(0.,0.),vec2f(1.,0.),vec2f(0.,1.),vec2f(0.,1.),vec2f(1.,0.),vec2f(1.,1.));let uv=q[i];let pixel=cell(id)+(uv-.5)*frame.viewport.z*vec2f(136./225.,1.);var p:Pixel;p.position=vec4f(pixel/frame.viewport.xy*vec2f(2.,-2.)+vec2f(-1.,1.),0.,1.);p.uv=(vec2f(62.,15.)+uv*vec2f(136.,225.))/vec2f(768.,512.);return p;}
fn linear(c:vec3f)->vec3f{return select(c/12.92,pow((c+.055)/1.055,vec3f(2.4)),c>vec3f(.04045));}
fn received(p:vec3f)->vec3f{if(frame.gates.x<.5||frame.gates.w<.5||frame.phase.z<.5){return vec3f(0.);}let directions=array<vec3f,6>(centre(22u),centre(49u),centre(31u),centre(32u),centre(58u),centre(10u));var L=vec3f(0.);let normal=fromView(vec3f(0.,0.,1.));for(var i=0u;i<6u;i++){let s=unit(directions[i])*axes;let v=s-p;let r2=dot(v,v);let cosi=max(0.,dot(normal,unit(v)));let d=density(s);L+=d.rgb*.11*.65*cosi/(12.56637*(r2+.18));}if(HIT_STATE_ENABLED&&frame.phase.y>2.5&&frame.phase.y<3.5&&frame.phase.x<.465){for(var id=0u;id<72u;id++){let pulse=response(id);if(pulse<=0.){continue;}let s=centre(id)*axes*(1.+.10*pulse);let v=s-p;L+=vec3f(1.8,4.8,7.6)*pulse*.004*max(0.,dot(normal,unit(v)))/(dot(v,v)+.18);}}
for(var i=0u;i<2u;i++){let s=focus(i);let v=s.p-p;L+=vec3f(8.,8.,7.6)*s.power*.012*max(0.,dot(normal,unit(v)))/(dot(v,v)+.12);}return L;}
@fragment fn bodyFS(p:Pixel)->MRT {let tex=textureSample(actor,actorSampler,p.uv);let q=local(p.position.xy);let L=received(fromView(vec3f(q.x,-q.y,0.)))*tex.a;return output(linear(tex.rgb)*tex.a+L,tex.a,L,vec2f(0.));}
@vertex fn pointVS(@builtin(vertex_index)i:u32,@builtin(instance_index)instance:u32)->Pixel {let id=instance/2u;let sourceId=instance%2u;let q=array<vec2f,6>(vec2f(-1.,-1.),vec2f(1.,-1.),vec2f(-1.,1.),vec2f(-1.,1.),vec2f(1.,-1.),vec2f(1.,1.));let uv=q[i];let s=focus(sourceId);let v=view(s.p);let pixel=cell(id)+vec2f(v.x,-v.y)*frame.viewport.z/1.65+uv*.10*frame.viewport.z/1.65;var p:Pixel;p.position=vec4f(pixel/frame.viewport.xy*vec2f(2.,-2.)+vec2f(-1.,1.),0.,1.);p.uv=vec2f(f32(sourceId),v.z);return p;}
fn point(p:Pixel,front:bool)->MRT {let i=u32(p.uv.x+.1);let s=focus(i);let depth=view(s.p).z;if((depth>=0.)!=front||frame.optics.w<.5){return output(vec3f(0.),0.,vec3f(0.),vec2f(0.));}let q=local(p.position.xy);let v=view(s.p);let d=q-vec2f(v.x,-v.y);let power=exp(-dot(d,d)/.0016)*s.power;let e=vec3f(8.,8.,7.6)*power;var signal=vec2f(0.);signal[i]=power;return output(e,0.,e,signal);}
@fragment fn rearPoint(p:Pixel)->MRT{return point(p,false);}
@fragment fn frontPoint(p:Pixel)->MRT{return point(p,true);}
@vertex fn occluderVS(@builtin(vertex_index)i:u32,@builtin(instance_index)id:u32)->Pixel {let q=array<vec2f,6>(vec2f(-1.,-1.),vec2f(1.,-1.),vec2f(-1.,1.),vec2f(-1.,1.),vec2f(1.,-1.),vec2f(1.,1.));let s=view(focus(0u).p);let pixel=cell(id)+vec2f(s.x,-s.y)*frame.viewport.z/1.65+q[i]*.24*frame.viewport.z/1.65;var p:Pixel;p.position=vec4f(pixel/frame.viewport.xy*vec2f(2.,-2.)+vec2f(-1.,1.),0.,1.);p.uv=vec2f(0.);return p;}
@fragment fn occluderFS(p:Pixel)->MRT {return output(vec3f(.12,.13,.14),1.,vec3f(0.),vec2f(0.));}
`;
