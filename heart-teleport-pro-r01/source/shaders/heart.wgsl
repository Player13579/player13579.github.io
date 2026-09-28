// 独立設計：PH1=閉じた二葉状張力膜と弁、PH2=内向きの脈芯。
// 対象座標、BODY、テクスチャ、乱数、ポータル輪を入力しない。
struct Params {
  view: vec4f,       // viewport physical px, caster center physical px
  time: vec4f,       // age seconds, reduced motion, H physical px, pixel ratio
  options: vec4f,    // glow enable, shared intensity scale, layer filter (0 all, 1 PH1, 2 PH2), unused
};
@group(0) @binding(0) var<uniform> u: Params;
struct VOut { @builtin(position) position: vec4f, @location(0) p: vec2f };
@vertex fn vs(@builtin(vertex_index) i:u32)->VOut {
  let corners = array<vec2f,6>(vec2f(-1,-1),vec2f(1,-1),vec2f(-1,1),vec2f(-1,1),vec2f(1,-1),vec2f(1,1));
  let p=corners[i];
  let pixel=u.view.zw+p*u.time.z*0.5;
  var o:VOut;
  o.position=vec4f(pixel.x/u.view.x*2.0-1.0,1.0-pixel.y/u.view.y*2.0,0,1);
  o.p=p;return o;
}
fn ease(a:f32,b:f32,x:f32)->f32 {return smoothstep(a,b,x);}
fn cubic(a:vec2f,b:vec2f,c:vec2f,d:vec2f,t:f32)->vec2f {
  let s=1.0-t;return a*s*s*s+3.0*b*s*s*t+3.0*c*s*t*t+d*t*t*t;
}
fn edgeDistance(p:vec2f,a:vec2f,b:vec2f)->f32 {
  let v=b-a;let h=clamp(dot(p-a,v)/max(dot(v,v),0.0000001),0.0,1.0);return length(p-a-v*h);
}
// 4本の独自Bezier輪郭から符号付き距離を求める。2D private fieldの厚み・陰面は下の応答で表す。
fn chamberBoundary(p:vec2f)->f32 {
  let starts=array<vec2f,4>(vec2f(0,-0.24),vec2f(-0.62,-0.10),vec2f(0.03,0.66),vec2f(0.56,-0.18));
  let c1=array<vec2f,4>(vec2f(-0.13,-0.70),vec2f(-0.63,0.14),vec2f(0.24,0.42),vec2f(0.52,-0.64));
  let c2=array<vec2f,4>(vec2f(-0.71,-0.67),vec2f(-0.21,0.48),vec2f(0.62,0.12),vec2f(0.18,-0.65));
  var distance=10.0;var inside=false;
  for(var s=0u;s<4u;s++){
    let a=starts[s];let end=starts[(s+1u)%4u];var last=a;
    for(var j=1u;j<=12u;j++){
      let v=cubic(a,c1[s],c2[s],end,f32(j)/12.0);
      distance=min(distance,edgeDistance(p,last,v));
      if((last.y>p.y)!=(v.y>p.y)){
        let crossX=(v.x-last.x)*(p.y-last.y)/(v.y-last.y)+last.x;
        if(p.x<crossX){inside=!inside;}
      }
      last=v;
    }
  }
  return select(distance,-distance,inside);
}
// 距離と曲線上の局所座標。流れの向きは脈室内だけに定義する。
fn valveCurve(p:vec2f,side:f32,closing:f32)->vec2f {
  let a=vec2f(side*0.37,-0.27);
  let b=vec2f(side*(0.25-0.10*closing),-0.16);
  let c=vec2f(-side*0.06,0.12);
  let d=vec2f(0.02,0.44);
  var nearest=10.0;var along=0.0;var last=a;
  for(var j=1u;j<=14u;j++){
    let v=cubic(a,b,c,d,f32(j)/14.0);let e=v-last;
    let h=clamp(dot(p-last,e)/max(dot(e,e),0.000001),0.0,1.0);
    let dist=length(p-last-h*e);
    if(dist<nearest){nearest=dist;along=(f32(j)-1.0+h)/14.0;}
    last=v;
  }
  return vec2f(nearest,along);
}
struct Field { density:f32, coverage:f32, emission:vec3f, glow:vec3f };
fn worldField(point:vec2f,t:f32,reduced:bool)->Field {
  let presence=ease(0.0,0.17,t)*(1.0-ease(1.23,1.8,t));
  let action=ease(0.43,0.66,t)*(1.0-ease(0.85,1.14,t));
  let closePhase=ease(0.2,0.86,t);
  let scale=select(1.22*(1.0-0.055*action),1.22,reduced);
  let p=point/scale;
  let closing=select(closePhase,0.55,reduced);
  let d=chamberBoundary(p);
  let px=2.0/max(u.time.z,1.0)/scale;
  let inside=1.0-ease(-px*0.7,px*0.7,d);
  let rim=exp(-pow(d/(px*0.8),2.0));
  let left=valveCurve(p,-1.0,closing);
  let right=valveCurve(p,1.0,closing);
  let valve=min(left.x,right.x);
  let ridge=exp(-pow(valve/(px*0.85),2.0))*inside;
  // 密度と不透明度は別量。内縁に密度が集まり、中心は透過して空洞を読ませる。
  let wallDensity=(0.26+0.49*exp(d*11.0)+0.17*ease(-0.12,0.52,p.y))*inside;
  let coverage=(1.0-exp(-wallDensity*1.5))*presence;
  let foldOcclusion=1.0-0.40*ridge*ease(-0.02,0.25,p.y);
  let corePoint=(p-vec2f(0.012,0.12))/vec2f(0.16,0.30);
  let coreShape=exp(-dot(corePoint,corePoint)*1.75)*inside;
  let coreEnvelope=ease(0.24,0.54,t)*(1.0-ease(0.98,1.51,t));
  let flowCenter=select(0.12+0.80*ease(0.10,0.81,t),0.56,reduced);
  let flowL=exp(-pow((left.y-flowCenter)/0.22,2.0))*exp(-pow(left.x/(px*0.65),2.0));
  let flowR=exp(-pow((right.y-flowCenter)/0.24,2.0))*exp(-pow(right.x/(px*0.65),2.0))*0.63;
  let flow=(flowL+flowR)*inside*coreEnvelope;
  let seam=exp(-pow((p.x-0.014)/(px*0.55),2.0))*ease(-0.17,-0.04,p.y)*(1.0-ease(0.30,0.44,p.y))*inside;
  // PH1: 深い葡萄色の膜、下側は吸収優勢。発光色とcoverageを混同しない。
  let ruby=vec3f(0.46,0.012,0.072);
  let coral=vec3f(1.0,0.13,0.16);
  let ivory=vec3f(1.0,0.77,0.49);
  let membraneBase=vec3f(0.095,0.0035,0.025)*coverage;
  let rimRadiance=(ruby*0.40+coral*0.33)*rim*(0.35+0.52*action*coreEnvelope)*presence;
  let valveRadiance=mix(coral,ivory,ease(0.37,0.66,t))*ridge*(0.10+0.18*coreEnvelope)*presence;
  // PH2: 弁の内側へ束縛された放射。中央を白い塊にせず心尖と切れ込みを残す。
  let coreRadiance=ivory*(coreShape*(0.30+1.32*action)*coreEnvelope+seam*0.62*action)*foldOcclusion*presence;
  let flowRadiance=mix(coral,ivory,0.67)*flow*0.74*presence;
  let layer1=select(1.0,0.0,u.options.z==2.0);
  let layer2=select(1.0,0.0,u.options.z==1.0);
  // OBS1: 既存境界放射のsource-bound PSF近似。wide haloや新規形状を作らない。
  let rimPSF=exp(-pow(d/(px*2.2),2.0))*0.095;
  let valvePSF=exp(-pow(valve/(px*2.0),2.0))*inside*0.065;
  let outsideCore=exp(-dot(corePoint,corePoint)*0.65)*inside*0.055*coreEnvelope;
  var field:Field;
  field.density=wallDensity;
  field.coverage=coverage*layer1;
  field.emission=(membraneBase+rimRadiance+valveRadiance)*layer1+(coreRadiance+flowRadiance)*layer2;
  field.glow=(coral*rimPSF*layer1*(0.35+action)+ivory*(valvePSF+outsideCore)*layer2)*presence;
  return field;
}
@fragment fn fs(i:VOut)->@location(0) vec4f {
  let t=u.time.x;
  if(t<0.0 || t>=1.8){return vec4f(0);}
  let f=worldField(i.p,t,u.time.y>0.5);
  let color=f.emission+f.glow*u.options.x;
  // OBS2: 肩で局所放射を圧縮。coverage+放射の合成alpha、premultipliedで黒縁を避ける。
  let mapped=vec3f(1.0)-exp(-color*1.28*u.options.y);
  let alpha=clamp(max(f.coverage*u.options.y,max(mapped.r,max(mapped.g,mapped.b))),0.0,0.96);
  if(alpha<0.0001){return vec4f(0);}
  // sRGB view attachmentが線形blend後にtransferを行う。shaderで二重encodeしない。
  return vec4f(min(mapped,vec3f(alpha)),alpha);
}
