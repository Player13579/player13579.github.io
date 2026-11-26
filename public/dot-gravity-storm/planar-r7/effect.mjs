// Gravity Storm R7 by dot: orthographic tidal pleats and compression fronts; GPU submission belongs to host.
export const VERSION_ID='gravity-storm-dot-r7';
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
 // R7 is an orthographic plan view. Bounds belong to the map, never the camera or 520.
 if(groundYScale!==1)throw RangeError('top-down map projection requires groundYScale 1');
 const worldRect=input.mapWorldRect;
 if(!Array.isArray(worldRect)||worldRect.length!==4||!worldRect.every(finite)||worldRect[0]>=worldRect[2]||worldRect[1]>=worldRect[3])throw RangeError('finite authored mapWorldRect required');
 const bounds=[...project(worldRect[0],worldRect[1]),...project(worldRect[2],worldRect[3])];
 const flags=(input.showActor!==false?1:0)+(input.observerOn!==false?2:0)+(input.reducedMotion?4:0);
 const values=[width,height,dpr,Math.max(0,Math.min(12,source.ageMs/1000)),...field,520*worldToCss,+gate,...eye,140*worldToCss,+(gate&&source.eyeActive),...actorCenterCss,actorHeightCss,flags,...bounds];
 const uniforms=new Float32Array(values);if(![...uniforms].every(finite))throw RangeError('Float32 projection overflow');
 return {uniforms,source,active:gate,phase:gate?source.phase:'off',fieldCenterCss:field,eyeCenterCss:eye,mapBoundsCss:bounds};
}
export const WGSL="struct Params { viewport:vec4f, field:vec4f, eye:vec4f, actor:vec4f, map:vec4f }\n@group(0) @binding(0) var<uniform> u:Params;\n@group(0) @binding(1) var actorTex:texture_2d<f32>;\n@group(0) @binding(2) var actorSampler:sampler;\noverride ENCODE_TARGET:bool=false;\noverride ACTOR_ASPECT:f32=.6036036;\nstruct VOut { @builtin(position) position:vec4f }\n@vertex fn vs(@builtin(vertex_index) i:u32)->VOut {\n var pts=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));\n var v:VOut;v.position=vec4f(pts[i],0,1);return v;\n}\nfn decode(c:vec3f)->vec3f {return select(pow((c+vec3f(.055))/1.055,vec3f(2.4)),c/12.92,c<=vec3f(.04045));}\nfn encode(c:vec3f)->vec3f {return select(1.055*pow(max(c,vec3f(0)),vec3f(1./2.4))-vec3f(.055),c*12.92,c<=vec3f(.0031308));}\nfn ink(c:vec3f,a:f32)->vec4f{let x=clamp(a,0.,1.);return vec4f(decode(clamp(c,vec3f(0),vec3f(1)))*x,x);}\nfn over(a:vec4f,b:vec4f)->vec4f{return a+b*(1.-a.a);}\nfn contour(x:f32,w:f32,aa:f32)->f32{return 1.-smoothstep(w,w+aa,abs(x));}\nfn markline(p:vec2f,a:vec2f,b:vec2f,w:f32)->f32{\n let ab=b-a;let s=clamp(dot(p-a,ab)/dot(ab,ab),0.,1.);return contour(length(p-(a+s*ab)),w,.85);\n}\nfn knock(t:f32,start:f32)->f32{let a=t-start;return smoothstep(0.,.019,a)*exp(-max(0.,a)*12.);}\nstruct Tide { sail:f32, lip:f32, folds:f32, fringe:f32, scatter:f32, channel:f32 }\n// ax is signed distance to the map side along this coordinate, -1..1.\n// xw is the signed coordinate transverse to flow. The propagating ridges are\n// *across* the section; they never form a circle or connect opposed fronts.\nfn tide(ax:f32,xw:f32,id:f32,sec:f32,late:f32,wing:f32,aa:f32)->Tide {\n let q=abs(ax);let signSide=select(-1.,1.,ax>=0.);\n let tag=id+select(.0,1.63,ax>=0.);\n let open=smoothstep(.012,.13,q);\n // Parent and leaf tows braid in map space, with a constrained common sink.\n let arc=q*(.23*sin(3.5*q+tag)+.30*sin(6.0*q+.6*tag)+.11*signSide);\n let halfSpan=.022+q*(.34+.105*sin(4.9*q+tag));\n let x=(xw-arc)/max(.02,halfSpan);\n let absx=abs(x);\n let mask=(1.-smoothstep(.78,1.14,absx))*open;\n // Shingled slip planes: pressed apex first, deeply swept sides, slight\n // asymmetric shear. Their decreasing q is physical transport towards source.\n let transport=sec*.64+max(0.,sec-11.)*.52;\n let s=4.35*q+transport+.36*(1.-min(1.5,x*x))-.19*x+.19*sin(5.3*q+tag)+.22*tag;\n let dist=fract(s+.50)-.50;\n let aaS=clamp(aa*6.,.002,.11);\n let shoulder=1.-smoothstep(.02,.37,dist);\n let face=smoothstep(-.026,.017,dist)*shoulder;\n let toe=smoothstep(-.034,.025,dist)*(1.-smoothstep(.10,.26,dist));\n let lobe=pow(max(0.,1.-min(1.,absx)),.36);\n let lip=contour(dist,.011+aaS*.48,aaS)*mask;\n let echo=contour(dist-.073,.005+aaS*.24,aaS*.85)*mask;\n // Finely split striations live *inside* the angled wing, not across every pixel.\n let flute=abs(fract(3.65*x+dist*(1.8+q)+.14*sin(q*6.1+tag))-.50);\n let grooves=smoothstep(.15,.36,absx)*(1.-smoothstep(.12,.29,dist))*smoothstep(.037,.12,dist)*(1.-smoothstep(.011,.052+aa,flute));\n let channel=mask*(.20+.26*lobe+.20*toe);\n let sail=mask*face*(.52+.48*lobe)*(1.-.77*grooves);\n let folds=echo*.40+mask*toe*(.22+.40*wing);\n let fringe=mask*lip*(.46+.54*pow(max(0.,1.-abs(x+.24)),3.));\n let scatter=exp(-abs(dist)*14.)*exp(-max(0.,absx-.65)*2.8)*open;\n return Tide(sail,lip,folds,fringe,scatter,channel);\n}\n@fragment fn fs(v:VOut)->@location(0) vec4f {\n let p=v.position.xy/u.viewport.z;let bits=u32(u.actor.w);\n let sec=u.viewport.w;let animated=(bits&4u)==0u;let obs=(bits&2u)!=0u;\n let t=select(1.73,sec,animated);let terminal=smoothstep(11.,11.30,sec);\n var col=vec4f(0);\n if(u.field.w>.5) {\n  let low=p-u.map.xy;let high=u.map.zw-p;\n  let h=min(min(low.x,low.y),min(high.x,high.y));let clip=smoothstep(-.55,.65,h);\n  if(clip>0.) {\n   let d=p-u.field.xy;\n   let halfSize=max(vec2f(1.),select(u.field.xy-u.map.xy,u.map.zw-u.field.xy,d>=vec2f(0.)));\n   let q=d/halfSize;let aa=1./max(90.,min(halfSize.x,halfSize.y));\n   let outer=max(abs(q.x),abs(q.y));\n   let strike=.75*knock(t,.115)+.88*knock(t,.335)+knock(t,.58);\n   // On activation the perimeter takes the load before the center seats; the\n   // late event increases inward velocity and warmth without changing field area.\n   let arrival=(1.-smoothstep(.03,1.,outer))*.41;\n   let load=.30+.70*smoothstep(arrival,arrival+.30,t);\n   let x=tide(q.x,q.y,.21,t,terminal,.72,aa);\n   let y=tide(q.y,-q.x,2.87,t,terminal,.18,aa);\n   let sink=smoothstep(.21,.85,1.-outer);\n   let north=mix(vec3f(.13,.19,.34),vec3f(.30,.19,.39),.55+.38*q.y);\n   // A quieter map-wide compression in the intervals between the major lobes;\n   // corner contact goes to all four edges, not a radius around the source.\n   let broad=clamp(x.scatter*.49+y.scatter*.40+max(x.sail,y.sail)*.22,0.,1.);\n   let board=mix(north,vec3f(.25,.40,.52),broad*.72);\n   col=ink(board,(.44+.10*load+.09*broad));\n   let water=mix(vec3f(.17,.55,.62),vec3f(.43,.82,.77),sink*.73);\n   let iris=mix(vec3f(.37,.32,.61),vec3f(.64,.51,.77),sink*.8);\n   let lime=mix(vec3f(.71,.96,.84),vec3f(.97,.95,.69),.22+terminal*.70);\n   let coral=mix(vec3f(.99,.65,.47),vec3f(1.,.83,.61),sink*.52);\n   col=over(ink(iris,(y.channel*.48+y.sail*(.72+terminal*.14))*load),col);\n   col=over(ink(water,(x.channel*.56+x.sail*(.93+terminal*.06))*load),col);\n   col=over(ink(coral,(y.lip*.86+y.folds*.58)*load),col);\n   col=over(ink(lime,(x.lip*.96+x.folds*.69)*load),col);\n   // Colored illumination of neighbouring medium. Optical response is a\n   // separate, very local veiling scatter around compressed luminous lips.\n   if(obs){\n    let haze=clamp(x.scatter*.19+y.scatter*.13,0.,.29)*load;\n    col=over(ink(mix(iris,water,.66),haze*(.65+.23*terminal+.12*strike)),col);\n    col=over(ink(lime,x.fringe*.15*load),col);\n    col=over(ink(coral,y.fringe*.12*load),col);\n   }\n   // Edge clamp: a broad inlay at heterogeneous pressure entrances, broken\n   // outside the mouths; corners and plates still feel the area together.\n   let edge=exp(-max(0.,h)/5.3);\n   let take=clamp(x.channel+y.channel+.22*broad,0.,1.);\n   col=over(ink(mix(iris,lime,take),edge*(.22+.62*take+.10*strike)*load),col);\n   // Tiny ground-plane source: opposing fractured strokes, no circular\n   // enclosure and no apparent field-radius or impact/victim signifier.\n   let fit=clamp(u.field.z/300.,.62,1.65);\n   let d0=d/fit;let crack=markline(d0,vec2f(-12.,4.),vec2f(-1.7,.7),1.15);\n   let crack2=markline(d0,vec2f(1.6,-.5),vec2f(9.2,-4.),1.);\n   let blade=max(crack,crack2);\n   col=over(ink(vec3f(.08,.10,.19),max(markline(d0,vec2f(-12.,4.),vec2f(-1.7,.7),2.25),markline(d0,vec2f(1.6,-.5),vec2f(9.2,-4.),2.1))*.85),col);\n   col=over(ink(mix(lime,coral,.24),blade*(.74+.18*load+.08*strike)),col);\n   if(u.eye.w>.5) {\n    let h0=p-u.eye.xy;let span=clamp(u.eye.z*.32,12.,32.);\n    let k=vec2f(abs(h0.x)-span,h0.y);\n    let gold=max(markline(k,vec2f(0.,2.),vec2f(0.,9.),1.),markline(k,vec2f(0.,9.),vec2f(-4.,11.),1.));\n    col=over(ink(vec3f(.99,.79,.40),gold*.96),col);\n   }\n   col*=clip;\n  }\n }\n let uv=(p-u.actor.xy)/vec2f(u.actor.z*ACTOR_ASPECT,u.actor.z)+vec2f(.5);\n if((bits&1u)!=0u&&all(uv>=vec2f(0.))&&all(uv<=vec2f(1.))){\n  let tex=textureSampleLevel(actorTex,actorSampler,uv,0.);\n  col=over(vec4f(decode(tex.rgb)*tex.a,tex.a),col);\n }\n if(ENCODE_TARGET&&col.a>.00001){col=vec4f(encode(col.rgb/col.a)*col.a,col.a);}\n return col;\n}\n";
export function synthesizeSfx(sampleRate=48000,variant=0){
 durationForVariant(variant);
 if(!finite(sampleRate)||!Number.isInteger(sampleRate)||sampleRate<8000||sampleRate>192000)throw RangeError('sampleRate');
 // Contact score, one mono cause/900 ms. Deformed laminated surfaces slide,
 // catch at three contacts, and dissipate into damped wood/mineral resonances.
 // The three visual knock clocks are the same .115/.335/.58 s. Not a synth sweep.
 const out=new Float32Array(Math.ceil(sampleRate*SFX_DURATION_MS/1000)),TAU=2*Math.PI;
 const strikes=[.115,.335,.58],weights=[.68,.83,1.0];
 const modes=[[91,8.7,.54],[144,13.,.43],[223,15.,.31],[326,19,.19],[547,35,.085],[889,62,.042]];
 const lp=(hz)=>1-Math.exp(-TAU*hz/sampleRate);
 const kLo=lp(115),kL=lp(430),kM=lp(1520),kH=lp(3330);
 let slow=0,low=0,mid=0,high=0,state=0x33a981cf,py=0,px=0;
 const hp=Math.exp(-TAU*38/sampleRate);
 for(let i=0;i<out.length;i++){
  const t=i/sampleRate;state^=state<<13;state^=state>>>17;state^=state<<5;
  const n=(state>>>0)/2147483648-1;
  slow+=(n-slow)*kLo;low+=(n-low)*kL;mid+=(n-mid)*kM;high+=(n-high)*kH;
  const fib=(mid-low)*1.65,grit=(high-mid)*1.34,air=(low-slow)*1.23;
  let sum=0;
  for(let j=0;j<strikes.length;j++){
   const u=t-strikes[j],w=weights[j];
   if(u>=-.108&&u<.027){
    const x=Math.max(0,Math.min(1,(u+.108)/.108));
    const catchEnv=x*x*Math.exp(-Math.max(0,u)*116);
    sum+=w*catchEnv*(.41*fib+.13*grit+.17*air);
   }
   if(u>=0){
    const attack=1-Math.exp(-u*670);
    let body=0;
    for(let m=0;m<modes.length;m++){const [f,decay,gain]=modes[m];const off=1+.013*(j-1);
     body+=gain*Math.sin(TAU*f*off*u+.045*m)*Math.exp(-u*decay);}
    sum+=w*(attack*body*.64+(1-Math.exp(-u*1200))*Math.exp(-u*84)*(fib*.63+grit*.18));
   }
  }
  // Quiet pre-load plus filtered slip from the final squeeze. Not a loop/bed.
  const slideEnv=(1-Math.exp(-t*21))*Math.exp(-t*2.2)*(1+ .32*Math.sin(t*23));
  sum+=slideEnv*(.13*air+.048*fib);
  const peak=.78*Math.tanh(sum*1.10);
  const filtered=hp*(py+peak-px);py=filtered;px=peak;
  const fade=Math.max(0,Math.min(1,(out.length-1-i)/(sampleRate*.045)));
  out[i]=filtered*fade*fade*(3-2*fade);
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
