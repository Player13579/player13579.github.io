// DVA gallery-only: compressible open contact edge, with a localized rebound around the receiving hand.
export const VERSION_ID='dot-item-transfer-recipient-r5';
export const DURATION_MS=1800,SFX_OFFSET_MS=0,SFX_DURATION_MS=660,UNIFORM_FLOATS=12;
export const EDITION=5,EDITION_LIMIT=5;
const finite=Number.isFinite,cap=(a)=>Math.max(0,Math.min(1,a));
export function phaseAt(ageMs){
 return !finite(ageMs)||ageMs<0||ageMs>=DURATION_MS?'off':ageMs<236?'arrival':ageMs<470?'seating':ageMs<995?'settlement':'resolve';
}
export function planSource(event,serverNow,viewerId){
 const reject=reason=>({valid:false,active:false,phase:'off',reason,causalId:null,ageMs:0,originKnown:false,direction:[0,0]});
 if(!event||event.type!=='transfer-in'||event.variant!=='item'||typeof event.acquisitionKind!=='string'||!event.acquisitionKind||['credits','loot'].includes(event.acquisitionKind)||typeof event.acquisitionId!=='string'||!event.acquisitionId)return reject('not-inventory-recipient');
 if(typeof event.id!=='string'||!/^magic_.{1,174}$/.test(event.id)||typeof event.playerId!=='string'||!event.playerId)return reject('missing-cause-owner');
 if(typeof viewerId!=='string'||!viewerId||event.playerId!==viewerId)return reject('not-recipient');
 if(![event.x,event.y,event.at,serverNow].every(finite)||event.at<946684800000||serverNow<946684800000||event.durationMs!==DURATION_MS||event.radius!==150)return reject('invalid-event-clock');
 if(event.at-serverNow>125)return reject('future-receipt');
 const ageMs=serverNow-event.at,phase=phaseAt(ageMs);
 // No sender coordinates, item kind or extra game data enter the renderer.
 return {valid:true,active:phase!=='off',phase,reason:null,causalId:'item-transfer-recipient:'+event.id,ageMs,originKnown:false,direction:[0,0],startedAt:event.at,endsAt:event.at+DURATION_MS};
}
export function frameState({width,height,dpr=1,event,serverNow,viewerId,actorCenterCss,actorHeightCss=64,sourceOn=true,mainOn=true,observerOn=true,showActor=true,reducedMotion=false}={}){
 if(![width,height,dpr,actorHeightCss].every(finite)||width<1||width>32768||height<1||height>32768||dpr<=0||dpr>8||actorHeightCss<8||actorHeightCss>2048||!Array.isArray(actorCenterCss)||actorCenterCss.length!==2||!actorCenterCss.every(finite))throw RangeError('viewport and actor fixture');
 const source=planSource(event,serverNow,viewerId),active=source.active&&sourceOn!==false&&mainOn!==false;
 const flags=(showActor!==false?1:0)+(observerOn!==false?2:0)+(reducedMotion?4:0);
 const uniforms=new Float32Array([width,height,dpr,Math.max(0,Math.min(1.8,source.ageMs*.001)),...actorCenterCss,actorHeightCss,flags,0,0,+active,0]);
 if(![...uniforms].every(finite))throw RangeError('uniform overflow');
 return {uniforms,source,active,phase:active?source.phase:'off'};
}
export const WGSL="struct Params { view:vec4f, actor:vec4f, state:vec4f }\n@group(0) @binding(0) var<uniform> u:Params;\n@group(0) @binding(1) var tex:texture_2d<f32>;\n@group(0) @binding(2) var samp:sampler;\noverride ENCODE_TARGET:bool=false;\noverride ACTOR_ASPECT:f32=.6036036;\nstruct Out { @builtin(position) pos:vec4f }\n@vertex fn vs(@builtin(vertex_index) i:u32)->Out{\n var v=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));\n var o:Out;o.pos=vec4f(v[i],0.,1.);return o;\n}\nfn decode(c:vec3f)->vec3f{return select(pow((c+vec3f(.055))/1.055,vec3f(2.4)),c/12.92,c<=vec3f(.04045));}\nfn encode(c:vec3f)->vec3f{return select(1.055*pow(max(c,vec3f(0)),vec3f(1./2.4))-vec3f(.055),c*12.92,c<=vec3f(.0031308));}\nfn sat(x:f32)->f32{return clamp(x,0.,1.);}\nfn ink(c:vec3f,a:f32)->vec4f{let n=sat(a);return vec4f(c*n,n);}\nfn over(a:vec4f,b:vec4f)->vec4f{return a+b*(1.-a.a);}\nfn fill(d:f32,aa:f32)->f32{return 1.-smoothstep(-aa*.30,aa,d);}\nfn line(d:f32,w:f32,aa:f32)->f32{return 1.-smoothstep(w,w+aa,abs(d));}\n\n\n@fragment fn fs(f:Out)->@location(0) vec4f{\n let p=f.pos.xy/u.view.z;\n let bits=u32(u.actor.w);\n let t=u.view.w;\n let live=u.state.z>.5;\n let reduced=(bits&4u)!=0u;\n let obs=(bits&2u)!=0u;\n let aa=clamp(.73*64./u.actor.z,.27,2.18);\n let q=(p-u.actor.xy-u.actor.z*vec2f(.213*ACTOR_ASPECT,.108))*64./u.actor.z;\n let jade=vec3f(.13,.537,.438);\n let forest=vec3f(.063,.208,.205);\n let mint=vec3f(.463,.922,.76);\n let bone=vec3f(.932,.973,.811);\n let seat=smoothstep(.184,.236,t)*(1.-smoothstep(.285,.465,t));\n let reb=smoothstep(.252,.386,t)*(1.-smoothstep(.418,.616,t));\n let visibility=smoothstep(.031,.119,t)*(1.-smoothstep(.524,.84,t));\n var col=vec4f(0.);\n if(live&&t<.86&&q.x>-7.&&q.x<22.&&q.y>-16.&&q.y<19.){\n  let o=q-vec2f(2.2,2.25);\n  let radius=7.4-select(3.68,2.24,reduced)*seat+select(2.7,1.12,reduced)*reb;\n  let scale=vec2f(1.,.77-.085*seat);\n  let k=o*scale;\n  let d=length(k);\n  let flank=smoothstep(-.08,1.98,o.x-.30*abs(o.y));\n  let key=smoothstep(.20,1.4,o.x)*(1.-smoothstep(.68,1.08,abs(k.y)/(radius+.96)));\n  let ring=fill(abs(d-radius)-(.79+.84*seat),aa);\n  let darkTrim=fill(abs(d-radius)-2.41,aa);\n  let inner=fill(abs(d-(radius-2.18))-(1.04+.58*seat),aa);\n  let core=fill(length((o-vec2f(2.3,.4))*vec2f(.79,1.22))-2.62,aa)*seat;\n  let bodyOpacity=flank*key*visibility;\n  col=over(ink(forest,darkTrim*bodyOpacity*.77),col);\n  col=over(ink(mix(jade,mint,seat*.45),inner*bodyOpacity*(.48+.33*seat)),col);\n  col=over(ink(mix(mint,bone,seat*.76),ring*bodyOpacity*.93),col);\n  if(obs){col=over(ink(bone,core*.58),col);}\n }\n let uv=(p-u.actor.xy)/(u.actor.z*vec2f(ACTOR_ASPECT,1.))+vec2f(.5);\n if((bits&1u)!=0u&&all(uv>=vec2f(0.))&&all(uv<=vec2f(1.))){\n  let c=textureSampleLevel(tex,samp,uv,0.);\n  var lit=decode(c.rgb);\n  if(live){\n   let glove=1.-smoothstep(1.6,5.45,length(q*vec2f(1.08,.92)-vec2f(2.61,-1.17)));\n   lit=min(vec3f(1.),lit+mix(bone,mint,.37)*glove*seat*.31);\n  }\n  col=over(ink(lit,c.a),col);\n }\n if(ENCODE_TARGET&&col.a>.00001){col=vec4f(encode(col.rgb/col.a)*col.a,col.a);}\n return col;\n}\n";

