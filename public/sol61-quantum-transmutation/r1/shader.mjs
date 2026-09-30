// GPT-6.1-Sol, zero-created Quantum Transmutation r1, 2026-10-01.
export const shader = /* wgsl */`
struct Params {
  view: vec4f, // physical viewport width/height, projected event x/y
  state: vec4f, // pixels per world unit, age seconds, mercury, visibility
  diagnostic: vec4f, // world enabled, glow enabled, flare enabled, reduced motion
};
@group(0) @binding(0) var<uniform> p: Params;
struct Vertex { @builtin(position) position: vec4f, @location(0) local: vec2f };
@vertex fn vs(@builtin(vertex_index) i:u32)->Vertex {
  let corners=array<vec2f,6>(vec2f(-64.,-96.),vec2f(64.,-96.),vec2f(-64.,32.),vec2f(-64.,32.),vec2f(64.,-96.),vec2f(64.,32.));
  let q=corners[i];
  let pixel=p.view.zw+q*p.state.x;
  var o:Vertex;
  o.position=vec4f(pixel.x/p.view.x*2.-1.,1.-pixel.y/p.view.y*2.,0.,1.);
  o.local=q-vec2f(0.,-32.);
  return o;
}
fn ease(a:f32,b:f32,t:f32)->f32 { return smoothstep(a,b,t); }
fn box(q:vec2f,b:vec2f)->f32 { let d=abs(q)-b; return length(max(d,vec2f(0.)))+min(max(d.x,d.y),0.); }
fn field(q:vec2f,b:vec2f,aa:f32)->f32 { return 1.-smoothstep(-aa,aa,box(q,b)); }
fn rot(q:vec2f,a:f32)->vec2f { return vec2f(cos(a)*q.x+sin(a)*q.y,-sin(a)*q.x+cos(a)*q.y); }
@fragment fn fs(v:Vertex)->@location(0) vec4f {
  let t=p.state.y;
  if(t<0. || t>=3.6 || p.state.w<=0.) { discard; }
  let q=v.local;
  let aa=max(.65,1./max(.1,p.state.x));
  let onset=ease(0.,.16,t);
  let end=1.-ease(3.02,3.6,t);
  let conversion=ease(.72,1.65,t);
  let result=ease(1.35,1.80,t);
  let motion=mix(1.,.35,p.diagnostic.w);
  // PH1: metal input stays within the event source domain; no fictitious hand.
  let inputCenter=vec2f(-27.+conversion*21.*motion,0.);
  let iq=q-inputCenter;
  let lead=field(rot(iq,-.12),vec2f(11.,15.),aa);
  let mercury=1.-smoothstep(-aa,aa,length(iq/vec2f(1.,1.35))-11.);
  let metal=mix(lead,mercury,p.state.z)*(1.-ease(.85,1.65,t))*onset;
  let metalShade=.38+.38*ease(-12.,9.,iq.x)+.22*(1.-ease(-10.,8.,iq.y));
  var material=vec3f(.18,.26,.34)*metalShade*metal;
  var coverage=metal*.92;
  // PH2: opposing broad segmented jaws, with a real open processing gap.
  // The six meso cells change occupancy; these are world field segments, no screen scanlines.
  let jawGap=mix(20.,9.,conversion);
  var jaw:f32=0.;
  var hot:f32=0.;
  for(var j=0;j<3;j=j+1) {
    let row=f32(j)-1.;
    let y=row*14.;
    let shift=abs(row)*5.;
    let cellOn=onset*(1.-ease(2.25,2.9,t));
    let left=field(q-vec2f(-jawGap-shift,y),vec2f(7.,5.2),aa);
    let right=field(q-vec2f(jawGap+shift,y),vec2f(7.,5.2),aa);
    jaw=max(jaw,max(left,right)*cellOn);
    let seam=field(q-vec2f(-jawGap-shift+5.,y),vec2f(1.4,4.),aa);
    hot=max(hot,seam*cellOn);
  }
  // Wide feed ribbons hand off to the aperture; they terminate in its inward faces.
  let feed=field(q-vec2f(-12.+conversion*5.,0.),vec2f(10.,4.5),aa)*ease(.32,.64,t)*(1.-ease(1.25,1.72,t));
  let carrier=max(jaw,feed);
  let discharge=exp(-pow((t-1.50)/.22,2.));
  let supply=(.8+.7*ease(.35,.8,t)+2.7*discharge)*end;
  let cyan=vec3f(.06,.65,1.);
  var emission=cyan*(carrier*.88+hot*2.1)*supply;
  coverage=max(coverage,carrier*.65);
  // PH3: a filled golden result field unfolds from the SAME conversion aperture.
  // It is not a coin, gold inventory object, award numeral, or inventory arrival cue.
  let unfold=ease(1.38,2.05,t);
  let goldQ=q-vec2f(10.*unfold*motion,0.);
  let main=field(goldQ,vec2f(14.+9.*unfold,19.),aa);
  let opening=field(goldQ-vec2f(2.,0.),vec2f(5.,10.),aa);
  let stepNotch=field(goldQ-vec2f(19.,-15.),vec2f(7.,6.),aa);
  let gold=main*(1.-opening)*(1.-stepNotch)*result*end;
  let depth=field(goldQ-vec2f(-4.,4.),vec2f(18.,19.),aa)*(1.-opening)*result*end*.26;
  material=mix(material,vec3f(.75,.32,.018)*(.55+.45*ease(-20.,17.,goldQ.x)),gold*.75);
  coverage=max(coverage,max(gold*.8,depth));
  let rim=(1.-smoothstep(.1,2.1,abs(box(goldQ,vec2f(14.+9.*unfold,19.)))))*gold;
  emission+=vec3f(1.,.56,.055)*(gold*.85+rim*1.7)*(.8+1.4*discharge+.3*ease(1.8,2.2,t));
  // PH source radiance is distinct from OBS response. Dense core during conversion.
  let source=exp(-dot(q/vec2f(6.,8.),q/vec2f(6.,8.)))*discharge*onset*end;
  emission+=vec3f(1.,.94,.72)*source*6.;
  material*=p.diagnostic.x;
  emission*=p.diagnostic.x;
  coverage*=p.diagnostic.x;
  // OBS1: near-source PSF follows the conversion aperture, not the whole viewport.
  let nearGlow=exp(-dot(q/vec2f(24.,25.),q/vec2f(24.,25.)))*(carrier*.12+discharge*.8)*onset*end;
  let goldGlow=exp(-dot(goldQ/vec2f(33.,28.),goldQ/vec2f(33.,28.)))*result*end*.27;
  let glow=(cyan*nearGlow+vec3f(1.,.48,.04)*goldGlow)*p.diagnostic.y;
  // OBS2: source-bound diffraction flare, a single coherent angle (35 degrees).
  let fq=rot(q,.610865238);
  // Flare uses SOURCE INTENSITY, not spatial core mask, so light can leave the contour.
  let flareSignal=(exp(-abs(fq.x)/27.-pow(fq.y/1.7,2.))+exp(-abs(fq.y)/18.-pow(fq.x/1.7,2.)))*discharge*onset*end*p.diagnostic.z;
  let optics=glow+vec3f(1.,.89,.57)*flareSignal*.8;
  let opticalCoverage=clamp(max(nearGlow*p.diagnostic.y,goldGlow*p.diagnostic.y)+flareSignal*.18,0.,.65);
  let alpha=max(coverage,opticalCoverage)*p.state.w;
  // Premultiplied radiance: material*coverage once; emission is not multiplied again.
  let radiance=(material*coverage+emission+optics)*p.state.w;
  if(alpha<.0001 && max(radiance.r,max(radiance.g,radiance.b))<.0001) { discard; }
  return vec4f(radiance,alpha);
}
`;
