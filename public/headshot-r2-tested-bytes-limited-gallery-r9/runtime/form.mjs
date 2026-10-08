// A procedural contact lamella, not a wound, rigid shard or impact normal.
// CPU sampling below is analytical design evidence, never rendered-pixel proof.
export const FORM = Object.freeze({duration:420, onset:18, openingTime:55,
  lengths:[8.8,7.2], widths:[3.6,2.7], travel:[8.3,6.3], drift:[-1.8,2.1]});
const smooth=x=>{const t=Math.max(0,Math.min(1,x));return t*t*(3-2*t);};
export function formState(ageMs,reduced=false){
  if(!Number.isFinite(ageMs)||ageMs<0||ageMs>=420)return null;
  const t=ageMs/1000, opening=1-Math.exp(-Math.max(t-.018,0)/.055);
  const motion=reduced?.52:1;
  return {t,opening,motion,life:smooth((t-.008)/.028)*Math.exp(-Math.max(t-.04,0)/.145)*(1-smooth((t-.285)/.135)),
    centers:[{x:-1.8*opening*motion,y:-(1.25+8.3*opening*motion)},
      {x:2.1*opening*motion,y:1.25+6.3*opening*motion}],
    widths:FORM.widths.map(w=>w*(.24+.76*opening)),
    lengths:[8.8,7.2],tilts:[-.18-.14*opening,.10+.13*opening]};
}
export function sampleFace(ageMs,face,x,y,reduced=false){
  const s=formState(ageMs,reduced);if(!s)return{coverage:0,normal:[0,0,1],life:0};
  if(![0,1].includes(face))throw new RangeError('Two lamellae only');
  const c=s.centers[face],dx=x-c.x,a=dx/s.lengths[face];
  const longitudinal=1-smooth((Math.abs(a)-.60)/.40);
  const bulge=.34+.66*Math.sqrt(Math.max(0,1-a*a));
  const bend=(face===0?-.013:.010)*dx*dx*s.opening;
  const b=(y-c.y-s.tilts[face]*dx-bend)/(s.widths[face]*bulge);
  const coverage=longitudinal*(1-smooth((Math.abs(b)-.62)/.38));
  const nx=-s.tilts[face]-(face===0?-.026:.020)*dx*s.opening;
  const ny=(face===0?-.36:.30)*b+.16*s.opening;
  const len=Math.hypot(nx,ny,1);
  return{coverage,normal:[nx/len,ny/len,1/len],life:s.life};
}

export const FORM_WGSL=/* wgsl */`
struct FaceSample { coverage: f32, normal: vec3f, thickness: f32, };
fn smooth01(x: f32) -> f32 { let t=clamp(x,0.0,1.0);return t*t*(3.0-2.0*t); }
fn band(distance: f32,width: f32) -> f32 {return exp(-distance*distance/(2.0*width*width));}
fn contactFace(p:vec2f,opening:f32,motion:f32,face:u32)->FaceSample {
  let upper=face==0u;
  let center=select(vec2f(2.1*opening*motion,1.25+6.3*opening*motion),
    vec2f(-1.8*opening*motion,-1.25-8.3*opening*motion),upper);
  let extent=select(7.2,8.8,upper);
  let width=select(2.7,3.6,upper)*(.24+.76*opening);
  let tilt=select(.10+.13*opening,-.18-.14*opening,upper);
  let dx=p.x-center.x;
  let longitudinal=1.0-smooth01((abs(dx/extent)-.60)/.40);
  let bulge=.34+.66*sqrt(max(0.0,1.0-(dx/extent)*(dx/extent)));
  let bend=select(.010,-.013,upper)*dx*dx*opening;
  let cross=(p.y-center.y-tilt*dx-bend)/(width*bulge);
  let coverage=longitudinal*(1.0-smooth01((abs(cross)-.62)/.38));
  let slopeX=tilt+select(.020,-.026,upper)*dx*opening;
  let slopeY=select(.30,-.36,upper)*cross+.16*opening;
  var result:FaceSample;result.coverage=coverage;
  result.normal=normalize(vec3f(-slopeX,slopeY,1.0));
  result.thickness=.24+.76*(1.0-min(1.0,abs(cross)));
  return result;
}`;
