// New host adapter for the frozen r04 artist module. The ambient artist source
// remains byte-identical; this pass separates its base/receiver sum from OBS.
struct ArtistState { clock:vec4f, sourceGroups:vec4f, display:vec4f, observer:vec4f };
struct AckState { causes:vec4f, faceUv:array<mat3x3f,6> };
@group(0) @binding(0) var<uniform> artist:ArtistState;
@group(0) @binding(1) var original:texture_2d<f32>;
@group(0) @binding(2) var bitmapSampler:sampler;
@group(0) @binding(3) var receivedTexture:texture_2d<f32>;
@group(0) @binding(4) var sourceTexture:texture_2d<f32>;
@group(0) @binding(5) var opticsTexture:texture_2d<f32>;
@group(0) @binding(6) var<uniform> ack:AckState;

struct VOut { @builtin(position) position:vec4f, @location(0) uv:vec2f };
const CONSOLE_CONTOUR:array<vec2f,18> = array<vec2f,18>(
 vec2f(494.,108.),vec2f(958.,108.),vec2f(958.,190.),vec2f(981.,190.),vec2f(994.,212.),vec2f(1013.,294.),
 vec2f(1006.,354.),vec2f(982.,362.),vec2f(887.,364.),vec2f(874.,299.),vec2f(520.,299.),vec2f(518.,359.),
 vec2f(451.,359.),vec2f(435.,351.),vec2f(427.,294.),vec2f(431.,218.),vec2f(442.,195.),vec2f(494.,192.));
const RACK_CONTOUR:array<vec2f,18> = array<vec2f,18>(
 vec2f(1092.,570.),vec2f(1234.,570.),vec2f(1243.,678.),vec2f(1217.,847.),vec2f(1078.,848.),vec2f(1067.,756.),vec2f(1074.,682.),vec2f(1087.,601.),
 vec2f(1087.,601.),vec2f(1087.,601.),vec2f(1087.,601.),vec2f(1087.,601.),vec2f(1087.,601.),vec2f(1087.,601.),vec2f(1087.,601.),vec2f(1087.,601.),vec2f(1087.,601.),vec2f(1087.,601.));
