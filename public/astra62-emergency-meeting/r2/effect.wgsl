struct View {
  size: vec2f, ageMs: f32, scale: f32,
  reduced: f32, activeFlag: f32, pad: vec2f,
}
@group(0) @binding(0) var<uniform> view: View;
@vertex fn vs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
  let corners=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));
  return vec4f(corners[i],0,1);
}
fn mask(d:f32,aa:f32)->f32 { return 1.0-smoothstep(-aa,aa,d); }
fn box(p:vec2f,b:vec2f,r:f32)->f32 {
  let q=abs(p)-b+vec2f(r);
  return length(max(q,vec2f(0)))+min(max(q.x,q.y),0.0)-r;
}
fn ellipse(p:vec2f,r:vec2f)->f32 {
  let k=length(p/r);
  if(k<0.0001) { return -min(r.x,r.y); }
  let n=max(length(p/(r*r)),0.0001);
  return k*(k-1.0)/n;
}
fn segment(p:vec2f,a:vec2f,b:vec2f)->f32 {
  let line=b-a;
  return length(p-a-line*clamp(dot(p-a,line)/dot(line,line),0.0,1.0));
}
fn turn(p:vec2f,a:f32)->vec2f {
  return vec2f(cos(a)*p.x-sin(a)*p.y,sin(a)*p.x+cos(a)*p.y);
}
fn srgb(c:vec3f)->vec3f {
  let v=clamp(c,vec3f(0),vec3f(1));
  return select(12.92*v,1.055*pow(v,vec3f(1.0/2.4))-0.055,v>vec3f(0.0031308));
}
// Linear display-light increment. Shared by the direct image and the optical taps.
fn r2Source(q:vec2f,past:f32,aa:f32,lip:f32,face:f32,bob:f32,brass:vec3f,metal:f32)->vec3f {
  let spot=length(q-vec2f(-31.3,55.6));
  let delay=0.062*smoothstep(0.0,65.0,spot);
  let body=smoothstep(0.0,0.088,past-delay)*exp(-4.6*max(past-0.155,0.0));
  let curveGain=0.33+0.67*clamp(brass.r/0.72,0.0,1.0);
  let fill=vec3f(0.82,0.57,0.21)*(curveGain*body);

  let contact=exp(-15.0*past)*(1.0-exp(-180.0*past));
  let ray=exp(-spot*spot/14.0)*(1.0-smoothstep(7.5,11.0,spot));
  let core=0.94*contact*ray;
  let progress=clamp(past/0.37,0.0,1.0);
  let theta=3.02-2.90*progress;
  let crest=vec2f(32.8*cos(theta),55.0+5.6*sin(theta));
  let band=exp(-dot(q-crest,q-crest)/22.0);
  let along=exp(-abs(lip)/1.8)*band*(1.0-exp(-80.0*past))*(1.0-smoothstep(0.30,0.44,past));
  let after=exp(-6.0*past)*(1.0-exp(-18.0*past))*mask(abs(lip)-0.75,aa);
  let accent=1.0-(1.0-core)*(1.0-0.72*along-0.16*after);
  let honey=vec3f(0.99,0.74,0.32);
  let onFace=fill+(vec3f(1)-fill)*honey*accent;
  let bobColor=vec3f(0.93,0.68,0.36)*metal;
  return face*(vec3f(1)-brass)*onFace+bob*(vec3f(1)-bobColor)*honey*core;
}
// Evaluate the same visible source at an offset in bell coordinates, not a lit copy of the idle art.
fn r2Tap(q:vec2f,swing:f32,ball:vec2f,past:f32,aa:f32)->vec3f {
  let dome=ellipse(q-vec2f(0,33),vec2f(25,25));
  let flare=clamp((q.y-33.0)/22.0,0.0,1.0);
  let radius=25.0+9.0*flare*flare;
  let outer=select(dome,max(q.y-55.0,abs(q.x)-radius),q.y>=33.0);
  let lip=ellipse(q-vec2f(0,55),vec2f(34.2,6.3));
  let shell=min(outer,lip);
  let mouth=mask(ellipse(q-vec2f(0,55.5),vec2f(31.5,4.9)),aa);
  let normalized=q.x/max(10.0,radius);
  let slope=normalized+0.34+0.9*swing;
  let broad=exp(-slope*slope/0.26);
  let edgeShade=pow(clamp(abs(normalized),0.0,1.0),2.0);
  let upper=0.77+0.23*(1.0-smoothstep(13.0,56.0,q.y));
  let brass=mix(vec3f(0.18,0.091,0.038),vec3f(0.72,0.43,0.17),broad)*upper*(1.0-0.32*edgeShade);
  let visibleMouth=max(mouth,smoothstep(57.0,62.0,q.y));
  let rod=mask(segment(q,vec2f(0,15),ball)-1.6,aa)*visibleMouth;
  let bob=mask(length(q-ball)-6.8,aa)*visibleMouth;
  let metal=0.28+0.45*exp(-dot(q-ball+vec2f(2,2),q-ball+vec2f(2,2))/21.0);
  let face=mask(shell,aa)*(1.0-mouth)*(1.0-rod)*(1.0-bob);
  return r2Source(q,past,aa,lip,face,bob,brass,metal);
}
@fragment fn fs(@builtin(position) pos:vec4f)->@location(0) vec4f {
  let p=(pos.xy-view.size*0.5)/view.scale+vec2f(0,32);
  let aa=0.65/view.scale;
  let live=view.activeFlag>0.5 && view.ageMs>=0.0 && view.ageMs<1170.0;
  let t=select(0.0,view.ageMs,live);
  let past=max(0.0,(t-195.0)*0.001);
  let envelope=1.0-smoothstep(810.0,1170.0,t);
  let bodyAngle=select(0.0,0.23*exp(-4.8*past)*sin(19.5*past)*envelope,live);
  let swing=bodyAngle*mix(1.0,0.27,view.reduced);
  let q=turn(p,-swing);
  let fond=vec3f(0.012,0.023,0.037);
  var col=fond;
  // Neutral meeting indicator: fixed bearing and an open-mouthed cast bell.
  let mount=box(p-vec2f(0,-3),vec2f(13,2.2),1.8);
  col=mix(col,vec3f(0.22,0.27,0.28),mask(mount,aa));
  let lug=box(q-vec2f(0,5.0),vec2f(3.5,6.0),2.4);
  col=mix(col,vec3f(0.27,0.20,0.11),mask(lug,aa));
  let dome=ellipse(q-vec2f(0,33),vec2f(25,25));
  let flare=clamp((q.y-33.0)/22.0,0.0,1.0);
  let radius=25.0+9.0*flare*flare;
  let skirt=max(q.y-55.0,abs(q.x)-radius);
  let outer=select(dome,skirt,q.y>=33.0);
  let lip=ellipse(q-vec2f(0,55),vec2f(34.2,6.3));
  let cavity=ellipse(q-vec2f(0,55.5),vec2f(31.5,4.9));
  let shell=min(outer,lip);
  let normalized=q.x/max(10.0,radius);
  let slope=normalized+0.34+0.9*swing;
  let broad=exp(-slope*slope/0.26);
  let edgeShade=pow(clamp(abs(normalized),0.0,1.0),2.0);
  let upper=0.77+0.23*(1.0-smoothstep(13.0,56.0,q.y));
  let brass=mix(vec3f(0.18,0.091,0.038),vec3f(0.72,0.43,0.17),broad)*upper*(1.0-0.32*edgeShade);
  col=mix(col,brass,mask(shell,aa));
  col=mix(col,vec3f(0.12,0.063,0.030),mask(cavity,aa));
  // The clapper reaches the inside of the left flare once, then loses energy.
  let wind=0.56*smoothstep(20.0,195.0,t);
  let rebound=0.56*exp(-6.5*past)*cos(17.0*past);
  let clapperAngle=select(wind,rebound,t>=195.0)*envelope;
  let pivot=vec2f(0,15);
  let ball=pivot+turn(vec2f(0,49),clapperAngle);
  let visibleMouth=max(mask(cavity,aa),smoothstep(57.0,62.0,q.y));
  let rod=mask(segment(q,pivot,ball)-1.6,aa)*visibleMouth;
  col=mix(col,vec3f(0.26,0.19,0.11),rod);
  let bob=mask(length(q-ball)-6.8,aa)*visibleMouth;
  let metal=0.28+0.45*exp(-dot(q-ball+vec2f(2,2),q-ball+vec2f(2,2))/21.0);
  col=mix(col,vec3f(0.93,0.68,0.36)*metal,bob);
  // A warm contact and a single traversing highlight follow the curved lip.
  // The analytic local bloom shares its radiance and finite envelope.
  if(live && t>=195.0) {
    let mouth=mask(cavity,aa);
    let skin=mask(shell,aa);
    let face=skin*(1.0-mouth)*(1.0-rod)*(1.0-bob);
    let direct=r2Source(q,past,aa,lip,face,bob,brass,metal);
    let clearBg=(1.0-skin)*(1.0-mouth)*(1.0-rod)*(1.0-bob)*(1.0-mask(lug,aa))*(1.0-mask(mount,aa));
    var spread=vec3f(0);
    if(clearBg>0.0 && shell<4.2+aa) {
      let axis=q-vec2f(0,35);
      let inward=-axis/max(length(axis),0.001);
      let taper=1.0-smoothstep(0.0,4.2+aa,max(shell,0.0));
      spread=clearBg*taper*(0.11*r2Tap(q+2.0*inward,swing,ball,past,aa)+0.07*r2Tap(q+4.2*inward,swing,ball,past,aa));
    }
    col+=envelope*(direct+spread);
  }
  return vec4f(srgb(col),1.0);
}