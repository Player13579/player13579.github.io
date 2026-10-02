// 新規 ZERO 創作。単位: 長さ=準備済み actor 高 H、時刻=所有 E-ms。
export const PROFILE = Object.freeze({version:'teleport-white-smoke-gust-r5', durationEms:800,
  strokeEms:140, arrivalAtEms:180, departureSmokeEndEms:500, heightInActorH:0.58,
  scatterAlbedo:Object.freeze([1,1,1]), smokeEmission:0, sourceEmissionPeak:4.5, raySamples:16, lobeCount:7});
const clamp=x=>Math.max(0,Math.min(1,x));
export const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
function finitePoint(p){return p&&Number.isFinite(p.x)&&Number.isFinite(p.y);}
export function phaseAt(ageEms,role) {
  if(!Number.isFinite(ageEms)||!['departure','arrival'].includes(role))throw TypeError('Finite E age and visible role required');
  const start=role==='departure'?0:PROFILE.arrivalAtEms;
  const end=role==='departure'?PROFILE.departureSmokeEndEms:PROFILE.durationEms;
  if(ageEms<start||ageEms>=end)return Object.freeze({active:false,bodyActive:false,drawLiftedBody:false,heightH:0,bodyAlpha:0,smokeEnvelope:0,shadowAlpha:0,strokeU:0});
  const u=clamp((ageEms-start)/PROFILE.strokeEms), v=smooth(u);
  const h=PROFILE.heightInActorH*(role==='departure'?v:1-v);
  const alpha=role==='departure'?1-smooth((u-0.52)/0.48):smooth(u/0.58);
  // 煙の供給と散逸は短い身体の移動と別応答。開始時には急な白いポップを置かない。
  const envelope=role==='departure'?smooth(ageEms/48)*(1-smooth((ageEms-140)/360)):
    smooth((ageEms-start)/28)*(1-smooth((ageEms-250)/550));
  const bodyActive=role==='departure'?u<1:true;
  return Object.freeze({active:true,bodyActive,drawLiftedBody:u<1,heightH:bodyActive?h:0,bodyAlpha:bodyActive?alpha:0,
    smokeEnvelope:envelope,shadowAlpha:bodyActive?alpha*(0.25+0.75*(1-h/PROFILE.heightInActorH)):0,
    shadowRadiusScale:1+0.55*(h/PROFILE.heightInActorH),strokeU:u});
}
// これは創作の要求相。privacy/currentness/submit/bodyticketの権限付与ではない。
// 呼出元は current fully-prepared paired ticket が存在する時だけこの抑制要求を使える。
export function pairedBodyPhaseAt(ageEms) {
  if(!Number.isFinite(ageEms))throw TypeError('Finite owning E age required');
  return Object.freeze({phase:ageEms<0||ageEms>=320?'ordinary':ageEms<140?'departing':ageEms<180?'concealed':'arriving',
    requestsSuppression:ageEms>=0&&ageEms<320,drawDeparture:ageEms>=0&&ageEms<140,
    drawArrival:ageEms>=180&&ageEms<320});
}
// source は白煙材そのものとは別の、transported silhouette内部の短い白放射。
export function sourceAt(ageEms,role) {
  const s=phaseAt(ageEms,role),u=s.strokeU;
  const strength=s.drawLiftedBody?PROFILE.sourceEmissionPeak*smooth(u/.20)*(1-smooth((u-.52)/.48)):0;
  return Object.freeze({strength,bodyCoverage:s.bodyAlpha,heightH:s.heightH,
    color:Object.freeze([1,1,1]),sourceRadiusH:.18,sourceCenterInCrop:Object.freeze([.5,.52])});
}
export function lightingStateAt(ageEms,role,{sourceEnabled=true,nearbyEnabled=true,observerEnabled=true}={}) {
  if(![sourceEnabled,nearbyEnabled,observerEnabled].every(v=>typeof v==='boolean'))throw TypeError('Explicit diagnostic booleans required');
  const source=sourceAt(ageEms,role);
  return Object.freeze({...source,strength:sourceEnabled?source.strength:0,
    sourceEnabled,nearbyEnabled:sourceEnabled&&nearbyEnabled,observerEnabled:sourceEnabled&&observerEnabled});
}
// Host は同frameのopaque ticket brand/source/pose/geometry/device/currentnessを検証する。
// この関数はticketを生成せず、true/準備済みflagだけを認可結果として受け取らない。
export function resolvePairedBodyPhase({ageEms,frameId,ticket,pairIdentity,endpointOnly=false,provePreparedPairTicket}) {
  const phase=pairedBodyPhaseAt(ageEms);
  const ordinary=reason=>Object.freeze({phase:'ordinary',suppressOrdinary:false,drawDeparture:false,drawArrival:false,reason});
  if(!phase.requestsSuppression)return ordinary('outside-height-presentation');
  if(endpointOnly)return ordinary('endpoint-only-has-no-paired-body-authority');
  const validFrame=(typeof frameId==='string'&&frameId.length>0)||(Number.isSafeInteger(frameId)&&frameId>0);
  if(!ticket||!Object.isFrozen(ticket)||!pairIdentity||typeof pairIdentity!=='object'||!Object.isFrozen(pairIdentity)||
    !validFrame||typeof provePreparedPairTicket!=='function')return ordinary('missing-prepared-pair-ticket');
  // Exceptions propagate. A malformed proof is never a reason to hide a body.
  const proof=provePreparedPairTicket({ticket,frameId,pairIdentity,ageEms});
  if(!proof||typeof proof!=='object'||!Object.isFrozen(proof)||proof.ticket!==ticket||proof.frameId!==frameId||
    proof.pairIdentity!==pairIdentity||proof.validatedEAge!==ageEms||proof.kind!=='current-prepared-pair-body-proof')
    return ordinary('refused-current-prepared-pair-ticket');
  return Object.freeze({phase:phase.phase,suppressOrdinary:true,drawDeparture:phase.drawDeparture,
    drawArrival:phase.drawArrival,reason:'source-owned-paired-presentation'});
}
export function projectHeight({ground, heightH, actorWorldH, camera, zoom}) {
  if(!finitePoint(ground)||!finitePoint(camera)||![heightH,actorWorldH,zoom].every(Number.isFinite)||
    heightH<0||actorWorldH<=0||zoom<=0)throw TypeError('Ground anchor and nonnegative physical height required');
  return Object.freeze({ground:Object.freeze({x:ground.x,y:ground.y}),height:heightH*actorWorldH,
    contactScreen:Object.freeze({x:(ground.x-camera.x)*zoom,y:(ground.y-camera.y)*zoom}),
    bodyScreen:Object.freeze({x:(ground.x-camera.x)*zoom,y:(ground.y-camera.y-heightH*actorWorldH)*zoom})});
}
// 3D lobe 座標: x=左右、d=床の局所奥行き、z=高さ。camera は d<0 側。
// 発生域は固定 ground。煙だけが膨張し上方へ輸送される。身体を追跡して床 XY を動かさない。
import {WIND,SEEDS,windVelocityHPerSecond,windDisplacementH,rollingFold as rollingFoldDesign,buildSmokeLobes} from './gust-design.mjs';
export {WIND,SEEDS,windVelocityHPerSecond,windDisplacementH};
export const rollingFold=rollingFoldDesign;
export function smokeLobes(ageEms,role){return buildSmokeLobes(ageEms,role,phaseAt);}
export function smokeSupport(ageEms,role){
  const lobes=smokeLobes(ageEms,role);
  if(!lobes.length)return Object.freeze({minX:0,maxX:0,minDepth:0,maxDepth:0,minHeight:0,maxHeight:0});
  const pad=WIND.supportPaddingH;
  return Object.freeze({
    minX:Math.min(...lobes.map(l=>l.center[0]-l.radius[0]-Math.abs(l.tiltXZ||0)*l.radius[2]))-pad-WIND.gradientSupportXH,
    maxX:Math.max(...lobes.map(l=>l.center[0]+l.radius[0]+Math.abs(l.tiltXZ||0)*l.radius[2]))+pad+WIND.gradientSupportXH,
    minDepth:Math.min(...lobes.map(l=>l.center[1]-l.radius[1]))-pad,
    maxDepth:Math.max(...lobes.map(l=>l.center[1]+l.radius[1]))+pad,
    minHeight:Math.min(...lobes.map(l=>l.center[2]-l.radius[2]))-pad-WIND.gradientSupportHeightH,
    maxHeight:Math.max(...lobes.map(l=>l.center[2]+l.radius[2]))+pad+WIND.gradientSupportHeightH
  });
}
// finite 白煙 source-over、線形色。actor は別の元 UV/alpha パスとして前後体積の間に描く。
// params: rect=(groundScreenX,groundScreenY,actorScreenH,depthSide), optics=(envelope,ambient,sideLight,ageSeconds)
// depthSide=-1 front; +1 back。lobe center/density と radius は CPU の smokeLobes をそのまま upload。
export const SMOKE_WGSL = `
struct Params { rect:vec4f, optics:vec4f, source:vec4f, supportXDepth:vec4f, supportHeight:vec4f };
struct Lobe { centerDensity:vec4f, radiusPad:vec4f };
@group(0) @binding(0) var<uniform> p:Params;
@group(0) @binding(1) var<storage,read> lobes:array<Lobe>;
@group(0) @binding(2) var<storage,read> sourceFlux:array<f32>;
struct Out { @builtin(position) position:vec4f };
@vertex fn vs(@builtin(vertex_index) i:u32)->Out {
  var vertices=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));
  var o:Out; o.position=vec4f(vertices[i],0,1); return o;
}
fn field(q:vec3f)->f32 {
  if(q.z<0.0 || q.x<p.supportXDepth.x || q.x>p.supportXDepth.y || q.y<p.supportXDepth.z || q.y>p.supportXDepth.w || q.z<p.supportHeight.x || q.z>p.supportHeight.y){return 0.0;}
  var rho=0.0;
  for(var i=0u;i<7u;i=i+1u){
    let l=lobes[i]; let normalized=(q-l.centerDensity.xyz)/l.radiusPad.xyz;
    let v=vec3f(normalized.x-l.radiusPad.w*(l.radiusPad.z/l.radiusPad.x)*normalized.z,normalized.y,normalized.z);
    let radius2=dot(v,v);
    if(radius2<1.0){
      let core=1.0-radius2;
      // broad advected density folding; no frame-random sparkle/microtexture.
      let fold=0.86+0.14*sin(8.0*q.x+5.0*q.z-2.5*p.optics.w+f32(i)*1.4);
      rho=rho+l.centerDensity.w*core*core*fold;
    }
  }
  return rho;
}
@fragment fn fs(@builtin(position) frag:vec4f)->@location(0) vec4f {
  if(p.optics.x<=0.0 || p.rect.z<=0.0){return vec4f(0);}
  let uv=(frag.xy-p.rect.xy)/p.rect.z;
  let uvMin=0.35*p.supportXDepth.z-p.supportHeight.y;
  let uvMax=0.35*p.supportXDepth.w-p.supportHeight.x;
  if(uv.x<p.supportXDepth.x || uv.x>p.supportXDepth.y || uv.y<uvMin || uv.y>uvMax){return vec4f(0);}
  var trans=1.0; var radiance=vec3f(0);
  // The two depth passes cover the full CPU-derived lobe extent.
  let startDepth=select(0.0,p.supportXDepth.z,p.rect.w<0.0);
  let endDepth=select(p.supportXDepth.w,0.0,p.rect.w<0.0);
  let depthStep=(endDepth-startDepth)/16.0;
  for(var j=0u;j<16u;j=j+1u){
    let depth=startDepth+(f32(j)+0.5)*depthStep;
    let q=vec3f(uv.x,depth,-uv.y+0.35*depth);
    let density=field(q);
    let extinction=1.0-exp(-density*abs(depthStep)*9.0);
    let upper=field(q+vec3f(-0.045,0,0.065));
    let lower=field(q-vec3f(-0.045,0,0.065));
    let normalLight=clamp(0.52+(lower-upper)*1.6,0.22,0.90);
    // neutral white scatter; shading controls luminance only. emission=0.
    let offset=q-vec3f(p.source.z,p.source.w,p.source.y);
    // fluxは同frameの元alpha/maskからGPU積分し、CPUreadbackせずに束縛する。
    let localIncident=sourceFlux[0]*p.source.x/(4.0*3.14159265*(dot(offset,offset)+0.18*0.18));
    let light=clamp(p.optics.y+p.optics.z*normalLight,0.32,0.95)+localIncident;
    radiance=radiance+trans*extinction*vec3f(light);
    trans=trans*(1.0-extinction);
  }
  return vec4f(radiance,1.0-trans);
}`;
export const ACTOR_WGSL = `
struct Actor { affine0:vec4f, affine1:vec4f, localRect:vec4f, uvRect:vec4f, life:vec4f, sourceMask:vec4f };
@group(0) @binding(0) var<uniform> a:Actor;
@group(0) @binding(1) var source:texture_2d<f32>;
@group(0) @binding(2) var sourceSampler:sampler;
struct ActorOut { @builtin(position) position:vec4f, @location(0) uv:vec2f, @location(1) localUV:vec2f };
fn decodeSRGB(v:vec3f)->vec3f {
  return select(pow((v+vec3f(0.055))/1.055,vec3f(2.4)),v/12.92,v<=vec3f(0.04045));
}
@vertex fn vs(@builtin(vertex_index) i:u32)->ActorOut {
  var corners=array<vec2f,6>(vec2f(0,0),vec2f(1,0),vec2f(0,1),vec2f(0,1),vec2f(1,0),vec2f(1,1));
  let q=corners[i]; var o:ActorOut;
  let point=a.localRect.xy+q*a.localRect.zw;
  o.position=vec4f(a.affine0.x*point.x+a.affine0.z*point.y+a.affine1.x,
    a.affine0.y*point.x+a.affine0.w*point.y+a.affine1.y,0,1);
  o.uv=a.uvRect.xy+q*a.uvRect.zw; o.localUV=q; return o;
}
@fragment fn fs(o:ActorOut)->@location(0) vec4f {
  // life.y=1: sRGB-encoded premultiplied rgba8unorm atlas; 0: already-linear resource.
  // 実format/color contractで選び、推測で二重decodeしない。coverageは元sourceから保持する。
  let sampled=textureSample(source,sourceSampler,o.uv);
  let straight=sampled.rgb/max(sampled.a,0.000001);
  let linear=select(straight,decodeSRGB(straight),a.life.y>0.5);
  let local=(o.localUV-a.sourceMask.xy)/a.sourceMask.zw;
  let mask=exp(-2.0*dot(local,local));
  let whiteEmission=a.life.z*a.life.w*mask;
  return vec4f((linear+vec3f(whiteEmission))*sampled.a,sampled.a)*a.life.x;
}
@fragment fn emission(o:ActorOut)->@location(0) vec4f {
  let coverage=textureSample(source,sourceSampler,o.uv).a;
  let local=(o.localUV-a.sourceMask.xy)/a.sourceMask.zw;
  let e=a.life.z*a.life.w*exp(-2.0*dot(local,local))*coverage*a.life.x;
  return vec4f(vec3f(e),0.0);
}`;
// Floor receiver のworld座標/normal/materialはhostの実geometryから与える。
// sourceFlux は source descriptor の同じalpha/maskを元textureでsampleした積分値。
// 9点のquadratureは創作の有限光源近似。未知textureをメタデータだけで発光扱いしない。
export const SOURCE_FLUX_WGSL = `
struct FluxParams { uvRect:vec4f, mask:vec4f, sourceLifeArea:vec4f };
@group(0) @binding(0) var<uniform> f:FluxParams;
@group(0) @binding(1) var atlas:texture_2d<f32>;
@group(0) @binding(2) var atlasSampler:sampler;
@group(0) @binding(3) var<storage,read_write> flux:array<f32>;
@compute @workgroup_size(1) fn cs(){
  var integral=0.0;
  for(var y=0u;y<3u;y=y+1u){for(var x=0u;x<3u;x=x+1u){
    let delta=(vec2f(f32(x),f32(y))-vec2f(1.0))*0.75;
    let q=f.mask.xy+delta*f.mask.zw;
    if(all(q>=vec2f(0))&&all(q<=vec2f(1))){
      let coverage=textureSampleLevel(atlas,atlasSampler,f.uvRect.xy+q*f.uvRect.zw,0.0).a;
      integral=integral+coverage*exp(-2.0*dot(delta,delta));
    }
  }}
  // sourceLifeArea=(strength,bodyCoverage,enabled,visibleMaskAreaH2).
  flux[0]=integral*0.5625*f.sourceLifeArea.x*f.sourceLifeArea.y*f.sourceLifeArea.z*f.sourceLifeArea.w;
}`;
export const NEARBY_WGSL = `
struct ReceiverParams { sourcePositionRadius:vec4f, enabled:vec4f };
@group(0) @binding(0) var<uniform> r:ReceiverParams;
@group(0) @binding(1) var<storage,read> flux:array<f32>;
struct ReceiverIn { @builtin(position) position:vec4f, @location(0) point:vec3f,
 @location(1) normal:vec3f, @location(2) material:vec3f, @location(3) valid:f32 };
@fragment fn fs(i:ReceiverIn)->@location(0) vec4f {
  if(r.enabled.x<=0.0||i.valid<=0.0||flux[0]<=0.0){return vec4f(0);}
  let delta=r.sourcePositionRadius.xyz-i.point;
  let distance2=dot(delta,delta);
  let distance=sqrt(distance2);
  if(distance>=1.6 || dot(i.normal,i.normal)<=0.0){return vec4f(0);}
  let incidence=max(0.0,dot(normalize(i.normal),delta/max(distance,0.000001)));
  let finiteBoundary=1.0-smoothstep(1.0,1.6,distance);
  let irradiance=flux[0]*incidence*finiteBoundary/(4.0*3.14159265*(distance2+r.sourcePositionRadius.w*r.sourcePositionRadius.w));
  return vec4f(i.material*irradiance/3.14159265,0.0);
}`;
export const OBS_WGSL = `
struct ObserverParams { targetSize:vec4f, enabled:vec4f };
@group(0) @binding(0) var<uniform> o:ObserverParams;
@group(0) @binding(1) var emissionTexture:texture_2d<f32>;
@group(0) @binding(2) var emissionSampler:sampler;
struct Out { @builtin(position) position:vec4f };
@vertex fn vs(@builtin(vertex_index) i:u32)->Out {
  var v=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));var r:Out;r.position=vec4f(v[i],0,1);return r;
}
@fragment fn fs(@builtin(position) frag:vec4f)->@location(0) vec4f {
  if(o.enabled.x<=0.0){return vec4f(0);}
  let uv=frag.xy/o.targetSize.xy;var scatter=vec3f(0);
  for(var y=-1;y<=1;y=y+1){for(var x=-1;x<=1;x=x+1){
    let offset=vec2f(f32(x),f32(y))*o.targetSize.zw/o.targetSize.xy;
    let source=textureSampleLevel(emissionTexture,emissionSampler,uv+offset,0.0).rgb;
    let luminance=dot(source,vec3f(.2126,.7152,.0722));
    // white reference=1。強い実source以外でOBSは0。全sceneの明部を拾わない。
    let response=max(luminance-1.5,0.0)/max(luminance,.000001);
    scatter=scatter+source*response/9.0;
  }}
  return vec4f(scatter*0.055,0.0);
}`;
export async function createWebGPUKernels(device,format='rgba16float') {
  if(!device?.createShaderModule||!device?.createRenderPipelineAsync||!device?.createComputePipelineAsync)throw TypeError('Actual WebGPU device required');
  const diagnostics=[];
  const build=async(label,code,entry='fs',compute=false)=>{
    const module=device.createShaderModule({label,code});
    const info=await module.getCompilationInfo();
    const messages=[...info.messages].map(m=>({type:m.type,message:m.message,lineNum:m.lineNum,linePos:m.linePos,offset:m.offset,length:m.length}));
    diagnostics.push(Object.freeze({label,messages:Object.freeze(messages)}));
    if(messages.some(m=>m.type==='error')){
      const error=new Error('Teleport ZERO shader compilation failed: '+label);error.diagnostics=diagnostics;throw error;
    }
    if(compute)return device.createComputePipelineAsync({label,layout:'auto',compute:{module,entryPoint:'cs'}});
    return device.createRenderPipelineAsync({label,layout:'auto',vertex:{module,entryPoint:'vs'},
      fragment:{module,entryPoint:entry,targets:[{format,blend:{
        color:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'},
        alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'}}}]},primitive:{topology:'triangle-list'}});
  };
  const smoke=await build('teleport-zero-white-smoke',SMOKE_WGSL);
  const actor=await build('teleport-zero-authored-height-body',ACTOR_WGSL);
  const emission=await build('teleport-zero-silhouette-white-source',ACTOR_WGSL,'emission');
  const sourceFlux=await build('teleport-zero-silhouette-flux',SOURCE_FLUX_WGSL,'cs',true);
  const observer=await build('teleport-zero-source-bound-observer',OBS_WGSL);
  return Object.freeze({smoke,actor,emission,sourceFlux,observer,nearbyFragmentWGSL:NEARBY_WGSL,
    format,diagnostics:Object.freeze(diagnostics),profile:PROFILE});
}
// 共有 E clock が呼出元で正当に壁/AudioContext時間へ写像されたときだけ再生する。
// 再生関数ではなく有限の新規音源 PCM。random は固定 seed、voice は一回の burst。
export function sfxPCM(role,sampleRate=48000) {
  if(!['departure','arrival'].includes(role)||!Number.isInteger(sampleRate)||sampleRate<8000||sampleRate>192000)throw TypeError('SFX arguments');
  const seconds=role==='departure'?.17:.21, data=new Float32Array(Math.ceil(seconds*sampleRate));
  let seed=role==='departure'?0x1723:0x9841, low=0, previous=0;
  for(let i=0;i<data.length;i++){
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const n=seed/2147483648-1,t=i/sampleRate,u=t/seconds;
    low+=.085*(n-low); const band=low-previous;previous=low;
    const env=smooth(t/.012)*(1-smooth((u-.25)/.75));
    // 上昇は短く圧が抜け、下降は柔らかな着地の低域に収束。音程記号やglitterなし。
    data[i]=env*(.19*band+.028*Math.sin(2*Math.PI*(role==='departure'?200*t+135*t*t/seconds:300*t-85*t*t/seconds)));
  }
  data[0]=0;data[data.length-1]=0;return data;
}
