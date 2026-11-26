// Gravity Storm R8 by dot: orthographic shear inlays and compression fault; GPU submission belongs to host.
export const VERSION_ID='gravity-storm-dot-r8';
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
 // R8 is an orthographic plan view. Bounds belong to the map, never the camera or 520.
 if(groundYScale!==1)throw RangeError('top-down map projection requires groundYScale 1');
 const worldRect=input.mapWorldRect;
 if(!Array.isArray(worldRect)||worldRect.length!==4||!worldRect.every(finite)||worldRect[0]>=worldRect[2]||worldRect[1]>=worldRect[3])throw RangeError('finite authored mapWorldRect required');
 const bounds=[...project(worldRect[0],worldRect[1]),...project(worldRect[2],worldRect[3])];
 const flags=(input.showActor!==false?1:0)+(input.observerOn!==false?2:0)+(input.reducedMotion?4:0);
 const values=[width,height,dpr,Math.max(0,Math.min(12,source.ageMs/1000)),...field,520*worldToCss,+gate,...eye,140*worldToCss,+(gate&&source.eyeActive),...actorCenterCss,actorHeightCss,flags,...bounds];
 const uniforms=new Float32Array(values);if(![...uniforms].every(finite))throw RangeError('Float32 projection overflow');
 return {uniforms,source,active:gate,phase:gate?source.phase:'off',fieldCenterCss:field,eyeCenterCss:eye,mapBoundsCss:bounds};
}
export const WGSL="struct Params { viewport:vec4f, field:vec4f, eye:vec4f, actor:vec4f, map:vec4f }\n@group(0) @binding(0) var<uniform> u:Params;\n@group(0) @binding(1) var actorTex:texture_2d<f32>;\n@group(0) @binding(2) var actorSampler:sampler;\noverride ENCODE_TARGET:bool=false;\noverride ACTOR_ASPECT:f32=.6036036;\nstruct VOut { @builtin(position) position:vec4f }\n@vertex fn vs(@builtin(vertex_index) i:u32)->VOut {\n var pts=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));\n var v:VOut;v.position=vec4f(pts[i],0,1);return v;\n}\nfn decode(c:vec3f)->vec3f {return select(pow((c+vec3f(.055))/1.055,vec3f(2.4)),c/12.92,c<=vec3f(.04045));}\nfn encode(c:vec3f)->vec3f {return select(1.055*pow(max(c,vec3f(0)),vec3f(1./2.4))-vec3f(.055),c*12.92,c<=vec3f(.0031308));}\nfn ink(c:vec3f,a:f32)->vec4f{let x=clamp(a,0.,1.);return vec4f(decode(clamp(c,vec3f(0),vec3f(1)))*x,x);}\nfn over(a:vec4f,b:vec4f)->vec4f{return a+b*(1.-a.a);}\nfn line(a:f32,w:f32,blur:f32)->f32{return 1.-smoothstep(w,w+blur,abs(a));}\nfn pin(p:vec2f,a:vec2f,b:vec2f,w:f32)->f32 {\n let k=b-a;let t=clamp(dot(p-a,k)/dot(k,k),0.,1.);return line(length(p-a-t*k),w,.8);\n}\nfn catchAt(t:f32,at:f32)->f32{\n let e=t-at;return smoothstep(-.008,.016,e)*exp(-max(0.,e)*16.);\n}\n// A single planar print is advected in map coordinates. Rhombic inlays\n// share a continuous material sheet: a local inverse deformation feeds both\n// grid axes. Opposite signed displacement across the fault is shear, not spin.\nfn lattice(q:vec2f)->vec2f {\n return vec2f(.84*q.x+.96*q.y,-.84*q.x+.96*q.y)*4.18;\n}\n@fragment fn fs(v:VOut)->@location(0) vec4f {\n let p=v.position.xy/u.viewport.z;let bits=u32(u.actor.w);\n let sec=u.viewport.w;let moving=(bits&4u)==0u;let obs=(bits&2u)!=0u;\n let t=select(2.06,sec,moving);\n let late=smoothstep(11.,11.42,sec);\n var col=vec4f(0.);\n if(u.field.w>.5) {\n  let l=p-u.map.xy;let r=u.map.zw-p;\n  let h=min(min(l.x,l.y),min(r.x,r.y));\n  let clip=smoothstep(-.50,.60,h);\n  if(clip>0.) {\n   let wh=u.map.zw-u.map.xy;\n   let sc=max(1.,min(wh.x,wh.y)*.5);\n   let q=(p-u.field.xy)/sc;\n   let sq=2.*(p-u.map.xy)/max(wh,vec2f(1.))-vec2f(1.);\n   let outer=max(abs(sq.x),abs(sq.y));\n   let tangent=vec2f(.8,.6);\n   let ortho=vec2f(-.6,.8);\n   let along=dot(q,tangent);\n   let j=dot(q,ortho);\n   let side=tanh(j*6.4);\n   let front=(1.-smoothstep(.05,.98,outer))*.072;\n   let contact=.48*catchAt(t,.219)+.77*catchAt(t,.428)+catchAt(t,.691);\n   let pull=smoothstep(front,.216+front,t)*(.80+.20*smoothstep(.242,.396,t));\n   let release=smoothstep(.702,.935,t);\n   // Elastic recovery leaves a loaded lattice, then the authoritative\n   // 11s change tightens the same fault; no second-radius geometry or cast.\n   let idle=(.035*sin(t*2.3-along*1.8)+.016*cos(t*.77+q.y))*release;\n   let slide=(.152-.085*release+.036*late+idle)*pull;\n   let grip=(.053-.025*release+.028*late+.026*contact)*pull;\n   let force=side*slide*(.74+.26*exp(-abs(along)*.78));\n   let loaded=q-tangent*force+ortho*side*grip*exp(-abs(j)*2.8);\n   let uv=lattice(loaded);\n   let index=floor(uv);\n   let f=fract(uv)-vec2f(.5);\n   let tooth=abs(f);\n   let pitch=.48/sc*5.5;\n   let aa=clamp(pitch,.004,.068);\n   let diag=(tooth.x+tooth.y)*.545+.015;\n   let d=max(max(tooth.x,tooth.y),diag);\n   let fill=1.-smoothstep(.418,.418+aa,d);\n   let slab=1.-smoothstep(.463,.463+aa,d);\n   let grid=line(d-.438,.006,aa*.78);\n   let mortise=select(-1.,1.,f.x+f.y>=0.);\n   let facing=select(-1.,1.,j>=0.);\n   let inner=1.-smoothstep(.38,1.18,abs(j));\n   let hot=exp(-abs(j)*6.1)*exp(-abs(along)*.50);\n   let polarity=smoothstep(-.15,.15,j);\n   // Dye in whole faces; sign controls its hue, material under compression\n   // controls the short saturation on the side of a tile that bears the load.\n   let salt=.5+.5*sin(index.x*1.82-index.y*2.11);\n   let stripe=.5+.5*sin(.70*index.x+1.51*index.y+.47*t*release);\n   let strength=(.34+.40*hot+.13*salt+.07*stripe)*( .76+.24*pull);\n   let base=mix(vec3f(.22,.103,.32),vec3f(.16,.22,.34),polarity);\n   let mid=mix(vec3f(.57,.20,.53),vec3f(.29,.46,.59),polarity);\n   let hue=mix(vec3f(.88,.48,.69),vec3f(.39,.77,.74),polarity);\n   let edgeHue=mix(vec3f(.89,.38,.63),vec3f(.50,.67,.98),polarity);\n   let energy=mix(vec3f(.87,.71,1.),vec3f(1.,.86,.61),max(contact,late*.61));\n   let shoulder=smoothstep(-.08,.70,-mortise*side)*smoothstep(.19,.47,d);\n   let lining=grid*(.37+.49*shoulder)*(.69+.31*hot);\n   let iris=mix(base,mid,strength);\n   let painted=mix(iris,hue,.25*shoulder+hot*.19);\n   // Inlay gaps remain readable instead of making the board a solid lightbox.\n   let board=mix(vec3f(.074,.083,.18),vec3f(.16,.115,.252),.25+.40*hot+.18*pull);\n   col=ink(board,.62+.12*pull);\n   col=over(ink(base,slab*(.49+.17*inner)),col);\n   col=over(ink(painted,fill*(.76+.17*pull)),col);\n   col=over(ink(edgeHue,lining*.77*pull),col);\n   // The tiles on the compressive side are short interlocking chevrons of\n   // luminous matter. Broad in-face lamina on that side is world emission.\n   let tip=side*(-f.x+f.y);\n   let striae=line(d-.309,.004,aa*.55)*smoothstep(.16,.50,tip);\n   let pressed=(1.-smoothstep(.063,.138,abs(j)))*smoothstep(-.015,.32,tip)*grid;\n   let plateGlow=hot*fill*(.21+.39*max(contact,late*.21))*(.42+.58*shoulder)*pull;\n   col=over(ink(mix(hue,energy,.22+.26*contact),plateGlow),col);\n   col=over(ink(hue,striae*(.34+.22*inner)*pull),col);\n   col=over(ink(energy,pressed*(.22+.75*contact+.19*late)),col);\n   // Observer response: weak, short near-field veiling only behind the\n   // sourced bright tiles; no rings/ghosts or a blurred second tessellation.\n   if(obs){\n    let close=exp(-abs(d-.447)*15.)*hot*pull;\n    col=over(ink(energy,close*(.053+.15*contact+.075*late)),col);\n   }\n   let frame=line(h-1.20,.68,.78);\n   let frameBack=1.-smoothstep(0.,7.,h);\n   let edgeIndex=select(p.x-u.map.x,p.y-u.map.y,min(l.x,r.x)<=min(l.y,r.y));\n   let toothFrame=1.-smoothstep(.13,.48,abs(fract(edgeIndex/(sc*.14))-.50));\n   col=over(ink(vec3f(.38,.35,.55),frameBack*.18+frame*(.55+.19*toothFrame*pull)),col);\n   // The open broken compass mark is a source location, not an indicator\n   // of an AOE radius. The golden foot brackets remain independently gated.\n   let fit=clamp(u.field.z/300.,.63,1.62);\n   let s=(p-u.field.xy)/fit;\n   let k1=pin(s,vec2f(-9.,2.),vec2f(-4.,2.),1.0);\n   let k2=pin(s,vec2f(-4.,2.),vec2f(-2.,.5),1.0);\n   let k3=pin(s,vec2f(2.,-.5),vec2f(4.,-2.),1.0);\n   let k4=pin(s,vec2f(4.,-2.),vec2f(9.,-2.),1.0);\n   col=over(ink(vec3f(.91,.91,1.),max(max(k1,k2),max(k3,k4))*.92),col);\n   if(u.eye.w>.5){\n    let px=p-u.eye.xy;let off=clamp(u.eye.z*.34,12.,31.);\n    let z=vec2f(abs(px.x)-off,px.y);\n    let b=max(pin(z,vec2f(0.,3.),vec2f(0.,9.),.89),pin(z,vec2f(0.,9.),vec2f(-4.,10.5),.89));\n    col=over(ink(vec3f(1.,.78,.36),b*.96),col);\n   }\n   col*=clip;\n  }\n }\n let uv=(p-u.actor.xy)/vec2f(u.actor.z*ACTOR_ASPECT,u.actor.z)+vec2f(.5);\n if((bits&1u)!=0u&&all(uv>=vec2f(0.))&&all(uv<=vec2f(1.))){\n  let tex=textureSampleLevel(actorTex,actorSampler,uv,0.);\n  col=over(vec4f(decode(tex.rgb)*tex.a,tex.a),col);\n }\n if(ENCODE_TARGET&&col.a>.00001){col=vec4f(encode(col.rgb/col.a)*col.a,col.a);}\n return col;\n}\n";
export function synthesizeSfx(sampleRate=48000,variant=0){
 durationForVariant(variant);
 if(!finite(sampleRate)||!Number.isInteger(sampleRate)||sampleRate<8000||sampleRate>192000)throw RangeError('sampleRate');
 // One occurrence: charged mineral inlays drag against each other, catch,
 // then recoil. Their three actual contact envelopes share the shader clocks.
 const hits=[.219,.428,.691],weights=[.66,.82,1.0],TAU=2*Math.PI;
 const out=new Float32Array(Math.ceil(sampleRate*SFX_DURATION_MS/1000));
 const gain=(f)=>1-Math.exp(-TAU*f/sampleRate);
 const ks=[118,385,1290,2960].map(gain),pole=[0,0,0,0];
 let seed=0x45209ad3,prev=0,dc=0;
 const hp=Math.exp(-TAU*32/sampleRate);
 const modes=[[138,12.8,.38],[251,18.1,.44],[423,24,.25],[719,33,.13],[1286,54,.069],[2719,102,.033]];
 for(let i=0;i<out.length;i++){
  const t=i/sampleRate;seed=(Math.imul(seed,1103515245)+12345)>>>0;
  const n=(seed>>>5)/67108864-1;
  for(let p=0;p<4;p++)pole[p]+=(n-pole[p])*ks[p];
  const roll=(pole[1]-pole[0])*1.48;
  const scrape=(pole[2]-pole[1])*1.32;
  const spark=(pole[3]-pole[2])*1.35;
  const grip=.54+.46*Math.abs(Math.sin(TAU*(22*t+20*t*t)+.53*Math.sin(t*110)));
  const intro=(1-Math.exp(-t*30))*Math.exp(-t*2.8);
  let x=intro*(roll*.17+(scrape*.25+spark*.095)*grip);
  for(let j=0;j<hits.length;j++){
   const dt=t-hits[j],w=weights[j],slideStart=-.119+.013*j;
   if(dt>=slideStart&&dt<0){
    const k=(dt-slideStart)/(-slideStart);
    x+=w*k*k*(.37*scrape*grip+.10*roll)*Math.pow(1-Math.max(0,(k-.93)/.07),.12);
   }
   if(dt>=0){
    const sharp=(1.-Math.exp(-dt*910))*Math.exp(-dt*(j===2?87:119));
    const attack=(1-Math.exp(-dt*670));
    let y=0;
    for(let m=0;m<modes.length;m++){
     const [f0,decay,a]=modes[m];const f=f0*[1.01,1.085,.94][j];
     y+=a*Math.sin(TAU*f*dt+m*.082)*Math.exp(-dt*decay);
    }
    x+=w*(sharp*(.59*scrape+.72*spark+.34*roll)+attack*y*.64);
   }
  }
  const v=.82*Math.tanh(x*1.10),z=hp*(dc+v-prev);dc=z;prev=v;
  const fade=Math.max(0,Math.min(1,(out.length-1-i)/(sampleRate*.074)));
  out[i]=z*fade*fade*(3-2*fade);
 }
 return out;
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
