struct View {
  size: vec2f, ageMs: f32, scale: f32,
  reduced: f32, activeFlag: f32, digits: f32, pad: f32,
  oldDigits: array<vec4f,4>,
  newDigits: array<vec4f,4>,
}
@group(0) @binding(0) var<uniform> view: View;
@vertex fn vs(@builtin(vertex_index) i:u32)->@builtin(position) vec4f {
  let v=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));
  return vec4f(v[i],0,1);
}
fn srgb(c:vec3f)->vec3f {
  let x=clamp(c,vec3f(0),vec3f(1));
  return select(12.92*x,1.055*pow(x,vec3f(1.0/2.4))-vec3f(0.055),x>vec3f(0.0031308));
}
fn coverage(d:f32, aa:f32)->f32 { return 1.0-smoothstep(-aa,aa,d); }
fn rounded(p:vec2f,h:vec2f,r:f32)->f32 {
  let d=abs(p)-h+vec2f(r);
  return length(max(d,vec2f(0)))+min(max(d.x,d.y),0.0)-r;
}
fn segment(p:vec2f,a:vec2f,b:vec2f)->f32{
  let e=b-a;
  return length(p-a-e*clamp(dot(p-a,e)/dot(e,e),0.0,1.0))-1.5;
}
fn ink(p:vec2f,nextFace:bool,aa:f32)->f32 {
  let count=i32(view.digits);
  let factor=min(1.0,86.0/(18.0*f32(count)));
  let q=p/factor;
  let col=i32(floor(q.x/18.0+0.5*f32(count)));
  if (col<0 || col>=count) { return 0.0; }
  let slot=u32(16-count+col);
  let digit=i32(select(view.oldDigits[slot/4u][slot%4u],view.newDigits[slot/4u][slot%4u],nextFace));
  if (digit<0 || digit>9) { return 0.0; }
  let masks=array<u32,10>(63u,6u,91u,79u,102u,109u,125u,7u,127u,111u);
  let bits=masks[u32(digit)];
  let x=q.x-(f32(col)+0.5-0.5*f32(count))*18.0;
  let v=vec2f(x,q.y);
  let h=5.4;
  let lo=10.8;
  let a=array<vec2f,7>(vec2f(-h+1.0,-lo),vec2f(h,-lo+1.2),vec2f(h,1.2),vec2f(-h+1.0,lo),vec2f(-h,1.2),vec2f(-h,-lo+1.2),vec2f(-h+1.0,0));
  let b=array<vec2f,7>(vec2f(h-1.0,-lo),vec2f(h,-1.2),vec2f(h,lo-1.2),vec2f(h-1.0,lo),vec2f(-h,lo-1.2),vec2f(-h,-1.2),vec2f(h-1.0,0));
  var mask=0.0;
  for(var j=0u;j<7u;j++){
    if ((bits&(1u<<j))!=0u) { mask=max(mask,coverage(segment(v,a[j],b[j]),aa/factor)); }
  }
  return mask;
}
fn face(p:vec2f,nextFace:bool,aa:f32)->vec3f {
  let base=select(vec3f(0.058,0.125,0.147),vec3f(0.044,0.094,0.115),p.y>0.0);
  return mix(base,vec3f(0.79,0.88,0.77),ink(p,nextFace,aa));
}
@fragment fn fs(@builtin(position) screen:vec4f)->@location(0) vec4f {
  let bg=vec3f(0.014,0.023,0.032);
  if (view.activeFlag<0.5 || view.ageMs>=1190.0) { return vec4f(srgb(bg),1); }
  let p=(screen.xy-view.size*0.5)/view.scale;
  let aa=0.68/view.scale;
  let t=view.ageMs;
  let hw=max(28.0,min(47.0,12.0+9.0*view.digits));
  let card=coverage(rounded(p,vec2f(hw,19),2.8),aa);
  let frame=coverage(rounded(p,vec2f(hw+3.2,22.2),4.4),aa);
  var scene=mix(bg,vec3f(0.23,0.33,0.34),frame);
  let f=smoothstep(220.0,580.0,t);
  var pigment=face(p,p.y<0.0,aa);
  if (view.reduced>0.5) {
    pigment=mix(face(p,false,aa),face(p,true,aa),f);
  } else {
    // The outgoing upper half turns edge-on, showing the incoming lower half on its reverse.
    let reach=cos(3.14159265*f);
    let isOld=reach>0.0 && p.y<=0.0 && p.y>=-19.0*reach;
    let isNew=reach<0.0 && p.y>=0.0 && p.y<=-19.0*reach;
    if (isOld || isNew) {
      let local=vec2f(p.x,p.y/max(abs(reach),0.001));
      let shading=0.56+0.44*abs(reach);
      pigment=face(local,isNew,aa)*shading;
    }
  }
  scene=mix(scene,pigment,card);
  let joint=coverage(abs(p.y)-0.65,aa)*card;
  scene=mix(scene,vec3f(0.014,0.030,0.038),joint);
  let stop=vec2f(hw+1.3,0);
  let hinge=coverage(length(abs(p)-stop)-1.5,aa)*frame;
  let seat=smoothstep(552.0,580.0,t)*exp(-max(0.0,t-580.0)/68.0);
  scene=mix(scene,vec3f(0.42,0.49,0.46)+seat*vec3f(0.35,0.22,0.07),hinge);
  let alpha=smoothstep(0.0,78.0,t)*(1.0-smoothstep(946.0,1160.0,t));
  return vec4f(srgb(mix(bg,scene,alpha)),1);
}
