// r3: compact broad material convergence; bounded row shear and exact handoff.
import {HANDOFF_TIMING as T,transportExtentRatio} from './handoff-state.mjs';
export const WORLD_WGSL = /* wgsl */`
struct Params {
  extent: vec4f, // physical width/height, DPR, original-alpha-support CSS height
  rect: vec4f, // same-frame registered original sprite rect, CSS pixels
  crop: vec4f,
  support: vec4f,
  controls: vec4f, // phase ms, sourceEnabled, observerEnabled, reducedMotion
  state: vec4f, // actorVisible, sourceActive, reserved, reserved
  background: vec4f,
};
@group(0) @binding(0) var<uniform> p: Params;
@group(0) @binding(1) var original: texture_2d<f32>;
@group(0) @binding(2) var originalSampler: sampler;
struct VertexOut { @builtin(position) position: vec4f, @location(0) uv: vec2f };
@vertex fn fullscreen(@builtin(vertex_index) i: u32) -> VertexOut {
  let xy = array<vec2f, 3>(vec2f(-1.,-1.), vec2f(3.,-1.), vec2f(-1.,3.));
  var o: VertexOut; o.position = vec4f(xy[i],0.,1.); o.uv=xy[i]*vec2f(.5,-.5)+.5; return o;
}
fn decodeSRGB(c: vec3f) -> vec3f {
  return select(pow((c+.055)/1.055, vec3f(2.4)), c/12.92, c<=vec3f(.04045));
}
fn sampleOriginal(uv: vec2f) -> vec4f {
  if any(uv<vec2f(0.)) || any(uv>=vec2f(1.)) { return vec4f(0.); }
  let halfTexel = .5/vec2f(textureDimensions(original));
  let sheetUV = clamp(p.crop.xy + uv*p.crop.zw, p.crop.xy+halfTexel,
    p.crop.xy+p.crop.zw-halfTexel);
  // Texture is rgba8unorm (not sRGB), so decode exactly here, once.
  let s = textureSampleLevel(original,originalSampler,sheetUV,0.);
  return vec4f(decodeSRGB(s.rgb),s.a);
}
struct WorldOut { @location(0) scene: vec4f, @location(1) emission: vec4f };
@fragment fn reconstruct(v: VertexOut) -> WorldOut {
  let css=v.position.xy/p.extent.z;
  let uv=(css-p.rect.xy)/p.rect.zw;
  var actor=vec4f(0.); var radiation=vec3f(0.);
  let sourceOn=p.controls.y>.5 && p.state.y>.5;
  let time=p.controls.x;
  if p.state.x>.5 && uv.y>=0. && uv.y<1. && uv.x>-.48 && uv.x<1.48 {
    let s=sampleOriginal(uv);
    if !sourceOn { actor=s; }
    else {
      let y=(uv.y-p.support.y)/p.support.w;
      let pixelNorm=.7/p.extent.w;
      // Local row material converges beside its registered body support.
      let rowArrival=${T.footArrivalMs}.+(1.-y)*${T.bodySweepMs}.;
      let approach=smoothstep(rowArrival-${T.travelMs}.,rowArrival,time);
      // Fixation starts only when transport has reached the exact original x.
      let completed=smoothstep(rowArrival,rowArrival+${T.fixMs}.,time);
      // A smooth arrival path with max |dx/dy|=1 (.4 reduced), avoiding wing-like shear.
      // No x/y rescale, density thinning or RGB/alpha recolor: only row translation.
      let travel=(1.-approach)*p.extent.w*select(${transportExtentRatio(false)},${transportExtentRatio(true)},p.controls.w>.5);
      let shift=travel/p.rect.z;
      let leftUV=uv+vec2f(shift,0.);
      let rightUV=uv-vec2f(shift,0.);
      let left=sampleOriginal(leftUV); let right=sampleOriginal(rightUV);
      let center=p.support.x+p.support.z*.5;
      let sideAA=.7/p.rect.z;
      let leftHalf=1.-smoothstep(center-sideAA,center+sideAA,leftUV.x);
      let rightHalf=smoothstep(center-sideAA,center+sideAA,rightUV.x);
      let materialOnset=smoothstep(rowArrival-${T.travelMs}.,rowArrival-${T.travelMs-30}.,time)*
        smoothstep(0.,${T.materialOnsetMs}.,time);
      let transportWeight=materialOnset*(1.-completed);
      let aL=left.a*leftHalf*transportWeight;
      let aR=right.a*rightHalf*transportWeight;
      let fixedA=s.a*completed;
      // These are mutually exclusive states of the same material, not overlaid copies.
      // At shift=0, leftHalf+rightHalf=1 and the original alpha is exactly preserved.
      let combinedA=fixedA+aL+aR;
      let premul=s.rgb*fixedA+left.rgb*aL+right.rgb*aR;
      actor=vec4f(premul/max(combinedA,.00001),combinedA);
      // Front emission is bound to the actual original alpha, independently of density.
      let front=clamp(1.-(time-${T.footArrivalMs}.)/${T.bodySweepMs}.,0.,1.);
      let distance=abs(y-front);
      let colored=exp(-pow(distance/max(2.0/p.extent.w,pixelNorm),2.));
      let core=exp(-pow(distance/max(.70/p.extent.w,pixelNorm*.6),2.));
      let onset=smoothstep(0.,65.,time);
      let frontEnvelope=onset*(1.-smoothstep(790.,865.,time));
      // Crown closure responds to completed material, then contracts to zero by expiry.
      let closure=exp(-pow((y-.06)/.075,2.))*smoothstep(700.,805.,time)*
        (1.-smoothstep(860.,1200.,time));
      let emissionSupport=s.a;
      radiation=emissionSupport*(vec3f(.28,2.3,1.62)*colored*2.1+
        vec3f(5.2,5.7,5.3)*core)*frontEnvelope;
      radiation+=emissionSupport*vec3f(.24,1.15,.72)*closure*1.65;
    }
  }
  var o: WorldOut;
  o.scene=vec4f(p.background.rgb*(1.-actor.a)+actor.rgb*actor.a,1.);
  o.emission=vec4f(radiation,0.);
  return o;
}`;
export const BLOOM_WGSL = /* wgsl */`
struct BlurParams { axis: vec4f };
@group(0) @binding(0) var input: texture_2d<f32>;
@group(0) @binding(1) var linearSampler: sampler;
@group(0) @binding(2) var<uniform> b: BlurParams;
struct V { @builtin(position) position: vec4f, @location(0) uv: vec2f };
@vertex fn fullscreen(@builtin(vertex_index) i:u32)->V {
  let xy=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));
  var o:V; o.position=vec4f(xy[i],0.,1.); o.uv=xy[i]*vec2f(.5,-.5)+.5; return o;
}
@fragment fn blur(v:V)->@location(0) vec4f {
  let step=b.axis.xy/vec2f(textureDimensions(input));
  var sum=vec3f(0.); var weights=0.;
  for(var i:i32=-6; i<=6; i++) {
    let w=exp(-f32(i*i)/10.);
    sum+=textureSampleLevel(input,linearSampler,v.uv+step*f32(i),0.).rgb*w;
    weights+=w;
  }
  return vec4f(sum/weights,0.);
}`;
export const PRESENT_WGSL = /* wgsl */`
struct P { controls: vec4f };
@group(0) @binding(0) var scene: texture_2d<f32>;
@group(0) @binding(1) var emission: texture_2d<f32>;
@group(0) @binding(2) var bloom: texture_2d<f32>;
@group(0) @binding(3) var linearSampler: sampler;
@group(0) @binding(4) var<uniform> p:P;
struct V { @builtin(position) position:vec4f, @location(0) uv:vec2f };
@vertex fn fullscreen(@builtin(vertex_index) i:u32)->V {
  let xy=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));
  var o:V; o.position=vec4f(xy[i],0.,1.); o.uv=xy[i]*vec2f(.5,-.5)+.5; return o;
}
fn encodeSRGB(c:vec3f)->vec3f {
  return select(1.055*pow(max(c,vec3f(0.)),vec3f(1./2.4))-.055,c*12.92,c<=vec3f(.0031308));
}
@fragment fn present(v:V)->@location(0) vec4f {
  let base=textureSampleLevel(scene,linearSampler,v.uv,0.).rgb;
  let direct=textureSampleLevel(emission,linearSampler,v.uv,0.).rgb;
  let observer=textureSampleLevel(bloom,linearSampler,v.uv,0.).rgb*p.controls.x*.8;
  let hdr=base+direct+observer;
  // Neutral highlight shoulder; original values <=1 stay unmodified when E is absent.
  let peak=max(max(hdr.r,hdr.g),hdr.b);
  let displayLinear=hdr/max(1.,peak);
  return vec4f(encodeSRGB(displayLinear),1.);
}`;
