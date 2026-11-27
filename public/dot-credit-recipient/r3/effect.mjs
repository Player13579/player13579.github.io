// DVA gallery-only, dot: situated credits settlement / paired waist clasp. No gameplay or amount inference.
export const VERSION_ID='dot-credit-recipient-r3';
export const DURATION_MS=1800,SFX_OFFSET_MS=0,SFX_DURATION_MS=660,UNIFORM_FLOATS=12;
export const EDITION=3,EDITION_LIMIT=5;
const finite=Number.isFinite, cap=(a)=>Math.max(0,Math.min(1,a));
export function phaseAt(ageMs){
 return !finite(ageMs)||ageMs<0||ageMs>=DURATION_MS?'off':ageMs<345?'arrival':ageMs<538?'seating':ageMs<1120?'settlement':'resolve';
}
export function planSource(event,serverNow){
 const off=reason=>({valid:false,active:false,phase:'off',reason,causalId:null,ageMs:0,originKnown:false,direction:[0,0]});
 if(!event||event.type!=='transfer-in'||event.variant!=='credits'||event.acquisitionKind!=='credits')return off('not-credit-recipient');
 if(typeof event.id!=='string'||!/^magic_.{1,174}$/.test(event.id)||typeof event.playerId!=='string'||!event.playerId)return off('missing-cause-owner');
 if(![event.x,event.y,event.at,serverNow].every(finite)||event.at<946684800000||serverNow<946684800000||event.durationMs!==DURATION_MS)return off('invalid-event-clock');
 if(event.at-serverNow>125)return off('future-receipt');
 const {targetX, targetY, acquisitionOriginX, acquisitionOriginY}=event;
 const revealed=[targetX,targetY,acquisitionOriginX,acquisitionOriginY].every(finite)&&targetX===acquisitionOriginX&&targetY===acquisitionOriginY;
 const dx=revealed?targetX-event.x:0,dy=revealed?targetY-event.y:0;
 const d=Math.hypot(dx,dy),originKnown=revealed&&finite(d)&&d>=.25;
 const ageMs=serverNow-event.at,phase=phaseAt(ageMs);
 return {valid:true,active:phase!=='off',phase,reason:null,causalId:'credit-recipient:'+event.id,ageMs,originKnown,direction:originKnown?[dx/d,dy/d]:[0,0],startedAt:event.at,endsAt:event.at+DURATION_MS};
}
export function frameState({width,height,dpr=1,event,serverNow,actorCenterCss,actorHeightCss=64,sourceOn=true,mainOn=true,observerOn=true,showActor=true,reducedMotion=false}={}){
 if(![width,height,dpr,actorHeightCss].every(finite)||width<1||width>32768||height<1||height>32768||dpr<=0||dpr>8||actorHeightCss<8||actorHeightCss>2048||!Array.isArray(actorCenterCss)||actorCenterCss.length!==2||!actorCenterCss.every(finite))throw RangeError('viewport and actor fixture');
 const source=planSource(event,serverNow), active=source.active&&sourceOn!==false&&mainOn!==false;
 const flags=(showActor!==false?1:0)+(observerOn!==false?2:0)+(reducedMotion?4:0)+(source.originKnown?8:0);
 const uniforms=new Float32Array([width,height,dpr,Math.max(0,Math.min(1.8,source.ageMs*.001)),...actorCenterCss,actorHeightCss,flags,...source.direction,+active,0]);
 if(![...uniforms].every(finite))throw RangeError('uniform overflow');
 return {uniforms,source,active,phase:active?source.phase:'off'};
}
export const WGSL="struct Params { view:vec4f, actor:vec4f, receipt:vec4f }\n@group(0) @binding(0) var<uniform> u:Params;\n@group(0) @binding(1) var tex:texture_2d<f32>;\n@group(0) @binding(2) var samp:sampler;\noverride ENCODE_TARGET:bool=false;\noverride ACTOR_ASPECT:f32=.6036036;\nstruct Out { @builtin(position) pos:vec4f }\n@vertex fn vs(@builtin(vertex_index) i:u32)->Out{\n var v=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));\n var o:Out;o.pos=vec4f(v[i],0.,1.);return o;\n}\nfn decode(c:vec3f)->vec3f{return select(pow((c+vec3f(.055))/1.055,vec3f(2.4)),c/12.92,c<=vec3f(.04045));}\nfn encode(c:vec3f)->vec3f{return select(1.055*pow(max(c,vec3f(0)),vec3f(1./2.4))-vec3f(.055),c*12.92,c<=vec3f(.0031308));}\nfn sat(x:f32)->f32{return clamp(x,0.,1.);}\nfn ink(c:vec3f,a:f32)->vec4f{let n=sat(a);return vec4f(c*n,n);}\nfn over(a:vec4f,b:vec4f)->vec4f{return a+b*(1.-a.a);}\nfn fill(d:f32,aa:f32)->f32{return 1.-smoothstep(-aa*.3,aa,d);}\nfn core(x:f32,w:f32,aa:f32)->f32{return 1.-smoothstep(w,w+aa,abs(x));}\nfn softRange(x:f32,a:f32,b:f32,aa:f32)->f32{return smoothstep(a-aa,a+aa*.27,x)*(1.-smoothstep(b-aa*.27,b+aa,x));}\nfn tick(t:f32,on:f32,decay:f32)->f32{\n let dt=t-on;return smoothstep(-.008,.014,dt)*(1.-smoothstep(.024,decay,dt));\n}\n@fragment fn fs(f:Out)->@location(0) vec4f{\n let p=f.pos.xy/u.view.z;\n let flags=u32(u.actor.w);\n let t=u.view.w;\n let aa=clamp(.73*64./u.actor.z,.30,2.0);\n var col=vec4f(0.);\n if(u.receipt.z>.5){\n  let known=(flags&8u)!=0u;\n  let reduce=(flags&4u)!=0u;\n  let showPath=known&&!reduce;\n  let v=select(vec2f(0.),u.receipt.xy,showPath);\n  // Both the hinge and its complete approach are on the same exterior\n  // side of the actor. Concealed origin implies a canonical local side.\n  let turn=select(1.,-1.,v.x<0.);\n  let dock=u.actor.xy+u.actor.z*vec2f(turn*(ACTOR_ASPECT*.5+.205),.095);\n  let q=(p-dock)*64./u.actor.z*vec2f(turn,1.);\n  if(q.x>=-13.&&q.x<=68.&&abs(q.y)<38.){\n   let arrived=smoothstep(.0,.319,t);\n   let check=tick(t,.319,.161);\n   let clasp=tick(t,.443,.210);\n   let sealPing=tick(t,.556,.220);\n   let formed=smoothstep(-.013,.130,t);\n   let locking=smoothstep(.304,.515,t);\n   let held=smoothstep(.420,.595,t);\n   let outerRelease=smoothstep(.820+sat((q.x+10.)/28.)*.42,1.20+sat((q.x+10.)/28.)*.47,t);\n   let material=formed*(1.-outerRelease);\n   let sway=sin(arrived*3.14159265);\n   let ext=(.66+.34*abs(v.x))*37.;\n   let center=select(vec2f(.15,0.),vec2f((1.-arrived)*ext,(1.-arrived)*v.y*18.-3.3*sway),showPath);\n   let d=q-center;\n   let skew=d.x+.26*d.y*(1.-locking);\n   let rx=(6.4+2.6*(1.-arrived))*(1.-.63*held);\n   let ry=(3.22+1.7*arrived)*(1.-.43*held);\n   let texel=abs(skew)/max(rx,1.)+abs(d.y)/max(ry,1.);\n   let facet=fill((texel-1.)*min(rx,ry),aa);\n   let facetLine=core((texel-.792)*min(rx,ry),.26,.63*aa)*facet;\n   let sheet=core(d.y+d.x*.21,.61,.71*aa)*facet;\n   let violet=vec3f(.24,.125,.49);\n   let azure=vec3f(.11,.65,.97);\n   let frost=vec3f(.54,.92,1.);\n   let gold=vec3f(.76,.46,.19);\n   let gilt=vec3f(1.,.82,.49);\n   let mint=vec3f(.24,.98,.78);\n   let white=vec3f(.89,1.,.96);\n   let lead=smoothstep(-4.2,4.6,-d.x+d.y*.45);\n   let coreMaterial=mix(mix(violet,azure,lead*.78+.12),mix(frost,mint,held*.56),.38+.30*check+.12*clasp);\n   let localGlow=1.-smoothstep(11.,107.,dot(d*vec2f(.78,1.23),d*vec2f(.78,1.23)));\n   if(showPath){\n    // An attached skin trails the liquid-glass core only during its actual\n    // approach. There is no distant avatar, external emitter, or arrow.\n    let dq=d-vec2f(1.8+6.*sway,.8*sway);\n    let shimmer=1.-smoothstep(.0,1.,dot(dq*vec2f(.104,.53),dq*vec2f(.104,.53)));\n    col=over(ink(azure,shimmer*material*(1.-locking)*.36),col);\n   }\n   col=over(ink(azure,localGlow*material*(.095+.061*check)*(.85+.14*held)),col);\n   col=over(ink(coreMaterial,facet*material*(.79+.17*check+.06*clasp)),col);\n   col=over(ink(mix(frost,white,clasp*.86),(facetLine*.44+sheet*.71)*material),col);\n\n   // Near-side bases grow into one pair of open springs. A physical gap\n   // stays between them until the faceted core seats. Never a rectangular\n   // port, enclosing halo, paper slip, status badge, or number.\n   let span=sat((q.x+8.)/22.5);\n   let tip=sin(3.14159265*span);\n   let actuator=smoothstep(.031,.235,t);\n   let gap=2.+6.77*actuator*(1.-locking);\n   let hingeOpen=sin(1.43*span)*(gap*.88);\n   let wave=3.0*tip*(1.-.36*locking);\n   let mainY=2.48+hingeOpen+wave;\n   let lowerY=2.35+hingeOpen*.80+wave*.72;\n   let upperDist=q.y+mainY;\n   let lowerDist=q.y-lowerY;\n   let run=softRange(q.x,-8.,11.2,aa);\n   let leaf=(.72+1.65*tip)*(1.-.31*span);\n   let top=fill(abs(upperDist)-leaf,aa)*run;\n   let bottom=fill(abs(lowerDist)-leaf*.94,aa)*run;\n   let outerLip=core(upperDist+leaf*.71,.32,aa*.64)*top+core(lowerDist-leaf*.67,.31,aa*.63)*bottom;\n   let lipInside=core(upperDist-leaf*.40,.24,aa*.60)*top+core(lowerDist+leaf*.38,.29,aa*.66)*bottom;\n   let hot=(.39*check+.64*clasp+.32*sealPing);\n   let arms=mix(mix(violet,gold,.62+.25*tip),mix(gilt,mint,held*.58),.22+.50*hot);\n   col=over(ink(arms,(top+bottom)*material*.91),col);\n   col=over(ink(mix(gold,gilt,.60),outerLip*material*(.64+.35*check)),col);\n   col=over(ink(mix(gilt,mint,held*.83),lipInside*material*(.49+.55*hot)),col);\n   // A local closure flash slides out along the same paired silhouette.\n   let combX=-5.4+12.4*smoothstep(.446,.715,t);\n   let seam=core(q.x-combX,1.24,.99)*lipInside;\n   col=over(ink(mix(gilt,white,held),seam*material*(.48*clasp+.92*sealPing)),col);\n   if((flags&2u)!=0u){\n    let d0=q*vec2f(.72,1.30);\n    let veil=1.-smoothstep(19.,137.,dot(d0,d0));\n    col=over(ink(mix(frost,mint,held),veil*material*(.12*check+.14*clasp+.12*sealPing)),col);\n   }\n  }\n }\n let uv=(p-u.actor.xy)/(u.actor.z*vec2f(ACTOR_ASPECT,1.))+vec2f(.5);\n if((flags&1u)!=0u&&all(uv>=vec2f(0.))&&all(uv<=vec2f(1.))){\n  let ar=textureSampleLevel(tex,samp,uv,0.);\n  col=over(ink(decode(ar.rgb),ar.a),col);\n }\n if(ENCODE_TARGET&&col.a>.00001){col=vec4f(encode(col.rgb/col.a)*col.a,col.a);}\n return col;\n}\n";
export function synthesizeSfx(sampleRate=48000){
 if(!Number.isInteger(sampleRate)||sampleRate<8000||sampleRate>192000)throw RangeError('sampleRate');
 const len=Math.ceil(sampleRate*SFX_DURATION_MS*.001),out=new Float32Array(len),tau=2*Math.PI;
 const pole=(h)=>1.-Math.exp(-tau*h/sampleRate);
 const cut=[213,746,1920,3440].map(pole),band=[0,0,0,0];
 const hp=Math.exp(-tau*96/sampleRate);
 const beat=[.319,.443,.556];
 // First light touch on a spring, double tongue close, pale glass quench.
 // The second close is a short paired contact, not two credited receipts.
 const modes=[
  [[507,.29,51],[861,.24,56],[1451,.14,81],[2423,.086,114]],
  [[648,.37,57],[1131,.28,82],[1689,.17,101],[2924,.077,139]],
  [[932,.18,68],[1444,.17,94],[2464,.069,124],[3203,.039,145]]
 ];
 const weights=[.61,1.,.57];
 let r=0x1828dd55,pre=0,last=0;
 for(let i=0;i<len;i++){
  const t=i/sampleRate;r=(Math.imul(r,1664525)+1013904223)>>>0;const n=r/2147483648-1;
  for(let j=0;j<band.length;j++)band[j]+=(n-band[j])*cut[j];
  const body=(band[1]-band[0])*1.57,metal=(band[2]-band[1])*1.31,tip=(band[3]-band[2])*1.26;
  const skid=cap((t-.048)/.067)*(1-cap((t-.257)/.064));
  let x=skid*(body*.095+metal*.18+tip*.13)*(1.-.26*Math.cos(t*348.));
  for(let j=0;j<beat.length;j++){
   const dt=t-beat[j];if(dt<0)continue;
   const start=1.-Math.exp(-dt*1720);
   const crack=start*Math.exp(-dt*(153.+25.*j));
   let tone=0.;
   for(const [f,a,target] of modes[j]){
    tone+=Math.sin(tau*f*dt)*a*Math.exp(-dt*target);
   }
   const ds=dt-.014;
   const paired=j===1&&ds>0?(1.-Math.exp(-ds*1210))*Math.exp(-ds*109):0;
   x+=weights[j]*(crack*(.36*body+.58*metal+.67*tip)+start*tone*.79+paired*(.16*body+.43*metal+.25*tip));
  }
  const v=.78*Math.tanh(x*1.21);const c=hp*(last+v-pre);pre=v;last=c;
  const fade=cap((len-1-i)/(sampleRate*.048));out[i]=c*fade*fade*(3-2*fade);
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
