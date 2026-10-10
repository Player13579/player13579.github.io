struct Params {
 viewport_anchor:vec4<f32>, // width,height,authority actor-action field anchor px
 state:vec4<f32>, // Hpx,ageMs,sourceOn,visibility
 modes:vec4<f32>, // OBSOn,mainOn,reducedMotion,angleRad
 optics:vec4<f32>, // intensity,sigmaX,sigmaY,PSF radius
 reserved4:vec4<f32>, reserved5:vec4<f32>,
}
@group(0) @binding(0) var<uniform> p:Params;
@group(1) @binding(0) var image: texture_2d<f32>;
@group(1) @binding(1) var bloom: texture_2d<f32>;
@group(1) @binding(2) var emission: texture_2d<f32>;
struct V { @builtin(position) pos:vec4<f32> };
@vertex fn vertexItemUse(@builtin(vertex_index) i:u32)->V {
 var points=array<vec2<f32>,3>(vec2<f32>(-1,-1),vec2<f32>(3,-1),vec2<f32>(-1,3));
 var o:V; o.pos=vec4<f32>(points[i],0,1);return o;
}
fn turn(q:vec2<f32>,a:f32)->vec2<f32>{return vec2<f32>(cos(a)*q.x-sin(a)*q.y,sin(a)*q.x+cos(a)*q.y);}
fn itemUseSmooth(x:f32)->f32 {let a=clamp(x,0.0,1.0);return a*a*(3.0-2.0*a);}
// 四辺の斜方容量面。発光で幾何の欠落を隠さず、二つの独立面の開きが主形を担う。
fn lozenge(q:vec2<f32>,half:vec2<f32>)->f32 {
 return (abs(q.x)/half.x+abs(q.y)/half.y-1.0)*min(half.x,half.y);
}
struct Signal { surface:vec3<f32>, cover:f32, emit:vec3<f32> }
fn useSignal(point:vec2<f32>)->Signal {
 var s:Signal;s.surface=vec3<f32>(0);s.cover=0;s.emit=vec3<f32>(0);
 let age=p.state.y;
 if(age<0.0||age>=780.0||p.state.z<=0.0||p.state.w<=0.0||p.modes.y<=0.0){return s;}
 // R3: capacity stays open, then an outer-to-inner deletion front consumes it.
 // A field release cue, not an item-specific bottle, healing, acquisition or projectile.
 let activation=itemUseSmooth(age/65.0);
 let unfold=itemUseSmooth((age-40.0)/205.0);
 let consume=itemUseSmooth((age-245.0)/330.0);
 let release=1.0-itemUseSmooth((age-555.0)/105.0);
 let q=turn(point,-p.modes.w);let rm=clamp(p.modes.z,0.0,1.0);
 let separation=mix(0.165,0.065,rm)*sin(unfold*1.5707963)*(1.0-0.48*consume);
 let rotation=mix(0.65,0.25,rm)*unfold;
 let leftQ=turn(q-vec2<f32>(-separation,0.035*unfold),rotation);
 let rightQ=turn(q-vec2<f32>(separation,-0.025*unfold),-rotation);
 let left=lozenge(leftQ,vec2<f32>(0.19,0.27));
 let right=lozenge(rightQ,vec2<f32>(0.165,0.24));
 let aa=max(1.0/p.state.x,0.006);
 let seam=0.009*(1.0-consume);
 let capacity=max(min(left,right),seam-abs(q.x));
 // Capacity is actually removed behind the advancing frontier; no detached ring.
 let cut=mix(0.48,0.0,consume);
 let deletion=abs(q.x)-cut;
 let d=max(capacity,deletion);
 let front=1.0-smoothstep(-aa,aa,d);
 let edge=exp(-abs(capacity)/max(aa*0.6,0.009))*front;
 let shallowBack=lozenge(turn(q-vec2<f32>(0.021,-0.025),-0.10),vec2<f32>(0.15,0.22));
 let depth=(1.0-smoothstep(-aa,aa,shallowBack))*(1.0-front)*(1.0-unfold);
 // Only existing material at the deletion boundary emits the consuming pulse.
 // The pulse follows the exact eroding contour rather than a stationary central blob.
 let burnWindow=itemUseSmooth((age-245.0)/60.0)*(1.0-itemUseSmooth((age-500.0)/75.0));
 let consumeEdge=exp(-pow(deletion/max(aa,0.013),2.0))*front*burnWindow;
 let coreWindow=itemUseSmooth((age-95.0)/65.0)*(1.0-itemUseSmooth((age-225.0)/110.0));
 let coreRadius=pow(q.x/0.048,2.0)+pow(q.y/0.14,2.0);
 let core=exp(-coreRadius*2.5)*coreWindow*(1.0-smoothstep(1.95,3.0,coreRadius));
 let foldLane=exp(-pow((q.y+q.x*0.65)/0.035,2.0))*front*(1.0-0.6*consume);
 let gate=activation*release*p.state.z*p.state.w;
 s.cover=(0.23*front+0.07*depth)*gate;
 s.surface=(vec3<f32>(0.20,0.105,0.028)*front+vec3<f32>(0.095,0.025,0.042)*depth)*gate;
 s.emit=(vec3<f32>(1.8,0.54,0.095)*front+vec3<f32>(3.4,2.75,1.8)*edge+vec3<f32>(2.9,1.35,0.48)*foldLane+vec3<f32>(4.4,3.1,1.6)*core+vec3<f32>(5.8,3.8,1.6)*consumeEdge)*gate*p.optics.x;
 return s;
}
struct W { @location(0) surface:vec4<f32>,@location(1) light:vec4<f32> }
@fragment fn worldItemUse(@builtin(position) pos:vec4<f32>)->W{
 let q=vec2<f32>((pos.x-p.viewport_anchor.z)/p.state.x,-(pos.y-p.viewport_anchor.w)/p.state.x);let s=useSignal(q);
 var o:W;o.surface=vec4<f32>(s.surface,s.cover);o.light=vec4<f32>(s.emit,0);return o;
}
fn read(t:texture_2d<f32>,q:vec2<i32>)->vec4<f32>{let dim=vec2<i32>(textureDimensions(t));return textureLoad(t,clamp(q,vec2<i32>(0),dim-vec2<i32>(1)),0);}
fn psf(q:vec2<i32>,axis:vec2<i32>,sigma:f32)->vec4<f32>{
 if(p.modes.x<=0.0){return vec4<f32>(0);}
 var total=0.0;var sum=vec3<f32>(0);let radius=i32(p.optics.w);
 for(var j=-12;j<=12;j=j+1){if(abs(j)<=radius){let w=exp(-f32(j*j)/(2.0*sigma*sigma));total+=w;sum+=read(image,q+axis*j).rgb*w;}}
 return vec4<f32>(sum/max(total,.00001),0);
}
@fragment fn spreadItemUseX(@builtin(position) pos:vec4<f32>)->@location(0) vec4<f32>{return psf(vec2<i32>(pos.xy),vec2<i32>(1,0),p.optics.y);}
@fragment fn spreadItemUseY(@builtin(position) pos:vec4<f32>)->@location(0) vec4<f32>{return psf(vec2<i32>(pos.xy),vec2<i32>(0,1),p.optics.z);}
@fragment fn compositeItemUse(@builtin(position) pos:vec4<f32>)->@location(0) vec4<f32>{
 let q=vec2<i32>(pos.xy);let w=read(image,q);let direct=read(emission,q).rgb;
 let radiance=direct+read(bloom,q).rgb*.46*p.modes.x;
 let mapped=vec3<f32>(1)-exp(-radiance);let a=1.0-(1.0-w.a)*exp(-max(mapped.r,max(mapped.g,mapped.b)));
 return vec4<f32>(w.rgb*(vec3<f32>(1)-mapped)+mapped,a);
}
