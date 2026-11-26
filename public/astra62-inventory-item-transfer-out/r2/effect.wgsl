struct View {
  size:vec2f, ageMs:f32, scale:f32,
  reduced:f32, activeFlag:f32, before:f32, after:f32,
  selfVisible:f32, pad0:f32, pad1:f32, pad2:f32,
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
fn cov(d:f32,aa:f32)->f32 { return 1.0-smoothstep(-aa,aa,d); }
fn rounded(p:vec2f,h:vec2f,r:f32)->f32 {
  let v=abs(p)-h+vec2f(r);
  return length(max(v,vec2f(0)))+min(max(v.x,v.y),0.0)-r;
}
fn line(p:vec2f,a:vec2f,b:vec2f)->f32 {
  let e=b-a;
  return length(p-a-e*clamp(dot(p-a,e)/dot(e,e),0.0,1.0));
}
// Distance to the filled, still-exposed part of the parcel, in parcel coordinates.
// Called only while the intersection with q.x <= cutX has positive width.
fn exposedDistance(q:vec2f,cutX:f32)->f32 {
  let h=vec2f(8.3,8.5);
  let r=2.1;
  let core=clamp(q,-h+vec2f(r),h-vec2f(r));
  let delta=q-core;
  let nearest=core+delta*min(1.0,r/max(length(delta),0.0001));
  if(nearest.x<=cutX){ return length(q-nearest); }
  // The unconstrained nearest point is hidden. Use the actual cut chord.
  let u=clamp(abs(cutX)-(h.x-r),0.0,r);
  let chordY=h.y-r+sqrt(max(0.0,r*r-u*u));
  return length(q-vec2f(cutX,clamp(q.y,-chordY,chordY)));
}

@fragment fn fs(@builtin(position) screen:vec4f)->@location(0) vec4f {
  let bg=vec3f(0.018,0.021,0.038);
  if(view.selfVisible<0.5){ return vec4f(srgb(bg),1); }
  let p=(screen.xy-view.size*0.5)/view.scale;
  let aa=0.65/view.scale;
  let outer=rounded(p-vec2f(-3,3),vec2f(56,21),5.0);
  let well=rounded(p-vec2f(-3,2),vec2f(54.4,18.8),3.8);
  let wellCov=cov(well,aa);
  var col=mix(bg,vec3f(0.26,0.25,0.37),cov(outer,aa));
  col=mix(col,vec3f(0.053,0.052,0.084),wellCov);
  let count=i32(view.before);
  let remaining=i32(view.after);
  let live=view.activeFlag>0.5 && view.ageMs>=0.0 && view.ageMs<1310.0;
  let mask=1.0-smoothstep(39.0-aa,39.0+aa,p.x);
  var centers:array<vec2f,3>;
  var drives:array<f32,3>;
  var floorLight=0.0;
  var response=0.0;
  for(var i=0;i<3;i++){
    if(i>=count){ continue; }
    let leaving=i>=remaining && view.activeFlag>0.5;
    let stage=view.ageMs-f32(count-1-i)*260.0;
    let travel=select(0.0,smoothstep(115.0,450.0,stage),leaving);
    let x=mix(-41.0+23.0*f32(i),52.0,travel);
    let raised=mix(4.5,0.4,view.reduced)*sin(3.14159265*travel);
    centers[i]=vec2f(x,4.0-raised);
    drives[i]=0.0;
    if(live && leaving){
      let cutX=39.0-x;
      let exposedWidth=clamp(cutX+8.3,0.0,16.6);
      drives[i]=smoothstep(115.0,175.0,stage)*smoothstep(0.0,1.2,exposedWidth);
      if(drives[i]>0.0){
        let d=exposedDistance(p-centers[i],cutX);
        let nearWeight=1.0-smoothstep(0.0,5.0,d);
        floorLight=max(floorLight,drives[i]*smoothstep(0.0,8.0,exposedWidth)*nearWeight*nearWeight);
      }
      response=max(response,smoothstep(402.0,450.0,stage)*exp(-max(stage-450.0,0.0)/72.0));
    }
  }
  // Only the well can receive this short-range display term. All parcels cover it.
  col+=vec3f(0.130,0.096,0.164)*(wellCov*mask*floorLight);
  for(var i=0;i<3;i++){
    if(i>=count){ continue; }
    let local=p-centers[i];
    let body=cov(rounded(local,vec2f(8.3,8.5),2.1),aa)*mask;
    let seam=clamp((local.y+7.0)/14.0,0.0,1.0);
    let paper=mix(vec3f(0.73,0.66,0.82),vec3f(0.44,0.38,0.62),seam);
    let power=drives[i]*mix(0.87,1.0,smoothstep(-4.0,7.0,local.x));
    let paperE=mix(vec3f(0.207,0.165,0.168),vec3f(0.295,0.236,0.274),seam);
    col=mix(col,paper+power*paperE,body);
    let ribbon=cov(abs(local.x+1.0)-1.8,aa);
    col=mix(col,vec3f(0.35,0.23,0.47)+power*vec3f(0.180,0.115,0.190),ribbon*body);
    let tag=cov(rounded(local-vec2f(2.8,-3.5),vec2f(2.7,1.8),0.6),aa);
    col=mix(col,vec3f(0.93,0.72,0.42)+power*vec3f(0.058,0.135,0.108),tag*body);
  }
  let wall=cov(rounded(p-vec2f(41,2),vec2f(2.1,17.1),1.1),aa);
  col=mix(col,vec3f(0.31,0.28,0.42)+response*vec3f(0.46,0.27,0.08),wall);
  let arrow=min(line(p,vec2f(45,-2),vec2f(49,2)),line(p,vec2f(49,2),vec2f(45,6)));
  col=mix(col,vec3f(0.77,0.63,0.48),cov(arrow-0.85,aa));
  return vec4f(srgb(col),1);
}