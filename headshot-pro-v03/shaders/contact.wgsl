// v3 PH1: 固定接触核 + 武器別の圧縮面。形の正本はcontact-geometry.mjsが作る凸半平面。
// PH2: 現在許可された既存面だけの局所受光。人物/血液/損傷/入射弾道を生成しない。
struct Instance {
  center_basis_x:vec4<f32>, basis_y_time:vec4<f32>, energy_shape:vec4<f32>,
  profile:vec4<f32>, options:vec4<f32>, inverse:vec4<f32>,
};
struct Globals {size_count:vec4<f32>,budget:vec4<f32>};
struct ContactPiece {header:vec4<f32>,planes:array<vec4<f32>,8>};
@group(0) @binding(0) var<storage,read> instances:array<Instance>;
@group(0) @binding(1) var<uniform> globals:Globals;
@group(0) @binding(2) var permission_masks:texture_2d_array<f32>;
@group(0) @binding(3) var<storage,read> geometry:array<ContactPiece>;
struct VertexOut {@builtin(position) position:vec4<f32>,@location(0) uv:vec2<f32>,@location(1) @interpolate(flat) index:u32};
@vertex fn vs_main(@builtin(vertex_index) vertex:u32,@builtin(instance_index) instance:u32)->VertexOut {
  let corners=array<vec2<f32>,6>(vec2(-1.0,-1.0),vec2(1.0,-1.0),vec2(-1.0,1.0),vec2(-1.0,1.0),vec2(1.0,-1.0),vec2(1.0,1.0));
  let p=corners[vertex];var out:VertexOut;out.position=vec4(p,0.0,1.0);out.uv=vec2(p.x,-p.y)*.5+.5;out.index=instance;return out;
}
fn coverage(distance:f32,aa:f32)->f32{return 1.0-smoothstep(-aa,aa,distance);}
fn flag(flags:f32,bit:u32)->f32{return select(0.0,1.0,(u32(flags)&bit)!=0u);}
struct FormOut {@location(0) body:vec4<f32>,@location(1) emission:vec4<f32>,@location(2) light:vec4<f32>};
@fragment fn fs_form(in:VertexOut)->FormOut {
  let inst=instances[in.index];let tile=i32(globals.size_count.w);
  let coord=clamp(vec2<i32>(in.uv*f32(tile)),vec2(0),vec2(tile-1));
  let permission=textureLoad(permission_masks,coord,i32(in.index),0);
  let allowed=select(0.0,1.0,permission.r>0.999 && permission.a<0.001);
  var out:FormOut;out.body=vec4(0.0);out.emission=vec4(0.0);out.light=vec4(0.0);
  let body_envelope=inst.basis_y_time.w;
  if(allowed==0.0 || body_envelope<=0.0){return out;}
  let p=vec2(in.uv.x*2.0-1.0,1.0-in.uv.y*2.0);
  // H32でも核と肉厚面を残す。AAだけを原寸幅へ適応し、光条/粒子を追加しない。
  let aa=max(.58/max(inst.options.y,1.0),1.0/f32(tile));
  let bevel=max(.027,aa*1.35);
  let body_color=vec3(.68,.19,.075); // 全10種同じpalette。武器識別を色差へ逃がさない。
  let dark_edge=vec3(.052,.019,.017);
  var composed=vec3(0.0);var covered=0.0;
  // 各凸面の内側と接触核を重ねる。前後順はCPUで定義し、核を最後に載せる。
  for(var i=0u;i<12u;i++){
    let shape=geometry[in.index*12u+i];let edges=u32(shape.header.x);
    if(edges<3u){continue;}
    var sd=-100.0;var nearest=vec2(0.0,1.0);
    for(var j=0u;j<8u;j++){
      if(j>=edges){break;}
      let plane=shape.planes[j];let d=dot(plane.xy,p)-plane.z;
      if(d>sd){sd=d;nearest=plane.xy;}
    }
    let c=coverage(sd,aa);
    let interior=1.0-smoothstep(-bevel,-bevel*.16,sd);
    let facet=clamp(.65+.27*nearest.y-.12*nearest.x,.32,1.0);
    // 光源側ほど面の値が上がるが、均一な発光縁/義務的な色相グラデーションにはしない。
    let source_response=.11*inst.energy_shape.x/(1.0+32.0*dot(p,p));
    let paint=body_color*(shape.header.y*(.68+.20*facet)+source_response);
    let rim=body_color*(.22+.34*facet);
    var color=mix(dark_edge,mix(rim,paint,interior),smoothstep(-aa*.15,bevel*.60,-sd));
    // 内側の境界を面として読ませる太い明度段差。核は盛り上がった有色座で、穴ではない。
    color=mix(color,body_color*(1.05+source_response),shape.header.z*interior*.72);
    composed=color*c+composed*(1.0-c);covered=c+covered*(1.0-c);
  }
  let a=covered*body_envelope*flag(inst.options.z,1u);
  out.body=vec4(composed*body_envelope*flag(inst.options.z,1u),a);
  // 中心に留まる短い面発光。全てのvariantでsourceの幾何学的中心はevent x/yそのもの。
  let core_radius=select(.088,.075,inst.profile.y>.5);
  let core_distance=max(max(abs(p.x),abs(p.y))*.88,(abs(p.x)+abs(p.y))*.62)-core_radius;
  let source_shape=coverage(core_distance,aa*.72);
  let source=vec3(2.10,1.55,.32)*source_shape*inst.energy_shape.x;
  out.emission=vec4(source*flag(inst.options.z,2u),source_shape*body_envelope);
  // 受け手が無い/見えないときは照らさない。源の有限放射と同じ包絡で応答する。
  let d2=dot(p,p);let finite_support=1.0-smoothstep(.44,.94,sqrt(d2));
  let transport=finite_support/(1.0+8.0*d2);
  let irradiance=inst.energy_shape.x*transport*permission.g*permission.b*globals.budget.x*flag(inst.options.z,4u)*flag(inst.options.z,2u);
  out.light=vec4(vec3(1.0,.46,.12)*irradiance,0.0);
  return out;
}
