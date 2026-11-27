// DVA gallery-only: performer-local visual closure of an already-finished common task.
export const VERSION_ID='dot-task-local-completion-r1';
export const DURATION_MS=1200,SFX_OFFSET_MS=0,SFX_DURATION_MS=470,UNIFORM_FLOATS=12;
export const EDITION=1,EDITION_LIMIT=5;
const finite=Number.isFinite,cap=(a)=>Math.max(0,Math.min(1,a));
export function phaseAt(ageMs){
 return !finite(ageMs)||ageMs<0||ageMs>=DURATION_MS?'off':ageMs<238?'align':ageMs<485?'closure':'settle';
}
export function planSource(event,serverNow,viewerId){
 const off=reason=>({valid:false,active:false,phase:'off',reason,causalId:null,ageMs:0});
 if(!event||event.type!=='action-task'||event.variant!==''||!['download','upload'].includes(event.mode))return off('not-completed-common-task');
 if(typeof event.id!=='string'||!/^magic_.{1,174}$/.test(event.id)||typeof event.playerId!=='string'||!event.playerId)return off('missing-cause-owner');
 if(typeof viewerId!=='string'||!viewerId||viewerId!==event.playerId)return off('not-performer');
 if(![event.x,event.y,event.at,serverNow,event.targetX,event.targetY].every(finite)||event.at<946684800000||serverNow<946684800000||event.durationMs!==0||event.radius!==105||typeof event.targetId!=='string'||!event.targetId)return off('invalid-receipt-fields');
 if(event.at-serverNow>125)return off('future-receipt');
 const ageMs=serverNow-event.at,phase=phaseAt(ageMs);
 return {valid:true,active:phase!=='off',phase,reason:null,causalId:'task-local-completion:'+event.id,ageMs,startedAt:event.at,endsAt:event.at+DURATION_MS};
}
export function frameState({width,height,dpr=1,event,serverNow,viewerId,actorCenterCss,actorHeightCss=64,sourceOn=true,mainOn=true,observerOn=true,showActor=true,reducedMotion=false}={}){
 if(![width,height,dpr,actorHeightCss].every(finite)||width<1||width>32768||height<1||height>32768||dpr<=0||dpr>8||actorHeightCss<8||actorHeightCss>2048||!Array.isArray(actorCenterCss)||actorCenterCss.length!==2||!actorCenterCss.every(finite))throw RangeError('viewport and actor fixture');
 const source=planSource(event,serverNow,viewerId),active=source.active&&sourceOn!==false&&mainOn!==false;
 const flags=(showActor!==false?1:0)+(observerOn!==false?2:0)+(reducedMotion?4:0);
 const uniforms=new Float32Array([width,height,dpr,Math.max(0,Math.min(1.2,source.ageMs*.001)),...actorCenterCss,actorHeightCss,flags,0,0,+active,0]);
 if(![...uniforms].every(finite))throw RangeError('uniform overflow');
 return {uniforms,source,active,phase:active?source.phase:'off'};
}
export const WGSL="struct Params { view:vec4f, actor:vec4f, state:vec4f }\n@group(0) @binding(0) var<uniform> u:Params;\n@group(0) @binding(1) var tex:texture_2d<f32>;\n@group(0) @binding(2) var samp:sampler;\noverride ENCODE_TARGET:bool=false;\noverride ACTOR_ASPECT:f32=.6036036;\nstruct Out { @builtin(position) pos:vec4f }\n@vertex fn vs(@builtin(vertex_index) i:u32)->Out{\n var v=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));\n var o:Out;o.pos=vec4f(v[i],0.,1.);return o;\n}\nfn decode(c:vec3f)->vec3f{return select(pow((c+vec3f(.055))/1.055,vec3f(2.4)),c/12.92,c<=vec3f(.04045));}\nfn encode(c:vec3f)->vec3f{return select(1.055*pow(max(c,vec3f(0)),vec3f(1./2.4))-vec3f(.055),c*12.92,c<=vec3f(.0031308));}\nfn sat(x:f32)->f32{return clamp(x,0.,1.);}\nfn ink(c:vec3f,a:f32)->vec4f{let n=sat(a);return vec4f(c*n,n);}\nfn over(a:vec4f,b:vec4f)->vec4f{return a+b*(1.-a.a);}\nfn fill(d:f32,aa:f32)->f32{return 1.-smoothstep(-aa*.30,aa,d);}\nfn thin(d:f32,w:f32,aa:f32)->f32{return 1.-smoothstep(w,w+aa,abs(d));}\nfn eventPulse(t:f32)->f32{\n let e=t-.238;return smoothstep(-.012,.018,e)*(1.-smoothstep(.034,.225,e));\n}\n@fragment fn fs(f:Out)->@location(0) vec4f{\n let p=f.pos.xy/u.view.z;\n let bits=u32(u.actor.w);\n let t=u.view.w;\n let reduced=(bits&4u)!=0u;\n let obs=(bits&2u)!=0u;\n let aa=clamp(.71*64./u.actor.z,.33,2.19);\n // The two local surfaces are arranged around the arms of the selected\n // fixture (not the remote task target or any system graphic).\n let pivot=u.actor.xy+u.actor.z*vec2f(-.035,.112);\n let q=(p-pivot)*64./u.actor.z;\n let x=abs(q.x);\n let run=u.state.z>.5;\n let closing=eventPulse(t);\n let release=smoothstep(.410,1.135,t);\n let form=smoothstep(-.020,.117,t);\n var col=vec4f(0.);\n let violet=vec3f(.216,.21,.57);\n let azure=vec3f(.11,.56,.83);\n let mint=vec3f(.24,.93,.74);\n let white=vec3f(.79,.99,.93);\n let champagne=vec3f(.99,.81,.50);\n let xNorm=x/31.5;\n let yFall=2.75*(xNorm*xNorm)-1.02;\n if(run&&x<37.&&abs(q.y)<24.){\n  let meet=smoothstep(.031,.251,t);\n  let lift=select(meet,.68,reduced);\n  let inner=select(16.1*(1.-lift),6.8,reduced);\n  let outer=select(31.2-6.5*lift,25.9,reduced);\n  let side=select(-1.,1.,q.x>=0.);\n  let stagger=(1.-lift)*(side*4.0);\n  let range=sat((x-inner)/max(1.,outer-inner));\n  let body=(.75+3.45*sin(range*3.14159265))*(1.-.47*meet);\n  let fold=(1.-lift)*sin(range*3.14159265)*4.8;\n  let y=q.y-yFall-stagger-side*fold;\n  let band=fill(max(max(inner-x,x-outer),abs(y)-body),aa);\n  let peak=thin(y-body*.76,.49,.67*aa)*band;\n  let darkFace=mix(violet,azure,smoothstep(-3.,3.,y)*(.46+.46*lift));\n  let lowOut=1.-smoothstep(.160,.380,t);\n  let pair=form*lowOut*(1.-.44*closing);\n  col=over(ink(darkFace,band*pair*.88),col);\n  col=over(ink(mix(azure,white,closing*.70),peak*pair*.97),col);\n\n  // Once their seam reaches the performer the two faces resolve into one\n  // open contour. The bright edge releases from the body outward and fades.\n  let seat=smoothstep(.218,.320,t);\n  let front=select(18.0+11.3*smoothstep(.320,.668,t),24.2,reduced);\n  let w=(x-front);\n  let n=thin(w,1.7,4.2);\n  let mass=1.-smoothstep(.21,.92,t);\n  let centerLine=q.y-yFall+.80*release;\n  let open=1.-smoothstep(front+.1,front+3.1,x);\n  let belt=fill(abs(centerLine)-(1.36+2.35*n),aa)*open;\n  let edge=thin(centerLine-.50,.49,aa*.62)*open;\n  let warmth=0.22*closing;\n  let seamColor=mix(mix(azure,mint,.54),champagne,warmth);\n  let shine=closing*.64+.36*n;\n  col=over(ink(seamColor,belt*seat*(1.-release)*(.69+.24*shine)),col);\n  col=over(ink(mix(mint,white,.58+.40*shine),edge*seat*(1.-release)*(.69+.31*mass)),col);\n  if(obs){\n   let fog=(1.-smoothstep(21.,154.,dot(q*vec2f(.45,1.25),q*vec2f(.45,1.25))));\n   col=over(ink(mint,fog*seat*closing*.15),col);\n  }\n }\n let uv=(p-u.actor.xy)/(u.actor.z*vec2f(ACTOR_ASPECT,1.))+vec2f(.5);\n if((bits&1u)!=0u&&all(uv>=vec2f(0.))&&all(uv<=vec2f(1.))){\n  let a=textureSampleLevel(tex,samp,uv,0.);\n  var lit=decode(a.rgb);\n  // Only material at the ordinary sprite's sleeves catches nearby light.\n  // The same actual alpha owns all occlusion; no line paints over the face.\n  if(run){\n   let y=q.y-yFall;\n   let sideShade=smoothstep(4.5,10.1,x)*(1.-smoothstep(15.2,21.7,x));\n   let reflect=1.-smoothstep(1.5,6.3,abs(y));\n   let g=sideShade*reflect*(.26*closing+.078*form*(1.-release));\n   lit=min(vec3f(1.),lit+mix(mint,white,.26)*g);\n  }\n  col=over(ink(lit,a.a),col);\n }\n if(ENCODE_TARGET&&col.a>.00001){col=vec4f(encode(col.rgb/col.a)*col.a,col.a);}\n return col;\n}\n";
export function synthesizeSfx(sampleRate=48000){
 if(!Number.isInteger(sampleRate)||sampleRate<8000||sampleRate>192000)throw RangeError('sampleRate');
 const out=new Float32Array(Math.ceil(sampleRate*SFX_DURATION_MS/1000)),tau=2*Math.PI;
 const k0=1.-Math.exp(-tau*309/sampleRate),k1=1.-Math.exp(-tau*1330/sampleRate),k2=1.-Math.exp(-tau*3370/sampleRate);
 const hp=Math.exp(-tau*75/sampleRate);
 let seed=0x80bfc271,slow=0,mid=0,high=0,raw=0,prev=0;
 // Cloth-like pressure alignment terminates in one shallow metallic mate
 // at .238s. There is no extra reward chime, no notification, no terminal hum.
 const parts=[[552,.24,59],[913,.16,82],[1489,.071,102],[2313,.048,152]];
 for(let i=0;i<out.length;i++){
  const t=i/sampleRate;seed=(Math.imul(seed,1664525)+1013904223)>>>0;const n=seed/2147483648-1;
  slow+=(n-slow)*k0;mid+=(n-mid)*k1;high+=(n-high)*k2;
  const cloth=(mid-slow)*1.57,steel=(high-mid)*1.45;
  const prefold=cap((t-.021)/.073)*(1.-cap((t-.167)/.071));
  let s=prefold*(.151*cloth+.068*steel)*(1.-.21*Math.cos(t*237.));
  const e=t-.238;
  if(e>=0){
   const touch=1.-Math.exp(-e*1580);
   const crack=touch*Math.exp(-e*185);
   let modes=0;
   for(const [f,a,b] of parts)modes+=Math.sin(tau*f*e)*a*Math.exp(-e*b);
   s+=crack*(.41*cloth+.67*steel)+touch*modes;
  }
  const q=.77*Math.tanh(s*1.13),d=hp*(prev+q-raw);raw=q;prev=d;
  const tail=cap((out.length-1-i)/(sampleRate*.048));out[i]=d*tail*tail*(3-2*tail);
 }
 return out;
}
export function createRenderer({device,format,actorTexture,actorAspect=134/222}){
 if(!device||!actorTexture||!finite(actorAspect)||actorAspect<=0)throw TypeError('device/texture/aspect');
 if(!['rgba8unorm','bgra8unorm','rgba8unorm-srgb','bgra8unorm-srgb','rgba16float'].includes(format))throw RangeError('format');
 const diagnostics={status:'PENDING',messages:[],error:null};
 const shader=device.createShaderModule({code:WGSL,label:VERSION_ID});
 const diagnosticsReady=shader.getCompilationInfo().then(info=>{diagnostics.messages=info.messages.map(m=>({message:m.message,type:m.type,lineNum:m.lineNum,linePos:m.linePos}));diagnostics.status=diagnostics.messages.some(m=>m.type==='error')?'ERROR':'COMPLETE';return diagnostics;},e=>{diagnostics.status='ERROR';diagnostics.error=String(e);return diagnostics});
 const buffer=device.createBuffer({size:UNIFORM_FLOATS*4,usage:72,label:VERSION_ID+' uniforms'});
 let pipeline,bind;
 try {
  pipeline=device.createRenderPipeline({layout:'auto',vertex:{module:shader,entryPoint:'vs'},fragment:{module:shader,entryPoint:'fs',constants:{ENCODE_TARGET:!format.endsWith('-srgb')&&format!=='rgba16float',ACTOR_ASPECT:actorAspect},targets:[{format,blend:{color:{srcFactor:'one',dstFactor:'one-minus-src-alpha'},alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha'}}}]},primitive:{topology:'triangle-list'}});
  bind=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer}},{binding:1,resource:actorTexture.createView()},{binding:2,resource:device.createSampler({magFilter:'linear',minFilter:'linear'})}]});
 }catch(e){buffer.destroy();throw e}
 let closed=false,disposal;
 function render(input){
  if(closed)throw Error('disposed');
  if(!input.encoder||!input.view)throw TypeError('encoder/view');
  const s=frameState(input);
  device.queue.writeBuffer(buffer,0,s.uniforms);
  const pass=input.encoder.beginRenderPass({colorAttachments:[{view:input.view,loadOp:'load',storeOp:'store'}]});
  pass.setPipeline(pipeline);pass.setBindGroup(0,bind);pass.draw(3);pass.end();
  return {passes:1,active:s.active,phase:s.phase,source:s.source,submitted:false,gpuCompletion:'HOST_OWNED_NOT_OBSERVED'};
 }
 function dispose(){if(disposal)return disposal;closed=true;disposal=(async()=>{try{await device.queue.onSubmittedWorkDone()}catch(e){await device.lost}buffer.destroy()})();return disposal}
 return {render,diagnostics,diagnosticsReady,dispose,destroy:dispose};
}
