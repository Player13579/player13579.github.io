struct View {
  size:vec2f, ageMs:f32, scale:f32, reduced:f32, activeFlag:f32, slot:f32, pad:f32,
}
@group(0) @binding(0) var<uniform> view:View;
@vertex fn vs(@builtin(vertex_index) i:u32)->@builtin(position) vec4f {
  let v=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3)); return vec4f(v[i],0,1);
}
fn srgb(c:vec3f)->vec3f {
  let x=clamp(c,vec3f(0),vec3f(1));
  return select(12.92*x,1.055*pow(x,vec3f(1.0/2.4))-vec3f(0.055),x>vec3f(0.0031308));
}
fn cov(d:f32,aa:f32)->f32 { return 1.0-smoothstep(-aa,aa,d); }
fn rounded(p:vec2f,h:vec2f,r:f32)->f32 {
  let d=abs(p)-h+vec2f(r); return length(max(d,vec2f(0)))+min(max(d.x,d.y),0.0)-r;
}
fn distLine(p:vec2f,a:vec2f,b:vec2f)->f32 {
  let e=b-a;return length(p-a-e*clamp(dot(p-a,e)/max(dot(e,e),0.00001),0.0,1.0));
}
@fragment fn fs(@builtin(position) screen:vec4f)->@location(0) vec4f {
  let p=(screen.xy-view.size*0.5)/view.scale;
  let aa=0.66/view.scale;
  let isRight=p.x>=0.0;
  let local=p-vec2f(select(-34.0,34.0,isRight),0.0);
  let body=rounded(local,vec2f(18,22),4.0);
  let inner=rounded(local,vec2f(16.8,20.8),3.4);
  var color=mix(vec3f(0.013,0.021,0.032),vec3f(0.25,0.32,0.40),cov(body,aa));
  color=mix(color,vec3f(0.055,0.081,0.116),cov(inner,aa));
  let chevron=min(distLine(local,vec2f(-7,3),vec2f(0,-4.5)),distLine(local,vec2f(0,-4.5),vec2f(7,3)));
  let glyph=select(chevron,abs(length(local)-6.25),isRight);
  color=mix(color,vec3f(0.47,0.59,0.69),cov(glyph-1.55,aa));
  if(view.activeFlag<0.5 || view.ageMs>=1070.0) {return vec4f(srgb(color),1);}
  let q=p-vec2f(select(-34.0,34.0,view.slot>0.5),0);
  let t=view.ageMs;
  let alpha=smoothstep(20.0,113.0,t)*(1.0-smoothstep(801.0,1045.0,t));
  let close=smoothstep(55.0,412.0,t);
  let gap=(1.0-close)*mix(12.0,2.5,view.reduced);
  let side=abs(q.x);
  // Both jaws seat against opposite edges of one card. Their lower rebates accept the locking tab.
  let leftTip=17.4+gap;
  let outer=21.2+gap;
  let flank=rounded(vec2f(side-outer,q.y-2.0),vec2f(2.25,15.0),1.6);
  let topLip=distLine(vec2f(side,q.y),vec2f(leftTip,-12.8),vec2f(outer,-12.8))-2.15;
  let bottomLip=distLine(vec2f(side,q.y),vec2f(leftTip-1.4,16.6),vec2f(outer,16.6))-2.15;
  let jaw=min(flank,min(topLip,bottomLip));
  let bevel=clamp((outer+2.0-side)*0.34,0.0,1.0);
  let metal=mix(vec3f(0.19,0.29,0.53),vec3f(0.50,0.63,0.89),bevel);
  color=mix(color,metal,cov(jaw,aa)*alpha);
  let lock=smoothstep(315.0,412.0,t);
  let tabPoint=vec2f(q.x,q.y-(16.6+mix(5.5,1.4,view.reduced)*(1.0-lock)));
  let tab=rounded(tabPoint,vec2f(17.2,2.05),1.3);
  let contact=smoothstep(389.0,412.0,t)*exp(-max(0.0,t-412.0)/78.0);
  color=mix(color,vec3f(0.43,0.49,0.70)+contact*vec3f(0.31,0.24,0.10),cov(tab,aa)*alpha*lock);
  // The mark is mounted below the card, leaving both registered candidate emblems legible.
  let mark=q-vec2f(0,28);
  let a=vec2f(-5.7,-0.8);
  let b=vec2f(-1.3,3.4);
  let c=vec2f(6.5,-4.2);
  let one=smoothstep(412.0,456.0,t);
  let two=smoothstep(456.0,529.0,t);
  let tick=min(distLine(mark,a,mix(a,b,one)),distLine(mark,b,mix(b,c,two))+20.0*(1.0-step(0.001,two)));
  color=mix(color,vec3f(0.94,0.59,0.26),cov(tick-1.65,aa)*alpha*one);
  return vec4f(srgb(color),1);
}
