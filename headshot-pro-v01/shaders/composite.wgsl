// OBS1: source閾値付き局所散乱。OBS2: 局所輝度予算とsRGB符号化。
// ぼかす前後にイベント固有maskを適用。背景の全画面露光は変更しない。
struct Instance {
  center_basis_x:vec4<f32>,basis_y_time:vec4<f32>,energy_shape:vec4<f32>,
  profile:vec4<f32>,options:vec4<f32>,inverse:vec4<f32>,
};
struct Globals {size_count:vec4<f32>,budget:vec4<f32>};
@group(0) @binding(0) var<storage,read> instances:array<Instance>;
@group(0) @binding(1) var<uniform> globals:Globals;
@group(0) @binding(2) var permission_masks:texture_2d_array<f32>;
@group(0) @binding(3) var bodies:texture_2d_array<f32>;
@group(0) @binding(4) var sources:texture_2d_array<f32>;
@group(0) @binding(5) var lighting:texture_2d_array<f32>;
@group(0) @binding(6) var scene:texture_2d<f32>;
struct VertexOut{@builtin(position) position:vec4<f32>};
@vertex fn vs_full(@builtin(vertex_index) vertex:u32)->VertexOut {
  let p=array<vec2<f32>,3>(vec2(-1.0,-1.0),vec2(3.0,-1.0),vec2(-1.0,3.0));
  var out:VertexOut;out.position=vec4(p[vertex],0.0,1.0);return out;
}
fn srgb_to_linear(c:vec3<f32>)->vec3<f32>{return select(c/12.92,pow((c+0.055)/1.055,vec3(2.4)),c>vec3(0.04045));}
fn linear_to_srgb(c:vec3<f32>)->vec3<f32>{let x=max(c,vec3(0.0));return select(x*12.92,1.055*pow(x,vec3(1.0/2.4))-0.055,x>vec3(0.0031308));}
fn luma(c:vec3<f32>)->f32{return dot(c,vec3(0.2126,0.7152,0.0722));}
fn permitted(pos:vec2<i32>,layer:i32,tile:i32)->bool {
  if(any(pos<vec2(0))||any(pos>=vec2(tile))){return false;}
  let mask=textureLoad(permission_masks,pos,layer,0);return mask.r>0.999 && mask.a<0.001;
}
fn threshold_source(pos:vec2<i32>,layer:i32,tile:i32)->vec3<f32>{
  if(!permitted(pos,layer,tile)){return vec3(0.0);}
  let s=textureLoad(sources,pos,layer,0).rgb;
  return s*smoothstep(globals.budget.w,globals.budget.w+0.4,luma(s));
}
@fragment fn fs_composite(@builtin(position) position:vec4<f32>)->@location(0) vec4<f32> {
  let screen=position.xy;let pixel=vec2<i32>(screen);let scene_pixel=textureLoad(scene,pixel,0);
  var base=srgb_to_linear(scene_pixel.rgb);var added=vec3(0.0);var changed=false;
  let count=u32(globals.size_count.z);let tile=i32(globals.size_count.w);
  for(var i=0u;i<count;i++){
    let inst=instances[i];let delta=screen-inst.center_basis_x.xy;
    let p=vec2(dot(inst.inverse.xy,delta),dot(inst.inverse.zw,delta));
    if(any(abs(p)>vec2(1.0))){continue;}
    let uv=vec2(p.x,-p.y)*0.5+0.5;
    let coord=clamp(vec2<i32>(uv*f32(tile)),vec2(0),vec2(tile-1));
    let layer=i32(i);if(!permitted(coord,layer,tile)){continue;}
    let b=textureLoad(bodies,coord,layer,0);let s=textureLoad(sources,coord,layer,0).rgb;
    let light=textureLoad(lighting,coord,layer,0).rgb;
    var bloom=vec3(0.0);
    if((u32(inst.options.z)&8u)!=0u && (u32(inst.options.z)&2u)!=0u){
      // native約1.4pxの狭い散乱。画面拡大時も主形を置き換えない。
      let radius=max(1,i32(round(1.4*f32(tile)/(2.0*max(inst.options.y,1.0)))));
      bloom=threshold_source(coord,layer,tile)*0.24;
      bloom+=threshold_source(coord+vec2(radius,0),layer,tile)*0.13;
      bloom+=threshold_source(coord+vec2(-radius,0),layer,tile)*0.13;
      bloom+=threshold_source(coord+vec2(0,radius),layer,tile)*0.13;
      bloom+=threshold_source(coord+vec2(0,-radius),layer,tile)*0.13;
      bloom+=threshold_source(coord+vec2(radius,radius),layer,tile)*0.06;
      bloom+=threshold_source(coord+vec2(-radius,radius),layer,tile)*0.06;
      bloom+=threshold_source(coord+vec2(radius,-radius),layer,tile)*0.06;
      bloom+=threshold_source(coord+vec2(-radius,-radius),layer,tile)*0.06;
      bloom*=globals.budget.y;
    }
    if(b.a>0.0||luma(s+light+bloom)>0.0){changed=true;}
    // 後に合成される不透明な折面は既存の光も遮る。bodyと発光量を混同しない。
    base=base*(1.0-b.a)+b.rgb;
    added=added*(1.0-b.a)+s+light+bloom;
  }
  if(!changed){return scene_pixel;}
  // 多重発生でも同じ全体予算。色相を保つ共通係数で圧縮し、scene自体の露光は変えない。
  added*=min(1.0,globals.budget.z/max(luma(added),0.00001));
  let bounded=1.0-exp(-added*0.60);
  let result=clamp(base+(1.0-base)*bounded,vec3(0.0),vec3(1.0));
  return vec4(linear_to_srgb(result),scene_pixel.a);
}
