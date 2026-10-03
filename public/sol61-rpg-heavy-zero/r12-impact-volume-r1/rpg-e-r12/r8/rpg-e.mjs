// GPT-6.1-Sol narrow RPG impact PH r12; adopted R9 source and direction jets retained. Preview causal protocol only; not a game port.
export const VERSION = 'sol-rpg-heavy-quality-r12-impact';
export const MAX_ATTEMPTS = 64;
const finite = n => typeof n === 'number' && Number.isFinite(n);
const point = p => p && finite(p.x) && finite(p.y);
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const freeze = v => { if (v && typeof v === 'object') { Object.values(v).forEach(freeze); Object.freeze(v); } return v; };
const POSES = freeze([
  { sha256: '2a2ca10e63b7e91f8379a0d0cf75dfe6994d9e904d6402c0eeb0e0c287a7c465', pivot: [850,1207], mouth:[397,408],rear:[1184,452] },
  { sha256: '857c1a936960b6cefbda60efda1205fa39fa4cdf7ba8682b0cfd6db4e4263643', pivot: [850,1210], mouth:[388,410],rear:[1198,452] }
]);
export function poseMouth(lease, motionAgeMs) {
  if (!lease || lease.identity !== 'male-bot' || lease.direction !== 'left' ||
      lease.motionId !== 'gunner-rpg' || !point(lease.ground) ||
      !finite(lease.scale) || lease.scale <= 0 || !finite(motionAgeMs) || motionAgeMs < 0)
    throw new TypeError('Exact approved male-left physical pose lease required');
  const index = motionAgeMs < 65 ? 0 : 1; // after260 retain source mouth only, never body action
  const pose = POSES[index];
  if (lease.poseHashes?.[index] !== pose.sha256) throw new TypeError('Wrong authored pose hash');
  return freeze({ x: lease.ground.x + (pose.mouth[0]-pose.pivot[0])*lease.scale,
    y: lease.ground.y + (pose.mouth[1]-pose.pivot[1])*lease.scale });
}
export function poseRearExhaust(lease,motionAgeMs) {
  poseMouth(lease,motionAgeMs);const p=POSES[motionAgeMs<65?0:1];
  return freeze({x:lease.ground.x+(p.rear[0]-p.pivot[0])*lease.scale,y:lease.ground.y+(p.rear[1]-p.pivot[1])*lease.scale});
}
export function plan({ receipt, poseLease, rawActorClock, motionAgeMs, context, reducedMotion=false }) {
  const r = receipt, s = r?.source;
  const fail = reason => freeze({ status:'blocked', reason, version:VERSION });
  if (!r || r.schema !== 'preview-rpg-use-r1' || r.provenance !== 'hypothetical-preview-only' ||
      typeof r.causeId !== 'string' || !r.causeId || !s || typeof s.id !== 'string' || !s.id ||
      s.type !== 'gunner-rpg' || !['normal','enhance'].includes(s.variant) ||
      s.radius !== (s.variant === 'enhance' ? 360 : 300) || s.durationMs !== 0 || r.localDurationMs !== 1200 ||
      !point(s) || !finite(s.at) || s.at < 0 || !finite(r.eClockStartedAt) || r.eClockStartedAt < 0 ||
      !finite(rawActorClock) || rawActorClock < 0 || !finite(motionAgeMs) || motionAgeMs < 0 ||
      !context || typeof context.hidden!=='boolean' || typeof context.sensoryBlocked!=='boolean' ||
      typeof context.sourceVisible!=='boolean' || !r.roomId || r.roomId !== context.roomId || r.eClockRoomId !== context.roomId ||
      r.sessionGeneration !== context.sessionGeneration || !Number.isSafeInteger(r.sessionGeneration) ||
      r.sessionGeneration < 0 || !r.actorId || s.playerId !== r.actorId || typeof r.soundId !== 'string' || !r.soundId ||
      poseLease?.actorId !== r.actorId || poseLease?.sourceEffectId !== s.id || poseLease?.causeId !== r.causeId ||
      !Array.isArray(r.attempts) || r.attempts.length > MAX_ATTEMPTS)
    return fail('invalid-source-clock-or-pose-owner');
  const ids = new Set();
  for (const a of r.attempts) {
    if (!a || !a.id || ids.has(a.id) || a.causeId !== r.causeId || !point(a.position) ||
        !['preview-physical-impact','preview-defended','preview-rejected'].includes(a.outcome) ||
        typeof a.visible !== 'boolean') return fail('invalid-attempt-proof');
    ids.add(a.id);
  }
  let mouth;
  try { mouth=poseMouth(poseLease,motionAgeMs); } catch (_) { return fail('invalid-authored-mouth'); }
  const age = rawActorClock-r.eClockStartedAt;
  if (age < 0 || age >= 1200) return freeze({ status:'omitted', reason:age<0?'not-started':'expired', version:VERSION });
  if (!['playing'].includes(context.phase) || context.hidden || context.sensoryBlocked)
    return freeze({ status:'omitted', reason:'presentation-gate', version:VERSION });
  if (typeof context.sourceVisible !== 'boolean') return fail('missing-source-privacy');
  const enhance=s.variant==='enhance', fields=[], endpoints=[];
  const launchEnd=enhance?400:360, impactEnd=enhance?1100:1040;
  // Coverage fields are local analytic geometry, never authoritative projectiles.
  const add=(center,kind,sx,sy,endpoint)=>fields.push({ center,axis:{x:-1,y:0},kind,sx,sy,age,
    enhance:enhance?1:0,reduced:reducedMotion?1:0,endpoint });
  if (context.sourceVisible && age < launchEnd) {
    add(mouth,0,80*(enhance?1.18:1),43,'launch');
    add(poseRearExhaust(poseLease,motionAgeMs),1,58*(enhance?1.20:1),42,'launch');
    endpoints.push({ role:'launch',id:s.id,position:mouth });
  }
  for (const a of r.attempts) if (a.visible && a.outcome==='preview-physical-impact' && age < impactEnd) {
    if(age < (enhance?700:620)) add(a.position,2,105,76,a.id); add(a.position,3,122,92,a.id);
    endpoints.push({ role:'impact',id:a.id,position:a.position });
  }
  // Only explicitly supplied physical3D source positions can illuminate surfaces.
  const lights = endpoints.map(e => {
    const p = r.lightPositions?.[e.id];
    if (!p || ![p.x,p.y,p.z].every(finite)) return null;
    const duration=e.role==='launch'?launchEnd:impactEnd;
    const gain=Math.pow(Math.max(0,1-age/duration),2)*Math.min(1,age/18);
    return { position:[p.x,p.y,p.z], color:[1,0.48,0.12], intensity:gain*(e.role==='launch'?1.2:1.8), range:105 };
  }).filter(Boolean);
  return freeze({ status: fields.length ? 'planned':'omitted', reason:fields.length?'preview-only':'coverage-ended',
    version:VERSION, scope:'preview-only', sourceEffectId:s.id,causeId:r.causeId,roomId:r.roomId,
    sessionGeneration:r.sessionGeneration, age, motionAgeMs, bodyActionActive:motionAgeMs<260,
    fields,endpoints,lights, soundId:r.soundId, snapshot:JSON.stringify({receipt,poseLease,context}) });
}
export function assertCurrent(prepared,input) {
  if (prepared.snapshot !== JSON.stringify({receipt:input.receipt,poseLease:input.poseLease,context:input.context}))
    throw Object.assign(new Error('RPG preview source/pose/privacy lease changed'),{code:'DVA_RPG_STALE_PREVIEW'});
}

