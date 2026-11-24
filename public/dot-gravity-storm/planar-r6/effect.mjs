// Gravity Storm R6 by dot: full-map planar ink and localized pull E; GPU submission belongs to host.
export const VERSION_ID='gravity-storm-dot-r6';
export const DURATION_MS=12000, SFX_OFFSET_MS=0, SFX_DURATION_MS=900, UNIFORM_FLOATS=20;
export const VARIANTS=Object.freeze([Object.freeze({id:'field-eye',durationMs:12000})]);
export function durationForVariant(i=0){if(i!==0)throw RangeError('variant');return DURATION_MS}
export function phaseAt(age,i=0){durationForVariant(i);return !Number.isFinite(age)||age<0||age>=12000?'off':age<650?'formation':age<11000?'tension':'terminal-strength'}
const finite=Number.isFinite;
const pair=(v)=>Array.isArray(v)&&v.length===2&&v.every(finite);
export function planSource(input={}){
 const z=input.zone,n=input.serverNow;
 const invalid=(reason)=>({valid:false,active:false,eyeActive:false,reason,phase:'off',ageMs:0,causalId:null});
 if(!z||typeof z.id!=='string'||!z.id||typeof z.ownerId!=='string'||!z.ownerId)return invalid('missing-identity');
 if(![z.x,z.y,z.startedAt,z.endsAt,n].every(finite))return invalid('nonfinite-source');
 if(n<946684800000||z.startedAt<946684800000||z.endsAt-z.startedAt!==12000)return invalid('clock-domain-or-duration');
 const age=n-z.startedAt, live=age>=0&&n<z.endsAt;
 const eye=live&&finite(z.barrierUntil)&&z.barrierUntil>0&&n<z.barrierUntil&&finite(z.safeX)&&finite(z.safeY);
 return {valid:true,active:live,eyeActive:eye,reason:null,ageMs:age,phase:phaseAt(age),causalId:'gravity-storm:'+z.id,startedAt:z.startedAt,endsAt:z.endsAt,barrierUntil:finite(z.barrierUntil)?z.barrierUntil:null};
}
export function frameState(input={}){
 const {width,height,dpr=1,worldToCss=1,groundYScale=1,screenOriginCss,cameraWorld=[0,0],actorCenterCss,actorHeightCss=64}=input;
 if(![width,height,dpr,worldToCss,groundYScale,actorHeightCss].every(finite)||width<=0||height<=0||width>32768||height>32768||dpr<=0||dpr>8||worldToCss<=0||worldToCss>16||groundYScale<=0||groundYScale>1||actorHeightCss<=0||actorHeightCss>2048||!pair(screenOriginCss)||!pair(cameraWorld)||!pair(actorCenterCss))throw RangeError('finite viewport/projection/actor inputs required');
 const source=planSource(input),gate=source.active&&input.sourceOn!==false&&input.mainOn!==false;
 const z=input.zone, project=(x,y)=>[screenOriginCss[0]+(x-cameraWorld[0])*worldToCss,screenOriginCss[1]+(y-cameraWorld[1])*worldToCss*groundYScale];
 const field=source.valid?project(z.x,z.y):screenOriginCss,eye=source.eyeActive?project(z.safeX,z.safeY):field;
 // R6 is an orthographic plan view. Bounds belong to the map, never the camera or 520.
 if(groundYScale!==1)throw RangeError('top-down map projection requires groundYScale 1');
 const worldRect=input.mapWorldRect;
 if(!Array.isArray(worldRect)||worldRect.length!==4||!worldRect.every(finite)||worldRect[0]>=worldRect[2]||worldRect[1]>=worldRect[3])throw RangeError('finite authored mapWorldRect required');
 const bounds=[...project(worldRect[0],worldRect[1]),...project(worldRect[2],worldRect[3])];
 const flags=(input.showActor!==false?1:0)+(input.observerOn!==false?2:0)+(input.reducedMotion?4:0);
 const values=[width,height,dpr,Math.max(0,Math.min(12,source.ageMs/1000)),...field,520*worldToCss,+gate,...eye,140*worldToCss,+(gate&&source.eyeActive),...actorCenterCss,actorHeightCss,flags,...bounds];
 const uniforms=new Float32Array(values);if(![...uniforms].every(finite))throw RangeError('Float32 projection overflow');
 return {uniforms,source,active:gate,phase:gate?source.phase:'off',fieldCenterCss:field,eyeCenterCss:eye,mapBoundsCss:bounds};
}
export const WGSL="struct Params { viewport:vec4f, field:vec4f, eye:vec4f, actor:vec4f, map:vec4f }\n@group(0) @binding(0) var<uniform> u:Params;\n@group(0) @binding(1) var actorTex:texture_2d<f32>;\n@group(0) @binding(2) var actorSampler:sampler;\noverride ENCODE_TARGET:bool=false;\noverride ACTOR_ASPECT:f32=.6036036;\nstruct VOut { @builtin(position) position:vec4f }\n@vertex fn vs(@builtin(vertex_index) i:u32)->VOut {\n  var quad=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));\n  var o:VOut;o.position=vec4f(quad[i],0,1);return o;\n}\nfn decode(c:vec3f)->vec3f{return select(pow((c+vec3f(.055))/1.055,vec3f(2.4)),c/12.92,c<=vec3f(.04045));}\nfn encode(c:vec3f)->vec3f{return select(1.055*pow(max(c,vec3f(0)),vec3f(1./2.4))-.055,c*12.92,c<=vec3f(.0031308));}\nfn over(src:vec4f,dst:vec4f)->vec4f{return src+dst*(1.-src.a);}\nfn ink(c:vec3f,a:f32)->vec4f{return vec4f(decode(c)*a,a);}\nfn pen(d:f32,w:f32)->f32{return 1.-smoothstep(w,w+.85,abs(d));}\nfn interval(x:f32,lo:f32,hi:f32)->f32{return smoothstep(lo-.8,lo+.4,x)*(1.-smoothstep(hi-.4,hi+.8,x));}\nfn diamondSeg(p:vec2f)->f32{\n  // Concave feather nib aimed at the origin. No closed loop at the suction point.\n  let q=abs(p);let t=max(q.x,q.y);let v=min(q.x,q.y);\n  return pen(v-max(0.,t-5.)*.33,.92)*interval(t,5.,21.);\n}\n@fragment fn fs(v:VOut)->@location(0) vec4f {\n let p=v.position.xy/u.viewport.z;let bits=u32(u.actor.w);\n let sec=u.viewport.w;let animated=(bits&4u)==0u;let obs=(bits&2u)!=0u;\n let late=smoothstep(10.96,11.12,sec);\n let t=select(.42,sec,animated);\n var c=vec4f(0.);\n if(u.field.w>.5) {\n  let dl=p-u.map.xy;let dh=u.map.zw-p;\n  let h=min(min(dl.x,dl.y),min(dh.x,dh.y));\n  let clip=smoothstep(-.65,.65,h);\n  if(clip>0.) {\n   let coverage=.64+.36*smoothstep(0.,.22,sec);\n   let d=p-u.field.xy;let r=length(d);let safeR=max(r,.05);\n   let theta=atan2(d.y,select(d.x,.01,r<.005));let tau=6.283185307;\n   // A printed field of open inward curves, derived from world-relative radius and azimuth.\n   let bend=.72*log(1.+safeR/75.)+.065*sin(safeR/134.);\n   let stripe=7.*(theta+bend)/tau;\n   let lane=(fract(stripe+.5)-.5)*tau*max(12.,r)/7.;\n   let branches=smoothstep(16.,46.,r);\n   let halo=exp(-abs(lane)/14.)*branches;\n   let radialPaper=.5+.5*sin((r*.017+theta*2.)+t*.14);\n   let violet=mix(vec3f(.33,.25,.59),vec3f(.56,.28,.62),late);\n   let cyan=mix(vec3f(.54,.88,.93),vec3f(1.,.68,.50),late);\n   let white=mix(vec3f(.85,.84,1.),vec3f(1.,.90,.76),late);\n   let floor=mix(vec3f(.13,.13,.26),violet,.28+.09*radialPaper+.18*halo);\n   c=ink(floor,(.52+.10*halo)*coverage);\n   // Ink ribbon and comb lines have no elevations or faux specular surfaces.\n   let bank=exp(-abs(lane-3.)/(5.+min(r,480.)*.014))*branches;\n   c=over(ink(violet,bank*.63*coverage),c);\n   let main=pen(lane,1.25)*branches;\n   let aux=pen(lane-(5.+min(480.,r)*.018),.55)*branches;\n   c=over(ink(cyan,(main*.66+aux*.20)*coverage),c);\n   // Broken arrowheads translate against increasing r, so their tips travel inward.\n   let intervalPx=mix(110.,82.,late);\n   let travel=(fract((r+t*intervalPx/.6)/intervalPx+.5)-.5)*intervalPx;\n   let chevron=pen(abs(lane)-max(0.,travel)*.43,.90)*interval(travel,0.,10.)*branches;\n   c=over(ink(white,chevron*.95*coverage),c);\n   // Small tick accents mark only the source cadence, not victims, impacts or damage receipts.\n   let beat=select(.28,exp(-fract(t/.6)*5.4),animated);\n   c=over(ink(cyan,halo*.08*beat*coverage*select(.0,1.,obs)),c);\n   let inner=pen(h-7.,.60);\n   let q=min(dl,dh);let corner=max(q.x,q.y);\n   let cornerPulse=1.-smoothstep(11.,24.,corner);\n   let rim=pen(h-2.1,1.12);\n   c=over(ink(vec3f(.10,.10,.20),pen(h-3.,2.2)*.90*coverage),c);\n   c=over(ink(white,(rim*(.89+.08*beat)+inner*(.24+.38*cornerPulse))*coverage),c);\n   let sourceMark=diamondSeg(d);\n   c=over(ink(white,sourceMark*coverage),c);\n   let punch=(1.-smoothstep(1.6,3.,r));\n   c=over(ink(cyan,punch*coverage),c);\n   // The caster marker is a personal cut-open bracket, not a safe disk or hole in the field.\n   if(u.eye.w>.5) {\n    let rel=abs(p-u.eye.xy);let b=clamp(u.eye.z*.37,13.,34.);\n    let side=pen(rel.x-b,.90)*interval(rel.y,0.,5.5);\n    let caps=pen(rel.y-5.5,.65)*interval(rel.x,b-4.,b);\n    c=over(ink(vec3f(1.,.79,.43),max(side,caps)*coverage),c);\n   }\n   c=c*clip;\n  }\n }\n let uv=(p-u.actor.xy)/vec2f(u.actor.z*ACTOR_ASPECT,u.actor.z)+vec2f(.5);\n if((bits&1u)!=0u&&all(uv>=vec2f(0))&&all(uv<=vec2f(1))){\n  let tex=textureSampleLevel(actorTex,actorSampler,uv,0.);\n  c=over(vec4f(decode(tex.rgb)*tex.a,tex.a),c);\n }\n if(ENCODE_TARGET&&c.a>.00001){c=vec4f(encode(c.rgb/c.a)*c.a,c.a);}\n return c;\n}\n";
export function synthesizeSfx(sampleRate=48000,variant=0){
 durationForVariant(variant);if(!finite(sampleRate)||sampleRate<8000||sampleRate>192000||!Number.isInteger(sampleRate))throw RangeError('sampleRate');
 const out=new Float32Array(Math.ceil(sampleRate*.9));let seed=0x73a95b17;
 for(let i=0;i<out.length;i++){const t=i/sampleRate;seed=(Math.imul(seed,1664525)+1013904223)>>>0;const noise=(seed/4294967296*2-1);
 const env=Math.sin(Math.PI*Math.min(1,t/.9))**1.4*Math.exp(-t*2.2);
 const f=84+112*Math.exp(-t*7);const phase=2*Math.PI*(84*t+16*(1-Math.exp(-7*t)));
 out[i]=.34*env*(Math.sin(phase)+.27*Math.sin(phase*2.013)+.13*noise*Math.exp(-t*9));}return out;
}
export function createRenderer({device,format,actorTexture,actorAspect=134/222}){
 if(!device||!actorTexture||!finite(actorAspect)||actorAspect<=0)throw TypeError('device/texture/aspect');
 if(!['rgba8unorm','bgra8unorm','rgba8unorm-srgb','bgra8unorm-srgb','rgba16float'].includes(format))throw RangeError('format');
 const diagnostics={status:'PENDING',messages:[],error:null};
 const shader=device.createShaderModule({code:WGSL,label:VERSION_ID});
 const diagnosticsReady=shader.getCompilationInfo().then(info=>{diagnostics.messages=info.messages.map(m=>({message:m.message,type:m.type,lineNum:m.lineNum,linePos:m.linePos}));diagnostics.status=diagnostics.messages.some(m=>m.type==='error')?'ERROR':'COMPLETE';return diagnostics;},e=>{diagnostics.status='ERROR';diagnostics.error=String(e);return diagnostics});
 const buffer=device.createBuffer({size:80,usage:72,label:VERSION_ID+' uniforms'});
 let pipeline,bind;
 try {pipeline=device.createRenderPipeline({layout:'auto',vertex:{module:shader,entryPoint:'vs'},fragment:{module:shader,entryPoint:'fs',constants:{ENCODE_TARGET:!format.endsWith('-srgb')&&format!=='rgba16float',ACTOR_ASPECT:actorAspect},targets:[{format,blend:{color:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'},alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'}}}]},primitive:{topology:'triangle-list'}});
 bind=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer}},{binding:1,resource:actorTexture.createView()},{binding:2,resource:device.createSampler({magFilter:'linear',minFilter:'linear'})}]});}catch(e){buffer.destroy();throw e}
 let closed=false,disposal;
 function render(input){if(closed)throw Error('disposed');const s=frameState(input);if(!input.encoder||!input.view)throw TypeError('encoder/view');device.queue.writeBuffer(buffer,0,s.uniforms);const p=input.encoder.beginRenderPass({colorAttachments:[{view:input.view,loadOp:'load',storeOp:'store'}]});p.setPipeline(pipeline);p.setBindGroup(0,bind);p.draw(3);p.end();return {passes:1,active:s.active,phase:s.phase,source:s.source,submitted:false,gpuCompletion:'HOST_OWNED_NOT_OBSERVED'};}
 function dispose(){if(disposal)return disposal;closed=true;disposal=(async()=>{try{await device.queue.onSubmittedWorkDone()}catch(e){await device.lost}buffer.destroy()})();return disposal}
 return {render,diagnostics,diagnosticsReady,dispose,destroy:dispose};
}
