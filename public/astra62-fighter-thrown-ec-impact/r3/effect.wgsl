struct View {
  size:vec2f, ageMs:f32, scale:f32,
  reduced:f32, activeFlag:f32, showSite:f32, pad:f32,
  landing:vec2f, spare:vec2f,
}
@group(0) @binding(0) var<uniform> view:View;

@vertex fn vs(@builtin(vertex_index) i:u32)->@builtin(position) vec4f {
  let v=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));
  return vec4f(v[i],0,1);
}
fn srgb(c:vec3f)->vec3f {
  let x=clamp(c,vec3f(0),vec3f(1));
  return select(12.92*x,1.055*pow(x,vec3f(1.0/2.4))-vec3f(.055),x>vec3f(.0031308));
}
fn cv(d:f32,w:f32)->f32 { return 1.0-smoothstep(-w,w,d); }
fn seamDistance(p:vec2f)->f32 {
  let cell=vec2f(43.0,36.0);
  let uv=p+vec2f(3.0,11.0);
  let k=abs(fract(uv/cell+vec2f(.5))-.5)*cell;
  return min(k.x,k.y);
}
fn floorColor(p:vec2f,aa:f32)->vec3f {
  let mortar=1.0-smoothstep(.40-aa,.40+aa,seamDistance(p));
  return mix(vec3f(.027,.047,.062),vec3f(.018,.032,.044),mortar);
}

// r in reference units, time in ms. Arrival is strictly increasing.
fn arrivalMs(r:f32)->f32 {
  let u=r/54.0;
  return u*(120.0+560.0*u);
}
fn packetPhase(r:f32,t:f32)->f32 {
  // Finite source duration; packet broadens as its radial speed drops.
  return (t-arrivalMs(r))/(56.0+180.0*(r/54.0));
}
fn sourceRise(h:f32)->f32 { return smoothstep(0.0,.25,h); }
fn pressureAt(h:f32)->f32 {
  return sourceRise(h)*(1.0-smoothstep(.25,1.42,h));
}
fn memoryAt(h:f32)->f32 {
  // Same loading branch, slower material unloading; no delayed excitation.
  return sourceRise(h)*(1.0-smoothstep(.25,1.90,h));
}
fn rangeClip(r:f32)->f32 { return 1.0-smoothstep(52.0,54.0,r); }
fn lifeGain(t:f32)->f32 {
  if (t<0.0 || t>=880.0) { return 0.0; }
  return 1.0-smoothstep(642.0,880.0,t);
}
fn deliveredGain(r:f32,t:f32)->f32 {
  return rangeClip(r)*lifeGain(t)/(1.0+.44*(r/54.0));
}
fn opticalShift(loadValue:f32,reducedValue:f32)->f32 {
  return loadValue*mix(3.40,.425,clamp(reducedValue,0.0,1.0));
}

@fragment fn fs(@builtin(position) screen:vec4f)->@location(0) vec4f {
  let p=(screen.xy-view.size*.5)/view.scale;
  let aa=.65/view.scale;
  var col=floorColor(p,aa);
  if (!(view.showSite>.5)) { return vec4f(srgb(col),1); }
  let q=p-view.landing;
  let r=length(q);
  let t=view.ageMs;
  if (view.activeFlag>.5 && t>=0.0 && t<880.0 && r<54.0) {
    let h=packetPhase(r,t);
    if (h>0.0 && h<2.30) {
      let g=deliveredGain(r,t);
      let loadValue=g*pressureAt(h);
      let storedValue=g*memoryAt(h);
      let n=q/max(r,3.5);
      let bed=p-n*opticalShift(loadValue,view.reduced);
      col=floorColor(bed,aa);
      // Broad glazed face falls away into the existing recessed joint.
      let glaze=smoothstep(.45,3.2+min(aa,2.0),seamDistance(bed));
      let faceReturn=mix(.32,1.0,glaze);
      let slopeView=.72+.28*dot(n,vec2f(-.8,-.6));
      // Near-floor light carried by the whole compressed section, not an isoline.
      let sheet=loadValue*(.82+.18*slopeView);
      col+=vec3f(.630,.296,.076)*sheet;
      // Diffuse floor response persists behind the section, not in front of it.
      col+=vec3f(.110,.290,.310)*(storedValue*faceReturn);
      // A short-path reflection on the same displaced face, strongest at compression.
      col+=vec3f(.138,.120,.074)*(loadValue*loadValue*glaze*slopeView);
    }
  }
  let marker=(abs(q.x)+abs(q.y)-3.5)*.7071;
  col=mix(col,vec3f(.48,.52,.49),cv(abs(marker)-.63,aa));
  return vec4f(srgb(col),1);
}