export const VFX_WGSL = /* wgsl */`
struct View { geometry:vec4f, clock:vec4f }; // width,height,cameraX,cameraY; zoom
struct Field { centerKind:vec4f, axisSize:vec4f, state:vec4f };
@group(0) @binding(0) var<uniform> view:View;
@group(0) @binding(1) var<storage,read> fields:array<Field>;
struct Out { @builtin(position) position:vec4f, @location(0) local:vec2f, @location(1) @interpolate(flat) index:u32 };
@vertex fn vs(@builtin(vertex_index) v:u32,@builtin(instance_index) i:u32)->Out {
 let corners=array<vec2f,6>(vec2f(-1,-1),vec2f(1,-1),vec2f(-1,1),vec2f(-1,1),vec2f(1,-1),vec2f(1,1));
 let f=fields[i]; let uv=corners[v]; let axis=f.axisSize.xy; let side=vec2f(-axis.y,axis.x);
 let world=f.centerKind.xy+axis*uv.x*f.axisSize.z+side*uv.y*f.axisSize.w;
 let px=(world-view.geometry.zw)*view.clock.x+view.geometry.xy*0.5;
 var o:Out;o.position=vec4f(px.x/view.geometry.x*2-1,1-px.y/view.geometry.y*2,0,1);o.local=uv;o.index=i;return o;
}
fn blob(p:vec3f,c:vec3f,r:vec3f)->f32 { return length((p-c)/r); }
// Low-frequency, advected folds. No pixel noise, random speckles or micro-fragment carpet.
fn folds(p:vec3f,t:f32)->f32 {
 return 0.52*sin(p.x*5.1+p.y*3.4+t*1.7)+0.30*sin(p.y*6.3-p.z*3.2-t*1.1)+0.18*sin(p.z*7.1+p.x*2.8+t*0.9);
}
// Front-to-back emission/absorption integration of a finite local volume.
// R6: open combustion interfaces and carrier transport replace the R5 enclosed medium.
// R8: contact-rooted pressure unfolding; two thick curled near/far combustion media become transported smoke.
fn retainedSmoke(p:vec2f,t:f32,en:f32,reduced:f32,smoke:bool)->vec4f {
 let fireLife=pow(max(0.0,1.0-t/mix(620.0,700.0,en)),1.1);
 let smokeLife=smoothstep(220.0,500.0,t)*pow(max(0.0,1.0-t/mix(1040.0,1100.0,en)),0.66);
 let life=select(fireLife,smokeLife,smoke)*smoothstep(0.0,15.0,t);
 let unfold=smoothstep(8.0,120.0,t);let transport=smoothstep(170.0,980.0,t);let motion=1.0-reduced*0.67;
 let boundary=(1.0-smoothstep(0.88,1.0,abs(p.x)))*(1.0-smoothstep(0.90,1.0,abs(p.y)));
 var radiance=vec3f(0.0);var transmittance=1.0;
 for(var i=0u;i<20u;i++) {
  let z=1.0-(f32(i)+0.5)*0.1;var density=0.0;var weightedColor=vec3f(0.0);
  for(var k=0u;k<2u;k++) {
   let side=select(-1.0,1.0,k==1u);let phase=f32(k)*1.6;
   let cx=side*(0.12*unfold+0.08*transport)*motion;
   let cy=0.03+0.085*unfold+0.28*transport*motion;
   let rx=select(0.32+0.22*unfold-0.06*transport,0.40+0.12*unfold+0.10*transport,smoke);
   let ry=select(0.20+0.12*unfold+0.08*transport,0.23+0.13*unfold+0.14*transport,smoke);
   let u=(p.x-cx)/rx;
   let bend=0.12*sin(u*2.4+phase-t*0.005)*(0.3+0.7*unfold)*motion;
   let v=(p.y-cy-bend)/ry;
   let envelope=exp(-pow(u,4.0)-pow(v,4.0))*boundary;
   let fold=0.70+0.30*pow(cos(u*2.4+v*2.7-t*0.005+phase),2.0);
   let airX=0.08*sin((p.y-cy)*3.0-t*0.004)*motion;
   let airY=0.12+0.22*transport*motion;
   let cleftWidth=select(0.11,0.14,smoke);
   let cleft=exp(-pow((p.x-airX-0.24*(p.y-cy))/cleftWidth,2.0)-pow((p.y-airY)/0.31,2.0));
   let layerDepth=select(0.32,-0.34,k==1u)+0.11*sin(u*2.2+v*1.8-t*0.003+phase)*motion;
   let thickness=select(0.22+0.07*unfold,0.29+0.10*transport,smoke);
   let dz=(z-layerDepth)/thickness;
   let d=envelope*fold*(1.0-0.94*cleft*unfold)*exp(-dz*dz);
   var color=vec3f(0.0);
   if(smoke) {
    let rawNormal=vec3f(u/rx+0.24*sin(v*2.1-t*0.004+phase),v/ry,dz/thickness);
    let normal=rawNormal/max(length(rawNormal),0.0001);
    let key=clamp(dot(normal,normalize(vec3f(-0.45,0.70,0.60))),0.0,1.0);
    color=mix(vec3f(0.025,0.030,0.038),vec3f(0.50,0.52,0.55),pow(key,1.35));
    color+=vec3f(0.90,0.25,0.02)*exp(-t/170.0)*exp(-pow(v+0.30,2.0));
   }else {
    let heat=exp(-t/460.0);let hot=exp(-pow(u*0.85,2.0)-pow(v+0.15,2.0));
    let pulse=1.0+0.80*exp(-pow((t-80.0)/65.0,2.0));
    let nearHot=select(vec3f(16.0,10.4,4.0),vec3f(13.0,4.4,0.60),k==1u);
    let crease=exp(-pow((v-0.28*sin(u*2.0-t*0.004+phase))/0.34,2.0));
    color=mix(vec3f(2.8,0.13,0.008),nearHot,hot*heat)*pulse+vec3f(7.0,2.3,0.08)*crease*heat;
   }
   density+=d;weightedColor+=d*color;
  }
  let opacity=1.0-exp(-density*select(0.38,0.34,smoke)*life);let color=weightedColor/max(density,0.00001);
  radiance+=transmittance*opacity*color;transmittance*=1.0-opacity;
 }
 return vec4f(radiance,1.0-transmittance);
}

// Connected3D gas volume. The pressure lip shares the material boundary.
fn volume(p:vec2f,t:f32,en:f32,reduced:f32,smoke:bool)->vec4f {
 if(smoke){return retainedSmoke(p,t,en,reduced,true);}
 let life=pow(max(0.0,1.0-t/mix(620.0,700.0,en)),1.1)*smoothstep(0.0,15.0,t);
 let expand=smoothstep(8.0,180.0,t);let roll=smoothstep(60.0,390.0,t);
 let motion=1.0-reduced*0.67;
 let boundary=(1.0-smoothstep(0.88,1.0,abs(p.x)))*(1.0-smoothstep(0.90,1.0,abs(p.y)));
 let heat=exp(-t/460.0);let pulse=1.0+0.80*exp(-pow((t-80.0)/65.0,2.0));
 let center=vec3f(0.025*roll*motion,0.015+0.11*expand+0.08*roll*motion,0.0);
 let radius=vec3f(0.12+0.39*expand,0.095+0.22*expand,0.22+0.29*expand);
 var radiance=vec3f(0.0);var transmittance=1.0;
 for(var i=0u;i<20u;i++) {
  let z=1.0-(f32(i)+0.5)*0.1;let q=vec3f(p,z);
  let central=length((q-center)/radius);
  let nearCenter=center+vec3f(0.16*expand*motion,0.08*expand,0.20*expand);
  let farCenter=center+vec3f(-0.21*expand*motion,0.015+0.12*roll,-0.23*expand);
  let nearRadius=radius*vec3f(0.70,0.83,0.80);
  let farRadius=radius*vec3f(0.76,0.72,0.86);
  let nearDistance=length((q-nearCenter)/nearRadius);
  let farDistance=length((q-farCenter)/farRadius);
  // Broad unequal folds move through3D; no repeated projected arc/tongue.
  let advected=(q-center)/radius;
  let fold=(0.060*sin(advected.x*3.1+advected.y*2.4+z*3.0-t*0.004)+0.035*sin(advected.y*3.6-z*2.7+t*0.003))*expand*motion;
  let distance=min(central,min(nearDistance,farDistance))+fold;
  let gas=1.0-smoothstep(0.72,1.04,distance);
  let lip=exp(-pow((distance-0.80)/0.16,2.0))*smoothstep(12.0,65.0,t)*(1.0-smoothstep(280.0,470.0,t));
  let pocket=exp(-pow((q.x-0.13*expand-0.25*q.y)/(0.12+0.06*expand),2.0)-pow((q.y-0.12-0.10*expand)/0.15,2.0)-pow((z-0.30)/0.29,2.0));
  let seed=exp(-pow(length(vec3f(q.x/0.115,(q.y-0.015)/0.095,z/0.28)),4.0))*(1.0-smoothstep(75.0,190.0,t))*2.0;
  let density=((gas*1.35+lip*0.8)*(1.0-0.92*pocket*roll)+seed)*boundary;
  // Existing hot maxima; peripheral material remains orange as in the parent.
  let hot=exp(-pow(central*0.85,2.0))*heat;
  let nearWeight=smoothstep(-0.35,0.40,z);
  let hotColor=mix(vec3f(13.0,4.4,0.60),vec3f(16.0,10.4,4.0),nearWeight);
  let color=(mix(vec3f(2.8,0.13,0.008),hotColor,hot)+vec3f(7.0,2.3,0.08)*lip*0.30*heat)*pulse;
  let opacity=1.0-exp(-density*0.38*life);
  radiance+=transmittance*opacity*color;transmittance*=1.0-opacity;
 }
 return vec4f(radiance,1.0-transmittance);
}

@fragment fn fs(o:Out)->@location(0) vec4f {
 let f=fields[o.index];let kind=u32(f.centerKind.z);let t=f.state.x;let en=f.state.y;let reduced=f.state.z;
 let launchEnd=mix(360.0,400.0,en);let p=o.local;
 if(kind==2u){return volume(p,t,en,reduced,false);}
 if(kind==3u){return volume(p,t,en,reduced,true);}
 // R7 separates leading pressure from rear vent without creating a second shot.
 let rear=kind==1u;let q=vec2f(select(p.x,-p.x,rear),p.y);let axis=q.x;
 let travel=smoothstep(0.0,select(65.0,35.0,rear),t);let extent=select(0.93,0.94,rear)*travel;
 let motion=1.0-reduced*0.70;
 let bend=select(sin(axis*9.0-t*0.024)*0.012*axis,sin(axis*6.0-t*0.011)*0.060*axis,rear)*motion;
 let leadingWidth=0.055+0.085*max(axis,0.0)+0.012*pow(sin(axis*14.0-t*0.034),2.0)*max(axis,0.0);
 let ventWidth=0.13+0.40*max(axis,0.0)*(0.80+0.20*smoothstep(25.0,125.0,t));
 let width=select(leadingWidth,ventWidth,rear);
 let root=smoothstep(-0.022,0.025,axis);let tip=1.0-smoothstep(extent-select(0.12,0.22,rear),extent,axis);
 let edge=1.0-smoothstep(0.72,0.98,abs(q.y));let inside=root*tip*edge;
 let envelope=smoothstep(0.0,12.0,t)*pow(max(0.0,1.0-t/launchEnd),0.65);let transverse=(q.y-bend)/max(width,0.02);
 let shell=exp(-transverse*transverse*1.3)*inside;
 let core=exp(-transverse*transverse*5.0)*inside*exp(-max(axis,0.0)*select(1.1,4.4,rear));
 let leadingCells=0.60+0.40*pow(0.5+0.5*cos(axis*18.0-t*0.038),2.0);
 let ventFold=0.70+0.30*pow(0.5+0.5*cos(axis*5.5-t*0.012),2.0);
 let cells=select(leadingCells,ventFold,rear);let rim=exp(-pow(abs(transverse)-0.83,2.0)*20.0)*inside;
 let flameLife=exp(-t/select(340.0,145.0,rear));
 var rgb=select(vec3f(2.5,0.25,0.02),vec3f(3.4,0.75,0.08),rear)*shell*envelope*flameLife;
 rgb+=select(vec3f(9.0,6.8,3.2),vec3f(6.8,3.2,0.45),rear)*core*cells*envelope*flameLife;
 rgb+=vec3f(1.4,0.40,0.07)*rim*envelope*flameLife*0.35;
 let optical=exp(-transverse*transverse*0.32)*inside*envelope*flameLife*0.055;rgb+=vec3f(2.0,0.65,0.13)*optical;
 let exhaust=smoothstep(select(85.0,50.0,rear),select(210.0,180.0,rear),t)*shell*envelope;
 let shade=clamp(0.45+transverse*0.20+sin(axis*select(8.0,5.5,rear)-t*select(0.007,0.011,rear))*0.15,0.0,1.0);
 let exhaustGain=select(0.38,0.55,rear);rgb+=mix(vec3f(0.035,0.046,0.061),vec3f(0.29,0.27,0.23),shade)*exhaust*exhaustGain;
 let alpha=clamp(shell*envelope*(flameLife+exhaust*exhaustGain)+optical,0.0,1.0);
 return vec4f(rgb,alpha); // same HDR/premultiplied source-over interface
}`;

