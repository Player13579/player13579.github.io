/* Heal Astra independent prototype. Runtime generated from executable design +
 * canonical WGSL. No imports of existing Heal rendering or audio. */
(function(root) {
  'use strict';
  const design = (() => { const module={exports:{}}; const require={main:null};
'use strict';

// Executable E design, authored BEFORE the shader/runtime. No E asset/reference.
// The runtime embeds this exact file and calls ribbonPoint() and stages(); its
// vertex geometry is not a second approximate implementation of this design.
const provenance = Object.freeze({
  author: 'GPT-6-Astra', date: '2026-09-25',
  baseCommit: '26ccab76342b7eec7a8b9e3164afd825e1838bdd',
  baseBlob: 'eb33f176862372809bf67057f9a0a5d533e2b9b8',
  extensionBlob: '513273efb4bb177be07de59e91200d382af1856d',
  branch: 'ECodeImplementation', creation: 'independent; no existing Heal E read or copied'
});
const contract = Object.freeze({
  name: 'Heal Astra / 身体へ結び戻す光流', durationSeconds: 12,
  gameplay: 'One self-restoration event: HP/SP restoration and status release, followed by a 12-second acceleration state. This visual does not award repeated healing.',
  intent: 'Two broad open streams rise outside the actual body silhouette on left and right, climb beyond the shoulders and fold back into the upper torso. Front/back crossing is local; most of the supply remains visible beside the actor. The receiving light settles while the supply remains alive for the buff duration.',
  not: ['healing other actors', 'invented wounds', 'damage amount indicators', 'shield shell', 'UI meter', 'medical claim', 'continuous healing gameplay'],
  environment: 'Declared fantasy self-generated restorative field; no ground contact, external emitter, gravity, air drag, or inferred object.',
  clocks: { wall: 'authoritative lifetime 0 <= t < 12', actor: 'integrated actor seconds; preview ordinary multiplier 1.8', motion: 'transport uses actor seconds; termination uses wall seconds' },
  coordinates: { world: 'relative to player root; +y down, +z toward viewer',
    actor: 'Sophia origin(128,240), ground(0,31), scale .4375*.72; visible x[-21.42,20.79], y[-39.245,31]',
    envelope: 'Open outer conduits from feet to above shoulders, bending into (0,-18); about x +/-52 and y -56..46 including scatter. Strong source stays beside the face, not over the eyes.',
    nominalZoom: 1.65, padding: 'Renderer does not scale shape with padding; geometry is explicit world coordinates.' },
  phases: [
    { wall: [0, .22], meaning: 'self-source is recruited; streams grow without a flash billboard' },
    { wall: [.22, 1.15], meaning: 'bright front and back branches fold toward one receiving body zone; the one restoration peak' },
    { wall: [1.15, 10.4], meaning: 'maintained acceleration circulation; moving density crests, stable lower intensity, no repeated cast peak' },
    { wall: [10.4, 11.4], meaning: 'source supply closes, radius contracts toward the receiving body' },
    { wall: [11.4, 11.72], meaning: 'remaining upper supply visibly enters the foreground torso; source closure does not erase the receiving flow' },
    { wall: [11.72, 12], meaning: 'finite emission and receiving volume terminate together; no detached remnant' }
  ],
  layers: [
    { id:'W-supply', space:'world', PH_refs:['PH-self-restoration'], OBS_refs:[], role:'two tapered, depth-resolved open ribbon volumes',
      morphology:'macro opposed curved conduits around body; meso folded sheet with lit edge, transparent middle, moving broad density crest; micro omitted at gameplay size',
      optical:'low optical coverage, independently emissive core and lit rim; no opaque dark plate', timing:'whole 12s with distinct recruitment/circulation/withdrawal',
      necessity:'remove => no spatial supply or body wrapping, leaving a generic glow' },
    { id:'W-receive', space:'world', PH_refs:['PH-self-restoration'], OBS_refs:[], role:'small elongated receiving volume at torso endpoint',
      morphology:'soft tapered volume; narrow luminous contact, broad low-density body without circular ring',
      optical:'pearl interior, pale green body; responds to arrival; initial response larger than maintained transport', timing:'begins after source, diminishes during steady state, catches final inward supply',
      necessity:'remove => streams do not visibly act on a receiver' },
    { id:'O-scatter', space:'observation', PH_refs:[], OBS_refs:['OBS-source-scatter'], role:'near-source scattering outside each actual ribbon/receiver',
      morphology:'finite local falloff relative to each source cross-section', optical:'emission-dependent extended radiance; not an independent symbol or global background correction',
      timing:'same local arrival as its input, finite end', necessity:'remove => luminous material reads painted instead of emitting' }
  ],
  links: [
    { type:'physical_influence', from:'W-supply', to:'W-receive', mechanism:'declared restorative transport is assimilated at the torso endpoint' },
    { type:'observation_dependency', from:'O-scatter', to:'W-supply', mechanism:'samples supply radiance and local width' },
    { type:'observation_dependency', from:'O-scatter', to:'W-receive', mechanism:'samples response radiance' }
  ],
  optics: { carrier:'declared fantasy volumetric ribbon; not a fluid or physical plasma',
    density:'broad smooth traveling crest + steady small supply', coverage:'translucent surface fraction independent of radiance',
    radiance:'pale-gold pearl hot spot inside celadon/emerald structure; local source may reach white',
    observation:'source-constrained finite Gaussian scattering; no exposure adaptation, background sampling, lens artifact, or chromatic smear',
    LDM:'active, source-driven; onset/arrival/maintained/withdrawal stages; no global automatic brightness budget' },
  PH_registry: [{id:'PH-self-restoration',anchor:'body',origin:'attribute_resolved',visibility:'visible',
    model_kind:'declared_fantasy',boundary:'self-owned field limited to 12 seconds and finite geometry around one actor',
    inputs:'authoritative self-heal event and its surviving acceleration state; energy supply is fictional and bounded',
    receiver:'the same actor upper torso; not a diagnosis or independently counted injury',
    balance:'No real mass, charge, thermal source or momentum transfer is asserted; maintained source closes before observation ends',
    OctaDomain:{Thermo:'not_applicable: no heat/burning/phase change',Fluid:'not_applicable: directed field transport is not material flow',
      Optics:'applicable: self emission, transparent coverage and depth occlusion',Materials:'not_applicable: no physical membrane or fluid material',
      Electromagnetics:'not_applicable: no electrical discharge or charge model',Rheology:'not_applicable: no stress-bearing substance',
      WaveOptics:'not_applicable: no interference, diffraction or caustics',SurfaceScience:'not_applicable: body coupling is fictional assimilation, no wetting/adhesion'}}],
  OBS_registry:[{id:'OBS-source-scatter',input_PH:'PH-self-restoration',space:'source-local display spread',
    mask:'finite ribbon cross section and receiver radial support',evaluation:'after source evaluation; source-over radiance; actual rear actor occlusion',
    colorSpace:'linear shader radiance into renderer preferred unorm presentation format; no exposure grade',
    SamplingContract:'per-frame instantaneous current state, no trail history, spatial antialias through smooth finite cross-sections; no microvariation'}],
  IntensityBudget:{shared:true,scope:'only this E, local source-linked OBS; never sample or compensate background',
    sourcePriority:'bright moving material and receiving contact first',glow:'0.18 + 0.19*crest before gain, relative to actual source density',
    preserved:'open interior between conduits and actual actor face; no automatic RGB or luminance cap on intended source',
    inactive:['flare','grain','ghost','chromatic separation','full-frame diffusion']},
  sfx: { onset:'warm nonuniform partials emerge with the first body supply; airy leading inhalation, no click',
    transport:'very soft stereo breathing/rippling band noise and quiet tonal bed follow circulation; no repeated loud cast',
    receive:'rounded harmonic arrival at initial restoration peak, then locally modulated low-level sustained tone',
    end:'upper harmonics cease before warm body; final release reaches exact silence by 12 seconds',
    event:'one sound per effect id, start from current visual phase on late audio unlock; stop on cancel, death, room leave and hidden preview',
    quality:'No reused sound, no stock beep; independently synthesized stereo. Listening acceptance remains separate from source tests.' },
  rules: [
    ['PhenomenonSystemTemplate.PhysicalModelClosureRule','Declared bounded self-source and receiver, not assumed medicine','ribbonPoint/stages'],
    ['PhenomenonSystemTemplate.VisualCausalityRule','Supply moves to actual body endpoint; receiving radiance follows arrival','ribbonPoint/receiver shader'],
    ['VFX.MultilayerArchitectureRule','Transport, reception and optical scattering have different functions/shape/time','layers, links, WGSL'],
    ['VFX.SpatialMorphologyRule','Open sheets, cross-section, front/back crossings and finite body bounds','ribbonPoint/mesh/depth pass'],
    ['VFX.MaterialOpticalResponseRule','Coverage, density and source radiance independent','WGSL emitting/receiver'],
    ['VFX.TransportTemporalRule','Actor transport, wall lifetime, distinct source closure and receiving decay','stages/ribbonPoint/audioState'],
    ['VFX.CompositingReadabilityRule','Rear E, actor, front E; source-over radiance, no repeated geometry brightness','record side contract'],
    ['ObservationIntegrationTemplate.ObservationRegistrySeparationRule','Source scatter is OBS and tied to its input, not another PH','O-scatter/WGSL'],
    ['LuminanceDynamicsModule.LDMActivationRule','Explicit VFX triggers local temporal radiance','stages/packet'],
    ['LuminanceDynamicsModule.LDMModeRule','Physical/declarative source-driven radiance rather than a global grade','optics/WGSL'],
    ['ECodeImplementation.ExecutableECodeBranchRule','This executable design precedes shader; runtime embeds these functions','design -> WGSL -> generated runtime']
  ],
  states: { duplicate:'owner deduplicates same effect id; module plan has no spontaneous events',
    cancellation:'plan null immediately; audio fade stop <=80ms', invisible:'caller must reject hidden owner rather than reveal them',
    reducedMotion:'hold angular breathing and reduce transport speed without removing source or 12s stages',
    previewLoop:'12s goes to zero radiance before next recruitment; no UI buttons; audio begins after ordinary browser gesture' },
  acceptance: { static:'geometry bounded; depth split complete; finite lifetime; actual causal source/receiver; exact shader artifact equality',
    actual:'gameplay-size front/back wrapping; bright volumetric supply and body reception visible; no ring/shield/UI reading; listen to stereo envelope',
    status:'prototype; static success does not mean artistic or gameplay acceptance' }
});
const clamp = (x,a=0,b=1) => Math.max(a,Math.min(b,x));
function smooth(a,b,x) { const q=clamp((x-a)/(b-a)); return q*q*(3-2*q); }
function stages(wall,actor=wall*1.8) {
  if (!Number.isFinite(wall)||!Number.isFinite(actor)||wall<0||wall>=12) return {alive:0,source:0,cast:0,withdraw:1,receive:0,actor:0,wall};
  const withdraw=smooth(10.4,11.65,wall);
  const source=smooth(0,.22,wall)*(1-smooth(11.72,12,wall));
  const cast=Math.exp(-Math.pow((actor-1.62)/.72,2));
  const receive=smooth(.13,.43,wall)*(1-smooth(11.72,12,wall));
  return {alive:1,source,cast,withdraw,receive,actor:Math.max(0,actor),wall};
}
function ribbonPoint(u,lane,wall,actor=wall*1.8,reduced=false) {
  u=clamp(u); const s=stages(wall,actor);
  const sign=lane===0?-1:1;
  const breathe=reduced?0:1.6*Math.sin(actor*.53+lane*.8)*Math.sin(Math.PI*u);
  const returnIn=1-smooth(.66,1,u);
  const radius=(8+30*Math.pow(Math.sin(Math.PI*u),.62)+breathe)*returnIn*(1-.50*s.withdraw);
  const depth=(Math.sin(u*5.4+lane*.7-.3)*11*(1-smooth(.78,1,u))+smooth(.78,1,u)*2)*(1-s.withdraw)+4*s.withdraw;
  const y=34-114*u+62*Math.pow(u,7)+depth*.10;
  return {x:sign*radius,y:y*(1-.25*s.withdraw)-18*.25*s.withdraw,z:depth,
    halfWidth:(9+6*Math.pow(Math.sin(Math.PI*u),.8))*(1-.32*s.withdraw)};
}
function packet(u,lane,wall,actor=wall*1.8,reduced=false) {
  const cycle=((Math.max(0,actor-2.07)*(reduced?.075:.16)+.47*lane)%1+1)%1;
  const onset=clamp((wall-.09*lane)/.9);
  const circulating=onset*(1-smooth(.95,1.35,wall))+cycle*smooth(.95,1.35,wall);
  const terminal=.40+.50*smooth(10.4,12,wall);
  const head=circulating*(1-smooth(10.35,10.8,wall))+terminal*smooth(10.35,10.8,wall);
  // Distance wraps in the transport domain; the geometry's endpoint taper
  // ensures no visible teleport from the receiver back to the lower source.
  const delta=Math.min(Math.abs(u-head),1-Math.abs(u-head));
  return .07+.93*Math.exp(-Math.pow(delta/.17,2));
}
function audioState(wall) {
  const s=stages(wall);
  return {source:s.source,receive:s.receive,cast:s.cast,
    bed:s.source*(.45+.55*smooth(.2,1.2,wall))*(1-.55*s.withdraw),
    breath:(.62+.38*Math.sin(wall*Math.PI*.88-.4))*s.source,
    stop:wall<0||wall>=12};
}
module.exports = {provenance,contract,clamp,smooth,stages,ribbonPoint,packet,audioState};
if (require.main===module) {
  const assert=require('node:assert/strict');
  let bounds={xMin:Infinity,xMax:-Infinity,yMin:Infinity,yMax:-Infinity};
  for(let t=0;t<=12;t+=.125) for(let lane=0;lane<2;lane++) for(let i=0;i<=64;i++) {
    const p=ribbonPoint(i/64,lane,t); Object.values(p).forEach(v=>assert(Number.isFinite(v)));
    bounds.xMin=Math.min(bounds.xMin,p.x-p.halfWidth); bounds.xMax=Math.max(bounds.xMax,p.x+p.halfWidth);
    bounds.yMin=Math.min(bounds.yMin,p.y-p.halfWidth); bounds.yMax=Math.max(bounds.yMax,p.y+p.halfWidth);
  }
  for(const t of [-1,12,13]) assert.equal(stages(t).alive,0);
  for(const t of [.1,2,6,10.8,11.9]) assert(stages(t).source>0);
  for(const lane of [0,1]) {const tip=ribbonPoint(1,lane,1);assert(Math.abs(tip.x)<1e-9);assert(Math.abs(tip.y+17.8)<1e-8);}
  assert(bounds.xMin>-58 && bounds.xMax<58 && bounds.yMin>-60 && bounds.yMax<50);
  console.log(JSON.stringify({status:'PASS:design-numerics',bounds,samples:[0,.5,3,10.7,11.9,12].map(t=>stages(t))},null,2));
}

    return module.exports;
  })();
  const shader = "// Independent procedural material for the executable Heal Astra design.\n// CPU geometry is generated by the exact design ribbonPoint() function.\nstruct Frame {\n  screen: vec4f, // logical width, height, side (0 rear / 1 front), reduced\n  clock: vec4f, // wall seconds, actor seconds, source, initial burst response\n  phase: vec4f, // withdrawal, reception, reserved, reserved\n};\n@group(0) @binding(0) var<uniform> f: Frame;\nstruct VertexIn {\n  @location(0) position: vec2f,\n  @location(1) uv: vec2f,\n  @location(2) layerData: vec4f, // world depth, lane, kind (0 stream / 1 receiver), reserved\n};\nstruct VertexOut {\n  @builtin(position) position: vec4f,\n  @location(0) uv: vec2f,\n  @location(1) layerData: vec4f,\n};\n@vertex fn vs_main(v: VertexIn) -> VertexOut {\n  var o: VertexOut;\n  o.position = vec4f(v.position.x / f.screen.x * 2.0 - 1.0,\n    1.0 - v.position.y / f.screen.y * 2.0, 0.0, 1.0);\n  o.uv = v.uv;\n  o.layerData = v.layerData;\n  return o;\n}\nfn gaussian(x: f32, width: f32) -> f32 { return exp(-pow(x / width, 2.0)); }\nfn emitting(body: vec3f, hot: vec3f, opacity: f32, radiance: f32, hotness: f32) -> vec4f {\n  let a = clamp(opacity, 0.0, 0.78);\n  // Low coverage and strong local radiance coexist. No RGB<=alpha cap.\n  return vec4f(body * a + mix(body, hot, clamp(hotness, 0.0, 1.0)) * radiance, a);\n}\n@fragment fn fs_main(v: VertexOut) -> @location(0) vec4f {\n  // Exact complementary half-spaces: source behind actor is genuinely occluded.\n  if ((f.screen.z < 0.5 && v.layerData.x >= 0.0) ||\n      (f.screen.z >= 0.5 && v.layerData.x < 0.0)) { discard; }\n  let wall = f.clock.x;\n  let actor = f.clock.y;\n  let recruitment = f.clock.z;\n  let burst = f.clock.w;\n  let withdrawal = f.phase.x;\n  let celadon = vec3f(0.18, 0.96, 0.58);\n  let pearl = vec3f(0.96, 1.0, 0.80);\n  let receivingGold = vec3f(1.0, 0.89, 0.54);\n\n  if (v.layerData.z > 0.5) {\n    // W-receive: finite body-local assimilating volume, not a ring or marker.\n    let p = v.uv;\n    let tapered = vec2f(p.x * (1.0 + 0.45 * abs(p.y)), p.y);\n    let radius = length(tapered);\n    let envelope = 1.0 - smoothstep(0.72, 1.0, radius);\n    let contact = gaussian(p.x, 0.22) * gaussian(p.y, 0.29);\n    let body = gaussian(radius, 0.49);\n    let scatter = gaussian(radius, 0.83) * envelope;\n    // The initial recovery response dominates; maintenance is not a new burst.\n    let assimilate = f.phase.y * (0.12 + 0.70 * burst + 0.65 * withdrawal);\n    let arriving = 0.84 + 0.16 * sin(actor * 3.07876 - 0.8);\n    let energy = assimilate * arriving;\n    return emitting(mix(celadon, receivingGold, 0.32), pearl,\n      body * energy * 0.16,\n      (contact * 1.05 + body * 0.33 + scatter * 0.17) * energy,\n      contact * 0.8 + burst * 0.16);\n  }\n\n  // W-supply: width is a resolved sheet cross-section, not a one-pixel line.\n  let x = v.uv.x;\n  let u = v.uv.y;\n  let lane = v.layerData.y;\n  let transportRate = select(0.16, 0.075, f.screen.w > 0.5);\n  let cycleHead = fract(max(0.0, actor - 2.07) * transportRate + 0.47 * lane);\n  let firstHead = clamp((wall - 0.09 * lane) / 0.9, 0.0, 1.0);\n  let circulatingHead = mix(firstHead, cycleHead, smoothstep(0.95, 1.35, wall));\n  let terminalHead = 0.40 + 0.50 * smoothstep(10.4, 12.0, wall);\n  let head = mix(circulatingHead, terminalHead, smoothstep(10.35, 10.8, wall));\n  let delta = min(abs(u - head), 1.0 - abs(u - head));\n  let crest = gaussian(delta, 0.17);\n  let density = 0.07 + 0.93 * crest;\n  let endpoint = smoothstep(0.0, 0.085, u) * (1.0 - smoothstep(0.91, 1.0, u));\n  let leadingGrowth = smoothstep(-0.08, 0.16, wall * 1.3 - u);\n  let closingSupply = 1.0 - smoothstep(u - 0.09, u + 0.08, smoothstep(10.6, 12.0, wall) * 0.65);\n  let energy = recruitment * endpoint * leadingGrowth * closingSupply * (1.25 + 0.95 * burst);\n  let body = gaussian(x + 0.025, 0.29);\n  let foldedEdge = gaussian(x - 0.145, 0.065);\n  let inner = gaussian(x + 0.115, 0.105);\n  // OBS-source-scatter takes only this local source; no independent halo.\n  let scatter = gaussian(x, 0.69) * (1.0 - smoothstep(0.83, 1.0, abs(x)));\n  let depthResponse = 0.87 + 0.13 * clamp(v.layerData.x / 22.0, -1.0, 1.0);\n  let emission = (body * 0.65 + foldedEdge * (0.24 + 1.12 * crest) +\n    inner * 0.38 * crest + scatter * (0.18 + 0.19 * crest)) *\n    density * energy * depthResponse;\n  let coverage = (body * 0.25 + foldedEdge * 0.06) * density * energy;\n  let color = mix(celadon, receivingGold, 0.10 + 0.19 * smoothstep(0.72, 1.0, u));\n  return emitting(color, pearl, coverage, emission, foldedEdge * (0.3 + 0.7 * crest));\n}\n";
  const SOURCE_SHA = "aa477a7bb4b4682932952a77fb7245fe16a60e759fd963a1cd5f0d12c3bbf99c";
  const SEGMENTS = 64;
  const VERTICES = SEGMENTS * 12 + 6;
  const FLOATS = 8;
  function plan({effect, owner, nowMs, actorElapsedSeconds, camera, zoom, viewport, reducedMotion=false}={}) {
    if(!effect || !owner || !effect.id || String(effect.ownerId)!==String(owner.id) ||
      owner.alive===false || owner.visible===false || owner.invisible===true) return null;
    const numbers=[nowMs,effect.startedAt,actorElapsedSeconds,owner.x,owner.y,camera?.x,camera?.y,
      zoom,viewport?.width,viewport?.height];
    if(!numbers.every(Number.isFinite)||zoom<=0||viewport.width<=0||viewport.height<=0) return null;
    const wall=(nowMs-effect.startedAt)/1000;
    if(wall<0||wall>=12||(Number.isFinite(effect.expiresAt)&&nowMs>=effect.expiresAt)||effect.cancelled) return null;
    const origin={x:(owner.x-camera.x)*zoom,y:(owner.y-camera.y)*zoom};
    if(origin.x+58*zoom<0||origin.x-58*zoom>viewport.width||origin.y+60*zoom<0||origin.y-50*zoom>viewport.height) return null;
    return Object.freeze({id:String(effect.id),ownerId:String(owner.id),origin,zoom,viewport,
      reducedMotion:Boolean(reducedMotion),phase:design.stages(wall,Math.max(0,actorElapsedSeconds))});
  }
  function geometry(p) {
    const out=new Float32Array(VERTICES*FLOATS); let k=0;
    const put=(x,y,side,u,z,lane,kind)=>{
      out[k++]=p.origin.x+x*p.zoom; out[k++]=p.origin.y+y*p.zoom;
      out[k++]=side;out[k++]=u;out[k++]=z;out[k++]=lane;out[k++]=kind;out[k++]=0;
    };
    const point=(u,lane)=>design.ribbonPoint(u,lane,p.phase.wall,p.phase.actor,p.reducedMotion);
    const row=(u,lane)=>{
      const a=point(Math.max(0,u-.001),lane),b=point(Math.min(1,u+.001),lane),c=point(u,lane);
      const norm=Math.hypot(b.x-a.x,b.y-a.y)||1;
      return {...c,nx:-(b.y-a.y)/norm,ny:(b.x-a.x)/norm,u};
    };
    const emit=(r,side,lane)=>put(r.x+r.nx*r.halfWidth*side,r.y+r.ny*r.halfWidth*side,side,r.u,r.z,lane,0);
    for(let lane=0;lane<2;lane++) for(let i=0;i<SEGMENTS;i++) {
      const a=row(i/SEGMENTS,lane),b=row((i+1)/SEGMENTS,lane);
      emit(a,-1,lane);emit(a,1,lane);emit(b,-1,lane);
      emit(b,-1,lane);emit(a,1,lane);emit(b,1,lane);
    }
    for(const [x,y] of [[-1,-1],[1,-1],[-1,1],[-1,1],[1,-1],[1,1]]) put(x*12,-17.8+y*18,x,y,1,0,1);
    return out;
  }
  function create({renderer}={}) {
    if(!renderer?.device||renderer.state!=='ready') throw new TypeError('Heal Astra needs the shared ready WebGPU renderer');
    const device=renderer.device;
    const module=device.createShaderModule({label:'Heal Astra source material',code:shader});
    let pipeline,disposed=false; const slots=new Map();
    const readiness={compilationErrors:[],warnings:[],pipeline:false};
    const ready=(async()=>{
      const info=await module.getCompilationInfo();
      readiness.compilationErrors=info.messages.filter(x=>x.type==='error').map(x=>x.message);
      readiness.warnings=info.messages.filter(x=>x.type==='warning').map(x=>x.message);
      if(readiness.compilationErrors.length) throw new Error(readiness.compilationErrors.join('\n'));
      pipeline=await device.createRenderPipelineAsync({label:'Heal Astra depth-split material',layout:'auto',
        vertex:{module,entryPoint:'vs_main',buffers:[{arrayStride:32,attributes:[
          {shaderLocation:0,offset:0,format:'float32x2'},
          {shaderLocation:1,offset:8,format:'float32x2'},
          {shaderLocation:2,offset:16,format:'float32x4'}]}]},
        fragment:{module,entryPoint:'fs_main',targets:[{format:renderer.format,
          blend:{color:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'},
            alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'}}}]},
        primitive:{topology:'triangle-list',cullMode:'none'}});
      if(disposed) throw new Error('Heal Astra disposed while preparing');
      readiness.pipeline=true; return readiness;
    })();
    function slot(id) {
      if(slots.has(id)) return slots.get(id);
      // The caller reconciles authoritative live event IDs each frame. An
      // arbitrary 32-event cap would reject valid overlapping server events.
      const vertex=renderer.own(device.createBuffer({label:`Heal Astra ${id} mesh`,size:VERTICES*FLOATS*4,usage:GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST}));
      const uniforms=[0,1].map(side=>renderer.own(device.createBuffer({label:`Heal Astra ${id} side ${side}`,size:48,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST})));
      const groups=uniforms.map(buffer=>device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer}}]}));
      const value={vertex,uniforms,groups,last:null};slots.set(id,value);return value;
    }
    function record({frame,target,planned,side}={}) {
      if(disposed) throw new Error('Heal Astra disposed');
      if(!pipeline) throw new Error('Await Heal Astra ready before recording');
      if(!planned) return {drawn:false};
      if(side!=='back'&&side!=='front') throw new TypeError('Use back before actor, front after actor');
      const s=slot(planned.id),index=side==='front'?1:0;
      if(s.last!==planned) {device.queue.writeBuffer(s.vertex,0,geometry(planned));s.last=planned;}
      const p=planned.phase;
      device.queue.writeBuffer(s.uniforms[index],0,new Float32Array([
        planned.viewport.width,planned.viewport.height,index,planned.reducedMotion?1:0,
        p.wall,p.actor,p.source,p.cast,p.withdraw,p.receive,0,0]));
      frame.add({target,label:`Heal Astra ${side}`,encode(pass){
        pass.setPipeline(pipeline);pass.setBindGroup(0,s.groups[index]);pass.setVertexBuffer(0,s.vertex);pass.draw(VERTICES);
      }});
      return {drawn:true,eventId:planned.id,side,wallSeconds:p.wall,actorSeconds:p.actor};
    }
    function release(id) {
      const s=slots.get(id);if(!s)return false;
      for(const r of [s.vertex,...s.uniforms]) {renderer.release(r);r.destroy();}
      slots.delete(id);return true;
    }
    return Object.freeze({ready,readiness,record,release,destroy(){if(disposed)return;disposed=true;for(const id of [...slots.keys()])release(id);}});
  }
  const api=Object.freeze({design,shader,SOURCE_SHA,VERTICES,plan,geometry,create});
  if(typeof module!=='undefined'&&module.exports) module.exports=api;
  root.DvaHealAstraE=api;
})(typeof globalThis==='undefined'?this:globalThis);
