// DVA gallery-only: zero-durability shield failure, pressure-pane puncture opens an aperture without debris.
export const VERSION_ID='dot-barrier-durability-break-r3';
export const DURATION_MS=480,SFX_OFFSET_MS=0,SFX_DURATION_MS=450,UNIFORM_FLOATS=12;
export const EDITION=3,EDITION_LIMIT=5;
const finite=Number.isFinite,cap=(a)=>Math.max(0,Math.min(1,a));
export function phaseAt(ageMs){
 return !finite(ageMs)||ageMs<0||ageMs>=DURATION_MS?'off':ageMs<116?'preload':ageMs<398?'failure':'clear';
}

export function planSource(event,serverNow,actorId,viewerId){
 const fail=reason=>({valid:false,active:false,phase:'off',reason,causalId:null,ageMs:0});
 if(!event||event.type!=='preparation-barrier-hit'||event.variant!=='durability-broken')return fail('not-durability-break');
 if(typeof event.id!=='string'||!/^magic_.{1,174}$/.test(event.id)||typeof event.playerId!=='string'||!event.playerId)return fail('missing-authority');
 if(typeof actorId!=='string'||actorId!==event.playerId)return fail('not-affected-actor');
 if(viewerId!==event.playerId)return fail('not-self-view');
 if(![event.x,event.y,event.at,serverNow].every(finite)||event.at<946684800000||serverNow<946684800000||event.durationMs!==480||event.radius!==110)return fail('invalid-break-shape');
 if(event.at-serverNow>125)return fail('future-event');
 const ageMs=serverNow-event.at,phase=phaseAt(ageMs);
 return {valid:true,active:phase!=='off',phase,reason:null,causalId:'barrier-durability-break:'+event.id,ageMs,startedAt:event.at,endsAt:event.at+DURATION_MS};
}
export function frameState({width,height,dpr=1,event,serverNow,actorId,viewerId,actorCenterCss,actorHeightCss=64,sourceOn=true,mainOn=true,observerOn=true,showActor=true,reducedMotion=false}={}){
 if(![width,height,dpr,actorHeightCss].every(finite)||width<1||width>32768||height<1||height>32768||dpr<=0||dpr>8||actorHeightCss<8||actorHeightCss>2048||!Array.isArray(actorCenterCss)||actorCenterCss.length!==2||!actorCenterCss.every(finite))throw RangeError('viewport and actor fixture');
 const source=planSource(event,serverNow,actorId,viewerId),active=source.active&&sourceOn!==false&&mainOn!==false;
 const flags=(showActor!==false?1:0)+(observerOn!==false?2:0)+(reducedMotion?4:0);
 const uniforms=new Float32Array([width,height,dpr,Math.max(0,Math.min(.48,source.ageMs*.001)),...actorCenterCss,actorHeightCss,flags,0,0,+active,0]);
 if(![...uniforms].every(finite))throw RangeError('uniform overflow');
 return {uniforms,source,active,phase:active?source.phase:'off'};
}
export const WGSL="struct Params { view:vec4f, actor:vec4f, state:vec4f }\n@group(0) @binding(0) var<uniform> u:Params;\n@group(0) @binding(1) var tex:texture_2d<f32>;\n@group(0) @binding(2) var samp:sampler;\noverride ENCODE_TARGET:bool=false;\noverride ACTOR_ASPECT:f32=.6036036;\nstruct Out { @builtin(position) pos:vec4f }\n@vertex fn vs(@builtin(vertex_index) i:u32)->Out{\n var v=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));\n var o:Out;o.pos=vec4f(v[i],0.,1.);return o;\n}\nfn decode(c:vec3f)->vec3f{return select(pow((c+vec3f(.055))/1.055,vec3f(2.4)),c/12.92,c<=vec3f(.04045));}\nfn encode(c:vec3f)->vec3f{return select(1.055*pow(max(c,vec3f(0)),vec3f(1./2.4))-vec3f(.055),c*12.92,c<=vec3f(.0031308));}\nfn sat(x:f32)->f32{return clamp(x,0.,1.);}\nfn ink(c:vec3f,a:f32)->vec4f{let n=sat(a);return vec4f(c*n,n);}\nfn over(a:vec4f,b:vec4f)->vec4f{return a+b*(1.-a.a);}\nfn fill(d:f32,aa:f32)->f32{return 1.-smoothstep(-aa*.30,aa,d);}\nfn line(d:f32,w:f32,aa:f32)->f32{return 1.-smoothstep(w,w+aa,abs(d));}\n\n\n\n\n@fragment fn fs(f:Out)->@location(0) vec4f{\n let p=f.pos.xy/u.view.z;\n let bits=u32(u.actor.w);\n let t=u.view.w;\n let on=u.state.z>.5;\n let reduce=(bits&4u)!=0u;\n let obs=(bits&2u)!=0u;\n let q=(p-u.actor.xy)*64./u.actor.z;\n let aa=clamp(.76*64./u.actor.z,.28,2.20);\n let carbon=vec3f(.100,.040,.061);\n let fig=vec3f(.39,.104,.119);\n let copper=vec3f(.828,.313,.140);\n let amber=vec3f(.988,.673,.264);\n let light=vec3f(1.,.911,.662);\n let hit=smoothstep(-.009,.010,t-.116)*(1.-smoothstep(.038,.103,t-.116));\n let died=1.-smoothstep(.237,.397,t);\n var col=vec4f(0.);\n if(on&&t<.401&&q.x>-52.&&q.x<53.&&q.y>-43.&&q.y<45.){\n   // A single fixed pressure pane. The dark aperture is absence of pane,\n   // not material or a projectile. The exterior corners do not translate.\n   let s=q-vec2f(6.2,3.5);\n   let v=vec2f(dot(s,vec2f(.952,.306)),dot(s,vec2f(-.306,.952)));\n   let hull=(abs(v.x)/42.5+abs(v.y)/31.5-1.)*22.3;\n   let corner=max(abs(v.x)-38.7,abs(v.y)-27.5);\n   let perimeter=max(hull,corner);\n   let panel=fill(perimeter,aa);\n   let b=.26*v.x+.068*abs(v.x-6.)+2.4;\n   let u=v.y-b;\n   let ctr=v.x-13.6;\n   let travel=smoothstep(.107,.228,t);\n   let expand=select(travel,smoothstep(.108,.165,t)*.92,reduce);\n   let reach=4.2+52.0*expand;\n   let thickness=.21+16.1*pow(expand,.71);\n   let slit=(abs(ctr)/reach+abs(u)/thickness-1.)*min(thickness,7.6);\n   let opened=smoothstep(.109,.149,t);\n   let hole=fill(slit,aa)*opened;\n   let liveArea=panel*(1.-hole);\n   let joins=1.-smoothstep(.23,1.34,abs(perimeter+.31));\n   let rimShadow=fill(perimeter-1.03,aa)*(1.-fill(perimeter+1.36,aa));\n   let margin=(.29+.71*smoothstep(0.,26.,abs(v.x+2.3)));\n   let lower=1.-smoothstep(-11.,10.,v.y);\n   let under=smoothstep(.005,.042,t)*died;\n   let pigment=mix(fig,copper,.28+.25*lower);\n   col=over(ink(carbon,rimShadow*under*(.55+.20*expand)*(1.-hole)),col);\n   col=over(ink(pigment,liveArea*under*(.27+.23*margin)),col);\n   col=over(ink(mix(copper,amber,.40+.37*lower),joins*under*(.65+.29*margin)*(1.-hole)),col);\n   // The two newly exposed sides of this single aperture are anchored to\n   // its expanding intersection. No outgoing lines continue beyond the pane.\n   let cutRim=line(slit,.53,1.09*aa)*panel*opened;\n   let slitShadow=line(slit-.79,.41,aa)*panel*opened;\n   let quality=.58+.42*cos(.276*ctr);\n   let focus=1.-smoothstep(1.75,17.9,abs(ctr));\n   col=over(ink(carbon,slitShadow*died*(.42+.33*hit)),col);\n   col=over(ink(mix(amber,light,.40+.59*hit*focus),cutRim*died*(.49+.46*hit)*quality),col);\n   let contactLine=line(u,.54,1.18*aa)*panel*(1.-smoothstep(3.4,9.7,abs(ctr)));\n   col=over(ink(light,contactLine*hit*.88),col);\n   if(obs){\n     let diffusion=exp(-.075*slit*slit-.0075*ctr*ctr);\n     col=over(ink(light,hit*diffusion*panel*.21),col);\n   }\n }\n let uvActor=(p-u.actor.xy)/(u.actor.z*vec2f(ACTOR_ASPECT,1.))+vec2f(.5);\n if((bits&1u)!=0u&&all(uvActor>=vec2f(0.))&&all(uvActor<=vec2f(1.))){\n  let c=textureSampleLevel(tex,samp,uvActor,0.);\n  var rgb=decode(c.rgb);\n  if(on){\n   let edge=smoothstep(.68,.96,uvActor.x)*(1.-smoothstep(.075,.39,abs(uvActor.y-.57)));\n   rgb=min(vec3f(1.),rgb+amber*edge*hit*.13);\n  }\n  col=over(ink(rgb,c.a),col);\n }\n if(ENCODE_TARGET&&col.a>.00001){col=vec4f(encode(col.rgb/col.a)*col.a,col.a);}\n return col;\n}\n";