export const LIGHT_POST_WGSL = /* wgsl */`
struct Light { positionRange:vec4f, colorIntensity:vec4f };
@group(0) @binding(0) var<storage,read> lights:array<Light>;
@group(0) @binding(1) var baseRadiance:texture_2d<f32>;
@group(0) @binding(2) var albedo:texture_2d<f32>;
@group(0) @binding(3) var worldNormal:texture_2d<f32>;
@group(0) @binding(4) var worldPosition:texture_2d<f32>;
@vertex fn vs(@builtin(vertex_index) i:u32)->@builtin(position) vec4f {
 let p=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));return vec4f(p[i],0,1);
}
@fragment fn fs(@builtin(position) pixel:vec4f)->@location(0) vec4f {
 let xy=vec2i(pixel.xy);let base=textureLoad(baseRadiance,xy,0);let material=textureLoad(albedo,xy,0);
 let normalData=textureLoad(worldNormal,xy,0);let pos=textureLoad(worldPosition,xy,0);var irradiance=vec3f(0);
 if(pos.w>0.5 && normalData.w>0.5 && length(normalData.xyz)>0.0001){let normal=normalize(normalData.xyz);
   for(var i=0u;i<arrayLength(&lights);i++){let l=lights[i];let delta=l.positionRange.xyz-pos.xyz;
     let distance=max(length(delta),0.001);let cutoff=pow(max(0.0,1.0-distance/l.positionRange.w),2.0);
     let cosine=max(dot(normal,delta/distance),0.0);
     irradiance+=l.colorIntensity.rgb*l.colorIntensity.w*cosine*cutoff/(1.0+distance*distance/225.0);
   }
 }
 // Actual per-surface Lambert response; preserve original radiance. No fake halo or full-screen tint.
 let lit=base.rgb+material.rgb*irradiance;return vec4f(lit,base.a);
}`;

