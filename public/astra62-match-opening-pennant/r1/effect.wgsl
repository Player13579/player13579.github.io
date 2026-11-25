struct View {
  size:vec2f,ageMs:f32,scale:f32,
  reduced:f32,activeFlag:f32,pad:vec2f,
}
@group(0) @binding(0) var<uniform> view:View;
@vertex fn vs(@builtin(vertex_index) i:u32)->@builtin(position) vec4f {
  let v=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));return vec4f(v[i],0,1);
}
fn srgb(c:vec3f)->vec3f {
  let x=clamp(c,vec3f(0),vec3f(1));
  return select(12.92*x,1.055*pow(x,vec3f(1.0/2.4))-vec3f(0.055),x>vec3f(0.0031308));
}
fn cov(d:f32,aa:f32)->f32{return 1.0-smoothstep(-aa,aa,d);}
fn line(p:vec2f,a:vec2f,b:vec2f)->f32{
  let v=b-a;return length(p-a-v*clamp(dot(p-a,v)/dot(v,v),0.0,1.0));
}
@fragment fn fs(@builtin(position) screen:vec4f)->@location(0) vec4f {
  let bg=vec3f(0.015,0.022,0.035);
  if(view.activeFlag<0.5 || view.ageMs>=1270.0){return vec4f(srgb(bg),1);}
  let p=(screen.xy-view.size*0.5)/view.scale;
  let aa=0.68/view.scale;
  let t=view.ageMs;
  let q=p-vec2f(-25,-16);
  let mast=line(q,vec2f(-1.6,-5),vec2f(-1.6,42));
  var col=mix(bg,vec3f(0.27,0.35,0.37),cov(mast-1.5,aa));
  let cap=length(q-vec2f(-1.6,-5.5));
  col=mix(col,vec3f(0.73,0.52,0.24),cov(cap-2.5,aa));
  let pull=smoothstep(130.0,490.0,t);
  let spread=mix(mix(7.0,31.0,view.reduced),58.0,pull);
  let u=clamp(q.x/spread,0.0,1.0);
  let lag=t-185.0-255.0*u;
  let v=max(lag,0.0)/158.0;
  let wave=select(0.0,4.7*exp(-v*0.71)*sin(v*3.25),lag>0.0)*u*(1.0-view.reduced);
  // The hoist stays fixed at both hems. A folded tip first hangs, then extends away from the staff.
  let drop=mix(20.0,0.0,pull)*(1.0-0.65*view.reduced)*u;
  let center=9.0-4.5*u+drop+wave;
  let halfH=10.2*(1.0-u)+0.85;
  let d=max(max(-q.x,q.x-spread),abs(q.y-center)-halfH);
  let fabric=cov(d,aa);
  let y=(q.y-center)/max(halfH,0.85);
  // One indigo diagonal band follows the fabric rather than screen coordinates.
  let band=cov(abs(u+0.15*y-0.44)-0.09,aa/spread);
  let cloth=mix(vec3f(0.66,0.84,0.76),vec3f(0.16,0.24,0.46),band);
  let ridge=0.80+0.16*cos(6.283185*(u-0.16*pull))+0.035*y;
  col=mix(col,cloth*ridge,fabric);
  let binding=cov(abs(q.x-0.8)-0.85,aa)*fabric;
  col=mix(col,vec3f(0.27,0.42,0.43),binding);
  let alpha=smoothstep(0.0,88.0,t)*(1.0-smoothstep(915.0,1234.0,t));
  return vec4f(srgb(mix(bg,col,alpha)),1);
}
