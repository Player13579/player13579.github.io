// r4: unsplit original-RGBA row transport; one continuous material region.
import {HANDOFF_TIMING as T,transportExtentRatio} from './handoff-state.mjs';
import {SPARKLE_ZERO,ZERO_WORLD_HELPERS,ZERO_OBSERVER_HELPERS} from './sparkle-zero.mjs';
import {BODY_COMPLETION} from './completion-design.mjs';
import {SETTLEMENT} from './settlement-design.mjs';
import {LOCAL_FIXATION as F} from './local-fixation.mjs';
export const WORLD_WGSL = /* wgsl */`
struct Params {
  extent: vec4f, // physical width/height, DPR, original-alpha-support CSS height
  rect: vec4f, // same-frame registered original sprite rect, CSS pixels
  crop: vec4f,
  support: vec4f,
  controls: vec4f, // phase ms, sourceEnabled, observerEnabled, reducedMotion
  state: vec4f, // actorVisible, sourceActive, glintsEnabled, reserved
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
// Host ABI: positions are backing pixels; alpha lookup maps through the same
// verified registered sprite rectangle and crop used by scene reconstruction.
fn zsAlpha(positionPx: vec2f) -> f32 {
  let css = positionPx / p.extent.z;
  return sampleOriginal((css-p.rect.xy)/p.rect.zw).a;
}
${ZERO_WORLD_HELPERS}
struct WorldOut { @location(0) scene: vec4f, @location(1) emission: vec4f, @location(2) glints: vec4f };
@fragment fn reconstruct(v: VertexOut) -> WorldOut {
  let css=v.position.xy/p.extent.z;
  let uv=(css-p.rect.xy)/p.rect.zw;
  var actor=vec4f(0.); var radiation=vec3f(0.); var pointRadiation=vec3f(0.);
  let sourceOn=p.controls.y>.5 && p.state.y>.5;
  let time=p.controls.x;
  if p.state.x>.5 && uv.y>=0. && uv.y<1. && uv.x>-.48 && uv.x<1.48 {
    let s=sampleOriginal(uv);
    if !sourceOn { actor=s; }
    else {
      let y=(uv.y-p.support.y)/p.support.w;
      let pixelNorm=.7/p.extent.w;
      // Complete original rows approach beside their registered body support.
      let rowArrival=${T.footArrivalMs}.+(1.-y)*${T.bodySweepMs}.;
      let approach=smoothstep(rowArrival-${T.travelMs}.,rowArrival,time);
      // Fixation starts only when transport has reached the exact original x.
      let completed=smoothstep(rowArrival,rowArrival+${T.fixMs}.,time);
      // One common path: no left/right cut, no artificial central vacuum.
      // Max |dx/dy|=.45 (.18 reduced); no fixation until the exact original x.
      // No x/y rescale, density thinning or RGB/alpha recolor: only row translation.
      let travel=(1.-approach)*p.extent.w*select(${transportExtentRatio(false)},${transportExtentRatio(true)},p.controls.w>.5);
      let shift=travel/p.rect.z;
      let incomingUV=uv+vec2f(shift,0.);
      let incoming=sampleOriginal(incomingUV);
      let materialOnset=smoothstep(rowArrival-${T.travelMs}.,rowArrival-${T.travelMs-30}.,time)*
        smoothstep(0.,${T.materialOnsetMs}.,time);
      let transportWeight=materialOnset*(1.-completed);
      let incomingA=incoming.a*transportWeight;
      let fixedA=s.a*completed;
      // At every pre-arrival row, use one complete cross-section, including its center.
      // At shift=0, incoming and fixed are complementary states of the same RGBA.
      let combinedA=fixedA+incomingA;
      let premul=s.rgb*fixedA+incoming.rgb*incomingA;
      actor=vec4f(premul/max(combinedA,.00001),combinedA);
      // Front emission is bound to the actual original alpha, independently of density.
      let front=clamp(1.-(time-${T.footArrivalMs}.)/${T.bodySweepMs}.,0.,1.);
      let distance=abs(y-front);
      let colored=exp(-pow(distance/max(2.0/p.extent.w,pixelNorm),2.));
      let core=exp(-pow(distance/max(.70/p.extent.w,pixelNorm*.6),2.));
      let onset=smoothstep(0.,65.,time);
      let frontEnvelope=onset*(1.-smoothstep(790.,865.,time));
      let emissionSupport=s.a;
      radiation=emissionSupport*(vec3f(.28,2.3,1.62)*colored*2.1+
        vec3f(5.2,5.7,5.3)*core)*frontEnvelope;
      // Approximate alpha-bound surface edge from the actual sampled RGBA.
      // The same registered CSS neighbor distance applies on both axes; this
      // is not a physical 3D Fresnel term and cannot extend outside alpha.
      let completionEnvelope=smoothstep(${BODY_COMPLETION.beginsMs}.,${BODY_COMPLETION.riseEndMs}.,time)*
        (1.-smoothstep(${BODY_COMPLETION.fadeBeginsMs}.,${BODY_COMPLETION.endsMs}.,time));
      // Birth light starts only after this exact row's material transport/fixation.
      let fixedAge=time-rowArrival-${T.fixMs}.;
      let localFixation=smoothstep(0.,${F.riseMs}.,fixedAge)*
        (1.-smoothstep(${F.fadeBeginsMs}.,${F.endsMs}.,fixedAge));
      if (completionEnvelope>0. || localFixation>0.) && s.a>0. {
        let widthCSS=${BODY_COMPLETION.contourWidthH64}*(p.extent.w/64.);
        let neighborUV=vec2f(widthCSS)/p.rect.zw;
        let alphaLeft=sampleOriginal(uv-vec2f(neighborUV.x,0.)).a;
        let alphaRight=sampleOriginal(uv+vec2f(neighborUV.x,0.)).a;
        let alphaUp=sampleOriginal(uv-vec2f(0.,neighborUV.y)).a;
        let alphaDown=sampleOriginal(uv+vec2f(0.,neighborUV.y)).a;
        let edgeAlpha=s.a*max(0.,s.a-min(min(alphaLeft,alphaRight),min(alphaUp,alphaDown)));
        let settlementCentre=1.-(time-${SETTLEMENT.beginsMs}.)/${SETTLEMENT.sweepMs}.;
        let settlementDistance=(y-settlementCentre)/${SETTLEMENT.widthNormalized};
        let settlementGain=select(0.,${SETTLEMENT.baseline}+${SETTLEMENT.movingGain}*exp(-.5*settlementDistance*settlementDistance),y>=0. && y<=1.);
        radiation+=edgeAlpha*vec3f(${BODY_COMPLETION.sourceRGB.join(',')})*${BODY_COMPLETION.sourceGain}*
          (completionEnvelope*settlementGain+localFixation*${F.gain});
      }
    }
  }
  // New zero-design sparkles sample the verified registered alpha support.
  // The support ABI converts the same sprite support to backing-pixel bounds.
  let physicalSupport=vec4f((p.rect.xy+p.support.xy*p.rect.zw)*p.extent.z,
    p.support.zw*p.rect.zw*p.extent.z);
  if sourceOn && p.state.x>.5 && p.state.z>.5 {
    pointRadiation=zsPointRadiation(v.position.xy,physicalSupport,time,p.extent.z,p.extent.w,true);
  }
  var o: WorldOut;
  o.scene=vec4f(p.background.rgb*(1.-actor.a)+actor.rgb*actor.a,1.);
  o.emission=vec4f(radiation,0.);
  o.glints=vec4f(pointRadiation,0.);
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
struct P { controls: vec4f, extent: vec4f, rect: vec4f, crop: vec4f, support: vec4f };
@group(0) @binding(0) var scene: texture_2d<f32>;
@group(0) @binding(1) var emission: texture_2d<f32>;
@group(0) @binding(2) var bloom: texture_2d<f32>;
@group(0) @binding(3) var zsSampler: sampler;
@group(0) @binding(4) var<uniform> p:P;
@group(0) @binding(5) var zsSourceTex: texture_2d<f32>;
struct V { @builtin(position) position:vec4f, @location(0) uv:vec2f };
@vertex fn fullscreen(@builtin(vertex_index) i:u32)->V {
  let xy=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));
  var o:V; o.position=vec4f(xy[i],0.,1.); o.uv=xy[i]*vec2f(.5,-.5)+.5; return o;
}
fn encodeSRGB(c:vec3f)->vec3f {
  return select(1.055*pow(max(c,vec3f(0.)),vec3f(1./2.4))-.055,c*12.92,c<=vec3f(.0031308));
}
${ZERO_OBSERVER_HELPERS}
@fragment fn present(v:V)->@location(0) vec4f {
  let base=textureSampleLevel(scene,zsSampler,v.uv,0.).rgb;
  let direct=textureSampleLevel(emission,zsSampler,v.uv,0.).rgb;
  let bloomObserver=textureSampleLevel(bloom,zsSampler,v.uv,0.).rgb*p.controls.x*.8;
  let pixel=v.position.xy;
  let sourceObserver=zsObserve(pixel,p.extent.xy,p.support,p.extent.z,p.extent.w,p.controls.x>.5);
  let hdr=base+direct+bloomObserver+sourceObserver;
  // Neutral highlight shoulder; original values <=1 stay unmodified when E is absent.
  let peak=max(max(hdr.r,hdr.g),hdr.b);
  let displayLinear=hdr/max(1.,peak);
  return vec4f(encodeSRGB(displayLinear),1.);
}`;
