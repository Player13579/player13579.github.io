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
 let activation=itemUseSmooth(age/65.0);let unfold=itemUseSmooth((age-40.0)/245.0);
 let consume=itemUseSmooth((age-250.0)/300.0);let release=1.0-itemUseSmooth((age-570.0)/210.0);
 let q=turn(point,-p.modes.w);let rm=clamp(p.modes.z,0.0,1.0);
 let separation=mix(0.165,0.065,rm)*sin(unfold*1.5707963)*(1.0-consume);
 let rotation=mix(0.65,0.25,rm)*unfold;
 // 容量面は左右で厚み/投影が異なる。静止UI、丸いゲージ、物体原画ではない。
 let leftQ=turn(q-vec2<f32>(-separation,0.035*unfold),rotation);
 let rightQ=turn(q-vec2<f32>(separation,-0.025*unfold),-rotation);
 let shrink=1.0-0.86*consume;
 let left=lozenge(leftQ,vec2<f32>(0.19,0.27)*shrink);
 let right=lozenge(rightQ,vec2<f32>(0.165,0.24)*shrink);
 // 中央seamを前半に保持。開放後は空域そのものが使用前との違いを示す。
 let seam=0.009*(1.0-consume);
 let d=max(min(left,right),seam-abs(q.x));
 let aa=max(1.0/p.state.x,0.006);
 let front=1.0-smoothstep(-aa,aa,d);
 let edge=exp(-abs(d)/max(aa*0.6,0.009))*front;
 let shallowBack=lozenge(turn(q-vec2<f32>(0.021,-0.025),-0.10),vec2<f32>(0.15,0.22)*shrink);
 let depth=(1.0-smoothstep(-aa,aa,shallowBack))*(1.0-front)*(1.0-unfold);
 // 内部releaseは既存面の容量が解かれる空域に限定する。回復/毒/標的命中ではない。
 let coreWindow=itemUseSmooth((age-100.0)/70.0)*(1.0-itemUseSmooth((age-330.0)/160.0));
 let elongated=vec2<f32>(q.x/0.078,q.y/0.17);
 let coreRadius=dot(elongated,elongated);
 let core=exp(-coreRadius*2.5)*coreWindow*(1.0-smoothstep(1.95,3.0,coreRadius));
 let foldLane=exp(-pow((q.y+q.x*.65)/0.035,2.0))*front*(0.5+0.5*unfold);
 let gate=activation*release*p.state.z*p.state.w;
 s.cover=(0.23*front+0.07*depth)*gate;
 s.surface=(vec3<f32>(0.20,0.105,0.028)*front+vec3<f32>(0.095,0.025,0.042)*depth)*gate;
 s.emit=(vec3<f32>(1.8,0.54,0.095)*front+vec3<f32>(3.4,2.75,1.8)*edge+vec3<f32>(2.9,1.35,.48)*foldLane+vec3<f32>(5.2,4.0,2.7)*core)*gate*p.optics.x;
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
