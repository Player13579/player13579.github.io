// Astra r05: normalized waiting-volume -> compression -> absence -> recipient readiness.
// Analytic 3D face intersections. No ray steps, rings, hourglass, clock symbols, or particles.
export const shader=/* wgsl */`
struct U{screen:vec4f,body:vec4f,state:vec4f};
@group(0) @binding(0) var<uniform> u:U;
@group(0) @binding(1) var actor:texture_2d<f32>;
@group(0) @binding(2) var samp:sampler;
struct V{@builtin(position) p:vec4f};
@vertex fn vs(@builtin(vertex_index) i:u32)->V{var v:V;let a=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));v.p=vec4f(a[i],0,1);return v;}
fn gate(t:f32,a:f32,b:f32)->f32{return smoothstep(a,a+.065,t)*(1-smoothstep(b-.15,b,t));}
fn rotate(p:vec3f,a:f32)->vec3f{return vec3f(cos(a)*p.x-sin(a)*p.z,p.y,sin(a)*p.x+cos(a)*p.z);}
fn prism(p:vec2f,t:f32,front:bool)->vec4f{
 if(t<=0.||t>=.595){return vec4f(0);}
 let compress=smoothstep(.16,.48,t);let collapse=select(compress,compress*.65,u.state.y>.5);
 let h=vec3f(.34+collapse*.08,mix(.58,.027,collapse),.235*(1-collapse*.26));
 let yaw=-.56+.16*collapse;
 let ro=rotate(vec3f(p.x,p.y+.28-.48,1),yaw);let rd=rotate(vec3f(0,-.28,-1),yaw);
 let a=(-h-ro)/rd;let b=(h-ro)/rd;let near=min(a,b);let far=max(a,b);
 let enter=max(near.x,max(near.y,near.z));let leave=min(far.x,min(far.y,far.z));
 let segmentStart=max(enter,select(1.,0.,front));let segmentEnd=min(leave,select(2.,1.,front));
 if(segmentEnd<=segmentStart){return vec4f(0);}
 let dist=select(leave,enter,front);let point=ro+rd*dist;
 let absFace=abs(h-abs(point));let minFace=min(absFace.x,min(absFace.y,absFace.z));
 var n=vec3f(0,0,sign(point.z));if(absFace.y<=minFace+.0001){n=vec3f(0,sign(point.y),0);}else if(absFace.x<=minFace+.0001){n=vec3f(sign(point.x),0,0);}
 let lighting=.35+.65*max(0.,dot(n,normalize(vec3f(-.45,.8,.5))));
 let edgeDist=absFace.x+absFace.y+absFace.z-minFace-max(absFace.x,max(absFace.y,absFace.z));
 let edge=1-smoothstep(.006,.026,edgeDist);
 let volumeDepth=clamp((segmentEnd-segmentStart)/.32,0,1);
 let strata=pow(max(0.,cos(point.y/max(.027,h.y)*6.28318)),12.);
 let pulse=exp(-pow((t-.465)/.065,2.));
 let color=mix(vec3f(.29,.16,.09),vec3f(.93,.65,.24),lighting)+vec3f(.20,.12,.03)*strata;
 let faceColor=color+vec3f(.76,.68,.34)*(edge*.55+pulse*.30);
 let appearance=smoothstep(.015,.09,t)*(1-smoothstep(.48,.58,t));
 let opacity=(.14+.30*volumeDepth+edge*.19)*appearance;
 return vec4f(faceColor,clamp(opacity,0,.74));
}
fn actorAlpha(source:vec2f)->f32{
 let legal=source.x>=0&&source.x<256&&source.y>=0&&source.y<256;
 return select(0.,textureSampleLevel(actor,samp,source/vec2f(textureDimensions(actor)),0).a,legal);
}
@fragment fn fs(v:V)->@location(0) vec4f{
 let pixel=v.p.xy/u.screen.z;let p=vec2f(pixel.x-u.body.x,u.body.y-pixel.y)/u.body.z;let t=u.state.x;
 var c=mix(vec3f(.035,.061,.102),vec3f(.77,.81,.79),u.state.z);
 let ground=exp(-pow(p.x/.40,2.)-pow(p.y/.045,2.));let ready=gate(t,.64,.995);
 c+=vec3f(.18,.10,.025)*ground*gate(t,.03,.59)+vec3f(.09,.33,.18)*ground*ready;
 c*=1-exp(-pow(p.x/.19,2.)-pow(p.y/.023,2.))*.24;
 let rear=prism(p,t,false);c=mix(c,rear.rgb,rear.a);
 let source=vec2f(128.+p.x*222.,240.-p.y*222.);let tex=textureSampleLevel(actor,samp,source/vec2f(textureDimensions(actor)),0);let alpha=actorAlpha(source)*u.state.w;
 let rise=smoothstep(.64,.865,t);let frontY=mix(-.06,1.12,rise);let wave=exp(-pow((p.y-frontY)/.125,2.));
 let sustain=(1-smoothstep(.85,.995,t))*smoothstep(.68,.79,t);
 let faceProtect=1-smoothstep(.77,.96,p.y)*.58;
 let response=(wave*.48+sustain*.19)*ready*faceProtect;
 let bodyColor=tex.rgb+vec3f(.26,.63,.40)*response;
 c=mix(c,bodyColor,alpha);
 let near=prism(p,t,true);c=mix(c,near.rgb,near.a);
 // The result is carried by the real character silhouette, not by a floating sign.
 let d=222./u.body.z*1.40;
 let neighbor=max(max(actorAlpha(source+vec2f(d,0)),actorAlpha(source-vec2f(d,0))),max(actorAlpha(source+vec2f(0,d)),actorAlpha(source-vec2f(0,d))));
 let rim=max(0.,neighbor-alpha)*u.state.w;
 let localReady=ready*(.28+.72*wave+.40*sustain);
 c+=vec3f(.57,1.,.72)*rim*localReady*.92;
 // A shoulder-to-foot material response follows the reveal front, then settles to the adopted sprite.
 c+=vec3f(.10,.31,.19)*alpha*wave*ready*faceProtect;
 return vec4f(c,1);
}`;
