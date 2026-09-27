// PH1: 有色の二枚の折面・接触口・有限放射。PH2: 正規の受光面だけの局所応答。
// 発射方向・人体損傷・飛翔粒子を推定しない。法線情報はホストのmask.bに限定する。
struct Instance {
  center_basis_x: vec4<f32>, // xy=screen中心、zw=世界局所X軸のscreen射影
  basis_y_time: vec4<f32>,   // xy=局所Y軸の射影、z=u、w=body包絡
  energy_shape: vec4<f32>,   // x=放射包絡、y=release、z=length、w=width
  profile: vec4<f32>,        // x=weapon、y=aim、z=reduced、w=skew
  options: vec4<f32>,        // x=spread、y=logical half extent、z=層mask、w=予備
  inverse: vec4<f32>,        // screen相対座標→局所pの逆行列
};
struct Globals {
  size_count: vec4<f32>,  // xy=screen寸法、z=active数、w=tile寸法
  budget: vec4<f32>,      // near light, bloom, extra luma上限, source閾値
};
@group(0) @binding(0) var<storage, read> instances: array<Instance>;
@group(0) @binding(1) var<uniform> globals: Globals;
@group(0) @binding(2) var permission_masks: texture_2d_array<f32>;
struct VertexOut {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
  @location(1) @interpolate(flat) index: u32,
};
@vertex fn vs_main(@builtin(vertex_index) vertex: u32, @builtin(instance_index) instance: u32) -> VertexOut {
  let corners=array<vec2<f32>,6>(vec2(-1.0,-1.0),vec2(1.0,-1.0),vec2(-1.0,1.0),vec2(-1.0,1.0),vec2(1.0,-1.0),vec2(1.0,1.0));
  let p=corners[vertex];var out:VertexOut;out.position=vec4(p,0.0,1.0);out.uv=vec2(p.x,-p.y)*0.5+0.5;out.index=instance;return out;
}
fn coverage(distance:f32, aa:f32)->f32 {return 1.0-smoothstep(-aa,aa,distance);}
fn flag(flags:f32,bit:u32)->f32{return select(0.0,1.0,(u32(flags)&bit)!=0u);}
// 幅が中央へ膨らみ、両端へ非対称に収束する折面。輪でも一様管でもない。
fn folded_lamina(p:vec2<f32>,length:f32,width:f32,side:f32,gap:f32,skew:f32)->f32 {
  let x=p.x/length;
  let taper=pow(max(0.0,1.0-abs(x)),0.68);
  let centerline=0.115*p.x+0.045*sin(p.x*5.0)+side*gap;
  let local_width=width*taper*(0.78+0.22*side*x);
  let y=(p.y-centerline)*side;
  let face=max(-y,y-local_width);
  let end=abs(p.x+side*skew*0.13)-length;
  return max(face,end);
}
struct FormOut {
  @location(0) body:vec4<f32>,
  @location(1) emission:vec4<f32>,
  @location(2) light:vec4<f32>,
};
@fragment fn fs_form(in:VertexOut)->FormOut {
  let inst=instances[in.index];let tile=i32(globals.size_count.w);
  let coord=clamp(vec2<i32>(in.uv*f32(tile)),vec2(0),vec2(tile-1));
  let permission=textureLoad(permission_masks,coord,i32(in.index),0);
  let allowed=select(0.0,1.0,permission.r>0.999 && permission.a<0.001);
  var out:FormOut;out.body=vec4(0.0);out.emission=vec4(0.0);out.light=vec4(0.0);
  let body_envelope=inst.basis_y_time.w;
  if(allowed==0.0 || body_envelope<=0.0){return out;}
  let p=vec2(in.uv.x*2.0-1.0,1.0-in.uv.y*2.0);
  // 固定された世界内形態軸。射手からの入射方位を表さない。
  let q=vec2(p.x*0.9563+p.y*0.2924,-p.x*0.2924+p.y*0.9563);
  let aa=max(0.65/max(inst.options.y,1.0),1.0/f32(tile));
  let weapon=u32(inst.profile.x);let aim=inst.profile.y;let u=inst.basis_y_time.z;
  let length=inst.energy_shape.z;let width=inst.energy_shape.w;
  let release=inst.energy_shape.y;
  let gap=0.022+inst.options.x*release;
  let upper=folded_lamina(q+vec2(-0.02,0.0),length,width,1.0,gap,inst.profile.w);
  let lower=folded_lamina(q+vec2(0.055,0.0),length*0.88,width*0.78,-1.0,gap*0.80,inst.profile.w);
  let upper_mask=coverage(upper,aa);let lower_mask=coverage(lower,aa);
  let face=max(upper_mask,lower_mask);
  let inner_ridge=coverage(abs(q.y-0.115*q.x)-gap*0.43,aa)*coverage(abs(q.x)-length*0.58,aa);
  // 深い有色面と明るい端面。補色の帯を周回させる装飾グラデーションは使わない。
  let edge=face*(1.0-coverage(min(upper,lower)+aa*2.1,aa));
  let upper_color=vec3(0.70,0.155,0.072);
  let lower_color=vec3(0.27,0.047,0.092);
  var color=mix(lower_color,upper_color,upper_mask/(upper_mask+lower_mask+0.0001));
  color=mix(color,vec3(0.95,0.34,0.10),edge*0.64);
  color=mix(color,vec3(0.030,0.043,0.10),inner_ridge*0.64);
  var contact_y=0.115*q.x+0.045*sin(q.x*5.0);
  if(weapon==4u){contact_y+=0.032*sin(q.x*18.0)*(1.0-smoothstep(0.2,0.6,abs(q.x)));}
  let pinch_width=max(0.018,aa*0.83)*(1.0-0.42*clamp(abs(q.x)/0.36,0.0,1.0));
  let mouth=coverage(abs(q.y-contact_y)-pinch_width,aa)*coverage(abs(q.x)-0.30-0.07*aim,aa);
  // 狙撃は長いが細い接触圧縮、SMGは短い小面。追跡弾・追加衝突ではない。
  let tiny_notch=1.0-coverage(abs(q.x-0.09)-0.021,aa)*0.55;
  let source_shape=mouth*tiny_notch;
  let source=vec3(2.10,1.55,0.32)*source_shape*inst.energy_shape.x;
  let a=face*body_envelope*flag(inst.options.z,1u);
  out.body=vec4(color*a,a);
  out.emission=vec4(source*flag(inst.options.z,2u),source_shape*body_envelope);
  // 近傍への光は source ON と許可済み受光面にのみ従属。架空の床/全身rimは作らない。
  let distance2=dot(p,p);
  let finite_support=1.0-smoothstep(0.45,0.94,sqrt(distance2));
  let transport=finite_support/(1.0+8.0*distance2);
  let irradiance=inst.energy_shape.x*transport*permission.g*permission.b*globals.budget.x*flag(inst.options.z,4u)*flag(inst.options.z,2u);
  out.light=vec4(vec3(1.0,0.46,0.12)*irradiance,0.0);
  return out;
}
