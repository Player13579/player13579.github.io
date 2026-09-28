// PH1: 一枚の厚い圧縮膜 + 固定接触核。PH2: 可視な既存受光面だけの応答。
// lobesは同じ境界の曲率差。飛翔粒子・弾道・頭部組織の変形ではない。
struct Instance {
  center_axisX:vec4<f32>, axisY_age:vec4<f32>, state:vec4<f32>,
  detail:vec4<f32>, inverse:vec4<f32>, reserved:vec4<f32>
};
struct Globals {viewport:vec4<f32>, controls:vec4<f32>};
@group(0) @binding(0) var<storage,read> instances:array<Instance>;
@group(0) @binding(1) var<uniform> globals:Globals;
@group(0) @binding(2) var visibility:texture_2d_array<f32>;
@group(0) @binding(3) var<storage,read> form:array<vec4<f32>>;
struct VertexOut {
  @builtin(position) position:vec4<f32>, @location(0) uv:vec2<f32>,
  @location(1) @interpolate(flat) effect_index:u32
};
@vertex fn vs_form(@builtin(vertex_index) vi:u32,@builtin(instance_index) ei:u32)->VertexOut {
  let xy=array<vec2<f32>,6>(vec2(-1.,-1.),vec2(1.,-1.),vec2(-1.,1.),vec2(-1.,1.),vec2(1.,-1.),vec2(1.,1.));
  var o:VertexOut;o.position=vec4(xy[vi],0.,1.);o.uv=vec2(xy[vi].x,-xy[vi].y)*.5+vec2(.5);o.effect_index=ei;return o;
}
struct Output {@location(0) body:vec4<f32>,@location(1) emission:vec4<f32>,@location(2) receiver:vec4<f32>};
fn cover(d:f32,aa:f32)->f32{return 1.-smoothstep(-aa,aa,d);}
@fragment fn fs_form(v:VertexOut)->Output {
  var o:Output;o.body=vec4(0.);o.emission=vec4(0.);o.receiver=vec4(0.);
  let inst=instances[v.effect_index];let tile=i32(globals.viewport.w);
  let texel=clamp(vec2<i32>(v.uv*f32(tile)),vec2(0),vec2(tile-1));
  let permission=textureLoad(visibility,texel,i32(v.effect_index),0);
  if(permission.r<.999 || permission.a>.001 || inst.state.x<=0.){return o;}
  let p=vec2(v.uv.x*2.-1.,1.-v.uv.y*2.);
  let growth=.25+.75*inst.state.z;
  let q=p/vec2(growth,form[0].y*growth);
  let r=length(q);let direction=q/vec2(max(r,.00001));
  var rim=form[0].x;var crease=0.;
  for(var j=0u;j<u32(form[0].z);j++){
    let lobe=form[j+1u];
    rim+=lobe.z*pow(max(0.,dot(direction,lobe.xy)),lobe.w);
    // 襞は局所曲率の折返し。方向を共有した幅ある陰部として、ノイズではなく連続面に刻む。
    let cross_axis=direction.x*lobe.y-direction.y*lobe.x;
    let bent=cross_axis+.20*inst.state.w*(r-.28);
    crease+=exp(-52.*bent*bent)*max(0.,dot(direction,lobe.xy));
  }
  let radial=r/max(.01,rim);
  let aa=max(.55/max(inst.detail.z,1.),1./f32(tile));
  let skin=cover((r-rim)*growth,aa);
  let height=sqrt(max(0.,1.-radial*radial));
  let folds=(1.-exp(-crease))*smoothstep(.10,.68,radial);
  let face=.25+.65*height+.22*max(0.,direction.y*.8-direction.x*.6);
  let roll_delta=radial-(.80-.12*inst.state.w);
  let rim_roll=exp(-90.*roll_delta*roll_delta);
  let color=vec3(.018,.165,.60)*(face*(1.-.72*folds)) + vec3(.012,.12,.31)*rim_roll;
  let opacity=.92*skin*inst.state.x; // 薄い有色膜のcoverage。源の放射量とは独立。
  o.body=vec4(color*opacity,opacity);
  // 白飛び回避の減光/上限は無し。中心放射の局所支持は幾何であり、全画面露光処理ではない。
  let core_radius=.060+.025*inst.detail.x;
  let core_q=p/vec2(core_radius*1.03,core_radius*.83);
  let nucleus=exp(-dot(core_q,core_q)*.80)*(1.-smoothstep(.10,.22,length(p)));
  // 発光を円周へ一律に配らず、圧縮の重なる幅ある内側へ置く。輪を主形にしない。
  let directional=.35+.65*max(0.,direction.x*.9+direction.y*.3);
  let internal=skin*pow(folds,1.4)*directional*smoothstep(.15,.38,radial)*(1.-smoothstep(.70,1.,radial));
  let radiance=inst.state.y*(vec3(1.,1.07,1.17)*nucleus+vec3(.015,.19,.62)*internal*.27);
  o.emission=vec4(radiance,skin);
  // 受光は光源と同時。架空の慣性/遅れを与えない。G/Bが0なら新しい面を作らない。
  let dist2=dot(p,p);
  let transport=(1.-smoothstep(.70,1.,sqrt(dist2)))/(1.+45.*dist2);
  let received=inst.state.y*.42*transport*permission.g*permission.b;
  o.receiver=vec4(vec3(.37,.71,1.)*received,0.);
  return o;
}
