// Gravity Storm R10 by dot: orthographic mica flakes, finite pull and selective release; GPU submission belongs to host.
export const VERSION_ID='gravity-storm-dot-r10';
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
 // R10 is an orthographic plan view. Bounds belong to the map, never the camera or 520.
 if(groundYScale!==1)throw RangeError('top-down map projection requires groundYScale 1');
 const worldRect=input.mapWorldRect;
 if(!Array.isArray(worldRect)||worldRect.length!==4||!worldRect.every(finite)||worldRect[0]>=worldRect[2]||worldRect[1]>=worldRect[3])throw RangeError('finite authored mapWorldRect required');
 const bounds=[...project(worldRect[0],worldRect[1]),...project(worldRect[2],worldRect[3])];
 const flags=(input.showActor!==false?1:0)+(input.observerOn!==false?2:0)+(input.reducedMotion?4:0);
 const values=[width,height,dpr,Math.max(0,Math.min(12,source.ageMs/1000)),...field,520*worldToCss,+gate,...eye,140*worldToCss,+(gate&&source.eyeActive),...actorCenterCss,actorHeightCss,flags,...bounds];
 const uniforms=new Float32Array(values);if(![...uniforms].every(finite))throw RangeError('Float32 projection overflow');
 return {uniforms,source,active:gate,phase:gate?source.phase:'off',fieldCenterCss:field,eyeCenterCss:eye,mapBoundsCss:bounds};
}
export const WGSL="struct Params { viewport:vec4f, field:vec4f, eye:vec4f, actor:vec4f, map:vec4f }\n@group(0) @binding(0) var<uniform> u:Params;\n@group(0) @binding(1) var actorTex:texture_2d<f32>;\n@group(0) @binding(2) var actorSampler:sampler;\noverride ENCODE_TARGET:bool=false;\noverride ACTOR_ASPECT:f32=.6036036;\nconst FLAKES:u32=105u;\nstruct VOut {\n @builtin(position) position:vec4f,\n @location(0) uv:vec2f,\n @location(1) @interpolate(flat) kind:u32,\n @location(2) @interpolate(flat) part:vec4f,\n}\nfn clamp1(x:f32)->f32{return clamp(x,0.,1.);}\nfn seed(i:u32)->f32{\n var x=i*747796405u+2891336453u;\n x=((x>>((x>>28u)+4u))^x)*277803737u;\n return f32((x>>22u)^x)*2.3283064365387e-10;\n}\nfn dest(p:vec2f)->vec4f{\n let wh=u.viewport.xy/u.viewport.z;\n return vec4f(p.x/wh.x*2.-1.,1.-p.y/wh.y*2.,0.,1.);\n}\nfn press(sec:f32,k:f32)->f32{\n let d=sec-k;return smoothstep(0.,.023,d)*(1.-smoothstep(.033,.118,d));\n}\n@vertex fn vs(@builtin(vertex_index) v:u32,@builtin(instance_index) n:u32)->VOut{\n var q=array<vec2f,6>(vec2f(-1.,-1.),vec2f(1.,-1.),vec2f(-1.,1.),vec2f(-1.,1.),vec2f(1.,-1.),vec2f(1.,1.));\n var o:VOut;o.uv=q[v];o.kind=0u;o.part=vec4f(0.);\n if(n==0u){\n  o.position=vec4f(q[v].x,-q[v].y,0.,1.);\n  return o;\n }\n if(n==FLAKES+1u){\n  let bits=u32(u.actor.w);\n  o.kind=2u;\n  if((bits&1u)==0u){o.position=vec4f(2.,2.,0.,1.);return o;}\n  o.position=dest(u.actor.xy+q[v]*vec2f(ACTOR_ASPECT,1.)*u.actor.z*.5);\n  o.uv=q[v]*.5+vec2f(.5);\n  return o;\n }\n if(u.field.w<.5){o.position=vec4f(2.,2.,0.,1.);return o;}\n o.kind=1u;\n let i=n-1u;\n let h0=seed(i*9u+3u);let h1=seed(i*9u+4u);let h2=seed(i*9u+5u);let h3=seed(i*9u+6u);let h4=seed(i*9u+7u);\n let cell=vec2f(f32(i%15u),f32(i/15u));\n let uv=(cell+vec2f(.09+h0*.82,.09+h1*.82))/vec2f(15.,7.);\n let p=mix(u.map.xy,u.map.zw,uv);\n let c=u.field.xy;\n let delta=p-c;\n let time=u.viewport.w;let motion=(u32(u.actor.w)&4u)==0u;\n let t=select(1.16,time,motion);\n let late=smoothstep(11.03,11.52,time);\n let finalStill=select(0.,smoothstep(11.66,11.995,time),motion);\n let perimeter=max(abs(2.*uv.x-1.),abs(2.*uv.y-1.));\n let wait=.031+h1*.11+(1.-perimeter)*.118;\n let pace=2.21+h3*1.22;\n let timeLocal=max(0.,min(t,11.04)-wait);\n let lap=floor(timeLocal/pace);\n let travel=fract(timeLocal/pace);\n let form=smoothstep(0.,.139+wait,t);\n let wake=select(1.,smoothstep(.0,.105,travel),lap>.5);\n let gather=1.-smoothstep(.50,.97,travel);\n let pull=clamp1((travel*travel*.85+travel*.36)*1.28);\n // Strict 2D trajectory and finite supply: independent seed plates draw\n // across the entire board, accelerate toward one source, then disappear at\n // contact. Reintroduced plates fade f at their real board coordinates.\n let len=max(1.,length(delta));\n let a=delta/len;\n let tangent=vec2f(-a.y,a.x);\n let side=mix(-1.,1.,h2);\n let bend=sin(3.14159265*travel)*(5.+15.*h2)*side;\n let small=select(1.,.76,h4<.29);\n let endOut=select(0.,finalStill,h2<.28);\n let endTravel=late*(.57-.29*endOut);\n let ratio=mix((1.-pull),.10+h2*.092,endTravel);\n let position=c+delta*ratio+tangent*(bend*(1.-late*.61)+endOut*(3.+h0*12.)*side);\n let knock=press(t,.168)*.62+press(t,.337)*.74+press(t,.617)*.86;\n let lamina=sin((h0*2.-1.)*t*4.+h4*8.);\n let baseAngle=.42+1.5*h2+.36*lamina*(1.-pull)-.33*late;\n let sinA=sin(baseAngle);let cosA=cos(baseAngle);\n let dir=vec2f(a.x*cosA-a.y*sinA,a.x*sinA+a.y*cosA);\n let ort=vec2f(-dir.y,dir.x);\n let fit=clamp(u.field.z/300.,.63,1.62);\n let mass=.23+h3*h3*.77;\n let xSize=(5.0+14.5*mass)*(1.+.13*pull+.30*late)*fit*small;\n let ySize=(1.9+6.2*mass)*(1.-.41*pull)*fit*small;\n let shade=mix(.13,1.,form*wake*gather)*form*(.52+.34*h1+.10*knock)*(1.-.87*endOut);\n let accent=.44+.24*knock+.14*pull+.155*late;\n o.position=dest(position+q[v].x*dir*xSize+q[v].y*ort*ySize);\n o.part=vec4f(shade,accent,h4,h0);\n return o;\n}\nfn decode(c:vec3f)->vec3f{return select(pow((c+vec3f(.055))/1.055,vec3f(2.4)),c/12.92,c<=vec3f(.04045));}\nfn encode(c:vec3f)->vec3f{return select(1.055*pow(max(c,vec3f(0)),vec3f(1./2.4))-vec3f(.055),c*12.92,c<=vec3f(.0031308));}\nfn outInk(c:vec3f,a:f32)->vec4f{\n let aa=clamp1(a);\n return vec4f(select(c,encode(c),ENCODE_TARGET)*aa,aa);\n}\nfn segment(p:vec2f,a:vec2f,b:vec2f,w:f32)->f32{\n let ab=b-a;\n let t=clamp1(dot(p-a,ab)/dot(ab,ab));\n return 1.-smoothstep(w*w,(w+.81)*(w+.81),dot(p-a-t*ab,p-a-t*ab));\n}\n@fragment fn fs(f:VOut)->@location(0) vec4f {\n if(f.kind==2u){\n  let ar=textureSampleLevel(actorTex,actorSampler,f.uv,0.);\n  return outInk(decode(ar.rgb),ar.a);\n }\n if(u.field.w<.5){return vec4f(0.);}\n let p=f.position.xy/u.viewport.z;\n let a=p-u.map.xy;let b=u.map.zw-p;\n let h=min(min(a.x,a.y),min(b.x,b.y));\n let clip=smoothstep(-.50,.61,h);\n if(clip==0.){return vec4f(0.);}\n if(f.kind==1u){\n  let q=f.uv;let dye=f.part.z;let side=f.part.w;\n  // Analytic asymmetric cut: thin flakes are neither rectangles nor chips\n  // from a grid, and only their moving quads incur fragment invocations.\n  let tilt=(side-.5)*.58;\n  let taper=.66+.18*q.x;\n  let width=abs(q.y-q.x*tilt);\n  let sides=max(abs(q.x),width/max(.36,taper));\n  let point=abs((q.x-.08)*(1.02+.18*dye))+.37*width;\n  let rim=max(sides*.82,point);\n  let mask=1.-smoothstep(.811,.951,rim);\n  let shine=(1.-smoothstep(.050,.15,abs(width-taper*.72)))*smoothstep(-.68,.79,-q.x);\n  let vein=1.-smoothstep(.016,.12,abs(q.y+q.x*.36+.07));\n  let lam=smoothstep(-.83,.36,q.x+q.y*.62);\n  let warm=smoothstep(.52,.91,dye);\n  let dark=mix(vec3f(.012,.164,.165),vec3f(.210,.160,.030),warm*.68);\n  let body=mix(vec3f(.065,.57,.435),vec3f(.68,.554,.126),warm);\n  let bright=mix(vec3f(.446,.985,.76),vec3f(.967,.91,.386),warm*.85);\n  let color=mix(mix(dark,body,.50+.40*lam),bright,clamp1((shine*.53+vein*.30)*f.part.y));\n  let glow=(1.-smoothstep(.82,1.11,rim))*.13*f.part.y;\n  let opacity=(mask*(.66+.30*lam)+glow)*f.part.x*clip;\n  return outInk(color,opacity);\n }\n let eyeDot=p-u.field.xy;\n let bits=u32(u.actor.w);\n let t=u.viewport.w;\n let first=smoothstep(.00,.278,t);\n let late=smoothstep(11.0,11.40,t);\n let act=first*(.77+.23*late);\n let fit=clamp(u.field.z/300.,.63,1.62);\n let s=eyeDot/fit;\n let rim=1.-smoothstep(1.1,3.,abs(h-1.8));\n let contact=1.-smoothstep(.0,12.,h);\n let d=dot(s,s);\n let sourceFace=1.-smoothstep(32.,245.,d);\n let lens=select(0.,(1.-smoothstep(97.,480.,d))*.055,(bits&2u)!=0u);\n // Broad world tone is translucent and only intensifies at the driven\n // boundary and source. A small local observer veil is sourced, never a radius.\n let floorColor=mix(vec3f(.010,.026,.050),vec3f(.024,.20,.145),contact*.31+sourceFace*.68);\n let marker=max(segment(s,vec2f(-9.,-1.4),vec2f(-3.2,-1.4),.91),segment(s,vec2f(3.2,1.4),vec2f(9.,1.4),.91));\n let caster=p-u.eye.xy;let off=clamp(u.eye.z*.34,12.,31.);\n let z=vec2f(abs(caster.x)-off,caster.y);\n let gold=max(segment(z,vec2f(0.,2.5),vec2f(0.,8.8),.94),segment(z,vec2f(0.,8.8),vec2f(-4.0,10.2),.94))*u.eye.w;\n let color=mix(mix(mix(floorColor,vec3f(.147,.420,.323),rim),vec3f(.61,1.,.82),marker),vec3f(1.,.56,.10),gold);\n let opacity=max(max(.14+.18*act+contact*.078+sourceFace*.12+lens,.66*rim),max(marker*.92,gold*.99))*clip;\n return outInk(color,opacity);\n}\n";
export function synthesizeSfx(sampleRate=48000,variant=0){
 durationForVariant(variant);
 if(!finite(sampleRate)||!Number.isInteger(sampleRate)||sampleRate<8000||sampleRate>192000)throw RangeError('sampleRate');
 // Three dry releases of paper-thin mineral scales; the early whisper
 // follows the gathering perimeter before the first pinned impulse.
 const taps=[.168,.337,.617],weights=[.67,.82,1.],TAU=2*Math.PI,states=[0,0,0,0,0];
 const out=new Float32Array(Math.ceil(sampleRate*SFX_DURATION_MS/1000));
 const cut=[126,370,940,2180,3880].map(h=>1-Math.exp(-TAU*h/sampleRate));
 const modes=[[98,23.5,.22],[287,44,.18],[479,63,.13],[883,69,.084],[1849,103,.041]];
 const hp=Math.exp(-TAU*45/sampleRate);
 let r=0xfea1d01f,m=0,z=0;
 for(let i=0;i<out.length;i++){
  const t=i/sampleRate;r^=r<<13;r^=r>>>17;r^=r<<5;
  const n=(r>>>0)/2147483648-1;
  for(let j=0;j<states.length;j++)states[j]+=(n-states[j])*cut[j];
  const airy=(states[2]-states[0])*1.03, dry=(states[3]-states[1])*1.53, grain=(states[4]-states[3])*1.74;
  const ho=(1-Math.exp(-t*36))*Math.exp(-t*2.7);
  const flutter=.37+.63*Math.abs(Math.sin(TAU*(23*t+43*t*t)+.29*Math.sin(t*52)));
  let volume=ho*(airy*.125+(dry*.30+grain*.20)*flutter);
  for(let j=0;j<taps.length;j++){
   const rel=t-taps[j], w=weights[j];
   const upramp=rel+.091;
   if(upramp>0&&rel<0){
    const p=upramp/.091;
    volume+=w*p*p*(.20*airy+(.27*dry+.35*grain)*flutter);
   }
   if(rel>=0){
    const tear=(1-Math.exp(-rel*(1500-120*j)))*Math.exp(-rel*(82-8*j));
    const fall=rel-.027-.003*j;
    const splay=fall>0?(1-Math.exp(-fall*630))*Math.exp(-fall*80):0;
    let reson=0;
    for(const [pitch,loss,a] of modes){
     reson+=a*Math.sin(TAU*pitch*(1.028-.051*j)*rel)*Math.exp(-rel*loss);
    }
    const hit=(1-Math.exp(-rel*720))*reson;
    volume+=w*(tear*(.38*airy+.86*dry+.64*grain)+splay*(.30*dry+.35*grain)+hit*.85);
   }
  }
  const compressed=.78*Math.tanh(volume*1.27);
  const y=hp*(z+compressed-m);z=y;m=compressed;
  const fade=Math.max(0,Math.min(1,(out.length-1-i)/(sampleRate*.069)));
  out[i]=y*fade*fade*(3-2*fade);
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
 function render(input){if(closed)throw Error('disposed');const s=frameState(input);if(!input.encoder||!input.view)throw TypeError('encoder/view');device.queue.writeBuffer(buffer,0,s.uniforms);const p=input.encoder.beginRenderPass({colorAttachments:[{view:input.view,loadOp:'load',storeOp:'store'}]});p.setPipeline(pipeline);p.setBindGroup(0,bind);p.draw(6,107);p.end();return {passes:1,active:s.active,phase:s.phase,source:s.source,submitted:false,gpuCompletion:'HOST_OWNED_NOT_OBSERVED'};}
 function dispose(){if(disposal)return disposal;closed=true;disposal=(async()=>{try{await device.queue.onSubmittedWorkDone()}catch(e){await device.lost}buffer.destroy()})();return disposal}
 return {render,diagnostics,diagnosticsReady,dispose,destroy:dispose};
}
