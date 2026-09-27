// OBS2: source-over、受光、放射、有限bloomの順。linear計算→sRGB出力。
struct Params { values:vec4f };
@group(0) @binding(0) var<uniform> p:Params;
@group(0) @binding(1) var scene:texture_2d<f32>;
@group(0) @binding(2) var body:texture_2d<f32>;
@group(0) @binding(3) var emission:texture_2d<f32>;
@group(0) @binding(4) var light:texture_2d<f32>;
@group(0) @binding(5) var bloom:texture_2d<f32>;
@group(0) @binding(6) var protect:texture_2d<f32>;
@vertex fn vs(@builtin(vertex_index) vi:u32)->@builtin(position) vec4f {
  let v=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3))[vi];return vec4f(v,0,1);
}
fn srgbToLinear(v:vec3f)->vec3f{return select(v/12.92,pow((v+0.055)/1.055,vec3f(2.4)),v>vec3f(0.04045));}
fn linearToSrgb(v:vec3f)->vec3f{return select(v*12.92,1.055*pow(max(v,vec3f(0)),vec3f(1.0/2.4))-0.055,v>vec3f(0.0031308));}
@fragment fn fs(@builtin(position) pos:vec4f)->@location(0) vec4f {
  let xy=vec2i(pos.xy);let base=srgbToLinear(textureLoad(scene,xy,0).xyz);
  let b=textureLoad(body,xy,0);let illumination=textureLoad(light,xy,0).xyz;
  let e=textureLoad(emission,xy,0).xyz;
  let protectedCoverage=textureLoad(protect,xy,0).x;
  let rawHalo=textureLoad(bloom,xy,0).xyz*p.values.x*(1.0-protectedCoverage);
  // OBS1/OBS2: 本体coverageは源の輝度とは別の保護入力。光は外側へ、形の内側は漂白しない。
  let bodyProtection=1.0-0.94*smoothstep(0.05,0.80,b.a);
  // 有限blur後の局所露出容量。明背景では光の飽和域だけを圧縮し、色・源・背景を暗化しない。
  let sceneLuma=dot(base,vec3f(0.2126,0.7152,0.0722));
  let capacity=mix(0.30,0.075,smoothstep(0.18,0.72,sceneLuma));
  let haloPeak=max(rawHalo.x,max(rawHalo.y,rawHalo.z));
  let halo=rawHalo*(bodyProtection/(1.0+haloPeak/capacity));
  // 既存albedoに依存した反射入力を、残る表示headroomの82%以内へ圧縮。
  // 明背景の受光をhard clipで白い円盤にせず、源が0なら背景は厳密に不変。
  let reflected=base*min(illumination,vec3f(12.0));
  let headroom=vec3f(1.0)-base;
  // 一つのscalar肩で受光の色比を保つ。RGBを別々に飽和させて白い暈へ変えない。
  let normalizedLight=reflected/max(headroom,vec3f(0.05));
  let lightPeak=max(normalizedLight.x,max(normalizedLight.y,normalizedLight.z));
  let lightShoulder=(1.0-exp(-lightPeak))/max(lightPeak,0.00001);
  let lit=base+headroom*0.82*normalizedLight*lightShoulder;
  let under=lit*(1.0-b.a)+b.xyz;
  // 光量増加のみ有限の肩で圧縮。源がゼロなら背景を保存。
  let added=e+halo;
  let mapped=vec3f(1.0)-(vec3f(1.0)-clamp(under,vec3f(0),vec3f(1)))*exp(-added*0.63);
  return vec4f(linearToSrgb(mapped),1);
}