export function synthesizeSfx(sampleRate=48000){
 if(!Number.isInteger(sampleRate)||sampleRate<8000||sampleRate>192000)throw RangeError('sampleRate');
 const out=new Float32Array(Math.ceil(sampleRate*SFX_DURATION_MS/1000)),tau=2*Math.PI;
 const a=1-Math.exp(-tau*310/sampleRate),b=1-Math.exp(-tau*810/sampleRate),c=1-Math.exp(-tau*2610/sampleRate),dc=Math.exp(-tau*54/sampleRate);
 let rng=0xfee428b1,lo=0,mi=0,hi=0,prevX=0,prevY=0;
 for(let i=0;i<out.length;i++){
  const t=i/sampleRate; rng^=rng<<13;rng^=rng>>>17;rng^=rng<<5;
  const x=(rng>>>0)/2147483648-1;lo+=(x-lo)*a;mi+=(x-mi)*b;hi+=(x-hi)*c;
  const breath=(mi-lo)*3.25; const fine=(hi-mi)*1.45;const u=t-.116;
  let raw=.091*breath*cap((t-.036)/.026)*(1.-cap((t-.092)/.024));
  if(u>=0){
    const front=(1.-Math.exp(-u*1710))*Math.exp(-u*134);
    const hollow=(1.-Math.exp(-u*250))*Math.exp(-u*36);
    const vent=(1.-Math.exp(-u*65))*Math.exp(-u*23);
    raw+=front*(.49*fine+.33*breath)+vent*(.10*fine+.39*breath)+hollow*.344*Math.sin(tau*(178*u-121*u*u));
  }
  const y=.84*Math.tanh(raw*1.37),z=dc*(prevY+y-prevX);prevY=z;prevX=y;
  const fade=cap((out.length-1-i)/(sampleRate*.061));out[i]=z*fade*fade*(3-2*fade);
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
