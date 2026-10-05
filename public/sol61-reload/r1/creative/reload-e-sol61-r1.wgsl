// Reload E R1。場の状態を描く。弾数、物質の輸送、手への実接触を推測しない。
struct Params {
  viewport_anchor: vec4<f32>, // width,height,authority projected anchor x,y [px]
  scale_time: vec4<f32>, // actor H [px], authoritative elapsed [ms], phase 0=start/1=complete, pending 0/1
  gates: vec4<f32>, // sourceOn,OBSOn,mainOn,visible fraction (same-source occlusion)
  response: vec4<f32>, // source intensity, field world-projection rotation [rad], reducedMotion, reserved
  support: vec4<f32>, // PSF sigma [px], PSF radius [px], reserved,reserved
  reserved5: vec4<f32>,
  reserved6: vec4<f32>,
  reserved7: vec4<f32>,
}
@group(0) @binding(0) var<uniform> p: Params;
@group(1) @binding(0) var inputImage: texture_2d<f32>;
@group(1) @binding(1) var bloomImage: texture_2d<f32>;
struct VSOut { @builtin(position) position: vec4<f32> };
@vertex fn vsFullscreen(@builtin(vertex_index) i: u32) -> VSOut {
  var v = array<vec2<f32>,3>(vec2<f32>(-1.0,-1.0),vec2<f32>(3.0,-1.0),vec2<f32>(-1.0,3.0));
  var o: VSOut; o.position=vec4<f32>(v[i],0.0,1.0); return o;
}
fn rotate(q: vec2<f32>,a: f32) -> vec2<f32> { return vec2<f32>(cos(a)*q.x-sin(a)*q.y,sin(a)*q.x+cos(a)*q.y); }
fn box(q: vec2<f32>,b: vec2<f32>) -> f32 { let d=abs(q)-b; return length(max(d,vec2<f32>(0.0)))+min(max(d.x,d.y),0.0); }
fn bevel(q: vec2<f32>,b: vec2<f32>,cut: f32) -> f32 {
  return max(box(q,b),(abs(q.x)+abs(q.y)-b.x-b.y+cut)*0.70710678);
}
fn ease(x: f32) -> f32 { let a=clamp(x,0.0,1.0); return a*a*(3.0-2.0*a); }
struct Field { coverage: f32, radiance: vec3<f32>, surface: vec3<f32> };
fn reloadField(point: vec2<f32>) -> Field {
  var o: Field; o.coverage=0.0; o.radiance=vec3<f32>(0.0); o.surface=vec3<f32>(0.0);
  let age=max(p.scale_time.y,0.0); let complete=p.scale_time.z>0.5;
  let startLive=age<480.0 || p.scale_time.w>0.5;
  let live=select(startLive,age<620.0,complete);
  if (!live || p.gates.x<=0.0 || p.gates.z<=0.0 || p.gates.w<=0.0) { return o; }
  let opening=ease(age/160.0);
  let entry=ease(age/480.0);
  let seat=select(0.0,ease(age/240.0),complete);
  let lock=select(0.0,ease((age-190.0)/170.0),complete);
  let fade=select(opening,1.0-ease((age-420.0)/200.0),complete);
  let stableEntry=select(entry,1.0,complete);
  // reduced motion短縮輸送のみ。開始/保留/完了の差と明部は保持する。
  let rm=clamp(p.response.z,0.0,1.0);
  let gate=p.gates.x*p.gates.w*fade;
  let q=rotate(point,-p.response.y);
  let jawX=mix(0.175,0.086,lock);
  let bevelCut=0.024;
  let left=bevel(rotate(q-vec2<f32>(-jawX,0.085),-0.16*(1.0-lock)),vec2<f32>(0.077,0.122),bevelCut);
  let right=bevel(rotate(q-vec2<f32>(jawX,0.085),0.16*(1.0-lock)),vec2<f32>(0.077,0.122),bevelCut);
  var mainD=min(left,right);
  // 一体の場の三つの離散構造。弾薬個数や残量に対応しない。
  for (var i=0u;i<3u;i=i+1u) {
    let fi=f32(i); let spread=1.0-seat;
    let startY=-0.31-fi*0.085;
    let stagedY=-0.14-fi*0.072;
    let enteredY=mix(startY,stagedY,stableEntry);
    let y=mix(mix(enteredY,stagedY,rm),0.072-fi*0.027,seat);
    let x=mix((fi-1.0)*0.081*spread,(fi-1.0)*0.035,seat);
    let packetQ=rotate(q-vec2<f32>(x,y),-0.22*spread);
    let face=bevel(packetQ,vec2<f32>(0.065,0.036),0.026);
    mainD=min(mainD,face);
  }
  // 非物体の有限な発光密度。厚みは斜投影された背面差から読む2.5D近似。
  let aa=max(1.0/p.scale_time.x,0.005);
  let front=1.0-smoothstep(-aa,aa,mainD);
  let backQ=q-vec2<f32>(0.017,-0.025);
  let backLeft=bevel(rotate(backQ-vec2<f32>(-jawX,0.085),-0.16*(1.0-lock)),vec2<f32>(0.077,0.122),bevelCut);
  let backRight=bevel(rotate(backQ-vec2<f32>(jawX,0.085),0.16*(1.0-lock)),vec2<f32>(0.077,0.122),bevelCut);
  let side=(1.0-smoothstep(-aa,aa,min(backLeft,backRight)))*(1.0-front);
  let edge=exp(-abs(mainD)/max(0.009,aa*0.65))*front;
  let centralPeak=select(0.0,exp(-pow((age-240.0)/76.0,2.0))*exp(-dot(q-vec2<f32>(0.0,0.06),q-vec2<f32>(0.0,0.06))/0.007),complete);
  // coverageと放射を別量に保つ。空洞を背景色やsource強度から埋めない。
  o.coverage=(0.28*front+0.10*side)*gate;
  o.surface=(vec3<f32>(0.035,0.27,0.23)*front+vec3<f32>(0.025,0.11,0.17)*side)*gate;
  let body=vec3<f32>(0.07,1.42,1.10)*front;
  let rim=vec3<f32>(2.5,3.7,3.25)*edge;
  let seating=vec3<f32>(5.0,4.25,2.55)*centralPeak;
  o.radiance=(body+rim+seating)*gate*max(p.response.x,0.0);
  return o;
}
struct WorldOut { @location(0) world: vec4<f32>, @location(1) emission: vec4<f32> };
@fragment fn fsWorld(@builtin(position) pos: vec4<f32>) -> WorldOut {
  let local=vec2<f32>((pos.x-p.viewport_anchor.z)/p.scale_time.x,-(pos.y-p.viewport_anchor.w)/p.scale_time.x);
  let f=reloadField(local); var o: WorldOut;
  o.world=vec4<f32>(f.surface,f.coverage); o.emission=vec4<f32>(f.radiance,0.0); return o;
}
fn readClamped(t: texture_2d<f32>,q: vec2<i32>) -> vec4<f32> {
  let dims=vec2<i32>(textureDimensions(t)); return textureLoad(t,clamp(q,vec2<i32>(0),dims-vec2<i32>(1)),0);
}
fn blur(q: vec2<i32>,axis: vec2<i32>) -> vec4<f32> {
  if (p.gates.y<=0.0) { return vec4<f32>(0.0); }
  let sigma=max(p.support.x,0.65); let radius=i32(clamp(p.support.y,1.0,10.0));
  var sum=vec3<f32>(0.0); var total=0.0;
  for (var j=-10;j<=10;j=j+1) {
    if (abs(j)<=radius) { let w=exp(-f32(j*j)/(2.0*sigma*sigma)); sum+=readClamped(inputImage,q+axis*j).rgb*w; total+=w; }
  }
  return vec4<f32>(sum/max(total,0.0001),0.0);
}
@fragment fn fsBlurX(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> { return blur(vec2<i32>(pos.xy),vec2<i32>(1,0)); }
@fragment fn fsBlurY(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> { return blur(vec2<i32>(pos.xy),vec2<i32>(0,1)); }
// composite inputImage=world; bloomImage=blurY; third texture keeps unblurred source radiance.
@group(1) @binding(2) var emissionImage: texture_2d<f32>;
@fragment fn fsComposite(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
  let q=vec2<i32>(pos.xy); let world=readClamped(inputImage,q); let direct=readClamped(emissionImage,q).rgb;
  let spread=readClamped(bloomImage,q).rgb*0.58*p.gates.y;
  let light=vec3<f32>(1.0)-exp(-(direct+spread));
  let coverage=1.0-(1.0-world.a)*exp(-max(light.r,max(light.g,light.b)));
  return vec4<f32>(world.rgb*(1.0-light)+light,coverage);
}
