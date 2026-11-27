// Gravity Storm R9 by dot: orthographic perimeter tow and travelling fiber clasps; GPU submission belongs to host.
export const VERSION_ID='gravity-storm-dot-r9';
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
 // R9 is an orthographic plan view. Bounds belong to the map, never the camera or 520.
 if(groundYScale!==1)throw RangeError('top-down map projection requires groundYScale 1');
 const worldRect=input.mapWorldRect;
 if(!Array.isArray(worldRect)||worldRect.length!==4||!worldRect.every(finite)||worldRect[0]>=worldRect[2]||worldRect[1]>=worldRect[3])throw RangeError('finite authored mapWorldRect required');
 const bounds=[...project(worldRect[0],worldRect[1]),...project(worldRect[2],worldRect[3])];
 const flags=(input.showActor!==false?1:0)+(input.observerOn!==false?2:0)+(input.reducedMotion?4:0);
 const values=[width,height,dpr,Math.max(0,Math.min(12,source.ageMs/1000)),...field,520*worldToCss,+gate,...eye,140*worldToCss,+(gate&&source.eyeActive),...actorCenterCss,actorHeightCss,flags,...bounds];
 const uniforms=new Float32Array(values);if(![...uniforms].every(finite))throw RangeError('Float32 projection overflow');
 return {uniforms,source,active:gate,phase:gate?source.phase:'off',fieldCenterCss:field,eyeCenterCss:eye,mapBoundsCss:bounds};
}
export const WGSL="struct Params { viewport:vec4f, field:vec4f, eye:vec4f, actor:vec4f, map:vec4f }\n@group(0) @binding(0) var<uniform> u:Params;\n@group(0) @binding(1) var actorTex:texture_2d<f32>;\n@group(0) @binding(2) var actorSampler:sampler;\noverride ENCODE_TARGET:bool=false;\noverride ACTOR_ASPECT:f32=.6036036;\nstruct VOut { @builtin(position) position:vec4f }\n@vertex fn vs(@builtin(vertex_index) i:u32)->VOut {\n var pts=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));\n var v:VOut;v.position=vec4f(pts[i],0,1);return v;\n}\nfn decode(c:vec3f)->vec3f {return select(pow((c+vec3f(.055))/1.055,vec3f(2.4)),c/12.92,c<=vec3f(.04045));}\nfn encode(c:vec3f)->vec3f {return select(1.055*pow(max(c,vec3f(0)),vec3f(1./2.4))-vec3f(.055),c*12.92,c<=vec3f(.0031308));}\nfn ink(c:vec3f,a:f32)->vec4f{let x=clamp(a,0.,1.);return vec4f(decode(clamp(c,vec3f(0),vec3f(1)))*x,x);}\nfn over(a:vec4f,b:vec4f)->vec4f{return a+b*(1.-a.a);}\nfn co(d:f32,w:f32,aa:f32)->f32{return 1.-smoothstep(w,w+aa,abs(d));}\nfn bar(x:f32,w:f32,aa:f32)->f32{return 1.-smoothstep(w,w+aa,abs(x));}\nfn overload(t:f32,at:f32)->f32{\n let e=t-at;return smoothstep(0.,.016,e)*exp(-max(0.,e)*10.);\n}\nfn endStroke(p:vec2f,a:vec2f,b:vec2f,w:f32)->f32{\n let k=b-a;let t=clamp(dot(p-a,k)/dot(k,k),0.,1.);return co(length(p-a-t*k),w,.75);\n}\nstruct Tow { fine:f32, ribs:f32, carry:f32, keyed:f32, spill:f32, area:f32 }\n// Atlas of the rectangular perimeter, split into two continuous families.\n// r increases *toward the map edge*. The fractional axial coordinate\n// increases with time, so every luminous splice advances *toward the sink*.\nfn comb(ax:f32,tr:f32,radPx:f32,sidePx:f32,tag:f32,t:f32,late:f32,kick:f32,fit:f32)->Tow{\n let r=abs(ax);\n let edgeWeight=1.-smoothstep(.89,1.025,abs(tr)/max(.028,r));\n let slant=sin((r-.85)*6.8+tag)*sin(r*3.14159265);\n let tether=tr/(r+.038);\n let wave=.083*slant*(1.-.54*late)+.041*sin(r*11.1-t*2.2+tag)*(1.-r)*r;\n // Each channel is a group of four filaments. Their ends remain at the\n // corresponding map side; the midsection breathes transversely with load.\n let cell=(tether+wave)*2.58+.37*sin(tag);\n let bin=floor(cell+.5);\n let u0=fract(cell+.5)-.5;\n let pxStep=max(6.,(r+.038)*sidePx/2.58);\n let x=u0*pxStep;\n let f=t*1.03+max(0.,t-11.)*.73+r*(3.02+late*.21)+.187*bin+tag*.27;\n let phase=fract(f+.5)-.5;\n let axial=phase*radPx/(3.02+late*.21);\n let advance=.56*(1.-clamp(r,0.,1.))+bin*.006;\n let form=smoothstep(advance-.009,advance+.155,t);\n let rootVoid=smoothstep(.034,.111,r);\n let live=edgeWeight*rootVoid*form;\n let tight=(1.-smoothstep(.008,.21,abs(phase)))*(.23+.21*kick);\n let spread=fit*(1.02+2.28*sqrt(clamp(r,0.,1.)))*(1.-tight);\n let roll=.54+.46*cos(8.2*r-.80*t+.51*bin+tag);\n let braid=.64+roll*.39;\n let sc=clamp(pxStep*.08,.64,1.);\n let outline=co(x,spread*1.75,fit*1.78);\n let f1=co(x-spread*1.58,fit*(.28+.29*roll),.76);\n let f2=co(x+spread*1.58,fit*(.25+.25*(1.-roll)),.76);\n let f3=co(x-spread*.48*braid,fit*.33,.76);\n let f4=co(x+spread*.48*braid,fit*.31,.76);\n let lit=(f1*(.52+.40*roll)+f2*(.58+.41*(1.-roll))+f3*.68+f4*.72)*sc;\n let envelope=exp(-max(0.,abs(x)-spread*1.02)/(2.4+3.6*fit));\n // A travelling clasp, made of a crosspiece plus two stepped contacts.\n // The shoulders of the clasp briefly squeeze width above; no arrowhead.\n let isMiddle=bar(axial,2.17*fit,.96);\n let shank=bar(x,spread*1.31,.83)*isMiddle;\n let shoulderA=co(x-spread*1.25,.76*fit,.68)*bar(axial-2.1*fit,2.53*fit,.96);\n let shoulderB=co(x+spread*1.25,.76*fit,.68)*bar(axial+2.1*fit,2.53*fit,.96);\n let clasp=max(shank,max(shoulderA,shoulderB));\n let swept=exp(-abs(axial-3.6*fit)/(8.0+2.1*late))*outline;\n let inlet=exp(-max(0.,(1.-r))*24.)*outline;\n let gate=clamp(live*1.15,0.,1.);\n return Tow(lit*gate,outline*gate,clasp*gate,max(swept,inlet*.58)*gate,envelope*gate,max(envelope*.43,outline)*live);\n}\n@fragment fn fs(v:VOut)->@location(0) vec4f {\n let p=v.position.xy/u.viewport.z;let bits=u32(u.actor.w);\n let sec=u.viewport.w;let moving=(bits&4u)==0u;let obs=(bits&2u)!=0u;\n let t=select(1.84,sec,moving);\n let late=smoothstep(10.99,11.31,sec);\n var col=vec4f(0.);\n if(u.field.w>.5) {\n  let a=p-u.map.xy;let b=u.map.zw-p;\n  let h=min(min(a.x,a.y),min(b.x,b.y));\n  let clip=smoothstep(-.52,.64,h);\n  if(clip>0.) {\n   let d=p-u.field.xy;\n   let fit=clamp(u.field.z/300.,.64,1.6);\n   let norm=max(vec2f(1.),select(u.field.xy-u.map.xy,u.map.zw-u.field.xy,d>=vec2f(0.)));\n   let q=d/norm;\n   let kick=.59*overload(t,.174)+.80*overload(t,.396)+overload(t,.658);\n   let tx=select(.83,2.54,q.x>=0.);\n   let ty=select(4.12,5.61,q.y>=0.);\n   let c1=comb(q.x,q.y,norm.x,norm.y,tx,t,late,kick,fit);\n   let c2=comb(q.y,-q.x,norm.y,norm.x,ty,t,late,kick,fit);\n   let weft=clamp(c1.area+c2.area,0.,1.);\n   let loom=smoothstep(.0,.43,t);\n   let latent=clamp(c1.keyed+c2.keyed,0.,1.);\n   let board=mix(vec3f(.126,.105,.215),vec3f(.239,.145,.256),weft*.37+latent*.37);\n   col=ink(board,(.20+.15*weft+.15*latent)*(.43+.57*loom));\n   let muteV=vec3f(.40,.30,.64);let topV=mix(vec3f(.67,.55,.94),vec3f(.84,.65,1.),late);\n   let muteA=vec3f(.56,.31,.36);let topA=mix(vec3f(.97,.67,.43),vec3f(1.,.82,.48),late);\n   let jointA=mix(vec3f(1.,.79,.54),vec3f(1.,.93,.78),.44+late*.33);\n   let jointV=mix(vec3f(.77,.79,.99),vec3f(.95,.88,1.),.34+late*.43);\n   // Pale fibers sit over a muted material body. Light that reaches between\n   // neighboring fibers comes from the same transported knots and endpoints.\n   col=over(ink(muteA,c1.ribs*.38+c1.spill*.13),col);\n   col=over(ink(muteV,c2.ribs*.38+c2.spill*.13),col);\n   col=over(ink(topA,c1.fine*(.73+.15*kick+.12*late)),col);\n   col=over(ink(topV,c2.fine*(.66+.15*kick+.15*late)),col);\n   col=over(ink(topA,c1.keyed*(.32+.16*late)),col);\n   col=over(ink(topV,c2.keyed*(.30+.16*late)),col);\n   col=over(ink(jointA,c1.carry*(.90+.09*kick)),col);\n   col=over(ink(jointV,c2.carry*(.89+.09*kick)),col);\n   if(obs){\n    // Tiny local lens veiling around inserted clasps; not a divergent ghost\n    // or substitute for the area- and hull-related world light above.\n    let flare=clamp(c1.keyed*c1.spill+c2.keyed*c2.spill,0.,1.);\n    col=over(ink(mix(jointV,jointA,smoothstep(-.16,.16,abs(q.x)-abs(q.y))),flare*(.090+.11*late+.07*kick)),col);\n   }\n   // Thin dark rail with contact needles on all sides of the authored rectangle.\n   let arc=select(p.x-u.map.x,p.y-u.map.y,min(a.x,b.x)<=min(a.y,b.y));\n   let hashline=bar(fract(arc/(9.2*fit))-.50,.08,.13);\n   let sourceLip=exp(-max(0.,h-2.)/(5.0*fit))*max(c1.ribs,c2.ribs);\n   let rim=co(h-1.22,.59,.83);\n   col=over(ink(vec3f(.33,.31,.51),rim*(.59+hashline*.22*loom)),col);\n   col=over(ink(jointA,sourceLip*(.38+.16*kick)),col);\n   // Small open terminal eye coordinates are separate from the game extent.\n   let s=d/fit;\n   let k=max(max(endStroke(s,vec2f(-8.,-2.),vec2f(-3.2,1.1),1.),endStroke(s,vec2f(8.,2.),vec2f(3.2,-1.1),1.)),max(endStroke(s,vec2f(-1.2,3.3),vec2f(-2.,5.5),.68),endStroke(s,vec2f(1.2,-3.3),vec2f(2.,-5.5),.68)));\n   let trace=exp(-length(s*vec2f(.84,1.21))*.31);\n   col=over(ink(topA,trace*(.12+.21*kick+.17*late)*loom),col);\n   col=over(ink(jointA,k*(.53+.42*loom)),col);\n   if(u.eye.w>.5){\n    let delta=p-u.eye.xy;let offset=clamp(u.eye.z*.34,12.,31.);\n    let z=vec2f(abs(delta.x)-offset,delta.y);\n    let guard=max(endStroke(z,vec2f(0.,3.),vec2f(0.,8.8),.94),endStroke(z,vec2f(0.,8.8),vec2f(-4.0,10.2),.94));\n    col=over(ink(vec3f(1.,.80,.36),guard*.98),col);\n   }\n   col*=clip;\n  }\n }\n let uv=(p-u.actor.xy)/vec2f(u.actor.z*ACTOR_ASPECT,u.actor.z)+vec2f(.5);\n if((bits&1u)!=0u&&all(uv>=vec2f(0.))&&all(uv<=vec2f(1.))){\n  let tex=textureSampleLevel(actorTex,actorSampler,uv,0.);\n  col=over(vec4f(decode(tex.rgb)*tex.a,tex.a),col);\n }\n if(ENCODE_TARGET&&col.a>.00001){col=vec4f(encode(col.rgb/col.a)*col.a,col.a);}\n return col;\n}\n";
export function synthesizeSfx(sampleRate=48000,variant=0){
 durationForVariant(variant);
 if(!finite(sampleRate)||!Number.isInteger(sampleRate)||sampleRate<8000||sampleRate>192000)throw RangeError('sampleRate');
 // One dry tension pickup. A modulated slip component is the fiber rubbing
 // against rails; after each clamping time a different loaded bundle rings.
 const out=new Float32Array(Math.ceil(sampleRate*SFX_DURATION_MS/1000));
 const taps=[.174,.396,.658],g=[.71,.84,1.0],f0=[175,219,131];const TAU=2*Math.PI;
 const pole=(f)=>1-Math.exp(-TAU*f/sampleRate);
 const damp=[96,338,1080,2422].map(pole),v=[0,0,0,0];
 const bod=[[1.0,12.8,.65],[1.996,15.2,.32],[3.014,24,.15],[4.033,32,.09],[5.202,45,.044]];
 const hp=Math.exp(-TAU*37/sampleRate);
 let seed=0x96b3a561,lat=0,mem=0;
 for(let i=0;i<out.length;i++){
  const t=i/sampleRate;seed=(Math.imul(seed,1664525)+1013904223)>>>0;
  const white=seed/2147483648-1;
  for(let m=0;m<v.length;m++)v[m]+=(white-v[m])*damp[m];
  const grip=(v[2]-v[1])*1.5, body=(v[1]-v[0])*1.72, fibril=(v[3]-v[2])*1.5;
  let sum=(1.-Math.exp(-t*35))*Math.exp(-t*2.1)*(.113*body+.075*grip);
  for(let j=0;j<taps.length;j++){
   const e=t-taps[j],act=e+.116;
   if(act>=0.&&e<0.){
    const x=act/.116,a=(1.-Math.exp(-x*7))*x*x;
    const tooth=Math.abs(Math.sin(TAU*((39+13*j)*act+58*act*act)))*.55+.45;
    sum+=g[j]*a*(.23*grip*tooth+.12*body+.093*fibril*tooth);
   }
   if(e>=0.){
    const bite=(1.-Math.exp(-1300*e))*Math.exp(-e*170.);
    const attack=(1.-Math.exp(-e*820));
    let tone=0;
    for (const [mul,loss,a] of bod) {
     const p=TAU*f0[j]*mul*e;
     const beating=.70*Math.sin(p)+.30*Math.sin(p*(1.007+j*.004)+.08*mul);
     tone+=a*beating*Math.exp(-e*loss);
    }
    const clampRes=.16*Math.sin(TAU*(89+5*j)*e)*Math.exp(-e*22);
    sum+=g[j]*(bite*(.58*grip+.34*fibril+.23*body)+attack*(tone*.60+clampRes));
   }
  }
  const hit=.76*Math.tanh(sum*1.16);const filter=hp*(lat+hit-mem);
  lat=filter;mem=hit;
  const fade=Math.max(0,Math.min(1,(out.length-1-i)/(sampleRate*.065)));
  out[i]=filter*fade*fade*(3-2*fade);
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
