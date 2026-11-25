// Local coordinates are CSS-reference pixels. y increases downwards; the slot mouth is y=0.
struct View {
  size: vec2f,
  ageMs: f32,
  scale: f32,
  reduced: f32,
  activeFlag: f32,
  pad: vec2f,
}
@group(0) @binding(0) var<uniform> view: View;
@vertex fn vs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
  let vertices = array<vec2f,3>(vec2f(-1,-1), vec2f(3,-1), vec2f(-1,3));
  return vec4f(vertices[i],0,1);
}
fn rect(p: vec2f, halfSize: vec2f, radius: f32) -> f32 {
  let d = abs(p) - halfSize + vec2f(radius);
  return length(max(d,vec2f(0))) + min(max(d.x,d.y),0.0) - radius;
}
fn cover(distance: f32, aa: f32) -> f32 {
  return 1.0-smoothstep(-aa,aa,distance);
}
fn srgb(linear: vec3f) -> vec3f {
  let x=clamp(linear,vec3f(0),vec3f(1));
  return select(12.92*x,1.055*pow(x,vec3f(1.0/2.4))-0.055,x>vec3f(0.0031308));
}
@fragment fn fs(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let p=(pos.xy-view.size*0.5)/view.scale + vec2f(0,-10);
  let aa=0.70/view.scale;
  let t=view.ageMs;
  let on=view.activeFlag>0.5 && t>=0.0 && t<830.0;
  let fadeIn=smoothstep(0.0,75.0,t);
  let seat=smoothstep(240.0,520.0,t);
  let latch=smoothstep(485.0,555.0,t)*(1.0-smoothstep(565.0,690.0,t));
  let receiver=rect(p-vec2f(0,8),vec2f(47,10),6);
  let mouth=rect(p-vec2f(0,1.5),vec2f(38,3),2.8);
  let base=vec3f(0.011,0.019,0.029);
  var color=base;
  color=mix(color,vec3f(0.031,0.058,0.071)+vec3f(0.022)*clamp((15.0-p.y)/20.0,0.0,1.0),cover(receiver,aa));
  color=mix(color,vec3f(0.055,0.099,0.115),cover(abs(receiver)-0.58,aa));
  color=mix(color,vec3f(0.006,0.010,0.014),cover(mouth,aa));
  if(on) {
    // The plain sheet banks towards the reader, straightens, and disappears behind the mouth.
    let reduced=clamp(view.reduced,0.0,1.0);
    let approach=smoothstep(0.0,235.0,t);
    let centerX=mix(-11.0*(1.0-approach),0.0,reduced);
    let centerY=mix(mix(-51.0,-28.5,approach),-28.5,reduced)+59.0*seat;
    let angle=mix(-0.19*(1.0-approach)+0.055*sin(3.141593*seat),0.0,reduced);
    let stretch=1.0-0.12*sin(3.141593*seat)*(1.0-reduced);
    let delta=p-vec2f(centerX,centerY);
    let q=vec2f(cos(angle)*delta.x+sin(angle)*delta.y,
                 (-sin(angle)*delta.x+cos(angle)*delta.y)/stretch);
    let paper=rect(q,vec2f(18.5,26),1.35);
    // The upper-right corner turns back across a single diagonal: a material cue, not a mark on the ballot.
    let clipCorner=(q.x-q.y-36.2)*0.7071;
    let sheet=cover(max(paper,clipCorner),aa);
    let lipMask=1.0-smoothstep(1.3-aa,1.3+aa,p.y);
    let face=vec3f(0.58,0.69,0.65)+vec3f(0.13,0.12,0.10)*clamp((-q.y+26.0)/52.0,0.0,1.0);
    let folded=smoothstep(27.4-aa,27.4+aa,q.x-q.y);
    let shadow=1.0-0.40*smoothstep(-9.5,1.4,p.y);
    let paperColor=mix(face,vec3f(0.27,0.43,0.42),folded)*shadow;
    color=mix(color,paperColor,fadeIn*sheet*lipMask);
    // Contact light begins where the lower paper edge enters the slot; a pair of leads runs out to its lips.
    let contact=smoothstep(265.0,318.0,t)*(1.0-smoothstep(520.0,605.0,t));
    let scan=10.0+25.0*smoothstep(320.0,540.0,t);
    let front=exp(-pow((abs(p.x)-scan)/5.0,2.0));
    let seated=smoothstep(510.0,573.0,t)*(1.0-smoothstep(610.0,830.0,t));
    let lit=contact*(0.26+0.70*front)+seated*0.77;
    let strip=cover(rect(p-vec2f(0,3.3-1.2*latch),vec2f(35.0,0.9),0.8),aa);
    color+=vec3f(0.21,0.68,0.53)*lit*strip;
    let spill=exp(-abs(p.y-3.1)/3.4)*exp(-pow(max(abs(p.x)-34.0,0.0)/5.0,2.0));
    color+=vec3f(0.035,0.11,0.079)*lit*spill;
  }
  return vec4f(srgb(color),1.0);
}
