// Reload R2: count-independent digital supply → receiving cavity → completion latch.
// Original action-field anchor contract remains; no actual gun/hand/contact/round count is inferred.
struct Params {
 viewport_anchor:vec4f, scale_time:vec4f, gates:vec4f, response:vec4f, support:vec4f,
 reserved5:vec4f, reserved6:vec4f, reserved7:vec4f,
}
@group(0) @binding(0) var<uniform> p:Params;
@group(1) @binding(0) var inputImage:texture_2d<f32>;
@group(1) @binding(1) var bloomImage:texture_2d<f32>;
@group(1) @binding(2) var emissionImage:texture_2d<f32>;
struct VSOut{@builtin(position) position:vec4f};
@vertex fn vsFullscreen(@builtin(vertex_index) i:u32)->VSOut{var corners=array<vec2f,3>(vec2f(-1.0,-1.0),vec2f(3.0,-1.0),vec2f(-1.0,3.0));var o:VSOut;o.position=vec4f(corners[i],0.0,1.0);return o;}
fn rotate(q:vec2f,a:f32)->vec2f{return vec2f(cos(a)*q.x-sin(a)*q.y,sin(a)*q.x+cos(a)*q.y);}
fn box(q:vec2f,b:vec2f)->f32{let d=abs(q)-b;return length(max(d,vec2f(0.0)))+min(max(d.x,d.y),0.0);}
fn bevel(q:vec2f,b:vec2f,cut:f32)->f32{return max(box(q,b),(abs(q.x)+abs(q.y)-b.x-b.y+cut)*0.70710678);}
fn ease(x:f32)->f32{let a=clamp(x,0.0,1.0);return a*a*(3.0-2.0*a);}
fn mask(d:f32,aa:f32)->f32{return 1.0-smoothstep(-aa,aa,d);}
struct Field{coverage:f32,radiance:vec3f,surface:vec3f};
fn reloadField(point:vec2f)->Field{
 var o:Field;o.coverage=0.0;o.radiance=vec3f(0.0);o.surface=vec3f(0.0);
 let age=max(0.0,p.scale_time.y);let complete=p.scale_time.z>0.5;
 let live=select(age<480.0||p.scale_time.w>0.5,age<620.0,complete);
 if(!live||p.gates.x<=0.0||p.gates.z<=0.0||p.gates.w<=0.0){return o;}
 let q=rotate(point,-p.response.y);let aa=max(0.006,0.85/max(1.0,p.scale_time.x));
 let opened=select(ease(age/160.0),1.0,complete);
 let approach=select(ease(age/480.0),1.0,complete);
 let seat=select(0.0,ease(age/240.0),complete);
 let latch=select(0.0,ease((age-260.0)/120.0),complete);
 let fade=select(opened,1.0-ease((age-420.0)/200.0),complete);
 let gate=p.gates.x*p.gates.w*fade;
 // One connected receiver: bridge plus walls. The aperture is real negative space.
 let bridge=bevel(q-vec2f(0.0,0.405),vec2f(0.38,0.055),0.032);
 let left=bevel(q-vec2f(-0.325,0.20),vec2f(0.055,0.20),0.030);
 let right=bevel(q-vec2f(0.325,0.20),vec2f(0.055,0.20),0.030);
 let receiverD=min(bridge,min(left,right));let receiver=mask(receiverD,aa);
 let receiverEdge=exp(-abs(receiverD)/max(0.014,aa*0.75))*receiver;
 let backQ=q-vec2f(0.020,-0.023);
 let backD=min(bevel(backQ-vec2f(0.0,0.405),vec2f(0.38,0.055),0.032),min(bevel(backQ-vec2f(-0.325,0.20),vec2f(0.055,0.20),0.030),bevel(backQ-vec2f(0.325,0.20),vec2f(0.055,0.20),0.030)));
 let receiverSide=mask(backD,aa)*(1.0-receiver);
 // A single broad supply form. Its internal slots are structure, never ammunition quantity.
 let reduced=clamp(p.response.z,0.0,1.0);
 let centerY=select(mix(mix(-0.55,-0.25,reduced),-0.13,approach),mix(-0.13,0.15,seat),complete);
 let supplyQ=q-vec2f(0.0,centerY);
 let supplyD=bevel(supplyQ,vec2f(0.20,0.17),0.055);let supply=mask(supplyD,aa);
 let supplyEdge=exp(-abs(supplyD)/max(0.012,aa*0.70))*supply;
 let front=mask(bevel(supplyQ-vec2f(0.0,0.127),vec2f(0.144,0.038),0.019),aa);
 let spine=mask(box(supplyQ,vec2f(0.033,0.119)),aa)*supply;
 // The same mouth plane receives the leading face; no isolated dots float above it.
 let aligned=ease((approach-0.70)/0.30);
 let mouthDistance=abs(q.y-0.012);
 let mouthLight=exp(-mouthDistance/max(0.017,aa))*mask(box(vec2f(q.x,0.0),vec2f(0.268,1.0)),aa)*aligned;
 let cavity=mask(bevel(q-vec2f(0.0,0.175),vec2f(0.255,0.170),0.032),aa);
 let inside=select(0.0,cavity*supply,complete);
 let shoulderResponse=receiver*aligned*(0.20+0.80*seat);
 // Completion closes only after seating. Its seam stays broad enough to read at H64.
 let latchD=bevel(q-vec2f(0.0,0.022),vec2f(0.274*latch,0.028),0.010*latch);
 let latchShape=mask(latchD,aa)*latch;
 let lockPeak=exp(-pow((age-355.0)/55.0,2.0))*select(0.0,1.0,complete);
 let unionCoverage=max(receiver,max(supply,latchShape));
 o.coverage=(0.34*unionCoverage+0.11*receiverSide)*gate;
 o.surface=(vec3f(0.015,0.20,0.23)*(receiver+0.28*receiverSide)+vec3f(0.31,0.14,0.025)*supply)*(1.0-latchShape*0.2)*gate;
 let receiverLight=vec3f(0.04,1.18,1.49)*(receiver*0.70+receiverSide*0.22)+vec3f(0.33,2.30,2.75)*receiverEdge;
 let supplyLight=vec3f(2.20,0.83,0.12)*(supply*0.85+spine*0.27)+vec3f(4.60,2.91,0.84)*(front*0.75+supplyEdge*0.60);
 let receiving=vec3f(2.38,2.55,1.40)*(mouthLight*0.72+shoulderResponse*0.35+inside*seat*0.55);
 let locked=vec3f(3.20,3.10,1.55)*latchShape*(0.7+lockPeak*1.3);
 o.radiance=(receiverLight+supplyLight+receiving+locked)*gate*max(0.0,p.response.x);
 return o;
}
struct WorldOut{@location(0) world:vec4f,@location(1) emission:vec4f};
@fragment fn fsWorld(@builtin(position) pos:vec4f)->WorldOut{let local=vec2f((pos.x-p.viewport_anchor.z)/p.scale_time.x,-(pos.y-p.viewport_anchor.w)/p.scale_time.x);let f=reloadField(local);var o:WorldOut;o.world=vec4f(f.surface,f.coverage);o.emission=vec4f(f.radiance,0.0);return o;}
fn readClamped(t:texture_2d<f32>,q:vec2i)->vec4f{let dims=vec2i(textureDimensions(t));return textureLoad(t,clamp(q,vec2i(0),dims-vec2i(1)),0);}
fn blur(q:vec2i,axis:vec2i)->vec4f{
 if(p.gates.y<=0.0){return vec4f(0.0);}let sigma=max(0.65,p.support.x);let radius=i32(clamp(p.support.y,1.0,10.0));var sum=vec3f(0.0);var total=0.0;
 for(var j=-10;j<=10;j++){if(abs(j)<=radius){let weight=exp(-f32(j*j)/(2.0*sigma*sigma));sum+=readClamped(inputImage,q+axis*j).rgb*weight;total+=weight;}}
 return vec4f(sum/max(0.0001,total),0.0);
}
@fragment fn fsBlurX(@builtin(position) pos:vec4f)->@location(0) vec4f{return blur(vec2i(pos.xy),vec2i(1,0));}
@fragment fn fsBlurY(@builtin(position) pos:vec4f)->@location(0) vec4f{return blur(vec2i(pos.xy),vec2i(0,1));}
@fragment fn fsComposite(@builtin(position) pos:vec4f)->@location(0) vec4f{
 let pixel=vec2i(pos.xy);let world=readClamped(inputImage,pixel);let direct=readClamped(emissionImage,pixel).rgb;
 let observer=readClamped(bloomImage,pixel).rgb*0.24*p.gates.y;
 let hdr=world.rgb+direct+observer;let alpha=1.0-(1.0-world.a)*exp(-max(direct.r+observer.r,max(direct.g+observer.g,direct.b+observer.b))*0.72);
 let straight=hdr/max(alpha,0.00001);let display=straight/(1.0+max(straight.r,max(straight.g,straight.b)));
 return vec4f(display*alpha,alpha);
}
