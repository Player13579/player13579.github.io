// Original Gravity Storm field/eye E; GPU submission belongs to host.
export const VERSION_ID='gravity-storm-cleanroom-sol61-r2';
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
export const WGSL="\nstruct Params { viewport:vec4f, field:vec4f, eye:vec4f, actor:vec4f };\n@group(0) @binding(0) var<uniform> u:Params;\n@group(0) @binding(1) var actorTex:texture_2d<f32>;\n@group(0) @binding(2) var actorSampler:sampler;\noverride ENCODE_TARGET:bool=false;\noverride ACTOR_ASPECT:f32=.6036036;\nstruct VOut { @builtin(position) position:vec4f };\n@vertex fn vs(@builtin(vertex_index) i:u32)->VOut {var pts=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));var o:VOut;o.position=vec4f(pts[i],0,1);return o;}\nfn decode(c:vec3f)->vec3f{return select(pow((c+vec3f(.055))/1.055,vec3f(2.4)),c/12.92,c<=vec3f(.04045));}\nfn encode(c:vec3f)->vec3f{return select(1.055*pow(max(c,vec3f(0)),vec3f(1.0/2.4))-.055,c*12.92,c<=vec3f(.0031308));}\nstruct Hit { color:vec4f, depth:f32 };\nfn vertexPoint(s:f32,t:f32,j:f32,sec:f32)->vec3f {\n let theta=j*2.0943951+(s-.5)*1.55+sec*.095;\n let bend=.035*sin(s*3.14159265+sec*.7+j);\n let radius=u.field.z*(.42+j*.205+t*.095+bend);\n let lift=u.field.z*.105*sin(s*3.14159265)*(1.0-.72*t*t);\n return vec3f(cos(theta)*radius,sin(theta)*radius,lift);\n}\nfn project(v:vec3f)->vec2f{return u.field.xy+vec2f(v.x,v.y*.36-v.z);}\nfn wedge(a:vec2f,b:vec2f)->f32{return a.x*b.y-a.y*b.x;}\nfn triangle(p:vec2f,a:vec3f,b:vec3f,c:vec3f,envelope:f32)->Hit {\n let pa=project(a);let pb=project(b);let pc=project(c);\n let det=wedge(pb-pa,pc-pa);\n if(abs(det)<.001){return Hit(vec4f(0),-1e10);}\n let w1=wedge(p-pa,pc-pa)/det;let w2=wedge(pb-pa,p-pa)/det;let w0=1.0-w1-w2;\n if(min(w0,min(w1,w2))<0.0){return Hit(vec4f(0),-1e10);}\n let xyz=a*w0+b*w1+c*w2;\n let eyexy=(u.eye.xy-u.field.xy)/vec2f(1.0,.36);\n let cutDistance=length(xyz.xy-eyexy)-u.eye.z;\n if(u.eye.w>.5&&cutDistance<0.0){return Hit(vec4f(0),-1e10);}\n var n=normalize(cross(b-a,c-a));\n if(n.z<0.0){n=-n;}\n let diffuse=.22+.6*max(0.0,dot(n,normalize(vec3f(-.4,-.2,1))));\n let facing=abs(n.z);\n let bevel=select(0.0,(1.0-smoothstep(0.0,5.0,cutDistance))*.42,u.eye.w>.5);\n // Face coverage is opaque-enough material, lighting follows actual mesh normal.\n let base=vec3f(.13,.055,.34)*diffuse+vec3f(.20,.16,.44)*(1.0-facing)*.5;\n let sheen=pow(max(0.0,dot(n,normalize(vec3f(.4,-.55,.9)))),12.0)*.3;\n let col=base+vec3f(.53,.49,.95)*(sheen+bevel+.09);\n let opacity=.82*envelope;\n return Hit(vec4f(col*opacity,opacity),xyz.y+xyz.z*.05);\n}\nfn over(a:vec4f,b:vec4f)->vec4f{return a+b*(1.0-a.a);}\n@fragment fn fs(v:VOut)->@location(0) vec4f {\n let p=v.position.xy/u.viewport.z;let bits=u32(u.actor.w);\n let sec=select(u.viewport.w,0.0,(bits&4u)!=0u);\n let envelope=smoothstep(0.0,.65,u.viewport.w)*(1.0-smoothstep(11.0,12.0,u.viewport.w))*u.field.w;\n var layers:array<Hit,3>;\n for(var j=0u;j<3u;j=j+1u){\n  var best=Hit(vec4f(0),-1e10);\n  if(envelope>0.0){\n   for(var k=0u;k<4u;k=k+1u){for(var l=0u;l<2u;l=l+1u){\n    let a=vertexPoint(f32(k)/4.0,f32(l)-1.0,f32(j),sec);\n    let b=vertexPoint(f32(k+1u)/4.0,f32(l)-1.0,f32(j),sec);\n    let c=vertexPoint(f32(k+1u)/4.0,f32(l),f32(j),sec);\n    let d=vertexPoint(f32(k)/4.0,f32(l),f32(j),sec);\n    let h1=triangle(p,a,b,c,envelope);let h2=triangle(p,a,c,d,envelope);\n    if(h1.depth>best.depth){best=h1;}if(h2.depth>best.depth){best=h2;}\n   }}\n  }\n  layers[j]=best;\n }\n for(var i=0u;i<3u;i=i+1u){for(var j=i+1u;j<3u;j=j+1u){if(layers[i].depth>layers[j].depth){let temp=layers[i];layers[i]=layers[j];layers[j]=temp;}}}\n let uv=(p-u.actor.xy)/vec2f(u.actor.z*ACTOR_ASPECT,u.actor.z)+vec2f(.5);\n var body=vec4f(0);\n if((bits&1u)!=0u&&all(uv>=vec2f(0))&&all(uv<=vec2f(1))){let tex=textureSampleLevel(actorTex,actorSampler,uv,0.0);body=vec4f(decode(tex.rgb)*tex.a,tex.a);}\n let actorDepth=(u.actor.y+u.actor.z*.5-u.field.y)/.36;\n var composed=vec4f(0);var bodyDone=false;\n for(var j=0u;j<3u;j=j+1u){\n  if(!bodyDone&&actorDepth<=layers[j].depth){composed=over(body,composed);bodyDone=true;}\n  composed=over(layers[j].color,composed);\n }\n if(!bodyDone){composed=over(body,composed);}\n if((bits&2u)!=0u){composed=vec4f(composed.rgb+vec3f(.015,.009,.035)*body.a*envelope,composed.a);}\n if(ENCODE_TARGET&&composed.a>.00001){composed=vec4f(encode(composed.rgb/composed.a)*composed.a,composed.a);}\n return composed;\n}\n";
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
