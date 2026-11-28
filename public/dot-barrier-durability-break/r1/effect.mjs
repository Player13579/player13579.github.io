// DVA gallery-only: zero-durability shield failure, extinguished support bands without debris.
export const VERSION_ID='dot-barrier-durability-break-r1';
export const DURATION_MS=480,SFX_OFFSET_MS=0,SFX_DURATION_MS=450,UNIFORM_FLOATS=12;
export const EDITION=1,EDITION_LIMIT=5;
const finite=Number.isFinite,cap=(a)=>Math.max(0,Math.min(1,a));
export function phaseAt(ageMs){
 return !finite(ageMs)||ageMs<0||ageMs>=DURATION_MS?'off':ageMs<52?'preload':ageMs<359?'failure':'clear';
}

export function planSource(event,serverNow,actorId){
 const fail=reason=>({valid:false,active:false,phase:'off',reason,causalId:null,ageMs:0});
 if(!event||event.type!=='preparation-barrier-hit'||event.variant!=='durability-broken')return fail('not-durability-break');
 if(typeof event.id!=='string'||!/^magic_.{1,174}$/.test(event.id)||typeof event.playerId!=='string'||!event.playerId)return fail('missing-authority');
 if(typeof actorId!=='string'||actorId!==event.playerId)return fail('not-affected-actor');
 if(![event.x,event.y,event.at,serverNow].every(finite)||event.at<946684800000||serverNow<946684800000||event.durationMs!==480||event.radius!==110)return fail('invalid-break-shape');
 if(event.at-serverNow>125)return fail('future-event');
 const ageMs=serverNow-event.at,phase=phaseAt(ageMs);
 return {valid:true,active:phase!=='off',phase,reason:null,causalId:'barrier-durability-break:'+event.id,ageMs,startedAt:event.at,endsAt:event.at+DURATION_MS};
}
export function frameState({width,height,dpr=1,event,serverNow,actorId,actorCenterCss,actorHeightCss=64,sourceOn=true,mainOn=true,observerOn=true,showActor=true,reducedMotion=false}={}){
 if(![width,height,dpr,actorHeightCss].every(finite)||width<1||width>32768||height<1||height>32768||dpr<=0||dpr>8||actorHeightCss<8||actorHeightCss>2048||!Array.isArray(actorCenterCss)||actorCenterCss.length!==2||!actorCenterCss.every(finite))throw RangeError('viewport and actor fixture');
 const source=planSource(event,serverNow,actorId),active=source.active&&sourceOn!==false&&mainOn!==false;
 const flags=(showActor!==false?1:0)+(observerOn!==false?2:0)+(reducedMotion?4:0);
 const uniforms=new Float32Array([width,height,dpr,Math.max(0,Math.min(.48,source.ageMs*.001)),...actorCenterCss,actorHeightCss,flags,0,0,+active,0]);
 if(![...uniforms].every(finite))throw RangeError('uniform overflow');
 return {uniforms,source,active,phase:active?source.phase:'off'};
}
export const WGSL="struct Params { view:vec4f, actor:vec4f, state:vec4f }\n@group(0) @binding(0) var<uniform> u:Params;\n@group(0) @binding(1) var tex:texture_2d<f32>;\n@group(0) @binding(2) var samp:sampler;\noverride ENCODE_TARGET:bool=false;\noverride ACTOR_ASPECT:f32=.6036036;\nstruct Out { @builtin(position) pos:vec4f }\n@vertex fn vs(@builtin(vertex_index) i:u32)->Out{\n var v=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));\n var o:Out;o.pos=vec4f(v[i],0.,1.);return o;\n}\nfn decode(c:vec3f)->vec3f{return select(pow((c+vec3f(.055))/1.055,vec3f(2.4)),c/12.92,c<=vec3f(.04045));}\nfn encode(c:vec3f)->vec3f{return select(1.055*pow(max(c,vec3f(0)),vec3f(1./2.4))-vec3f(.055),c*12.92,c<=vec3f(.0031308));}\nfn sat(x:f32)->f32{return clamp(x,0.,1.);}\nfn ink(c:vec3f,a:f32)->vec4f{let n=sat(a);return vec4f(c*n,n);}\nfn over(a:vec4f,b:vec4f)->vec4f{return a+b*(1.-a.a);}\nfn fill(d:f32,aa:f32)->f32{return 1.-smoothstep(-aa*.30,aa,d);}\nfn line(d:f32,w:f32,aa:f32)->f32{return 1.-smoothstep(w,w+aa,abs(d));}\n\n\nfn rangeMask(x:f32,lo:f32,hi:f32,aa:f32)->f32{return fill(max(lo-x,x-hi),aa);}\nfn response(d:f32,attack:f32,hold:f32,tail:f32)->f32{return smoothstep(-attack,0.,d)*(1.-smoothstep(hold,tail,d));}\n@fragment fn fs(f:Out)->@location(0) vec4f {\n let p=f.pos.xy/u.view.z;\n let bits=u32(u.actor.w);\n let t=u.view.w;\n let on=u.state.z>.5;\n let gentle=(bits&4u)!=0u;\n let obs=(bits&2u)!=0u;\n let q=(p-u.actor.xy)*64./u.actor.z;\n let aa=clamp(.75*64./u.actor.z,.29,2.19);\n let violet=vec3f(.162,.181,.472);\n let slate=vec3f(.188,.355,.637);\n let coreBlue=vec3f(.289,.625,.902);\n let rimBlue=vec3f(.548,.836,1.);\n let bright=vec3f(.832,.966,1.);\n let inside=vec3f(1.,.782,.647);\n var col=vec4f(0.);\n if(on&&t<.471&&q.x>-51.&&q.x<51.&&q.y>-36.&&q.y<37.){\n  // A raked pressure screen; all structural regions occupy a shared plane.\n  // Its load does not release as bodies, fragments or expanding rings.\n  let uv=vec2f(q.x-.23*q.y-1.75,q.y-.157*q.x);\n  let lateral=uv.x;\n  let coord=uv.y+.062*lateral;\n  let h=coord+27.0;\n  let band=clamp(floor(h/12.05),0.,4.);\n  let edgeH=h-band*12.05;\n  let w=29.8-6.1*abs(coord/29.5)-.11*coord;\n  let frameD=max(max(-27.-coord,coord-29.5),abs(lateral)-w);\n  let field=fill(frameD,aa);\n  let asym=smoothstep(-13.,15.,lateral);\n  // Supports fail in order. Their onset is not a sliding barrier object:\n  // undischarged lower supports remain registered to their original points.\n  let lossAt=.052+.059*band+select(.017*asym,0.,gentle);\n  let dt=t-lossAt;\n  let pulse=response(dt,.008,.011,.069);\n  let gone=smoothstep(.010,.084,dt);\n  let separation=1.-smoothstep(.15,2.75,abs(edgeH-1.47));\n  let joint=(1.-smoothstep(.78,2.18,abs(edgeH-1.47)))*field;\n  let edgeFace=1.-smoothstep(.28,1.78,abs(abs(lateral)-w));\n  let faceRange=rangeMask(coord,-25.7,28.7,aa);\n  let quiet=(1.-gone)*(1.-smoothstep(.346,.447,t));\n  let relief=(.32+.68*pow(sat(abs(lateral)/w),1.5));\n  let density=field*quiet*relief;\n  let bandShade=mix(violet,slate,sat(edgeH/11.5));\n  col=over(ink(bandShade,density*.37),col);\n  col=over(ink(coreBlue,joint*quiet*(.44+.2*asym)),col);\n  col=over(ink(rimBlue,edgeFace*faceRange*quiet*(.51+.22*asym)),col);\n  // Interior filament carries the rupture flash, with unequal reach towards\n  // the two edges; the earlier (non-winning) rows never reactivate.\n  let crossSection=rangeMask(lateral,-w*.94,w*.97,aa);\n  let innerLine=separation*crossSection*field;\n  let reach=smoothstep(-.005,.028,dt);\n  let xCenter=mix(-.33,.43,reach)*w;\n  let charge=1.-smoothstep(3.7,15.6,abs(lateral-xCenter));\n  let faceGrain=.86+.14*cos(lateral*.63+band*1.1);\n  col=over(ink(mix(coreBlue,inside,charge*.84),innerLine*pulse*(.38+.51*charge)*faceGrain),col);\n  col=over(ink(bright,joint*pulse*charge*.91),col);\n  if(obs){\n   // Small camera diffusion of that same moving material source, not VFX.\n   let scatter=exp(-.017*(lateral-xCenter)*(lateral-xCenter)-.09*(edgeH-1.47)*(edgeH-1.47));\n   col=over(ink(mix(rimBlue,inside,.39),scatter*pulse*.22),col);\n  }\n }\n let uvActor=(p-u.actor.xy)/(u.actor.z*vec2f(ACTOR_ASPECT,1.))+vec2f(.5);\n if((bits&1u)!=0u&&all(uvActor>=vec2f(0.))&&all(uvActor<=vec2f(1.))){\n  let c=textureSampleLevel(tex,samp,uvActor,0.);\n  var rgb=decode(c.rgb);\n  if(on){\n   let backEdge=pow(smoothstep(.51,.96,abs(2.*uvActor.x-1.)),2.);\n   let level=clamp(floor((q.y+27.)/12.05),0.,4.);\n   let residual=response(t-(.052+.059*level),.004,.006,.032);\n   rgb=min(vec3f(1.),rgb+rimBlue*backEdge*residual*.095);\n  }\n  col=over(ink(rgb,c.a),col);\n }\n if(ENCODE_TARGET&&col.a>.00001){col=vec4f(encode(col.rgb/col.a)*col.a,col.a);}\n return col;\n}\n";

