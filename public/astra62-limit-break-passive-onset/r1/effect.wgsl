struct Params {
  size: vec2f, age: f32, scale: f32,
  reduced: f32, live: f32, pad: vec2f,
}
@group(0) @binding(0) var<uniform> u: Params;
@vertex fn vs(@builtin(vertex_index) k: u32) -> @builtin(position) vec4f {
  let tri=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));
  return vec4f(tri[k],0,1);
}
fn box(p: vec2f, e: vec2f, r: f32) -> f32 {
  let d=abs(p)-e+r;
  return length(max(d,vec2f(0)))+min(max(d.x,d.y),0.)-r;
}
fn mask(d: f32, aa: f32) -> f32 { return 1.-smoothstep(-aa,aa,d); }
fn stroke(p: vec2f, a: vec2f, b: vec2f) -> f32 {
  let ab=b-a;
  return length(p-a-ab*clamp(dot(p-a,ab)/dot(ab,ab),0.,1.));
}
fn heart(p: vec2f) -> f32 {
  let lobe=length(vec2f(abs(p.x)-3.9,p.y+2.5))-5.35;
  let point=(abs(p.x)+abs(p.y-.2)-8.7)*.7071;
  return min(lobe,point);
}
@fragment fn fs(@builtin(position) at: vec4f) -> @location(0) vec4f {
  let bg=vec3f(.056,.075,.087);
  if (u.live<.5) {return vec4f(bg,1);}
  let p=(at.xy-.5*u.size)/u.scale;
  let aa=.62/u.scale;
  let t=u.age;
  let iron=vec3f(.30,.33,.33);
  let inner=vec3f(.11,.14,.15);
  let warm=vec3f(.95,.52,.32);
  var ink=mix(bg,iron,mask(box(p-vec2f(-36,4),vec2f(46,22),6.),aa));
  ink=mix(ink,inner,mask(box(p-vec2f(-36,4),vec2f(43,19),4.),aa));
  for (var i=0; i<2; i++) {
    let x=-61.+32.*f32(i);
    let q=p-vec2f(x,4.);
    let well=mask(box(q,vec2f(13,14),2.5),aa);
    ink=mix(ink,vec3f(.29,.18,.17),well);
    ink=mix(ink,warm,mask(heart(q),aa));
    if (i==1) {
      let drop=mix(smoothstep(138.,425.,t),smoothstep(380.,425.,t),u.reduced);
      let edge=mix(-16.,16.,drop);
      let cover=well*smoothstep(-aa,aa,edge-q.y);
      let steel=mix(vec3f(.40,.44,.43),vec3f(.24,.28,.28),clamp((q.y+14.)/28.,0.,1.));
      ink=mix(ink,steel,cover);
      let seam=1.-smoothstep(.3-aa,.8+aa,abs(q.y-edge+2.3));
      ink=mix(ink,vec3f(.66,.68,.62),seam*cover);
    }
  }
  // The scale is deliberately unitless; the needle marks the start of growth.
  let q=p-vec2f(37.,3.);
  let dist=length(q);
  ink=mix(ink,iron,mask(dist-34.,aa));
  ink=mix(ink,vec3f(.83,.78,.64),mask(dist-31.,aa));
  let pivot=vec2f(0.,6.);
  let printInk=vec3f(.18,.23,.24);
  for (var i=0; i<7; i++) {
    let a=-2.54+.321*f32(i);
    let ray=vec2f(cos(a),sin(a));
    ink=mix(ink,printInk,mask(stroke(q,pivot+ray*23.,pivot+ray*27.)-.8,aa));
  }
  let progress=mix(smoothstep(425.,850.,t),smoothstep(425.,495.,t),u.reduced);
  let angle=-2.54+.84*progress;
  let dir=vec2f(cos(angle),sin(angle));
  ink=mix(ink,vec3f(.59,.17,.12),mask(stroke(q,pivot-dir*4.,pivot+dir*24.)-1.45,aa));
  ink=mix(ink,printInk,mask(length(q-pivot)-3.8,aa));
  let opacity=smoothstep(0.,70.,t)*(1.-smoothstep(1090.,1310.,t));
  return vec4f(mix(bg,ink,opacity),1.);
}