export function synthesizeSfx(sampleRate=48000){
 if(!Number.isInteger(sampleRate)||sampleRate<8000||sampleRate>192000)throw RangeError('sampleRate');
 const out=new Float32Array(Math.ceil(sampleRate*SFX_DURATION_MS/1000)),tau=2*Math.PI;
 const base=1.-Math.exp(-tau*250/sampleRate),fabric=1.-Math.exp(-tau*890/sampleRate),fibers=1.-Math.exp(-tau*2200/sampleRate),hp=Math.exp(-tau*48/sampleRate);
 let seed=0xc784103a,l=0,m=0,h=0,pre=0,carry=0;
 for(let i=0;i<out.length;i++){
  const t=i/sampleRate;seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;
  const n=(seed>>>0)/2147483648-1;l+=(n-l)*base;m+=(n-m)*fabric;h+=(n-h)*fibers;
  const breath=(m-l)*2.33,brush=(h-m)*2.65;
  const onset=cap((t-.046)/.107)*(1.-cap((t-.226)/.056));
  let x=onset*(.079*breath+.108*brush)*(.72+.28*Math.sin(t*143)**2);
  const u=t-.236;
  if(u>=0.){
   const rise=1.-Math.exp(-u*1070),hit=rise*Math.exp(-u*111),soft=rise*Math.exp(-u*36);
   const air=(1.-Math.exp(-u*35))*Math.exp(-u*15);
   x+=hit*(.61*breath+.40*brush)+soft*(.42*Math.sin(tau*(191*u-164*u*u))+.13*Math.sin(tau*(316*u-196*u*u)))+air*(.071*breath+.139*brush);
  }
  const v=.78*Math.tanh(x*1.40),y=hp*(carry+v-pre);carry=y;pre=v;
  const tail=cap((out.length-1-i)/(sampleRate*.091));out[i]=y*tail*tail*(3-2*tail);
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
