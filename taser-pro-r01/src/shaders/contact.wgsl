@group(0) @binding(2) var targetMask: texture_2d<f32>;
struct ContactOut { @location(0) material: vec4f, @location(1) emission: vec4f };

// PH1: 接触ラッチ。填充された三日月状の厚み・内部の帯・内向き境界を持つ。
// 発射方向、飛翔、実電極、痙攣、解除の瞬間は生成しない。
@fragment fn contactFragment(i: VertexOut) -> ContactOut {
  let inst=instances[i.index]; let t=inst.geom.w;
  var out: ContactOut; out.material=vec4f(0.); out.emission=vec4f(0.);
  if (clipped(i.position.xy,inst.clip) || t<0. || t>=1.2 || inst.flags.w<.5 || g.options.x<.5) { return out; }
  let mask=textureLoad(targetMask,vec2i(i.position.xy),0);
  let aa=.65/max(inst.geom.z,.1);
  let p=i.local-vec2f(0.,2.);
  let onset=smoothstep(0.,.050,t);
  let fade=1.-smoothstep(.70,1.2,t);
  let envelope=onset*fade;
  let settle=1.-exp(-t*17.);
  var rx=mix(28.5,22.,settle);
  var ry=mix(22.5,18.4,settle);
  if (inst.flags.x>.5) { rx=22.; ry=18.4; }
  let q=p/vec2f(rx,ry);
  let radius=length(q);
  let d=(radius-1.)*18.4;
  let side=1.-smoothstep(.58,.91,abs(q.y)/max(radius,.001));
  let thickness=2.6+1.1*(1.-min(abs(q.y),1.));
  let shell=coverage(abs(d)-thickness,aa)*side;
  // 内部は短い面内ラメラ。独立した粒子・ランダム放射は無い。
  let bandY=abs(fract((p.y+11.)/7.)-.5)*7.;
  let lamella=coverage(bandY-.78,aa)*coverage(abs(d+.4)-(thickness-1.),aa)*side;
  let lamellaTime=smoothstep(.045,.17,t)*(1.-smoothstep(.61,1.15,t));
  let innerRidge=coverage(abs(d+thickness*.57)-.48,aa)*side;
  let exterior=coverage(abs(d-thickness*.70)-.85,aa)*side;
  // PH2の既存対象表面。contactMaskが無ければこの反応もゼロ。
  let pair=abs(p.x);
  let padDistance=capsule(vec2f(pair,p.y),vec2f(10.,-6.3),vec2f(10.,6.3),2.0);
  let pad=coverage(padDistance,aa)*mask.r;
  // 外殻から接触部まで連続する先細りの面。孤立した浮遊輪にしない。
  let jawDistance=max(max(10.-pair,pair-23.),abs(p.y)-(2.2+.37*(pair-10.)));
  let jaw=coverage(jawDistance,aa);
  let jawRidge=coverage(abs(jawDistance)-.42,aa)*jaw;
  let shoulder=exp(-pow((pair-10.)/5.,2.)-pow(p.y/12.,2.))*mask.r;
  let contactTime=smoothstep(0.,.030,t)*(1.-smoothstep(.48,.96,t));
  let seam=coverage(abs(p.y-1.8*p.x/11.)-.9,aa)*coverage(pair-11.,aa)*mask.r;
  let seamTime=smoothstep(.07,.14,t)*(1.-smoothstep(.28,.55,t));
  // 背面は対象の後ろ、下側の前面は手前。maskで背面の透けを防ぐ。
  let frontness=smoothstep(-3.,4.,p.y);
  let rearVisibility=(1.-frontness)*(1.-mask.r);
  let frontVisibility=frontness*(1.-mask.b);
  let visibleShell=(rearVisibility+frontVisibility)*(1.-mask.g);
  let protect=(1.-mask.b)*(1.-mask.g);
  let bodyAlpha=clamp((shell*.67+exterior*.20)*envelope*visibleShell+
    (shoulder*.18*g.options.z+jaw*.37)*contactTime*protect,0.,.84);
  // 色は役割にアンカー。深部blue-violet→面cyan→接触点ivory、均等な虹色帯ではない。
  let depth=clamp((d+thickness)/(thickness*2.),0.,1.);
  let carrierColor=mix(vec3f(.018,.025,.12),vec3f(.024,.22,.23),1.-depth);
  let materialColor=mix(carrierColor,vec3f(.010,.018,.025),exterior*.68);
  out.material=vec4f(materialColor*bodyAlpha,bodyAlpha);
  let shellEnergy=(shell*.55+innerRidge*.82)*envelope;
  let lamellaEnergy=lamella*.55*lamellaTime;
  let contactEnergy=(pad*2.8+shoulder*.33)*contactTime+seam*.78*seamTime;
  let cyan=vec3f(.08,1.24,1.32);
  let violet=vec3f(.29,.13,.76);
  let shellLight=mix(violet,cyan,clamp(1.-depth*.82,0.,1.));
  let emission=(shellLight*shellEnergy+cyan*lamellaEnergy)*visibleShell+
    cyan*(jaw*.19+jawRidge*.27)*contactTime*protect+
    (vec3f(2.2,2.05,1.20)*pad*contactTime+cyan*(contactEnergy-pad*2.8*contactTime))*protect*g.options.z;
  // luminous sourceとcoverageは別量。αを放射量として流用しない。
  out.emission=vec4f(max(emission,vec3f(0.)),0.);
  return out;
}
