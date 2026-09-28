// OBS1: linear -> SDR表示。OBS2: PH1のHDR放射だけを畳み込む局所PSF。
// tone mapping、露光自動調整、clamp(maxAddedLuminance)、白飛び回避gainは存在しない。
struct Instance {
  center_axisX:vec4<f32>, axisY_age:vec4<f32>, state:vec4<f32>,
  detail:vec4<f32>, inverse:vec4<f32>, reserved:vec4<f32>
};
struct Globals {viewport:vec4<f32>, controls:vec4<f32>};
@group(0) @binding(0) var<storage,read> instances:array<Instance>;
@group(0) @binding(1) var<uniform> globals:Globals;
@group(0) @binding(2) var visibility:texture_2d_array<f32>;
@group(0) @binding(3) var body_map:texture_2d_array<f32>;
@group(0) @binding(4) var emission_map:texture_2d_array<f32>;
@group(0) @binding(5) var receiver_map:texture_2d_array<f32>;
@group(0) @binding(6) var scene_map:texture_2d<f32>;
struct VertexOut {@builtin(position) position:vec4<f32>};
@vertex fn vs_comp(@builtin(vertex_index) vi:u32)->VertexOut {
  let pts=array<vec2<f32>,3>(vec2(-1.,-1.),vec2(3.,-1.),vec2(-1.,3.));
  var v:VertexOut;v.position=vec4(pts[vi],0.,1.);return v;
}
fn from_srgb(x:vec3<f32>)->vec3<f32>{return select(x/vec3(12.92),pow((x+vec3(.055))/vec3(1.055),vec3(2.4)),x>vec3(.04045));}
fn to_srgb(x:vec3<f32>)->vec3<f32>{return select(x*12.92,vec3(1.055)*pow(max(x,vec3(0.)),vec3(1./2.4))-vec3(.055),x>vec3(.0031308));}
// rgba16floatを手動再構成。タイル/個体境界をまたぐsamplerは使わない。
fn read_map(t:texture_2d_array<f32>,uv:vec2<f32>,layer:i32)->vec4<f32>{
  if(any(uv<vec2(0.)) || any(uv>vec2(1.))){return vec4(0.);}
  let n=i32(globals.viewport.w);let pos=uv*f32(n)-vec2(.5);let base=vec2<i32>(floor(pos));let f=fract(pos);
  let a=textureLoad(t,clamp(base,vec2(0),vec2(n-1)),layer,0);
  let b=textureLoad(t,clamp(base+vec2(1,0),vec2(0),vec2(n-1)),layer,0);
  let c=textureLoad(t,clamp(base+vec2(0,1),vec2(0),vec2(n-1)),layer,0);
  let d=textureLoad(t,clamp(base+vec2(1,1),vec2(0),vec2(n-1)),layer,0);
  return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);
}
fn allowed(uv:vec2<f32>,layer:i32)->bool{
  if(any(uv<vec2(0.)) || any(uv>vec2(1.))){return false;}
  let n=i32(globals.viewport.w);let xy=clamp(vec2<i32>(uv*f32(n)),vec2(0),vec2(n-1));
  let m=textureLoad(visibility,xy,layer,0);return m.r>.999 && m.a<.001;
}
fn flag(flags:f32,bit:u32)->bool{return (u32(flags)&bit)!=0u;}
@fragment fn fs_comp(@builtin(position) frag:vec4<f32>)->@location(0) vec4<f32>{
  let pixel=vec2<i32>(frag.xy);var rgb=from_srgb(textureLoad(scene_map,pixel,0).rgb);
  for(var i=0u;i<u32(globals.viewport.z);i++){
    let a=instances[i];let delta=frag.xy-a.center_axisX.xy;
    let local=vec2(dot(a.inverse.xy,delta),dot(a.inverse.zw,delta));
    let uv=vec2(local.x,-local.y)*.5+vec2(.5);let layer=i32(i);
    // 畳み込み後の宛先にも現在権限を掛ける。壁の向こう/不可視面へBloomを漏らさない。
    if(!allowed(uv,layer)){continue;}
    // 既存受光面は膜より後方。受光を加えてから有色膜で遮蔽し、その後に放射/PSF。
    if(flag(a.detail.w,2u) && flag(a.detail.w,4u)){rgb+=read_map(receiver_map,uv,layer).rgb;}
    if(flag(a.detail.w,1u)){let b=read_map(body_map,uv,layer);rgb=rgb*(1.-b.a)+b.rgb;}
    if(flag(a.detail.w,2u)){
      rgb+=read_map(emission_map,uv,layer).rgb;
      if(flag(a.detail.w,8u)){
        let offsets=array<vec2<f32>,12>(
          vec2(1.,0.),vec2(-1.,0.),vec2(0.,1.),vec2(0.,-1.),
          vec2(.707,.707),vec2(-.707,.707),vec2(.707,-.707),vec2(-.707,-.707),
          vec2(1.84,.76),vec2(-1.84,-.76),vec2(-.76,1.84),vec2(.76,-1.84));
        var bloom=vec3(0.);
        for(var j=0u;j<12u;j++){
          let location=uv+offsets[j]*.032;
          // 遮蔽を横切る畳み込みも抑止。発光の減光ではなく視認権限。
          if(allowed(location,layer) && allowed((location+uv)*.5,layer)){
            bloom+=read_map(emission_map,location,layer).rgb*select(.09,.055,j>=8u);
          }
        }
        rgb+=bloom*.62;
      }
    }
  }
  // SDR UNORM格納時に1を超えた値が飽和する。意図した飽和を逆補正しない。
  return vec4(to_srgb(rgb),1.);
}
