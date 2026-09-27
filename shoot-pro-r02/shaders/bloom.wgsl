// OBS1: 高輝度の可視源だけを入力とする、有限支持の局所拡散。
struct Params { size:vec2u, direction:vec2i, radius:f32, threshold:f32, pad:vec2f };
@group(0) @binding(0) var<uniform> p:Params;
@group(0) @binding(1) var inputTex:texture_2d<f32>;
@group(0) @binding(2) var outputTex:texture_storage_2d<rgba16float,write>;
@compute @workgroup_size(8,8) fn cs(@builtin(global_invocation_id) gid:vec3u){
  if(any(gid.xy>=p.size)){return;}
  let pixel=vec2i(gid.xy);var sum=vec3f(0);var norm=0.0;
  for(var k=-6;k<=6;k++){
    let weight=exp(-f32(k*k)/11.0);
    let offset=i32(round(f32(k)*p.radius/6.0));
    let pos=pixel+p.direction*offset;
    if(all(pos>=vec2i(0))&&all(pos<vec2i(p.size))){
      let v=textureLoad(inputTex,pos,0).xyz;
      // 第一段だけ閾値を適用。黒い不透明領域に加算光を発生させない。
      let peak=max(v.x,max(v.y,v.z));
      let gain=select(1.0,max(peak-p.threshold,0.0)/max(peak,0.00001),p.threshold>0.0);
      sum+=v*gain*weight;
    }
    norm+=weight;
  }
  textureStore(outputTex,pixel,vec4f(sum/norm,1));
}
