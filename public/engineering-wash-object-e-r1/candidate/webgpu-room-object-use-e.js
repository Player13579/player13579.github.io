/* Textureless source-space E candidates for observed non-corridor station objects.
 * The caller owns accepted server events, the shared WebGPU frame, and SFX playback. */
(function(root){
 'use strict';
 const MAP_ID='station',DURATION_MS=2200,MAX_FRAME_EVENTS=32;
 const raw=[
  ['v302-comms-serverRack-2','serverRack','credits',4346,2882,'comms','rack-powered-bay-retrieval','rack-relay-click','steel-relay'],
  ['v302-engineering-toolCart-2','toolCart','credits',4308,1316,'engineering','cart-drawer-withdrawal','drawer-slide-clink','steel-drawer'],
  ['v302-fabrication-toolCart-3','toolCart','acceleration',3655,2426,'fabrication','cart-flywheel-start','ratchet-flywheel-tick','brass-ratchet'],
  ['v302-atrium-conferenceTable-4','conferenceTable','mana',2812,1886,'atrium','table-inlay-transfer','inlay-glass-tone','wood-glass'],
  ['v302-comms-radioConsole-1','radioConsole','luckBoost',3742,2882,'comms','console-tuning-response','radio-tuner-pip','bakelite-radio'],
  ['v302-atrium-sofa-1','conferenceSofa','overheal',2149,1314,'atrium','sofa-cushion-recovery','cushion-spring-hum','woven-cushion'],
  ['v302-comms-antennaArray-3','antennaArray','mana',3754,3143,'comms','antenna-signal-acquisition','antenna-carrier-chirp','copper-aerial'],
  ['v302-cafeteria-nutritionStation-1','healthyMealTable','healthyMeal',1334,2661,'cafeteria','meal-service-fan','service-bell-steam','ceramic-mealware'],
  ['v302-storage-equipmentLocker-3','equipmentLocker','stamina',1210,2011,'storage','storage-locker-withdrawal','storage-locker-latch','painted-steel'],
  ['v302-security-equipmentLocker-3','equipmentLocker','stamina',1458,965,'security','security-locker-release','security-locker-bolt','armored-steel'],
  ['v302-storage-cargoCrate-1','cargoCrate','credits',1203,1696,'storage','crate-hinged-credit-retrieval','crate-hinge-knock','timber-hinge'],
  ['v302-fabrication-workbench-1','workbench','stamina',3642,2102,'fabrication','fabrication-bench-tool-run','bench-tool-chime','machined-steel'],
  ['v302-engineering-workbench-1','workbench','stamina',3619,1316,'engineering','engineering-bench-pressure-release','bench-pressure-hiss','composite-worktop'],
  ['v302-atrium-airPlant-3','indoorGarden','luckBoost',2162,1899,'atrium','garden-root-to-canopy-luck-current','atrium-leaf-cup-rustle','leaf-and-clay'],
  ['v302-reactor-coolingUnit-2','coolingUnit','stamina',4388,388,'reactor','stone-basin-cold-current','basin-water-turn','water-over-carved-stone',[
   ['basin-opens',0,.14],['water-rises',.14,.39],['cool-current-crosses',.39,.72],['surface-settles',.72,.88],['stone-dim',.88,1]]],
  ['v302-observatory-commandDesk-3','commandDesk','luckBoost',2240,636,'observatory','survey-desk-sight-alignment','brass-sight-index','brushed-brass-and-glass',[
   ['desk-wakes',0,.14],['sight-sweeps',.14,.43],['reading-aligns',.43,.68],['bearing-holds',.68,.85],['instrument-rests',.85,1]]],
  ['v302-storage-palletJack-2','palletJack','acceleration',1600,1696,'storage','wicker-carrier-lift-and-roll','woven-cradle-wheel-roll','rubber-wheel-and-braided-wicker',[
   ['forks-engage',0,.16],['load-lifts',.16,.39],['rollers-drive',.39,.72],['forward-release',.72,.88],['wheel-stop',.88,1]]],
  ['v302-greenhouse-mistSprayer-2','restorativeMist','luckBoost',817,2652,'greenhouse','herbal-mist-canopy-bloom','ceramic-mist-leaf-tone','ceramic-bowl-and-herbal-vapor',[
   ['bowl-condenses',0,.16],['herbal-vapor-rises',.16,.43],['canopy-unfurls',.43,.72],['mist-carries',.72,.88],['dew-dissolves',.88,1]]],
  ['v302-greenhouse-compostUnit-3','herbPreparationTable','heal',313,3057,'greenhouse','mortar-press-infusion-return','stone-mortar-infusion-drop','stone-mortar-and-timber',[
   ['table-and-mortar',0,.15],['herbs-are-pressed',.15,.42],['infusion-forms',.42,.66],['remedy-returns',.66,.86],['surface-clears',.86,1]]],
  ['v302-security-cameraTripod-2','cameraTripod','luckBoost',1802,691,'security','observation-map-optical-registration','none-map-sfx','observed-map-and-wood',[
   ['map-acquires',0,.18],['readings-align',.18,.50],['reading-locks',.50,.78],['source-resolves',.78,1]]],
  ['v302-engineering-coolingUnit-3','coolingUnit','stamina',3632,1631,'engineering','stone-wash-inlet-divided-current','none-map-sfx','water-and-carved-stone',[
   ['inlet-engages',0,.18],['current-divides',.18,.50],['water-reaches-stone',.50,.78],['surface-settles',.78,1]]]
 ];
 const OBJECTS=Object.freeze(Object.fromEntries(raw.map((r,code)=>[r[0],Object.freeze({
  id:r[0],type:r[1],effectKind:r[2],x:r[3],y:r[4],room:r[5],width:110,height:76,code,
  design:r[6],soundProfile:r[7],visualSequence:r[9]?Object.freeze(r[9].map(([name,from,to])=>Object.freeze({name,from,to}))):null,
  sound:Object.freeze({profile:r[7],material:r[8],durationMs:180+code*7,
   edge:'accepted-use-once',playbackByCandidate:false})
 })])));
 const SFX_POLICY=Object.freeze({owner:'external-world-sound-player',edge:'one-per-accepted-object-use-event-id',
  required:true,customProfilesDistinct:true,candidatePlayback:false,idle:'none',loop:'none',
  note:'Current server emits generic object sound. Wire these exact ID profiles through the authoritative one-shot sound path.'});
 const SERVER_RACK_VISUAL=Object.freeze({sequence:Object.freeze([
  Object.freeze({name:'enclosure-response',from:0,to:.16}),
  Object.freeze({name:'rolling-bay-scan',from:.16,to:.42}),
  Object.freeze({name:'bounded-core-halo',from:.42,to:.62}),
  Object.freeze({name:'retrieval-pulse',from:.62,to:.80}),
  Object.freeze({name:'finite-decay',from:.80,to:1})
 ])});
 const finite=Number.isFinite;
 function visualPhase(code,progress){
  if(!finite(progress)||progress<0||progress>=1)return '';
  const profile=Object.values(OBJECTS).find(item=>item.code===code);
  const sequence=code===0?SERVER_RACK_VISUAL.sequence:profile?.visualSequence;
  if(!sequence)return '';
  const phase=sequence.find(item=>progress>=item.from&&progress<item.to);
  return phase?.name||'';
 }
const CAMERA_FUNCTIONS=`struct CameraField{color:vec3f,emission:vec3f,alpha:f32};
// Two reading regions belong to the observed map surface. Corners mark a
// completed reading, while a vertical front transfers light into that region.
// These are source-space readings, not a camera, screen replacement or new map.
fn readingCorners(q:vec2f,center:vec2f,halfSize:vec2f)->f32{
 let d=abs(q-center);
 let vertical=line(d.x-halfSize.x,.025)*band(d.y,halfSize.y-.11,halfSize.y+.025);
 let horizontal=line(d.y-halfSize.y,.025)*band(d.x,halfSize.x-.11,halfSize.x+.025);
 return vertical+horizontal;
}
fn cameraField(q:vec2f,t:f32,flags:f32)->CameraField{
 let sourceOn=select(0.0,1.0,(u32(flags)&1u)!=0u);let receiverOn=select(0.0,1.0,(u32(flags)&2u)!=0u);
 let wake=smoothstep(0.0,.12,t)*(1.0-smoothstep(.78,1.0,t));
 let plane=band(q.x,-.83,.55)*band(q.y,-.85,.32);
 let acquire=smoothstep(.04,.12,t)*(1.0-smoothstep(.28,.40,t));
 let approach=clamp((t-.06)/.24,0.0,1.0);
 let leftX=mix(-.79,-.68,approach);let rightX=mix(.50,.40,approach);
 let sweepL=line(q.x-leftX-.10*(q.y+.44),.055)*band(q.y,-.72,-.16)*acquire;
 let sweepR=line(q.x-rightX+.10*(q.y+.02),.055)*band(q.y,-.30,.26)*acquire;
 let regionA=band(q.x,-.68,-.28)*band(q.y,-.64,-.24);
 let regionB=band(q.x,0.0,.40)*band(q.y,-.22,.18);
 let travelA=clamp((t-.17)/.28,0.0,1.0);let travelB=clamp((t-.42)/.27,0.0,1.0);
 let frontAX=mix(-.68,-.28,travelA);let frontBX=mix(0.0,.40,travelB);
 let scanA=smoothstep(.14,.20,t)*(1.0-smoothstep(.43,.49,t));
 let scanB=smoothstep(.39,.45,t)*(1.0-smoothstep(.67,.73,t));
 let frontA=line(q.x-frontAX,.045)*regionA*scanA;
 let frontB=line(q.x-frontBX,.045)*regionB*scanB;
 let lockA=smoothstep(.40,.49,t)*(1.0-smoothstep(.82,.95,t));
 let lockB=smoothstep(.66,.75,t)*(1.0-smoothstep(.85,.98,t));
 let cornerA=readingCorners(q,vec2f(-.48,-.44),vec2f(.20))*lockA;
 let cornerB=readingCorners(q,vec2f(.20,-.02),vec2f(.20))*lockB;
 // The received face appears behind each front, never across the gap between
 // readings. The first reading can hold while the second is still acquiring.
 let receivedA=regionA*(1.0-smoothstep(frontAX-.035,frontAX+.035,q.x))*smoothstep(.17,.25,t);
 let receivedB=regionB*(1.0-smoothstep(frontBX-.035,frontBX+.035,q.x))*smoothstep(.42,.50,t);
 let pulse=1.0+.45*exp(-pow((t-.56)/.075,2.0));
 let source=vec3f(.43,.79,1.0)*(sweepL*.95+sweepR*.95+frontA*1.45+frontB*1.45+cornerA*1.45+cornerB*1.45)*plane*wake*sourceOn*pulse;
 let reflected=vec3f(.17,.30,.35)*(receivedA+receivedB*.85)*plane*wake*sourceOn*receiverOn;
 var o:CameraField;o.alpha=(receivedA*.17+receivedB*.15)*wake*sourceOn*receiverOn;
 o.color=source+reflected;o.emission=source;return o;
}
`;
const WASH_FUNCTIONS=`// Engineering stone wash basin: submerged inlet -> broad divided current ->
// bounded surface settling. Coordinates are registered to the actual basin.
fn washField(q:vec2f,t:f32,flags:f32,reduced:bool)->CameraField{
 let sourceOn=select(0.0,1.0,(u32(flags)&1u)!=0u);let receiverOn=select(0.0,1.0,(u32(flags)&2u)!=0u);
 let wake=smoothstep(0.0,.12,t)*(1.0-smoothstep(.78,1.0,t));
 let u=select(t,.53,reduced);
 let surface=band(q.x,-.84,.81)*band(q.y,-.98,.31);
 let inlet=vec2f(-.38,-.83);
 let fill=smoothstep(.10,.24,u);let divide=smoothstep(.26,.43,u);
 let settle=smoothstep(.58,.76,u);
 let frontY=mix(-.82,.20,clamp((u-.11)/.49,0.0,1.0));
 let stemX=inlet.x+.65*(q.y-inlet.y);
 let stem=line(q.x-stemX,.105)*band(q.y,inlet.y,-.39)*fill;
 let depth=clamp((q.y+.45)/.63,0.0,1.0);
 let leftX=-.12-.48*depth;let rightX=-.12+.70*depth;
 let leftBody=line(q.x-leftX,.17)*band(q.y,-.46,.23)*divide;
 let rightBody=line(q.x-rightX,.18)*band(q.y,-.46,.23)*divide;
 let passed=1.0-smoothstep(frontY-.035,frontY+.035,q.y);
 let advancing=line(q.y-frontY,.16);
 let foldL=line(q.x-leftX+.06,.040)*band(q.y,-.42,.21)*divide;
 let foldR=line(q.x-rightX-.06,.042)*band(q.y,-.42,.21)*divide;
 let entry=line(length((q-inlet)/vec2f(.11,.075)),.65)*fill;
 let crest=(stem*.70+(foldL+foldR)*(.35+advancing))*passed*(1.0-settle*.62);
 let water=(stem*.48+leftBody+rightBody)*passed;
 // The strong source lives at the inlet and moving folds. The gray water
 // body and warm received stone are distinct from that source radiance.
 let emission=vec3f(.95,.97,.88)*(entry*1.55+crest*1.65)*surface*wake*sourceOn;
 let body=vec3f(.20,.29,.32)*water*surface*wake*sourceOn;
 let wetLeft=band(q.x,-.93,-.80)*band(q.y,-.74,.31);
 let wetRight=band(q.x,.78,.91)*band(q.y,-.56,.31);
 let wetBottom=band(q.y,.26,.43)*band(q.x,-.82,.81);
 let received=vec3f(.24,.20,.14)*(wetLeft+wetRight+wetBottom)*smoothstep(.40,.63,u)*wake*sourceOn*receiverOn;
 var o:CameraField;o.alpha=water*surface*.18*wake*sourceOn;
 o.color=body+emission+received;o.emission=emission;return o;
}
`;
const CAMERA_WORLD=`struct Params{view:vec4f,source:vec4f,shape:vec4f,state:vec4f,targetCoord:vec4f};
@group(0)@binding(0)var<uniform>p:Params;
struct V{@builtin(position)position:vec4f,@location(0)uv:vec2f};
@vertex fn vs(@builtin(vertex_index)i:u32)->V{let q=vec2f(f32((i<<1u)&2u),f32(i&2u));var o:V;o.position=vec4f(q*vec2f(2,-2)+vec2f(-1,1),0,1);o.uv=q;return o;}
fn line(v:f32,w:f32)->f32{return exp(-v*v/max(w*w,.0001));}
fn band(v:f32,a:f32,b:f32)->f32{return smoothstep(a,a+.035,v)*(1.0-smoothstep(b-.035,b,v));}
struct CameraField{color:vec3f,emission:vec3f,alpha:f32};
// Two reading regions belong to the observed map surface. Corners mark a
// completed reading, while a vertical front transfers light into that region.
// These are source-space readings, not a camera, screen replacement or new map.
fn readingCorners(q:vec2f,center:vec2f,halfSize:vec2f)->f32{
 let d=abs(q-center);
 let vertical=line(d.x-halfSize.x,.025)*band(d.y,halfSize.y-.11,halfSize.y+.025);
 let horizontal=line(d.y-halfSize.y,.025)*band(d.x,halfSize.x-.11,halfSize.x+.025);
 return vertical+horizontal;
}
fn cameraField(q:vec2f,t:f32,flags:f32)->CameraField{
 let sourceOn=select(0.0,1.0,(u32(flags)&1u)!=0u);let receiverOn=select(0.0,1.0,(u32(flags)&2u)!=0u);
 let wake=smoothstep(0.0,.12,t)*(1.0-smoothstep(.78,1.0,t));
 let plane=band(q.x,-.83,.55)*band(q.y,-.85,.32);
 let acquire=smoothstep(.04,.12,t)*(1.0-smoothstep(.28,.40,t));
 let approach=clamp((t-.06)/.24,0.0,1.0);
 let leftX=mix(-.79,-.68,approach);let rightX=mix(.50,.40,approach);
 let sweepL=line(q.x-leftX-.10*(q.y+.44),.055)*band(q.y,-.72,-.16)*acquire;
 let sweepR=line(q.x-rightX+.10*(q.y+.02),.055)*band(q.y,-.30,.26)*acquire;
 let regionA=band(q.x,-.68,-.28)*band(q.y,-.64,-.24);
 let regionB=band(q.x,0.0,.40)*band(q.y,-.22,.18);
 let travelA=clamp((t-.17)/.28,0.0,1.0);let travelB=clamp((t-.42)/.27,0.0,1.0);
 let frontAX=mix(-.68,-.28,travelA);let frontBX=mix(0.0,.40,travelB);
 let scanA=smoothstep(.14,.20,t)*(1.0-smoothstep(.43,.49,t));
 let scanB=smoothstep(.39,.45,t)*(1.0-smoothstep(.67,.73,t));
 let frontA=line(q.x-frontAX,.045)*regionA*scanA;
 let frontB=line(q.x-frontBX,.045)*regionB*scanB;
 let lockA=smoothstep(.40,.49,t)*(1.0-smoothstep(.82,.95,t));
 let lockB=smoothstep(.66,.75,t)*(1.0-smoothstep(.85,.98,t));
 let cornerA=readingCorners(q,vec2f(-.48,-.44),vec2f(.20))*lockA;
 let cornerB=readingCorners(q,vec2f(.20,-.02),vec2f(.20))*lockB;
 // The received face appears behind each front, never across the gap between
 // readings. The first reading can hold while the second is still acquiring.
 let receivedA=regionA*(1.0-smoothstep(frontAX-.035,frontAX+.035,q.x))*smoothstep(.17,.25,t);
 let receivedB=regionB*(1.0-smoothstep(frontBX-.035,frontBX+.035,q.x))*smoothstep(.42,.50,t);
 let pulse=1.0+.45*exp(-pow((t-.56)/.075,2.0));
 let source=vec3f(.43,.79,1.0)*(sweepL*.95+sweepR*.95+frontA*1.45+frontB*1.45+cornerA*1.45+cornerB*1.45)*plane*wake*sourceOn*pulse;
 let reflected=vec3f(.17,.30,.35)*(receivedA+receivedB*.85)*plane*wake*sourceOn*receiverOn;
 var o:CameraField;o.alpha=(receivedA*.17+receivedB*.15)*wake*sourceOn*receiverOn;
 o.color=source+reflected;o.emission=source;return o;
}

${WASH_FUNCTIONS}
struct O{@location(0)color:vec4f,@location(1)emission:vec4f};
@fragment fn fs(v:V)->O{let px=v.uv*p.shape.xy+p.shape.zw;let world=p.view.xy+px/p.view.zw;let q=(world-p.source.xy)/p.source.zw*2.-vec2f(1.);var o:O;o.color=vec4f(0);o.emission=vec4f(0);if(any(abs(q)>vec2f(1))){return o;}var f:CameraField;if(p.state.y==20.0){f=washField(q,p.state.x,p.state.w,p.state.z>.5);}else{f=cameraField(q,p.state.x,p.state.w);}o.color=vec4f(f.color,f.alpha);o.emission=vec4f(f.emission,0);return o;}
`;
const CAMERA_POST=`struct Params{view:vec4f,source:vec4f,shape:vec4f,state:vec4f,targetCoord:vec4f};
@group(0)@binding(0)var<uniform>p:Params;
@group(0)@binding(1)var field:texture_2d<f32>;
@group(0)@binding(2)var emission:texture_2d<f32>;
@group(0)@binding(3)var smp:sampler;
struct V{@builtin(position)position:vec4f,@location(0)uv:vec2f};
@vertex fn vs(@builtin(vertex_index)i:u32)->V{let q=vec2f(f32((i<<1u)&2u),f32(i&2u));var o:V;o.position=vec4f(q*vec2f(2,-2)+vec2f(-1,1),0,1);o.uv=q;return o;}
fn sampleSource(uv:vec2f)->vec3f{if(any(uv<vec2f(0))||any(uv>vec2f(1))){return vec3f(0);}return textureSampleLevel(emission,smp,uv,0).rgb;}
@fragment fn fs(v:V)->@location(0)vec4f{let pixel=v.uv*p.targetCoord.xy;let uv=(pixel-p.shape.zw)/p.shape.xy;if(any(uv<vec2f(0))||any(uv>vec2f(1))){discard;}let ph=textureSampleLevel(field,smp,uv,0);var spread=sampleSource(uv)*.20;for(var j=-1;j<=1;j++){for(var i=-1;i<=1;i++){if(i!=0||j!=0){spread+=sampleSource(uv+vec2f(f32(i),f32(j))*p.view.zw*2.0/p.shape.xy)*.10;}}}let obs=select(0.,1.,(u32(p.state.w)&4u)!=0u);return vec4f(ph.rgb+spread*.24*obs,ph.a);}
`;
 const shader=/* wgsl */`
struct Params{view:vec4f,source:vec4f,shape:vec4f,state:vec4f};
@group(0)@binding(0)var<uniform>p:Params;
struct V{@builtin(position)position:vec4f,@location(0)clip:vec2f};
@vertex fn vs(@builtin(vertex_index)i:u32)->V{let q=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3))[i];var o:V;o.position=vec4f(q,0,1);o.clip=q;return o;}
fn line(v:f32,w:f32)->f32{return exp(-v*v/max(w*w,.0001));}
fn band(v:f32,a:f32,b:f32)->f32{return smoothstep(a,a+.035,v)*(1.0-smoothstep(b-.035,b,v));}
${CAMERA_FUNCTIONS}
${WASH_FUNCTIONS}
@fragment fn fs(i:V)->@location(0)vec4f{
 let px=vec2f((i.clip.x+1.0)*.5*p.shape.x,(1.0-i.clip.y)*.5*p.shape.y);
 let world=p.view.xy+px/p.view.zw;let q=(world-p.source.xy)/p.source.zw*2.0-vec2f(1.0);
 if(any(abs(q)>vec2f(1.0))){discard;}let t=p.state.x;let k=p.state.y;let reduced=p.state.z>.5;
 let u=select(t,.55,reduced);let fadeStart=select(.76,.88,k>=13.5);
 let env=smoothstep(0.0,.10,t)*(1.0-smoothstep(fadeStart,1.0,t));
 var m=0.0;var h=0.0;var c=vec3f(.8,.8,.8);
 if(k<.5){
  // Powered rack: enclosure opens, a broad scanner crosses ordered bays, a
  // bounded core gathers charge, then one retrieval pulse decays cleanly.
  let response=smoothstep(0.0,.12,t)*(1.0-smoothstep(.16,.24,t));
  let scan=smoothstep(.12,.20,t)*(1.0-smoothstep(.48,.58,t));
  let core=smoothstep(.34,.44,t)*(1.0-smoothstep(.68,.78,t));
  let retrieve=smoothstep(.59,.67,t)*(1.0-smoothstep(.76,.85,t));
  let scanY=.68-clamp((t-.16)/.42,0.0,1.0)*1.36;
  let retrievalProgress=clamp((t-.60)/.22,0.0,1.0);
  let sideOpen=.48+.15*response;
  let enclosure=(line(abs(q.x)-sideOpen,.055)*band(q.y,-.64,.64))+
   (line(abs(q.y)-.64,.055)*band(q.x,-.65,.65));
  let innerFrame=(line(abs(q.x)-.42,.035)*band(q.y,-.48,.48))+
   (line(abs(q.y)-.48,.035)*band(q.x,-.44,.44));
  let bays=(line(q.y+.23,.035)+line(q.y,.035)+line(q.y-.23,.035))*band(q.x,-.39,.39);
  let bayScan=line(q.y-scanY,.115)*band(q.x,-.38,.38)*scan;
  let scanLeading=line(q.y-scanY-.075,.045)*band(q.x,-.36,.36)*scan;
  let coreRadius=length(vec2f(q.x/.245,q.y/.52));
  let boundedCore=(1.0-smoothstep(.70,1.0,coreRadius))*core;
  let coreRim=line(coreRadius-.91,.105)*core;
  let coreHalo=line(coreRadius-1.10,.32)*core*.48;
  let pulseRadius=.10+retrievalProgress*.96;
  let retrievalRing=line(length(vec2f(q.x,q.y*.86))-pulseRadius,.075)*retrieve;
  let retrievalPacket=line(q.y-(.56-retrievalProgress*1.12),.105)*band(q.x,-.21,.21)*retrieve;
  let retrieveGate=(line(q.x-.24,.045)+line(q.x+.24,.045))*band(q.y,-.62,.62)*retrieve;
  c=vec3f(.36,.88,1.0);
  m=enclosure*(.35+.65*response)+innerFrame*.56+bays*.48+bayScan*.94+scanLeading*.7+
   boundedCore*.95+coreRim*.76+retrievalRing*.92+retrievalPacket;
  h=enclosure*.24+bayScan*.55+scanLeading*.45+boundedCore*.72+coreRim*.66+coreHalo*.9+
   retrievalRing*.64+retrievalPacket*.62+retrieveGate*.42;
 }else if(k<1.5){c=vec3f(1.0,.63,.30);let drawer=line(q.y+.27,.055)*band(q.x,-.58,.58);m=drawer*line(q.x-(u*1.5-.75),.19)+line(q.y-.54,.045)*band(q.x,-.68,.68)*.4;h=drawer*.25;
 }else if(k<2.5){c=vec3f(.98,.48,.25);let wheel=line(length(q-vec2f(-.48,.45))-.19,.04)+line(length(q-vec2f(.48,.45))-.19,.04);let spoke=line(q.y-.08*sin(u*6.28),.035)*band(q.x,-.38,.38);m=wheel*.65+spoke*band(q.y,-.36,.3);h=spoke*.65;
 }else if(k<3.5){c=vec3f(.59,.82,1.0);let ring=line(length(q)-(.17+.62*u),.055);let inlay=line(q.y-.08*sin(q.x*5.0),.055)*band(q.x,-.65,.65);m=ring*.68+inlay*line(u-(q.x*.5+.5),.18);h=ring*.42;
 }else if(k<4.5){c=vec3f(.47,.89,.76);let wave=line(q.y-.18*sin(q.x*7.0-u*9.0),.045)*band(q.x,-.75,.75);let dial=line(length(q-vec2f(.52,-.48))-.16,.04);m=wave*.8+dial*.55;h=wave*.42;
 }else if(k<5.5){c=vec3f(.77,.65,1.0);let cushion=line(q.y+.18+.08*sin(q.x*5.0),.09)*band(q.x,-.72,.72);let waves=line(q.y-(u*.95-.48),.045)*band(q.x,-.62,.62);m=cushion*.35+waves;h=waves*.48;
 }else if(k<6.5){c=vec3f(.34,.88,1.0);let mast=line(q.x,.035)*band(q.y,-.86,.72);let a=line(length(q-vec2f(-.28,.18))-(.15+.52*u),.045);let b=line(length(q-vec2f(.28,.18))-(.12+.43*u),.04);m=mast*.45+(a+b)*band(q.y,-.65,.48);h=(a+b)*.5;
 }else if(k<7.5){c=vec3f(1.0,.72,.32);let plate=band(q.y,.18,.58)*band(q.x,-.67,.67);let steam=line(q.x-.36*sin(u*5.0),.05)*band(q.y,-.72,.05)+line(q.x+.34*sin(u*4.0),.045)*band(q.y,-.68,.10);m=plate*.46+steam*.8;h=steam*.42;
 }else if(k<8.5){c=vec3f(.69,.87,1.0);let door=line(abs(q.x)-.56,.045)*band(q.y,-.72,.72);let shelves=line(q.y+.3,.035)*band(q.x,-.5,.5)+line(q.y-.25,.035)*band(q.x,-.5,.5);let pull=line(q.x-(u*1.2-.6),.13)*band(q.y,-.28,.12);m=door*.6+shelves*.35+pull*.7;h=pull*.5;
 }else if(k<9.5){c=vec3f(.38,.89,1.0);let bolt=line(q.x-.49,.05)*band(q.y,-.55,.55)+line(q.x+.49,.05)*band(q.y,-.55,.55);let bar=line(q.y-(.55-u*1.1),.065)*band(q.x,-.74,.74);m=bolt*.55+bar;h=bar*.55;
 }else if(k<10.5){c=vec3f(1.0,.56,.30);let lid=line(q.y-(.42-u*.75),.065)*band(q.x,-.72,.72);let box=line(abs(q.x)-.7,.04)*band(q.y,-.55,.38);m=lid+box*.45;h=lid*.6;
 }else if(k<11.5){c=vec3f(.72,.93,.43);let tool=line(q.y-(.48-.96*u),.055)*band(q.x,-.68,.68);let bench=line(q.y+.35,.06)*band(q.x,-.72,.72);let spark=(line(q.x-.42,.055)+line(q.x+.37,.05))*line(q.y-(.05+.24*sin(u*12.0)),.09);m=tool*.62+bench*.38+spark*.55;h=spark*.65;
 }else if(k<12.5){c=vec3f(.93,.72,.42);let platen=line(q.y+.28,.06)*band(q.x,-.68,.68);let pressure=line(q.x-(u*1.4-.7),.07)*band(q.y,-.60,.35);let release=line(q.y-(.05+.52*u),.055)*band(q.x,-.42,.42);m=platen*.42+pressure*.62+release*.6;h=release*.52;
  }else if(k<13.5){
   // Atrium garden: a contained clay cup feeds three broad leaves in order;
   // the accepted luck event lights each midrib from the root outward.
   c=vec3f(.55,.91,.45);let cup=line(q.y-.57,.065)*band(q.x,-.48,.48);
   let root=line(q.x,.045)*band(q.y,.22,.55);
   let left=line(q.x+.34+.24*q.y,.075)*band(q.y,-.64,.24);
   let right=line(q.x-.34-.24*q.y,.075)*band(q.y,-.64,.24);
   let crown=line(q.x,.06)*band(q.y,-.82,.20);
   let front=line(q.y-(.50-u*1.25),.14);
   m=cup*.42+root*.38+(left+right+crown)*front*.84;
   h=(left+right+crown)*front*.42;
  }else if(k<14.5){
   // Cooling basin: the carved lip contains a rising water plane. A broad
   // cross-current folds over the bowl, then inward ripples leave a cool pool.
   let open=smoothstep(0.0,.16,t);let fill=smoothstep(.10,.36,t);
   let lip=line(q.y+.40,.055)*band(q.x,-.72,.72);
   let bowlLeft=line(q.x+.58-.20*q.y,.055)*band(q.y,-.34,.69);
   let bowlRight=line(q.x-.58+.20*q.y,.055)*band(q.y,-.34,.69);
   let base=line(q.y-.66,.06)*band(q.x,-.42,.42);
   let waterline=.18-.38*fill+.035*sin(q.x*4.2-u*7.0);
   let water=band(q.y,waterline,waterline+.54)*band(q.x,-.55,.55)*fill;
   let current=line(q.y-(waterline+.16+.13*sin(q.x*3.3-u*5.4)),.075)*band(q.x,-.48,.48)*smoothstep(.28,.45,t);
   let inward=.15+.42*clamp((u-.38)/.34,0.0,1.0);
   let ripple=(line(length(vec2f(q.x*.94,(q.y-waterline-.18)*1.3))-inward,.045)+
    line(length(vec2f(q.x*.94,(q.y-waterline-.18)*1.3))-(inward+.16),.035))*smoothstep(.42,.58,t)*(1.0-smoothstep(.74,.86,t));
   c=vec3f(.35,.83,.88);
   m=(lip*(.48+.52*open)+(bowlLeft+bowlRight)*.58+base*.72)+water*.33+current*.76+ripple*.7;
   h=(bowlLeft+bowlRight)*.12+current*.25+ripple*.35;
  }else if(k<15.5){
   // Observatory desk: a hinged sight sweeps across a broad instrument face,
   // meets a glass index, and holds one measured bearing before going dark.
   let wake=smoothstep(0.0,.16,t);let sweep=smoothstep(.12,.27,t)*(1.0-smoothstep(.43,.55,t));
   let alignment=smoothstep(.39,.53,t)*(1.0-smoothstep(.68,.79,t));
   let slab=line(q.y-.48,.07)*band(q.x,-.78,.78);
   let front=line(q.y-.69,.045)*band(q.x,-.66,.66);
   let sideL=line(q.x+.68-.10*q.y,.055)*band(q.y,-.34,.62);
   let sideR=line(q.x-.68+.10*q.y,.055)*band(q.y,-.34,.62);
   let indexX=.58-1.16*clamp((u-.13)/.31,0.0,1.0);
   let index=line(q.x-indexX,.045)*band(q.y,-.24,.38)*sweep;
   let indexHead=line(length(vec2f(q.x-indexX,q.y+.23))-.12,.04)*sweep;
   let pivot=line(length(q-vec2f(.30,-.15))-.105,.045);
   let needleAngle=mix(-.60,.64,clamp((u-.16)/.37,0.0,1.0));
   let needleTip=vec2f(.30+cos(needleAngle)*.48,-.15+sin(needleAngle)*.48);
   let needle=line(q.x-(.30+(needleTip.x-.30)*clamp((u-.16)/.37,0.0,1.0)),.038)*
    band(q.y,-.68,.25)*sweep;
   let bearing=line(q.x-(.30+cos(.64)*.48),.045)*band(q.y,-.55,.22)*alignment;
   let glassIndex=line(length(vec2f((q.x-.30)*.83,(q.y+.15)*1.15))-.38,.035)*alignment;
   c=vec3f(.93,.66,.30);
   m=slab*.52+front*.55+(sideL+sideR)*.42+(pivot+needle*.8+index*.65+indexHead*.42)*wake+bearing*.9+glassIndex*.48;
   h=(needle*.35+indexHead*.28+bearing*.48+glassIndex*.25)*wake;
  }else if(k<16.5){
   // Wicker carrier: a raised cradle, exposed forks and paired rollers show
   // the load transfer; the roller turn then drives two broad forward wakes.
   let engage=smoothstep(0.0,.17,t);let lift=smoothstep(.15,.39,t);
   let drive=smoothstep(.36,.51,t)*(1.0-smoothstep(.72,.84,t));
   let forkY=.44-.16*lift;
   let cradle=band(q.y,-.48,-.12)*band(q.x,-.55,.55);
   let weaveA=line(q.x-.22*sin(q.y*3.2),.045)*band(q.y,-.44,-.15)*cradle;
   let weaveB=line(q.y+.30,.045)*band(q.x,-.50,.50)*cradle;
   let rail=line(q.y-forkY,.055)*band(q.x,-.75,.72);
   let forkL=line(q.y-(forkY+.11),.035)*band(q.x,-.74,.42);
   let forkR=line(q.y-(forkY-.11),.035)*band(q.x,-.74,.42);
   let handle=line(q.x+.62-.12*q.y,.055)*band(q.y,-.24,.62);
   let grip=line(q.y+.27,.055)*band(q.x,-.78,-.48);
   let wheelAngle=u*7.0;
   let wheelL=line(length(q-vec2f(-.56,.60))-.12,.045)+line(q.y-.60-.09*sin(wheelAngle),.03)*band(q.x,-.68,-.43);
   let wheelR=line(length(q-vec2f(.51,.60))-.12,.045)+line(q.y-.60-.09*sin(wheelAngle+1.0),.03)*band(q.x,.40,.64);
   let wakeY=.02+.23*sin(u*12.0);
   let wake=(line(q.x-(.32+.42*clamp((u-.39)/.35,0.0,1.0)),.055)+
    line(q.x-(.20+.39*clamp((u-.39)/.35,0.0,1.0)),.045))*band(q.y,wakeY-.16,wakeY+.16)*drive;
   c=vec3f(.77,.60,.93);
   m=cradle*.35+weaveA*.28+weaveB*.30+(rail+forkL+forkR)*engage*.72+(handle+grip)*.56+
    (wheelL+wheelR)*(.62+.30*drive)+wake*.82;
   h=wake*.46+(wheelL+wheelR)*drive*.18+rail*lift*.17;
  }else if(k<17.5){
   // Herbal mist: vapor rises from a ceramic bowl as three broad, staggered
   // ribbons; their upper arcs open into a canopy and dissolve as dew.
   let bowl=line(q.y-.53,.06)*band(q.x,-.50,.50);
   let bowlSideL=line(q.x+.45+.12*q.y,.055)*band(q.y,-.34,.58);
   let bowlSideR=line(q.x-.45-.12*q.y,.055)*band(q.y,-.34,.58);
   let rim=line(q.y+.27,.05)*band(q.x,-.57,.57);
   let rise=smoothstep(.11,.27,t)*(1.0-smoothstep(.72,.88,t));
   let travel=clamp((u-.14)/.68,0.0,1.0);
   let y1=.18-travel*.88;
   let vapor1=line(q.y-y1-.11*sin(q.x*3.0-u*4.0),.105)*band(q.x,-.36,.36)*rise;
   let vapor2=line(q.y-(y1+.10)-.12*sin(q.x*2.8-u*4.0+1.7),.09)*band(q.x,-.40,.40)*rise;
   let vapor3=line(q.y-(y1-.08)-.10*sin(q.x*3.2-u*4.0+3.1),.08)*band(q.x,-.31,.31)*rise;
   let canopyL=line(q.x+.33+.35*(q.y+.12),.07)*band(q.y,-.80,-.15)*smoothstep(.4,.62,t);
   let canopyR=line(q.x-.33-.35*(q.y+.12),.07)*band(q.y,-.80,-.15)*smoothstep(.4,.62,t);
   let dew=band(q.y,-.84,-.72)*band(q.x,-.64,.64)*smoothstep(.62,.76,t)*(1.0-smoothstep(.82,.92,t));
   c=vec3f(.38,.88,.70);
   m=(bowl*.38+(bowlSideL+bowlSideR)*.50+rim*.65)+vapor1*.62+vapor2*.52+vapor3*.40+
    (canopyL+canopyR)*.62+dew*.28;
   h=(vapor1*.28+vapor2*.25+vapor3*.20)+(canopyL+canopyR)*.24+dew*.10;
  }else if(k<18.5){
   // Herb table: a pestle compresses a broad leaf bed into one infusion;
   // the formed remedy settles back into the mortar in a single clear drop.
   let table=line(q.y-.65,.07)*band(q.x,-.76,.76);
   let tableFront=line(q.y-.76,.04)*band(q.x,-.64,.64);
   let bowl=abs(length(vec2f(q.x*.92,(q.y-.18)*1.18))-.40);
   let mortar=line(bowl,.052)*band(q.y,-.12,.58);
   let herbs=line(q.y-(.25+.055*sin(q.x*4.0)),.085)*band(q.x,-.29,.29)*smoothstep(.05,.24,t)*(1.0-smoothstep(.32,.44,t));
   let press=smoothstep(.15,.30,t)*(1.0-smoothstep(.43,.53,t));
   let pestleX=.05+.18*sin(u*4.2);
   let pestleTip=vec2f(pestleX,.05+.22*(1.0-press));
   let pestle=line(q.x-pestleX-.10*(q.y+.19),.055)*band(q.y,-.52,.30);
   let pressContact=line(q.y-pestleTip.y,.045)*band(q.x,pestleX-.17,pestleX+.17)*press;
   let infusion=smoothstep(.39,.54,t)*(1.0-smoothstep(.76,.88,t));
   let dropY=mix(-.33,.20,clamp((u-.42)/.19,0.0,1.0));
   let drop=line(length(vec2f((q.x-.02)*.78,q.y-dropY))-.105,.045)*infusion;
   let remedy=line(q.y-(.47-.05*sin(u*6.0)),.065)*band(q.x,-.25,.25)*smoothstep(.58,.72,t);
   let wash=line(q.y-(.37+.07*sin(q.x*4.0-u*3.0)),.06)*band(q.x,-.31,.31)*smoothstep(.70,.82,t)*(1.0-smoothstep(.86,.95,t));
   c=vec3f(.64,.88,.44);
   m=table*.44+tableFront*.46+mortar*.66+herbs*.70+pestle*.55+pressContact*.42+drop*.9+remedy*.58+wash*.68;
   h=pressContact*.24+drop*.54+remedy*.24+wash*.32;
  }
 else {var cf:CameraField;if(k<19.5){cf=cameraField(q,t,7.0);}else{cf=washField(q,t,7.0,reduced);}return vec4f(cf.color,cf.alpha);}
 let a=clamp((m+h*.58)*env*.78,0.0,.84);return vec4f(c*a,a);
}`;
 function supported(e){const s=OBJECTS[e?.objectId];return Boolean(s&&e.type===`object-${s.type}`&&e.effectKind===s.effectKind);}
 function eventStart(e){return finite(e?.startedAt)?e.startedAt:e?.at;}
 function plan({map,event,now,phase,camera,zoom,viewport,reducedMotion=false}={}){
  if(!supported(event)||map?.id!==MAP_ID||!Array.isArray(map.objects)||phase!=='playing'||
   typeof event.id!=='string'||!event.id||typeof event.playerId!=='string'||!event.playerId||
   !finite(now)||!finite(zoom)||zoom<=0||!camera||![camera.x,camera.y,viewport?.width,viewport?.height,
   viewport?.pixelWidth,viewport?.pixelHeight].every(finite)||viewport.width<=0||viewport.height<=0||
   !Number.isInteger(viewport.pixelWidth)||!Number.isInteger(viewport.pixelHeight)||viewport.pixelWidth<=0||viewport.pixelHeight<=0)return null;
  const s=OBJECTS[event.objectId],o=map.objects.find(x=>x?.id===s.id),start=eventStart(event);
  if(!o||o.type!==s.type||o.effectKind!==s.effectKind||o.x!==s.x||o.y!==s.y||
   o.visualWidth!==s.width||o.visualHeight!==s.height||o.room!==s.room||event.x!==s.x||event.y!==s.y||
   event.radius!==100||!finite(start)||!finite(event.duration)||event.duration<=0||event.duration>DURATION_MS||
   now<start||now>=start+event.duration)return null;
  const sx=zoom*viewport.pixelWidth/viewport.width,sy=zoom*viewport.pixelHeight/viewport.height;
  const halfW=Math.max(s.width*.78,28),halfH=Math.max(s.height*.78,28);
  const bounds={x:s.x-halfW,y:s.y-halfH,width:halfW*2,height:halfH*2};
  const rect={x:(bounds.x-camera.x)*sx,y:(bounds.y-camera.y)*sy,width:bounds.width*sx,height:bounds.height*sy};
  if(!Object.values(rect).every(finite)||rect.x>=viewport.pixelWidth||rect.y>=viewport.pixelHeight||rect.x+rect.width<=0||rect.y+rect.height<=0)return null;
  return Object.freeze({objectId:s.id,eventId:event.id,startedAt:start,code:s.code,design:s.design,effectKind:s.effectKind,
   progress:(now-start)/event.duration,visualPhase:visualPhase(s.code,(now-start)/event.duration),
   durationMs:event.duration,source:Object.freeze(bounds),screen:Object.freeze(rect),
   pixelWidth:viewport.pixelWidth,pixelHeight:viewport.pixelHeight,camera:Object.freeze({x:camera.x,y:camera.y}),
   scale:Object.freeze({x:sx,y:sy}),reducedMotion:Boolean(reducedMotion),
   sound:Object.freeze({required:s.code!==19&&s.code!==20,profile:s.soundProfile,eventId:event.id,x:s.x,y:s.y,
    edge:'accepted-use-once',currentProfile:'object',playbackByCandidate:false,durationMs:s.sound.durationMs,material:s.sound.material})});
 }
 function planAll({map,effects,...context}={}){if(!Array.isArray(effects))return Object.freeze([]);const seen=new Set(),out=[];
  for(const e of effects){const p=plan({map,event:e,...context});if(p&&!seen.has(e.id)){seen.add(e.id);out.push(p);}}return Object.freeze(out);}
 function pack(p){const s=OBJECTS[p?.objectId];if(!s||p.code!==s.code||typeof p.eventId!=='string'||!p.eventId||
  ![p.pixelWidth,p.pixelHeight,p.source?.x,p.source?.y,p.source?.width,p.source?.height,p.camera?.x,p.camera?.y,
   p.scale?.x,p.scale?.y,p.progress].every(finite)||p.pixelWidth<=0||p.pixelHeight<=0||p.scale.x<=0||p.scale.y<=0||p.progress<0||p.progress>=1)
   throw new TypeError('Valid room object E plan required');
  const d=new Float32Array([p.camera.x,p.camera.y,p.scale.x,p.scale.y,p.source.x,p.source.y,p.source.width,p.source.height,
   p.pixelWidth,p.pixelHeight,0,0,p.progress,p.code,p.reducedMotion?1:0,0]);
  if(!d.every(finite))throw new RangeError('Room object E uniform exceeds float32 range');return d;}
 function createCameraRecorder(owner){
  const device=owner.device,format=owner.format,slots=[],sampler=device.createSampler({minFilter:'linear',magFilter:'linear'});
  let destroyed=false,totalPixels=0;const MAX_PIXELS=4194304;
  const worldModule=device.createShaderModule({label:'Observation map PH MRT',code:CAMERA_WORLD});
  const postModule=device.createShaderModule({label:'Observation map actual PostEffects',code:CAMERA_POST});
  const worldPipeline=device.createRenderPipeline({layout:'auto',vertex:{module:worldModule,entryPoint:'vs'},fragment:{module:worldModule,entryPoint:'fs',targets:[{format:'rgba16float'},{format:'rgba16float'}]},primitive:{topology:'triangle-list'}});
  const postPipeline=device.createRenderPipeline({layout:'auto',vertex:{module:postModule,entryPoint:'vs'},fragment:{module:postModule,entryPoint:'fs',targets:[{format,blend:{color:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'},alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'}}}]},primitive:{topology:'triangle-list'}});
  function retire(s){if(!s)return;const dispose=()=>{for(const r of [s.buffer,...s.textures])if(owner.release(r))r.destroy();totalPixels-=s.w*s.h;};device.queue.onSubmittedWorkDone().then(dispose,dispose);}
  function slot(index,w,h){let s=slots[index];if(s?.w===w&&s?.h===h)return s;if(totalPixels+w*h>MAX_PIXELS)throw new RangeError('Observation map HDR scratch pixel budget');
   if(s){retire(s);}const buffer=owner.own(device.createBuffer({size:80,usage:0x40|0x08}));
   const textures=[0,1].map(()=>owner.own(device.createTexture({size:[w,h],format:'rgba16float',usage:0x10|0x04})));
   const views=textures.map(t=>t.createView());const worldBind=device.createBindGroup({layout:worldPipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer}}]});
   const postBind=device.createBindGroup({layout:postPipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer}},{binding:1,resource:views[0]},{binding:2,resource:views[1]},{binding:3,resource:sampler}]});
   totalPixels+=w*h;return slots[index]={w,h,buffer,textures,views,worldBind,postBind};
  }
  function record({planned,frame,target,viewport,index,diagnostics={}}){
   if(destroyed||owner.state!=='ready'||typeof frame.addEncoder!=='function')throw new Error('Observation map requires live shared encoder/PostEffects');
   const d=pack(planned),x=Math.max(0,Math.floor(planned.screen.x)),y=Math.max(0,Math.floor(planned.screen.y));
   const w=Math.ceil(Math.min(viewport.pixelWidth,planned.screen.x+planned.screen.width))-x,h=Math.ceil(Math.min(viewport.pixelHeight,planned.screen.y+planned.screen.height))-y;
   if(w<=0||h<=0||w>2048||h>2048)throw new RangeError('Observation map scratch extent');
   const s=slot(index,w,h),values=new Float32Array(20);values.set(d);values.set([w,h,x,y],8);values[15]=(diagnostics.source===false?0:1)|(diagnostics.receiver===false?0:2)|(diagnostics.observer===false?0:4);values.set([viewport.pixelWidth,viewport.pixelHeight,0,0],16);
   device.queue.writeBuffer(s.buffer,0,values);
   frame.stage(`world:observation-map:${planned.eventId}`);
   frame.addEncoder({label:`observation-map-PH-OBS:${planned.eventId}`,reads:[],writes:[target],encode(encoder,info){
    if(destroyed||info.device!==device||info.format!==format||info.size(target).width!==viewport.pixelWidth||info.size(target).height!==viewport.pixelHeight)throw new Error('Observation map shared lease mismatch');
    const ph=encoder.beginRenderPass({colorAttachments:s.views.map(view=>({view,loadOp:'clear',storeOp:'store',clearValue:{r:0,g:0,b:0,a:0}}))});ph.setPipeline(worldPipeline);ph.setBindGroup(0,s.worldBind);ph.draw(3);ph.end();
    const obs=encoder.beginRenderPass({colorAttachments:[{view:info.view(target),loadOp:'load',storeOp:'store'}]});obs.setPipeline(postPipeline);obs.setBindGroup(0,s.postBind);obs.draw(3);obs.end();
   }});
   return Object.freeze({drawn:true,objectId:planned.objectId,eventId:planned.eventId,design:planned.design,postEffectsRecorded:true,passes:2,soundPlaybackOwned:false,soundProfile:'none-map-sfx'});
  }
  return {record,destroy(){if(destroyed)return;destroyed=true;for(const s of slots)retire(s);slots.length=0;}};
 }

 function create({renderer,frameOwner=renderer}={}){
  if(frameOwner?.state!=='ready'||!frameOwner.device?.createShaderModule||!frameOwner.device?.createRenderPipeline||
   !frameOwner.device?.createBuffer||!frameOwner.device?.createBindGroup||!frameOwner.device?.queue?.writeBuffer||
   typeof frameOwner.own!=='function'||typeof frameOwner.release!=='function'||typeof frameOwner.format!=='string')
   throw new TypeError('Room object E requires ready shared WebGPU owner');
  const device=frameOwner.device,format=frameOwner.format,module=device.createShaderModule({label:'DVA room object use E',code:shader});
  const pipeline=device.createRenderPipeline({label:'DVA room source object E',layout:'auto',vertex:{module,entryPoint:'vs'},
   fragment:{module,entryPoint:'fs',targets:[{format,blend:{color:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'},
   alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'}}}]},primitive:{topology:'triangle-list'}});
  const slots=[],indices=new WeakMap(),seenByFrame=new WeakMap();let destroyed=false,cameraRecorder=null;
  function slot(i){if(slots[i])return slots[i];const buffer=frameOwner.own(device.createBuffer({label:`DVA room object E slot ${i}`,size:64,usage:0x40|0x08}));
   const bind=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer}}]});return(slots[i]={buffer,bind});}
  function record({frame,target,viewport,planned,cameraDiagnostics}={}){if(destroyed||frameOwner.state!=='ready')throw new Error('Room object E unavailable');
   if(!frame||typeof frame.stage!=='function'||typeof frame.add!=='function'||typeof target!=='string'||!target||viewport?.kind!=='main'||
    viewport.pixelWidth!==planned?.pixelWidth||viewport.pixelHeight!==planned?.pixelHeight)throw new TypeError('Room object E requires current main viewport plan');
   const d=pack(planned);let seen=seenByFrame.get(frame);if(!seen){seen=new Set();seenByFrame.set(frame,seen);}
   if(seen.has(planned.eventId))return Object.freeze({drawn:false,duplicate:true,eventId:planned.eventId});
   const i=indices.get(frame)||0;if(i>=MAX_FRAME_EVENTS)throw new RangeError('Room object E frame limit');
   if(planned.code===19||planned.code===20){cameraRecorder ||= createCameraRecorder(frameOwner);const result=cameraRecorder.record({planned,frame,target,viewport,index:i,diagnostics:cameraDiagnostics});seen.add(planned.eventId);indices.set(frame,i+1);return result;}
   const slotRef=slot(i);
   device.queue.writeBuffer(slotRef.buffer,0,d);frame.stage(`world:room-object-use-e:${planned.objectId}:${planned.eventId}`);
   frame.add({target,label:`world:${planned.design}:${planned.eventId}`,encode(pass,info){if(info.device!==device||info.format!==format||
    info.width!==viewport.pixelWidth||info.height!==viewport.pixelHeight)throw new Error('Room object E shared target mismatch');
    pass.setPipeline(pipeline);pass.setBindGroup(0,slotRef.bind);pass.draw(3);}});
   seen.add(planned.eventId);indices.set(frame,i+1);return Object.freeze({drawn:true,objectId:planned.objectId,eventId:planned.eventId,
    design:planned.design,soundProfile:planned.sound.profile,soundPlaybackOwned:false});
  }
  return Object.freeze({record,get state(){return destroyed?'destroyed':frameOwner.state;},destroy(){if(destroyed)return;destroyed=true;cameraRecorder?.destroy();
   for(const s of slots)if(frameOwner.release(s.buffer))s.buffer.destroy();slots.length=0;}});
 }
 const api=Object.freeze({WASH_FUNCTIONS,CAMERA_WORLD,CAMERA_POST,CAMERA_FUNCTIONS,MAP_ID,DURATION_MS,OBJECTS,SFX_POLICY,SERVER_RACK_VISUAL,visualPhase,shader,supported,plan,planAll,pack,create});
 root.DvaWebGPURoomObjectUseE=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:window);
