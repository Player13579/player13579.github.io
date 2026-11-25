struct View{
  size:vec2f,ageMs:f32,scale:f32,
  reduced:f32,activeFlag:f32,pad:vec2f,
}
@group(0) @binding(0) var<uniform> view:View;
@vertex fn vs(@builtin(vertex_index) i:u32)->@builtin(position) vec4f {
  let v=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));
  return vec4f(v[i],0,1);
}
fn srgb(c:vec3f)->vec3f {
  let x=clamp(c,vec3f(0),vec3f(1));
  return select(12.92*x,1.055*pow(x,vec3f(1.0/2.4))-vec3f(0.055),x>vec3f(0.0031308));
}
fn cov(d:f32,aa:f32)->f32 {return 1.0-smoothstep(-aa,aa,d);}
@fragment fn fs(@builtin(position) screen:vec4f)->@location(0) vec4f {
  let bg=vec3f(0.009,0.019,0.035);
  if(view.activeFlag<0.5 || view.ageMs>=1070.0){return vec4f(srgb(bg),1);}
  let p=(screen.xy-view.size*0.5)/view.scale;
  let aa=0.66/view.scale;
  let t=view.ageMs;
  let reveal=smoothstep(0.0,65.0,t);
  let extinguish=1.0-smoothstep(112.0,310.0,t);
  let shut=smoothstep(238.0,610.0,t);
  let open=1.0-shut;
  let halfW=35.0;
  let u=clamp(p.x/halfW,-1.0,1.0);
  let arch=max(0.0,1.0-u*u);
  let opening=mix(13.8,8.0,view.reduced)*open;
  // Upper and lower contours converge onto one gently bowed, finite closed seam.
  let joint=1.8*arch*shut;
  let top=joint-opening*arch;
  let bottom=joint+opening*arch;
  let beyond=max(0.0,abs(p.x)-halfW);
  let dTop=length(vec2f(beyond,p.y-top));
  let dBottom=length(vec2f(beyond,p.y-bottom));
  let mask=cov(max(abs(p.x)-halfW,max(top-p.y,p.y-bottom)),aa);
  let glass=mix(vec3f(0.034,0.070,0.11),vec3f(0.052,0.25,0.30),extinguish);
  var col=mix(bg,glass,mask*open);
  let r=length(p-vec2f(0,joint));
  let iris=cov(r-8.4,aa);
  let core=cov(r-3.45,aa);
  let irisCol=mix(vec3f(0.15,0.27,0.32),vec3f(0.25,0.71,0.68),extinguish);
  col=mix(col,irisCol,iris*mask*open);
  col=mix(col,vec3f(0.013,0.046,0.063),core*mask*open);
  // Only the powered lens carries the small off-center reflection.
  let spot=length((p-vec2f(-3.3,-3.9))/vec2f(2.7,1.6));
  col+=vec3f(0.56,0.77,0.66)*exp(-spot*spot)*mask*extinguish;
  let extent=1.0-smoothstep(725.0,1002.0,t);
  let endHalf=mix(2.0,halfW,extent);
  let finiteSeam=1.0-smoothstep(endHalf-aa,endHalf+aa,abs(p.x));
  let upper=cov(dTop-1.65,aa);
  let lower=cov(dBottom-1.20,aa);
  let edge=max(upper,lower)*finiteSeam;
  let edgeColor=mix(vec3f(0.22,0.39,0.47),vec3f(0.49,0.78,0.79),upper*(0.5+0.5*extinguish));
  col=mix(col,edgeColor,edge);
  let contact=smoothstep(579.0,610.0,t)*exp(-max(0.0,t-610.0)/86.0);
  let residual=exp(-abs(p.x)/12.0)*exp(-abs(p.y-joint)/2.1);
  col+=vec3f(0.16,0.28,0.30)*residual*contact*finiteSeam;
  let dissolve=1.0-smoothstep(846.0,1028.0,t);
  return vec4f(srgb(mix(bg,col,reveal*dissolve)),1);
}
