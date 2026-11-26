struct View {
  size: vec2f,
  ageMs: f32,
  scale: f32,
  reduced: f32,
  activeFlag: f32,
  showOwner: f32,
  pad: f32,
  owner: vec2f,
  reserved: vec2f,
}
@group(0) @binding(0) var<uniform> view: View;

@vertex fn vs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
  var v = array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));
  return vec4f(v[i],0,1);
}

fn coverage(d: f32, aa: f32) -> f32 {
  return 1.0-smoothstep(-aa,aa,d);
}
fn capsule(p: vec2f, a: vec2f, b: vec2f, radius: f32) -> f32 {
  let e=b-a;
  let u=clamp(dot(p-a,e)/max(dot(e,e),0.001),0.0,1.0);
  return length(p-a-e*u)-radius;
}
fn srgb(c: vec3f) -> vec3f {
  let x=clamp(c,vec3f(0),vec3f(1));
  return select(12.92*x,1.055*pow(x,vec3f(1.0/2.4))-vec3f(0.055),x>vec3f(0.0031308));
}

fn scene(screen: vec2f) -> vec3f {
  var color=vec3f(0.014,0.023,0.034);
  if (view.showOwner<0.5) { return color; }
  let p=(screen-view.size*0.5)/view.scale-view.owner;
  let aa=0.65/view.scale;
  let head=length(p-vec2f(0,-5))-4.3;
  let shoulders=capsule(p,vec2f(-4,5),vec2f(4,5),4.0);
  color=mix(color,vec3f(0.19,0.25,0.29),coverage(min(head,shoulders),aa));
  let t=view.ageMs;
  if (view.activeFlag<0.5 || t>=940.0) { return color; }

  let q=p-vec2f(0,-32);
  let glide=smoothstep(0.0,245.0,t);
  let reduce=clamp(view.reduced,0.0,1.0);
  let gateX=10.0-0.43*q.y;
  let right=gateX-3.1-(1.0-glide)*mix(18.0,3.0,reduce);
  let left=right-mix(15.0,28.0,glide);
  let laneY=abs(abs(q.y)-4.8);
  let ribbon=max(laneY-2.1,max(left-q.x,q.x-right));
  let laneAlpha=smoothstep(0.0,105.0,t)*(1.0-smoothstep(510.0,780.0,t));
  let bands=coverage(ribbon,aa)*laneAlpha;

  let strike=smoothstep(142.0,245.0,t);
  let postA=vec2f(3.55,15.0);
  let postB=vec2f(16.45,-15.0);
  let edge=mix(postA,postB,strike);
  let slash=capsule(q,postA,edge,2.85);
  let endAlpha=smoothstep(142.0,190.0,t)*(1.0-smoothstep(640.0,920.0,t));
  let post=coverage(slash,aa)*endAlpha;

  // Finite emitting face inset toward the brass; it ends with the grown segment.
  let inset=0.85*normalize(vec2f(1.0,0.43));
  let axisDist=capsule(q,postA-inset,edge-inset,0.0);
  let core=1.0-smoothstep(1.0,2.0,axisDist);
  let seat=smoothstep(218.0,245.0,t)*(0.56+0.44*exp(-max(t-245.0,0.0)/72.0));
  let radiance=vec3f(0.49,0.245,0.078)*seat;

  // Compact display-plane transfer from that same finite source. No field is
  // composited by itself: only existing band material can return this light.
  let fromCore=max(axisDist-1.0,0.0);
  let coupling=1.0-smoothstep(1.0,13.0,fromCore);
  let received=radiance*endAlpha*coupling*vec3f(0.94,0.82,0.44);
  let lip=1.0-smoothstep(0.3,1.4,abs(laneY-1.65));
  let brass=vec3f(0.395,0.275,0.140)+vec3f(0.080,0.057,0.024)*lip;
  color=mix(color,brass+received,bands);
  let vermilion=vec3f(0.50,0.087,0.040);
  color=mix(color,vermilion+radiance*core,post);
  return color;
}

@fragment fn fs(@builtin(position) screen: vec4f) -> @location(0) vec4f {
  return vec4f(srgb(scene(screen.xy)),1);
}