export function synthesizeSfx(sampleRate=48000){
 if(!Number.isInteger(sampleRate)||sampleRate<8000||sampleRate>192000)throw RangeError('sampleRate');
 const out=new Float32Array(Math.ceil(sampleRate*SFX_DURATION_MS/1000)),tau=2*Math.PI;
 const a=1-Math.exp(-tau*420/sampleRate),b=1-Math.exp(-tau*1780/sampleRate),c=1-Math.exp(-tau*4020/sampleRate);
 const hp=Math.exp(-tau*59/sampleRate);
 let rnd=0x137b69af,lo=0,mid=0,hi=0,back=0,last=0;
 for(let i=0;i<out.length;i++){
  const t=i/sampleRate;
  rnd^=rnd<<13;rnd^=rnd>>>17;rnd^=rnd<<5;
  const n=(rnd>>>0)/2147483648-1;
  lo+=(n-lo)*a;mid+=(n-mid)*b;hi+=(n-hi)*c;
  const u=t-.052;
  let x=0;
  if(u>=0){
   // One crack starts the failure. Subsequent contacts share the short
   // structural rustle rather than sounding like independent hits.
   const front=(1.-Math.exp(-u*1550))*Math.exp(-u*138);
   const tail=(1.-Math.exp(-u*51))*Math.exp(-u*16);
   const wall=(front*.54+tail*.084)*(hi-mid)*2.16;
   x=wall+(mid-lo)*(.52*front+.127*tail)*1.69;
   x+=(1.-Math.exp(-u*690))*.42*Math.sin(tau*(285*u-183*u*u))*Math.exp(-u*57);
   const knots=.52+.48*Math.cos(tau*(16.95*u-.92*u*u))**2;
   x+=tail*.106*knots*(hi-lo);
  }
  const v=.85*Math.tanh(x*1.28),y=hp*(back+v-last);back=y;last=v;
  const fade=cap((out.length-1-i)/(sampleRate*.054));out[i]=y*fade*fade*(3-2*fade);
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
