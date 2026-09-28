// world層 PH1。主形・内部の被覆差・境界放射を別量として算出する。
struct Globals { viewport:vec2f, invViewport:vec2f };
struct Instance { anchor:vec2f, scale:f32, age:f32, variant:f32, reduced:f32, seed:f32, pad:f32 };
@group(0) @binding(0) var<uniform> g:Globals;
@group(0) @binding(1) var<storage,read> instances:array<Instance>;
@group(0) @binding(2) var visibility:texture_2d<f32>;
struct VOut { @builtin(position) position:vec4f, @location(0) local:vec2f, @location(1) @interpolate(flat) instance:u32 };
@vertex fn vs(@builtin(vertex_index) vi:u32,@builtin(instance_index) ii:u32)->VOut {
  let corners=array<vec2f,6>(vec2f(-90.,-90.),vec2f(90.,-90.),vec2f(-90.,90.),vec2f(-90.,90.),vec2f(90.,-90.),vec2f(90.,90.));
  let i=instances[ii];let p=corners[vi];let screen=i.anchor+p*i.scale;
  var o:VOut;o.position=vec4f(screen.x/g.viewport.x*2.-1.,1.-screen.y/g.viewport.y*2.,0.,1.);o.local=p;o.instance=ii;return o;
}
fn ss(a:f32,b:f32,x:f32)->f32{return smoothstep(a,b,x);}
fn ellipse(p:vec2f,r:vec2f)->f32{return (length(p/r)-1.)*min(r.x,r.y);}
fn capsule(p:vec2f,a:vec2f,b:vec2f,r:f32)->f32{let pa=p-a;let ba=b-a;return length(pa-ba*clamp(dot(pa,ba)/dot(ba,ba),0.,1.))-r;}
fn cover(d:f32,aa:f32)->f32{return 1.-ss(-aa,aa,d);}
struct FOut { @location(0) color:vec4f, @location(1) radiance:vec4f };
@fragment fn fs(i:VOut)->FOut {
  let e=instances[i.instance];let t=e.age;let p=i.local;
  let pixel=vec2i(i.position.xy);let visibilityValue=textureLoad(visibility,pixel,0).r;
  var o:FOut;o.color=vec4f(0.);o.radiance=vec4f(0.);
  if(t<=0.||t>=1.2||visibilityValue<=0.001||length(p)>89.){return o;}
  let aa=max(0.38,0.75/max(e.scale,0.01));
  let moving=1.-e.reduced;
  let settle=ss(0.08,0.65,t)*moving;
  let onset=select(0.085,0.12,e.reduced>0.5);
  var tail=0.72;
  var d=0.;var seamD=0.;var q=vec2f(0.);var density=0.;var opticalWidth=0.6;
  var pigment=vec3f(0.);var bright=vec3f(0.);var inner=vec3f(0.);var luminance=0.35;
  if(e.variant<0.5){
    // mineral-water: 一枚の滑らかな開いた折り膜。左の余白を残して使用側にわずかに畳まれる。
    q=p-vec2f(23.-1.8*settle,-43.+1.1*settle);
    let skew=vec2f(q.x+0.20*q.y,q.y);
    let outer=ellipse(skew,vec2f(9.7-1.0*settle,15.8));
    let cut=ellipse(skew-vec2f(-3.4,-0.6),vec2f(6.8,11.4));
    d=max(outer,-cut);
    // 一つの内側折り目。別の飛翔滴、輪、回復粒子にはしない。
    seamD=abs(q.x-(3.3-0.12*q.y+0.65*sin(q.y*0.14)))-0.48;
    density=ss(-12.,10.,q.y)*0.55+0.25;
    pigment=mix(vec3f(0.022,0.105,0.27),vec3f(0.028,0.40,0.53),ss(-11.,13.,q.y));
    inner=vec3f(0.12,0.51,0.64);bright=vec3f(0.50,0.83,0.91);opticalWidth=0.62;luminance=0.39;
  }else if(e.variant<1.5){
    // seawater: 弱彩度の折れた膜と二つの短い切れ目。祝福の放射・上昇を持たない。
    q=p-vec2f(24.-0.6*settle,-42.+1.6*settle);
    let skew=vec2f(q.x-0.11*q.y,q.y);
    let kink=0.68*abs(q.y+1.)-2.8;
    d=max(abs(skew.x)-max(2.3,7.2-0.18*abs(q.y)),abs(q.y)-14.6);
    d=max(d,-max(abs(q.x+4.5)-2.2,abs(q.y+2.)-9.3));
    let slotA=max(abs(q.x-1.0)-3.5,abs(q.y+4.1)-0.92);
    let slotB=max(abs(q.x-0.1)-3.0,abs(q.y-3.6)-0.92);
    d=max(d,-min(slotA,slotB));
    seamD=abs(q.x-1.4-0.12*kink)-0.46;
    density=0.68+0.11*ss(-12.,12.,q.y);
    pigment=mix(vec3f(0.070,0.10,0.135),vec3f(0.24,0.31,0.34),ss(-14.,14.,q.y));
    inner=vec3f(0.33,0.40,0.43);bright=vec3f(0.63,0.65,0.60);opticalWidth=0.52;luminance=0.22;tail=0.64;
  }else{
    // antidote: 細い計量折り。中央のくびれが局所へ閉じる。毒を消す像は持たない。
    q=p-vec2f(23.-1.2*settle,-44.+0.45*settle);
    let y=abs(q.y);
    let w=2.0+4.9*ss(0.0,11.8,y);
    d=max(abs(q.x+0.10*q.y)-w,y-13.6);
    let slit=max(abs(q.x+0.10*q.y+0.1)-0.82,abs(q.y)-10.0);
    d=max(d,-slit);
    seamD=min(abs(q.y+7.6),abs(q.y-7.6))-0.43;
    density=0.58+0.24*ss(0.,12.,y);
    pigment=mix(vec3f(0.15,0.045,0.080),vec3f(0.55,0.23,0.050),ss(-11.,13.,q.y));
    inner=vec3f(0.60,0.32,0.073);bright=vec3f(0.94,0.69,0.30);opticalWidth=0.57;luminance=0.34;tail=0.57;
  }
  let envelope=ss(0.,onset,t)*(1.-ss(tail,1.2,t));
  let bodyCoverage=cover(d,aa);
  let rim=cover(abs(d)-opticalWidth,aa)*bodyCoverage;
  let seam=cover(seamD,aa)*bodyCoverage*0.55;
  // coverage, density, radianceを混同しない。暗い膜もalphaで残る。
  let alpha=bodyCoverage*(0.50+0.28*density)*envelope*visibilityValue;
  let phase=0.72+0.28*(1.-ss(0.18,0.58,t));
  let emission=(rim*0.80+seam*0.22)*luminance*phase*envelope*visibilityValue;
  let diffuse=pigment*(0.84+0.16*ss(-14.,13.,q.y));
  let color=mix(diffuse,inner,seam*0.42);
  o.color=vec4f(color*alpha+bright*emission,alpha);
  o.radiance=vec4f(bright*emission,emission);
  return o;
}
