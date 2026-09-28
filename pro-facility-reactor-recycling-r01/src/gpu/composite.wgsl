// OBS2: 共有表示変換。HDRの入力強度を保持して肩を圧縮する。Eごとの源を弱く書き換えない。
@group(0) @binding(0) var radiance:texture_2d<f32>;
struct Fullscreen { @builtin(position) position:vec4f }
@vertex fn vs(@builtin(vertex_index) index:u32)->Fullscreen{
  let p=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));var out:Fullscreen;out.position=vec4f(p[index],0,1);return out;
}
fn encodeSRGB(x:vec3f)->vec3f{
  return select(12.92*x,1.055*pow(max(x,vec3f(0)),vec3f(1.0/2.4))-.055,x>vec3f(.0031308));
}
@fragment fn fs(in:Fullscreen)->@location(0) vec4f{
  let scene=max(textureLoad(radiance,vec2i(in.position.xy),0).rgb,vec3f(0));
  let y=dot(scene,vec3f(.2126,.7152,.0722));
  // 低輝度の背景はidentity。0.75から始まる連続な肩で高輝度だけを圧縮する。
  let mapped=select(y,.75+.25*(1-exp(-(y-.75)/.25)),y>.75);
  var color=scene*(mapped/max(y,.00001));
  let maximum=max(max(color.r,color.g),color.b);
  if(maximum>1){color=vec3f(mapped)+(color-vec3f(mapped))*((1-mapped)/max(maximum-mapped,.00001));}
  return vec4f(clamp(encodeSRGB(color),vec3f(0),vec3f(1)),1);
}