@vertex fn vertex(@builtin(vertex_index)i:u32)->VOut {
  let q=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.))[i];
  var o:VOut;o.position=vec4f(q,0.,1.);o.uv=vec2f((q.x+1.)*.5,(1.-q.y)*.5);return o;
}
fn smoothCurve(a:f32,b:f32,x:f32)->f32 { let t=clamp((x-a)/(b-a),0.,1.);return t*t*(3.-2.*t); }
fn envelope(age:f32)->f32 {
  if(age<0.||age>=1.45){return 0.;}
  if(age<.1){return smoothCurve(0.,.1,age);}
  if(age<1.08){return 1.;}
  return 1.-smoothCurve(1.08,1.45,age);
}
fn faceUv(point:vec2f,index:u32)->vec2f {
  let h=ack.faceUv[index]*vec3f(point,1.);
  return h.xy/max(abs(h.z),1e-7)*sign(h.z);
}
fn sweep(age:f32,delay:f32,v:f32)->f32 {
  let local=age-.1-delay;
  if(local<0.||local>.8){return 0.;}
  let center=-.30+(local/.8)*1.6;
  return 1.-smoothCurve(.11,.19,abs(v-center));
}
fn rect(p:vec2f,r:vec4f)->f32 {
  return select(0.,1.,p.x>=r.x&&p.y>=r.y&&p.x<=r.x+r.z&&p.y<=r.y+r.w);
}
fn signedDistanceOutline(p:vec2f,points:array<vec2f,18>,count:u32)->f32 {
  var best=1e9;var inside=false;
  for(var i=0u;i<count;i++){
    let a=points[i];let b=points[(i+1u)%count];let edge=b-a;
    let t=clamp(dot(p-a,edge)/max(dot(edge,edge),1e-8),0.,1.);
    best=min(best,distance(p,a+edge*t));
    if((a.y>p.y)!=(b.y>p.y)){
      let crossingX=a.x+(b.x-a.x)*(p.y-a.y)/(b.y-a.y);
      if(p.x<crossingX){inside=!inside;}
    }
  }
  return select(best,-best,inside);
}
fn rimEnvelope(ageEms:f32)->f32 {
  if(ageEms<=0.||ageEms>=1450.){return 0.;}
  return smoothCurve(0.,100.,ageEms)*(1.-smoothCurve(780.,1450.,ageEms))*
    (.42+.58*exp(-pow((ageEms-180.)/190.,2.)));
}
fn outlineRim(p:vec2f,points:array<vec2f,18>,count:u32,ageEms:f32)->vec3f {
  let d=signedDistanceOutline(p,points,count);
  // Derivatives must be evaluated before distance-dependent discard branches.
  let aa=max(fwidth(d)*.5,1e-4);
  if(ageEms<=0.||ageEms>=1450.){return vec3f(0.);}
  if(d>0.||d < -3.){return vec3f(0.);}
  let s=clamp(1.+d/3.,0.,1.);let band=s*s*(3.-2.*s);
  let core=exp(-pow(d/.85,2.));
  let coverage=1.-smoothCurve(-aa,aa,d);let envelope=rimEnvelope(ageEms);
  let material=vec3f(.14,.62,1.)*(1.55*band);
  let coreRGB=vec3f(.84,.98,1.)*(3.40*core);
  return (material+coreRGB)*(envelope*coverage);
}
fn trianglePulse(age:f32,peak:f32,halfWidth:f32)->f32 {
  return max(0.,1.-abs(age-peak)/halfWidth);
}
struct Combined { @location(0) scene:vec4f, @location(1) source:vec4f, @location(2) ambientObsDelta:vec4f };
@fragment fn combine(in:VOut)->Combined {
  let p=in.uv*vec2f(1340.,1174.);
  let base=textureSampleLevel(original,bitmapSampler,in.uv,0.).rgb;
  let received=max(textureLoad(receivedTexture,vec2i(p),0).rgb+textureLoad(sourceTexture,vec2i(p),0).rgb,vec3f(0.))*max(artist.observer.w,0.);
  let through=max(textureLoad(receivedTexture,vec2i(p),0).rgb+textureLoad(sourceTexture,vec2i(p),0).rgb+
      textureLoad(opticsTexture,vec2i(p),0).rgb,vec3f(0.))*max(artist.observer.w,0.);
  let ambient=base+(vec3f(1.)-exp(-received));
  let obsDelta=exp(-received)-exp(-through);
  var delta=vec3f(0.);
  let consoleAge=ack.causes.x;
  let consoleEnv=envelope(consoleAge);
  let faceDelays=array<f32,6>(0.,.035,.070,.105,.140,.175);
  for(var i=0u;i<6u;i++) {
    let uv=faceUv(p,i);
    if(uv.x>=0.&&uv.x<=1.&&uv.y>=0.&&uv.y<=1.) {
      let moving=sweep(consoleAge,faceDelays[i],uv.y);
      let held=select(0.,1.,consoleAge>=.9&&consoleAge<1.08);
      delta+=base*(.65*consoleEnv*moving+.12*consoleEnv*held)+vec3f(.025,.065,.090)*(consoleEnv*moving);
    }
  }
  let rackAge=ack.causes.y;
  let rackEnv=envelope(rackAge);
  let blueBoxes=array<vec4f,5>(vec4f(1198.,694.,7.,7.),vec4f(1194.,718.,7.,7.),
    vec4f(1191.,744.,7.,7.),vec4f(1188.,770.,7.,7.),vec4f(1184.,796.,7.,7.));
  let bluePeaks=array<f32,5>(.220,.390,.560,.730,.900);
  for(var i=0u;i<5u;i++) {
    if(rect(p,blueBoxes[i])>.5) {
      let pulse=trianglePulse(rackAge,bluePeaks[i],.140)*rackEnv;
      delta+=base*(.45*pulse)+vec3f(.012,.035,.070)*pulse;
    }
  }
  if(rect(p,vec4f(1137.,692.,12.,7.))>.5) {
    let pulse=trianglePulse(rackAge,1.050,.180)*rackEnv;
    delta+=base*(.45*pulse)+vec3f(.015,.055,.025)*pulse;
  }
  // Distinct successful transaction ages drive exact equipment silhouettes;
  // screen/LED supports are not used as substitute outer-contour masks.
  delta+=outlineRim(p,CONSOLE_CONTOUR,18u,ack.causes.z);
  delta+=outlineRim(p,RACK_CONTOUR,8u,ack.causes.w);
  var out:Combined;
  out.scene=vec4f(ambient+delta,1.);
  out.source=vec4f(delta,0.);
  out.ambientObsDelta=vec4f(obsDelta,0.);
  return out;
}
