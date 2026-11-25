struct View {
  size:vec2f, ageMs:f32, scale:f32,
  reduced:f32, liveFlag:f32, targetShown:f32, pad:f32,
  origin:vec2f, destination:vec2f,
}
@group(0) @binding(0) var<uniform> view:View;
@vertex fn vs(@builtin(vertex_index) i:u32)->@builtin(position) vec4f {
  let v=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));
  return vec4f(v[i],0,1);
}
fn fill(d:f32,w:f32)->f32 {return 1.0-smoothstep(-w,w,d);}
fn segment(p:vec2f,a:vec2f,b:vec2f)->f32 {
  let e=b-a;return length(p-a-e*clamp(dot(p-a,e)/max(dot(e,e),0.001),0.0,1.0));
}
fn side(a:vec2f,b:vec2f)->f32{return a.x*b.y-a.y*b.x;}
fn tri(p:vec2f,a:vec2f,b:vec2f,c:vec2f)->f32 {
  let e=side(b-a,p-a);let f=side(c-b,p-b);let g=side(a-c,p-c);
  let inside=(e>=0.0 && f>=0.0 && g>=0.0)||(e<=0.0 && f<=0.0 && g<=0.0);
  return select(1.0,-1.0,inside)*min(segment(p,a,b),min(segment(p,b,c),segment(p,c,a)));
}
fn srgb(c:vec3f)->vec3f {
  let x=clamp(c,vec3f(0),vec3f(1));
  return select(12.92*x,1.055*pow(x,vec3f(1.0/2.4))-0.055,x>vec3f(0.0031308));
}
@fragment fn fs(@builtin(position) pos:vec4f)->@location(0) vec4f {
  let p=(pos.xy-view.size*0.5)/view.scale;
  let aa=0.64/view.scale;
  let a=p-view.origin;
  var col=vec3f(0.012,0.024,0.037);
  // Neutral registered fixture glyphs have no role/health/hit information.
  let dock=min(segment(a,vec2f(-8,6),vec2f(4,6)),segment(a,vec2f(-8,6),vec2f(-8,-4)));
  col=mix(col,vec3f(0.16,0.25,0.28),fill(dock-1.5,aa));
  if(view.targetShown>0.5) {
    let dst=p-view.destination;
    let diamond=(abs(dst.x)+abs(dst.y)-6.5)*0.7071;
    col=mix(col,vec3f(0.21,0.33,0.36),fill(abs(diamond)-0.85,aa));
  }
  if(view.liveFlag<0.5 || view.targetShown<0.5 || view.ageMs<0.0 || view.ageMs>=790.0) {
    return vec4f(srgb(col),1);
  }
  let t=view.ageMs;
  let line=view.destination-view.origin;
  let span=length(line);
  let dir=line/max(span,1.0);
  let across=vec2f(-dir.y,dir.x);
  let step01=clamp((t-34.0)/672.0,0.0,1.0);
  // The luminous graphic dissolves at the finite viewer-permitted endpoint.
  let progress=step01*step01*(2.0-step01);
  let distanceAlong=(span-10.5)*progress;
  let local=vec2f(dot(a,dir)-distanceAlong,dot(a,across));
  let appear=smoothstep(0.0,55.0,t);
  let finish=1.0-smoothstep(637.0,712.0,t);
  let carrier=appear*finish;
  let departure=appear*(1.0-smoothstep(62.0,191.0,t));
  let fromGlow=exp(-dot(a,a)/40.0);
  col+=vec3f(0.36,0.20,0.075)*fromGlow*departure;
  // One broad, tapering wake is bounded by travelled distance. Its dark split closes
  // behind the moving tail. No marker or wake is emitted beyond a visible endpoint.
  let stretch=mix(46.0,27.0,view.reduced);
  let wakeLength=min(stretch,max(0.0,distanceAlong-6.0));
  let back=-local.x-6.0;
  let fraction=clamp(back/max(wakeLength,1.0),0.0,1.0);
  let wakeWidth=(1.0-fraction)*(3.7+1.9*sin(3.141593*fraction));
  let bend=(1.0-view.reduced)*1.7*sin(fraction*4.5-step01*2.6)*fraction;
  let crossY=abs(local.y-bend);
  let bounds=step(0.0,dot(a,dir))*smoothstep(0.0,1.0,wakeLength)*smoothstep(-aa,aa,back)*(1.0-smoothstep(wakeLength-aa,wakeLength+aa,back));
  let wake=bounds*fill(crossY-wakeWidth,aa)*(1.0-fraction);
  let groove=1.0-0.63*exp(-pow(crossY/1.15,2.0))*smoothstep(0.12,0.42,fraction);
  let fading=1.0-smoothstep(650.0,757.0,t);
  col+=vec3f(0.11,0.48,0.38)*wake*groove*appear*fading;
  // A broad mint face and a shadowed lower face meet at the same keel.
  let nose=vec2f(11.5,0), rear=vec2f(-7.5,0);
  let top=tri(local,nose,rear,vec2f(-6.8,-4.8));
  let bottom=tri(local,nose,rear,vec2f(-7.0,4.25));
  let finA=tri(local,vec2f(-0.5,-2.2),vec2f(-10.7,-7.7),vec2f(-8.0,-1.0));
  let finB=tri(local,vec2f(-0.7,2.0),vec2f(-10.0,6.5),vec2f(-7.9,0.9));
  let fin=fill(min(finA,finB),aa);
  col=mix(col,vec3f(0.19,0.56,0.49),fin*carrier);
  let coverage=fill(min(top,bottom),aa);
  let lower=smoothstep(-aa,aa,local.y);
  let face=mix(vec3f(0.59,0.91,0.79),vec3f(0.14,0.42,0.43),lower);
  col=mix(col,face,coverage*carrier);
  let keel=fill(segment(local,vec2f(-6,0),nose)-0.47,aa);
  col+=vec3f(0.27,0.39,0.34)*keel*coverage*carrier;
  let port=local-vec2f(-7.6,0.1);
  let hot=exp(-dot(port/vec2f(2.5,2.25),port/vec2f(2.5,2.25)));
  let bloom=exp(-dot(port/vec2f(7.2,4.6),port/vec2f(7.2,4.6)));
  col+=vec3f(0.87,0.47,0.17)*carrier*(0.80*hot+0.14*bloom);
  return vec4f(srgb(col),1);
}