export async function createPass({ device,format='rgba16float' }) {
  if(!device?.createShaderModule) throw new TypeError('Real WebGPU device required');
  const compile=async(code,label)=>{const module=device.createShaderModule({code,label});
    if(module.getCompilationInfo){const info=await module.getCompilationInfo();if(info.messages.some(m=>m.type==='error'))throw Object.assign(new Error(label+': '+info.messages.filter(m=>m.type==='error').map(m=>m.message).join(';')),{shaderDiagnostics:info.messages.map(m=>({type:m.type,message:m.message,lineNum:m.lineNum,linePos:m.linePos,offset:m.offset,length:m.length}))});}return module;};
  const shader=await compile(VFX_WGSL,VERSION),lightShader=await compile(LIGHT_POST_WGSL,VERSION+'-surface-light');
  const pipeline=await device.createRenderPipelineAsync({label:VERSION,layout:'auto',vertex:{module:shader,entryPoint:'vs'},
    fragment:{module:shader,entryPoint:'fs',targets:[{format,blend:{color:{srcFactor:'one',dstFactor:'one-minus-src-alpha'},alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha'}}}]},primitive:{topology:'triangle-list'}});
  const lightPipeline=await device.createRenderPipelineAsync({label:VERSION+'-surface-light',layout:'auto',vertex:{module:lightShader,entryPoint:'vs'},fragment:{module:lightShader,entryPoint:'fs',targets:[{format}]},primitive:{topology:'triangle-list'}});
  let destroyed=false;const recordings=new WeakMap(),submissions=new WeakSet(),active=new Set();
  return Object.freeze({
    isSubmitted:receipt=>!destroyed&&submissions.has(receipt),
    submit(recordReceipt) {
      const owned=recordings.get(recordReceipt);if(destroyed||!owned||owned.submitted||!owned.sourceCurrent())throw new Error('Exact current one-shot recorded RPG encoder required');
      owned.submitted=true;device.queue.submit([owned.encoder.finish()]);
      const completion=device.queue.onSubmittedWorkDone();owned.lease.submitted=true;owned.lease.completion=completion;
      const receipt=Object.freeze({...recordReceipt,version:VERSION,roomId:owned.plan.roomId,
        sessionGeneration:owned.plan.sessionGeneration,soundId:owned.plan.soundId,
        positiveCoverage:owned.plan.age>0,submitted:true,completion});submissions.add(receipt);return receipt;
    },
    prepare(planResult,{ viewport,camera,sourceCurrent }) {
      if(destroyed||planResult.status!=='planned'||typeof sourceCurrent!=='function'||!sourceCurrent()||!viewport||![viewport.width,viewport.height,camera?.x,camera?.y,camera?.zoom].every(finite)||camera.zoom<=0||viewport.width<=0||viewport.height<=0)throw new TypeError('Valid planned lease/current source+viewport required');
      const buffers=[];const buffer=(data,usage)=>{const b=device.createBuffer({size:Math.max(16,data.byteLength),usage,mappedAtCreation:true});new Float32Array(b.getMappedRange()).set(data);b.unmap();buffers.push(b);return b;};
      const view=buffer(new Float32Array([viewport.width,viewport.height,camera.x,camera.y,camera.zoom,0,0,0]),GPUBufferUsage.UNIFORM);
      const fields=buffer(new Float32Array(planResult.fields.flatMap(f=>[f.center.x,f.center.y,f.kind,0,f.axis.x,f.axis.y,f.sx,f.sy,f.age,f.enhance,f.reduced,0])),GPUBufferUsage.STORAGE);
      const lightData=planResult.lights.length?planResult.lights:[{position:[0,0,0],range:1,color:[0,0,0],intensity:0}];
      const lights=buffer(new Float32Array(lightData.flatMap(l=>[...l.position,l.range,...l.color,l.intensity])),GPUBufferUsage.STORAGE);
      const bind=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:view}},{binding:1,resource:{buffer:fields}}]});
      let released=false,recorded=false,postRecorded=false;const lease={submitted:false,completion:null,release:null};active.add(lease);
      const release=({submitted=false,completion=null}={})=>{if(released)return;
        submitted=submitted||lease.submitted;completion=lease.completion||completion;
        if(submitted&&!completion?.then)throw new TypeError('Submitted resources require actual GPU completion promise');
        released=true;const dispose=()=>{buffers.forEach(b=>b.destroy());active.delete(lease);};
        if(submitted)Promise.resolve(completion).then(dispose,dispose);else dispose();};lease.release=release;
      return Object.freeze({ plan:planResult,
        record(encoder,targetView,{loadOp='load',lightingLease=null}={}) {
          if(released||recorded||destroyed||!sourceCurrent())throw new Error('RPG prepared lease unavailable or source stale');
          if(lightingLease){
            if(lightingLease.device!==device||lightingLease.targetView===targetView||lightingLease.scope!=='physical-surface-inputs'||!lightingLease.isCurrent?.())throw new Error('Exact nonaliased surface lighting lease required');
            const names=['baseRadiance','albedo','worldNormal','worldPosition'];
            if(names.some(n=>!lightingLease[n]||lightingLease[n]===targetView))throw new Error('Missing/nonaliased physical surface inputs; no fake dynamic light fallback');
            const b=device.createBindGroup({layout:lightPipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:lights}},...names.map((n,i)=>({binding:i+1,resource:lightingLease[n]}))]});
            const pass=encoder.beginRenderPass({colorAttachments:[{view:targetView,loadOp:'clear',storeOp:'store',clearValue:{r:0,g:0,b:0,a:0}}]});pass.setPipeline(lightPipeline);pass.setBindGroup(0,b);pass.draw(3);pass.end();postRecorded=true;
          }
          const pass=encoder.beginRenderPass({colorAttachments:[{view:targetView,loadOp:postRecorded?'load':loadOp,storeOp:'store',clearValue:{r:0,g:0,b:0,a:0}}]});pass.setPipeline(pipeline);pass.setBindGroup(0,bind);pass.draw(6,planResult.fields.length);pass.end();recorded=true;
          const receipt=Object.freeze({scope:'preview-only',causeId:planResult.causeId,sourceEffectId:planResult.sourceEffectId,recorded:true,submitted:false,dynamicLightRecorded:postRecorded&&planResult.lights.length>0,endpoints:planResult.endpoints});
          recordings.set(receipt,{encoder,plan:planResult,submitted:false,lease,sourceCurrent});return receipt;
        },
        release
      });
    },destroy(){destroyed=true;for(const lease of active)lease.release();}
  });
}

