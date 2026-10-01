// GPT-6.1-Sol zero-designed RPG E. Preview causal protocol only; not a game port.
export const VERSION = 'sol-rpg-heavy-zero-r1';
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
  const launchEnd=enhance?400:360, impactEnd=enhance?700:620;
  // Coverage fields are local analytic geometry, never authoritative projectiles.
  const add=(center,kind,sx,sy,endpoint)=>fields.push({ center,axis:{x:-1,y:0},kind,sx,sy,age,
    enhance:enhance?1:0,reduced:reducedMotion?1:0,endpoint });
  if (context.sourceVisible && age < launchEnd) {
    add(mouth,0,80*(enhance?1.18:1),43,'launch');
    add(poseRearExhaust(poseLease,motionAgeMs),1,90*(enhance?1.35:1),42,'launch');
    endpoints.push({ role:'launch',id:s.id,position:mouth });
  }
  for (const a of r.attempts) if (a.visible && a.outcome==='preview-physical-impact' && age < impactEnd) {
    add(a.position,2,105,70,a.id); add(a.position,3,100,70,a.id);
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
fn ellipse(p:vec2f,c:vec2f,r:vec2f)->f32 {return length((p-c)/r);}
@fragment fn fs(o:Out)->@location(0) vec4f {
 let f=fields[o.index]; let kind=u32(f.centerKind.z);let t=f.state.x;let en=f.state.y;let reduced=f.state.z;
 let launchEnd=mix(360.0,400.0,en);let impactEnd=mix(620.0,700.0,en);
 let p=o.local;var a=0.0;var color=vec3f(0);let onset=smoothstep(0.0,18.0,t);
 if(kind==0u){ // connected front fire wedge, bright core and two broad folds
   let travel=min(t/180.0,1.0);let q=p-vec2f(0.18+0.14*travel*(1.0-reduced*0.75),0);
   let wide=0.1+0.30*max(q.x,0.0);let wedge=1.0-smoothstep(wide,wide+0.09,abs(q.y));
   let nose=1.0-smoothstep(0.75,0.94,q.x);let root=smoothstep(-0.02,0.05,q.x);
   let fold=0.76+0.24*sin(q.x*7.0+q.y*2.0-t*0.009); // large connected folds, no speckle
   a=wedge*nose*root*fold*onset*pow(max(0.0,1.0-t/launchEnd),1.4);
   let core=1.0-smoothstep(0.02,0.12,abs(q.y));color=mix(vec3f(1.8,0.20,0.025),vec3f(4.2,2.9,1.4),core*exp(-q.x*3));
 }else if(kind==1u){ // rear exhaust pressure sheet, directional and finite
   let q=vec2f(-p.x,p.y);let extent=0.65*min(t/110.0,1.0);
   let width=0.07+0.32*max(q.x,0.0);let edge=1.0-smoothstep(width,width+0.1,abs(q.y+0.06*sin(q.x*5.0)));
   a=edge*smoothstep(0.02,0.11,q.x)*(1.0-smoothstep(extent,extent+0.17,q.x))*onset*pow(max(0.0,1.0-t/launchEnd),1.5);
   color=mix(vec3f(2.3,0.72,0.13),vec3f(0.27,0.24,0.20),clamp(t/330.0,0.0,1.0));
 }else if(kind==2u){ // immediate true outcome point; never moving towards endpoint
   let grow=min(t/180.0,1.0);let r=vec2f(0.23+grow*0.44,0.12+grow*0.40);
   let d=min(ellipse(p,vec2f(-0.16,-0.08),r),ellipse(p,vec2f(0.22,0.04),r*vec2f(0.72,0.86)));
   a=(1.0-smoothstep(0.75,1.0,d))*onset*pow(max(0.0,1.0-t/impactEnd),1.3);
   let core=exp(-dot(p,p)*20.0)*max(0.0,1.0-t/120.0);color=mix(vec3f(1.9,0.19,0.018),vec3f(4.4,3.2,1.7),core);
 }else{ // three calm smoke masses after fire, local absorption not global grade
   let drift=min(t/620.0,1.0)*(1.0-reduced*0.67);let q=p+vec2f(0,drift*0.17);
   let d=min(ellipse(q,vec2f(-0.28,-0.12),vec2f(0.37,0.40)),min(ellipse(q,vec2f(0.26,-0.15),vec2f(0.35,0.46)),ellipse(q,vec2f(0,0.12),vec2f(0.45,0.27))));
   a=(1.0-smoothstep(0.65,1.0,d))*smoothstep(130.0,290.0,t)*pow(max(0.0,1.0-t/impactEnd),0.75)*0.62;color=vec3f(0.055,0.065,0.082);
 }
 a=clamp(a,0.0,1.0);return vec4f(color*a,a); // premultiplied source-over, HDR authored intensity
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
    if(module.getCompilationInfo){const info=await module.getCompilationInfo();if(info.messages.some(m=>m.type==='error'))throw new Error(label+': '+info.messages.filter(m=>m.type==='error').map(m=>m.message).join(';'));}return module;};
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
    const hz=role==='launch'?92-42*t/duration:68-24*t/duration;
    const pressure=Math.sin(2*Math.PI*(hz*t))*Math.exp(-t/(role==='launch'?0.11:0.16));
    pcm[i]=(pressure*0.8+filtered*(role==='launch'?0.48:0.65))*onset*tail;
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
