// 診断専用。ゲームのキャラクター、床、銃口、既存Eではない。
struct FixtureOut { @location(0) scene: vec4f, @location(1) mask: vec4f };
@fragment fn backgroundFragment(i: FullOut) -> FixtureOut {
  let light = i.position.x >= g.size.x * .5;
  var bg = vec3f(.008,.014,.024);
  if (light) { bg = vec3f(.76,.80,.83); }
  // 分割線はプレビューの表示枠だけ。世界内PHとして扱わない。
  if (abs(i.position.x-g.size.x*.5)<g.size.z || abs(i.position.y-g.size.y*.43)<g.size.z) {
    bg = vec3f(.065,.09,.12);
  }
  var out: FixtureOut; out.scene=vec4f(bg,1.); out.mask=vec4f(0.); return out;
}
@fragment fn fixtureFragment(i: VertexOut) -> FixtureOut {
  let inst=instances[i.index];
  if (clipped(i.position.xy,inst.clip) || inst.flags.z<.5) { discard; }
  let p=i.local;
  let aa=.65/max(inst.geom.z,.1);
  let body=coverage(capsule(p,vec2f(0.,-21.),vec2f(0.,21.),11.),aa);
  let right=clamp(p.x/22.+.5,0.,1.);
  var color=mix(vec3f(.032,.054,.081),vec3f(.115,.17,.22),right);
  // 二つの面と幅の異なる境界により、輪郭と受光部の違いを読ませる。
  let centerPanel=coverage(capsule(p,vec2f(-1.,-13.),vec2f(-1.,13.),5.),aa);
  color=mix(color,vec3f(.20,.25,.29),centerPanel*.43);
  let edge=body*(1.-coverage(capsule(p,vec2f(0.,-21.),vec2f(0.,21.),10.2),aa));
  color+=edge*vec3f(.15,.18,.20);
  let protectedRegion=body*max(1.-smoothstep(-19.,-12.,p.y),smoothstep(22.,26.,p.y));
  var occ=0.;
  if (inst.flags.y>.5) { occ=coverage(max(abs(p.x-20.)-12.,abs(p.y)-35.),aa); }
  let total=max(body,occ);
  if (total<=.0001) { discard; }
  var out: FixtureOut;
  let sceneColor=mix(color,vec3f(.14,.12,.16),occ);
  out.scene=vec4f(sceneColor*total,total);
  // R=対象全輪郭、G=前景遮蔽、B=保護領域、A=書き込みcoverage
  out.mask=vec4f(body,occ,protectedRegion,total);
  return out;
}