export function synthesizePCM(role,sampleRate=48000) {
  if(!['launch','impact'].includes(role)||!Number.isInteger(sampleRate)||sampleRate<8000||sampleRate>192000)throw new TypeError('Finite authored role/sample rate required');
  const duration=role==='launch'?0.36:0.52, n=Math.ceil(duration*sampleRate),pcm=new Float32Array(n);let seed=0x739ab143,filtered=0;
  for(let i=0;i<n;i++){const t=i/sampleRate;seed=(Math.imul(seed,1664525)+1013904223)>>>0;const noise=seed/2147483648-1;
    filtered=filtered*0.84+noise*0.16;const onset=Math.min(1,t/0.008),tail=Math.pow(Math.max(0,1-t/duration),2);
    const launch=role==='launch';
    const f0=launch?116:74, sweep=launch?170:60;
    const phase=2*Math.PI*(f0*t-sweep*t*t*0.5);
    const pressure=Math.sin(phase)*Math.exp(-t/(launch?0.095:0.15));
    const ignition=noise*Math.exp(-t/(launch?0.016:0.024));
    const exhaust=filtered*(1-Math.exp(-t/0.025))*Math.exp(-t/(launch?0.16:0.23));
    pcm[i]=(pressure*0.74+ignition*0.26+exhaust*(launch?0.72:0.90))*onset*tail;
  }
  let mean=0;for(const x of pcm)mean+=x;mean/=n;let peak=0;
  for(let i=0;i<n;i++){pcm[i]-=mean;const edge=Math.min(1,i/96,(n-1-i)/96);pcm[i]*=edge;peak=Math.max(peak,Math.abs(pcm[i]));}
  const gain=peak?0.085/peak:0;for(let i=0;i<n;i++)pcm[i]*=gain;return pcm;
}
export function createAudioOwner({context,destination,consumedIds=new Set(),isSubmitted=()=>false}) {
  const active=new Set();let destroyed=false;
  return Object.freeze({
    admit(submission,role,{verify=false,visible=true,unlocked=false,muted=false,sensoryBlocked=false,endpointId=null}={}) {
      if(destroyed||!submission?.submitted||!isSubmitted(submission)||submission.scope!=='preview-only'||submission.version!==VERSION||
        !['launch','impact'].includes(role)||!submission.causeId||!submission.soundId||
        submission.positiveCoverage!==true) return false;
      if(role==='impact'&&!endpointId)return false;
      const endpoint=submission.endpoints?.find(e=>e.role===role&&(!endpointId||e.id===endpointId));if(!endpoint)return false;
      const id=`${submission.roomId}:${submission.sessionGeneration}:${submission.causeId}:${endpoint.id}:${role}:${submission.soundId}`;
      if(consumedIds.has(id))return false;consumedIds.add(id); // gated sources never replay later
      if(verify||!visible||!unlocked||muted||sensoryBlocked||context?.state!=='running')return false;
      const pcm=synthesizePCM(role,context.sampleRate),buffer=context.createBuffer(1,pcm.length,context.sampleRate);buffer.copyToChannel(pcm,0);
      const source=context.createBufferSource();source.buffer=buffer;source.connect(destination);source.onended=()=>{active.delete(source);source.disconnect();};active.add(source);source.start();return true;
    },destroy(){if(destroyed)return;destroyed=true;for(const source of active){try{source.stop();}catch{}source.disconnect();}active.clear();}
  });
}
