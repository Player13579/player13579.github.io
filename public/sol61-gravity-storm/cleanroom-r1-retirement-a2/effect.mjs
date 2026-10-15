// Original Gravity Storm field/eye E; GPU submission belongs to host.
export const VERSION_ID='gravity-storm-cleanroom-sol61-r1';
export const DURATION_MS=12000, SFX_OFFSET_MS=0, SFX_DURATION_MS=900, UNIFORM_FLOATS=16;
export const VARIANTS=Object.freeze([Object.freeze({id:'field-eye',durationMs:12000})]);
export function durationForVariant(i=0){if(i!==0)throw RangeError('variant');return DURATION_MS}
export function phaseAt(age,i=0){durationForVariant(i);return !Number.isFinite(age)||age<0||age>=12000?'off':age<650?'formation':age<11000?'tension':'dissipation'}
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
 const {width,height,dpr=1,worldToCss=1,groundYScale=.36,screenOriginCss,cameraWorld=[0,0],actorCenterCss,actorHeightCss=64}=input;
 if(![width,height,dpr,worldToCss,groundYScale,actorHeightCss].every(finite)||width<=0||height<=0||width>32768||height>32768||dpr<=0||dpr>8||worldToCss<=0||worldToCss>16||groundYScale<=0||groundYScale>1||actorHeightCss<=0||actorHeightCss>2048||!pair(screenOriginCss)||!pair(cameraWorld)||!pair(actorCenterCss))throw RangeError('finite viewport/projection/actor inputs required');
 const source=planSource(input),gate=source.active&&input.sourceOn!==false&&input.mainOn!==false;
 const z=input.zone, project=(x,y)=>[screenOriginCss[0]+(x-cameraWorld[0])*worldToCss,screenOriginCss[1]+(y-cameraWorld[1])*worldToCss*groundYScale];
 const field=source.valid?project(z.x,z.y):screenOriginCss,eye=source.eyeActive?project(z.safeX,z.safeY):field;
 // groundYScale is fixed .36 in shader; reject another projection instead of lying.
 if(groundYScale!==.36)throw RangeError('groundYScale must be .36');
 const flags=(input.showActor!==false?1:0)+(input.observerOn!==false?2:0)+(input.reducedMotion?4:0);
 const values=[width,height,dpr,Math.max(0,Math.min(12,source.ageMs/1000)),...field,520*worldToCss,+gate,...eye,140*worldToCss,+(gate&&source.eyeActive),...actorCenterCss,actorHeightCss,flags];
 const uniforms=new Float32Array(values);if(![...uniforms].every(finite))throw RangeError('Float32 projection overflow');
 return {uniforms,source,active:gate,phase:gate?source.phase:'off',fieldCenterCss:field,eyeCenterCss:eye};
}
export const WGSL=`
struct Params { viewport:vec4f, field:vec4f, eye:vec4f, actor:vec4f };
@group(0) @binding(0) var<uniform> u:Params;
@group(0) @binding(1) var actorTex:texture_2d<f32>;
@group(0) @binding(2) var actorSampler:sampler;
override ENCODE_TARGET:bool=false;
override ACTOR_ASPECT:f32=0.6036036;
struct VOut { @builtin(position) position:vec4f };
@vertex fn vs(@builtin(vertex_index) i:u32)->VOut {
 var pts=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));
 var o:VOut;o.position=vec4f(pts[i],0,1);return o;
}
fn decode(c:vec3f)->vec3f {return select(pow((c+vec3f(.055))/1.055,vec3f(2.4)),c/12.92,c<=vec3f(.04045));}
fn encode(c:vec3f)->vec3f {return select(1.055*pow(max(c,vec3f(0)),vec3f(1.0/2.4))-.055,c*12.92,c<=vec3f(.0031308));}
fn lineBand(d:f32,w:f32)->f32{return 1.0-smoothstep(w,w+1.5,d);}
@fragment fn fs(v:VOut)->@location(0) vec4f {
 let p=v.position.xy/u.viewport.z;
 let sec=u.viewport.w;
 let bits=u32(u.actor.w);
 let reduced=(bits&4u)!=0u;
 let formation=smoothstep(0.0,.65,sec);
 let departure=1.0-smoothstep(11.0,12.0,sec);
 let envelope=formation*departure*u.field.w;
 let q=(p-u.field.xy)/vec2f(1.0,.36);
 let rad=length(q);
 let theta=atan2(q.y,q.x);
 let drift=select(sec*.24,0.0,reduced);
 var ribbons=0.0;var rimLight=0.0;
 // Three broad inward curved folds; no particles stand for victims or damage.
 for(var j=0u;j<3u;j=j+1u){
   let jf=f32(j);
   let sector=cos(theta*3.0+rad/u.field.z*2.7-drift*3.0);
   let reach=u.field.z*(.39+jf*.21);
   let bow=reach+sin(theta*3.0-drift+jf)*u.field.z*.055;
   let band=lineBand(abs(rad-bow),2.5+jf*.7);
   let broken=smoothstep(-.35,.35,sector+jf*.12);
   ribbons=max(ribbons,band*broken);
   rimLight=max(rimLight,lineBand(abs(rad-bow-6.0),1.0)*broken*.24);
 }
 let eyeq=(p-u.eye.xy)/vec2f(1.0,.36);
 let eyed=length(eyeq);
 let hollow=1.0-smoothstep(u.eye.z*.91,u.eye.z,eyed);
 let cavity=1.0-hollow*u.eye.w;
 ribbons*=cavity*envelope;
 rimLight*=cavity*envelope;
 let eyeLip=lineBand(abs(eyed-u.eye.z),2.2)*u.eye.w*envelope;
 // Clear cavity is carried by the independent safe-eye coordinates, never field-center snapped.
 let color=vec3f(.29,.13,.9)*ribbons+vec3f(.48,.62,1.0)*(rimLight+eyeLip*.7);
 var alpha=clamp(ribbons*.68+rimLight*.3+eyeLip*.65,0.0,.88);
 var rgb=color;
 let uv=(p-u.actor.xy)/vec2f(u.actor.z*ACTOR_ASPECT,u.actor.z)+vec2f(.5);
 var a=vec4f(0);
 if((bits&1u)!=0u&&all(uv>=vec2f(0))&&all(uv<=vec2f(1))){a=textureSampleLevel(actorTex,actorSampler,uv,0.0);}
 var body=decode(a.rgb)*a.a;
 // Source-bound violet edge illumination, no screen-wide lens flare.
 if((bits&2u)!=0u){body+=vec3f(.05,.03,.12)*a.a*envelope*(ribbons+eyeLip);}
 rgb=body+rgb*(1.0-a.a);alpha=a.a+alpha*(1.0-a.a);
 if(ENCODE_TARGET&&alpha>0.00001){rgb=encode(rgb/alpha)*alpha;}
 return vec4f(rgb,alpha);
}
`;
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
 const buffer=device.createBuffer({size:64,usage:72,label:VERSION_ID+' uniforms'});
 let pipeline,bind;
 try {pipeline=device.createRenderPipeline({layout:'auto',vertex:{module:shader,entryPoint:'vs'},fragment:{module:shader,entryPoint:'fs',constants:{ENCODE_TARGET:!format.endsWith('-srgb')&&format!=='rgba16float',ACTOR_ASPECT:actorAspect},targets:[{format,blend:{color:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'},alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'}}}]},primitive:{topology:'triangle-list'}});
 bind=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer}},{binding:1,resource:actorTexture.createView()},{binding:2,resource:device.createSampler({magFilter:'linear',minFilter:'linear'})}]});}catch(e){buffer.destroy();throw e}
 let closed=false,disposal;
 function render(input){if(closed)throw Error('disposed');const s=frameState(input);if(!input.encoder||!input.view)throw TypeError('encoder/view');device.queue.writeBuffer(buffer,0,s.uniforms);const p=input.encoder.beginRenderPass({colorAttachments:[{view:input.view,loadOp:'load',storeOp:'store'}]});p.setPipeline(pipeline);p.setBindGroup(0,bind);p.draw(3);p.end();return {passes:1,active:s.active,phase:s.phase,source:s.source,submitted:false,gpuCompletion:'HOST_OWNED_NOT_OBSERVED'};}
 function dispose(){if(disposal)return disposal;closed=true;disposal=(async()=>{try{await device.queue.onSubmittedWorkDone()}catch(e){await device.lost}buffer.destroy()})();return disposal}
 return {render,diagnostics,diagnosticsReady,dispose,destroy:dispose};
}
