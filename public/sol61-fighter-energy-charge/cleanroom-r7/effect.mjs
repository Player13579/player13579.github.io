export const WGSL="// Fighter Energy Charge — R7 creative edition.\n// WGSL-only derivative of the exact immutable R6:\n// fighter-energy-charge-cleanroom-sol61-r6\n// Public base: 847f79f\n// R6 package manifest SHA256:\n// 7e71a48c87821465b33bdff94f016f60d9fd425df7cea592e9800adc599f8c61\n// R7 edition accounting: 2/5 additional editions consumed; three remain.\n// Historical R6 runtime/publish/quality records are unchanged.\n//\n// All glow is fixture-local artistic composition. No world lighting.\n// R6 ABI, image placement, finite paths, receiver layers and clocks retained.\n\nstruct U {\n    view:vec4f,\n    actor:vec4f,\n    gates:vec4f,\n    state:vec4f\n};\n\n@group(0) @binding(0) var<uniform> u:U;\n@group(0) @binding(1) var img:texture_2d<f32>;\n@group(0) @binding(2) var samp:sampler;\n\nstruct Out {\n    @builtin(position) p:vec4f\n};\n\n@vertex fn vs(@builtin(vertex_index) i:u32)->Out {\n    let positions=array<vec2f,3>(\n        vec2f(-1.,-1.),\n        vec2f(3.,-1.),\n        vec2f(-1.,3.)\n    );\n    var o:Out;\n    o.p=vec4f(positions[i],0.,1.);\n    return o;\n}\n\nfn decode(c:vec3f)->vec3f {\n    return select(\n        c/12.92,\n        pow((c+vec3f(.055))/1.055,vec3f(2.4)),\n        c>vec3f(.04045)\n    );\n}\n\nfn encode(c:vec3f)->vec3f {\n    let x=max(c,vec3f(0.));\n    return select(\n        x*12.92,\n        1.055*pow(x,vec3f(1./2.4))-vec3f(.055),\n        x>vec3f(.0031308)\n    );\n}\n\nfn over(a:vec4f,b:vec4f)->vec4f {\n    return a+b*(1.-a.a);\n}\n\nfn emitter(coverage:f32,color:vec3f,radiance:f32)->vec4f {\n    let a=clamp(coverage,0.,1.);\n    return vec4f((vec3f(1.)-exp(-color*radiance))*a,a);\n}\n\nfn pulse(t:f32,a:f32,b:f32)->f32 {\n    return sin(clamp((t-a)/(b-a),0.,1.)*3.14159265359);\n}\n\nfn capsule(p:vec2f,a:vec2f,b:vec2f)->f32 {\n    let v=b-a;\n    let h=clamp(dot(p-a,v)/max(dot(v,v),.0001),0.,1.);\n    return length(p-a-v*h);\n}\n\nfn circularChord(distance:f32,radius:f32)->f32 {\n    return 2.*sqrt(max(radius*radius-distance*distance,0.));\n}\n\nfn gradedChannelColumn(distance:f32,radius:f32)->f32 {\n    let rr=radius*radius;\n    let h=max(rr-distance*distance,0.);\n    return 3.2*h*h*sqrt(h)/(rr*rr);\n}\n\nfn conduitPoint(side:f32,progress:f32)->vec2f {\n    let a=vec2f(side*28.,17.);\n    let b=vec2f(side*23.,-5.);\n    let c=vec2f(side*6.,-9.);\n    let ab=length(b-a);\n    let bc=length(c-b);\n    let travel=clamp(progress,0.,1.)*(ab+bc);\n    if(travel<=ab) {\n        return mix(a,b,travel/ab);\n    }\n    return mix(b,c,(travel-ab)/bc);\n}\n\n// x: distance to the existing finite polyline.\n// y: arc length of its nearest point, measured from the existing source.\n// z: full authored path length.\nfn conduitCoordinates(q:vec2f,side:f32)->vec3f {\n    let a=vec2f(side*28.,17.);\n    let b=vec2f(side*23.,-5.);\n    let c=vec2f(side*6.,-9.);\n    let ab=b-a;\n    let bc=c-b;\n    let lenAB=length(ab);\n    let lenBC=length(bc);\n    let hAB=clamp(dot(q-a,ab)/dot(ab,ab),0.,1.);\n    let hBC=clamp(dot(q-b,bc)/dot(bc,bc),0.,1.);\n    let dAB=length(q-a-ab*hAB);\n    let dBC=length(q-b-bc*hBC);\n    return vec3f(\n        min(dAB,dBC),\n        select(lenAB+hBC*lenBC,hAB*lenAB,dAB<=dBC),\n        lenAB+lenBC\n    );\n}\n\nfn channelSupport(t:f32)->f32 {\n    if(t<=0. || t>=.63) {\n        return 0.;\n    }\n    return pulse(t,0.,.63);\n}\n\nfn packetLife(t:f32)->f32 {\n    return 1.-smoothstep(.44,.56,t);\n}\n\n// One packet per original path, with a trailing shoulder on that same path.\n// No repeated pulses, additional travel clocks, or additional source geometry.\nfn packetOnPath(c:vec3f,t:f32,transfer:f32)->f32 {\n    let behind=transfer*c.z-c.y;\n    let width=select(2.25,8.0,behind>=0.);\n    let head=exp(-behind*behind/(width*width));\n    return head*packetLife(t);\n}\n\nfn receivedLayer(t:f32,j:u32,variant:f32)->f32 {\n    let enabled=select(0.,1.,f32(j)<=variant);\n    return enabled*clamp((t-.30-f32(j)*.045)/.14,0.,1.);\n}\n\nfn receiverDistance(q:vec2f,j:u32)->f32 {\n    let y=-8.+f32(j)*6.;\n    let width=10.+f32(j)*1.6;\n    return min(\n        capsule(q,vec2f(-width,y-2.),vec2f(0.,y+2.)),\n        capsule(q,vec2f(0.,y+2.),vec2f(width,y-2.))\n    );\n}\n\n// Camera-facing optical columns retain finite support.\n// Separate packet depth permits a warm guide and a brighter advancing packet.\nfn cameraSourceTau(\n    q:vec2f,t:f32,variant:f32,env:f32,transfer:f32\n)->vec3f {\n    var guideTau=0.;\n    var packetTau=0.;\n    var receiverTau=0.;\n    let support=channelSupport(t);\n\n    for(var k=0u;k<2u;k++) {\n        let side=select(-1.,1.,k==1u);\n        let c=conduitCoordinates(q,side);\n        let packet=packetOnPath(c,t,transfer);\n        guideTau+=.48*env*.24*support\n            *gradedChannelColumn(c.x,1.7);\n        packetTau+=.48*env*2.15*packet\n            *gradedChannelColumn(c.x,1.7);\n    }\n\n    for(var j=0u;j<4u;j++) {\n        let layer=receivedLayer(t,j,variant);\n        let d=receiverDistance(q,j);\n        // Retain the recognizable receiver/chest structure, but let the\n        // supplied material remain visible through the accumulated receipt.\n        receiverTau+=.48*env*.52*layer\n            *circularChord(d,1.9);\n    }\n    return vec3f(guideTau,packetTau,receiverTau);\n}\n\n// Bounded receiving response, not additional geometry.\n// Channel contribution follows the existing packet. Receiver contribution\n// accumulates only on the original four layer clocks.\nfn receivingField(\n    q:vec2f,t:f32,variant:f32,transfer:f32\n)->vec2f {\n    var channel=0.;\n    var receiver=0.;\n    let support=channelSupport(t);\n\n    for(var k=0u;k<2u;k++) {\n        let side=select(-1.,1.,k==1u);\n        let c=conduitCoordinates(q,side);\n        let packet=packetOnPath(c,t,transfer);\n        let tip=conduitPoint(side,transfer);\n        let delta=q-tip;\n        let tipD2=dot(delta,delta);\n\n        // Quiet continuous connection, with a wider moving material footprint.\n        channel+=.075*support/(1.+c.x*c.x/64.);\n        channel+=.65*packet/(1.+c.x*c.x/100.);\n        channel+=.24*packetLife(t)/(1.+tipD2/144.);\n    }\n\n    for(var j=0u;j<4u;j++) {\n        let layer=receivedLayer(t,j,variant);\n        let d=receiverDistance(q,j);\n        let weight=1./(1.+f32(j)*.8);\n\n        // A local receipt focus plus a broad alpha-clipped material response.\n        // Broad support is derived from distance to the same finite segment.\n        receiver+=layer*weight*(\n            .46/(1.+d*d/100.)\n            +.90/(1.+d*d/900.)\n        );\n    }\n\n    return vec2f(1.-exp(-channel),1.-exp(-receiver));\n}\n\n// Local material response to the existing accumulator; no inferred normals,\n// anatomy, environmental emitter, or world-light transport.\nfn accumulatorReflection(\n    q:vec2f,t:f32,variant:f32,env:f32,color:vec3f\n)->vec3f {\n    var amount=0.;\n    for(var j=0u;j<4u;j++) {\n        let layer=receivedLayer(t,j,variant);\n        let d=receiverDistance(q,j);\n        amount+=layer/(1.+f32(j)*.8)\n            *(.32/(1.+d*d/81.));\n    }\n    return color*(1.-exp(-amount))*env;\n}\n\nfn imageCoverage(uv:vec2f)->f32 {\n    let inside=select(\n        0.,1.,all(uv>=vec2f(0.)) && all(uv<=vec2f(1.))\n    );\n    return textureSampleLevel(\n        img,samp,clamp(uv,vec2f(0.),vec2f(1.)),0.\n    ).a*inside;\n}\n\n// Static alpha-only neighborhood, unchanged in size and construction.\n// Only its source/receipt weighting varies with the established clocks.\nfn silhouetteSpill(uv:vec2f)->f32 {\n    let directions=array<vec2f,8>(\n        vec2f(1.,0.),vec2f(.70710678,.70710678),\n        vec2f(0.,1.),vec2f(-.70710678,.70710678),\n        vec2f(-1.,0.),vec2f(-.70710678,-.70710678),\n        vec2f(0.,-1.),vec2f(.70710678,-.70710678)\n    );\n    let bodySize=vec2f(64.*u.actor.w,64.);\n    var inner=0.;\n    var outer=0.;\n    for(var i=0u;i<8u;i++) {\n        inner+=imageCoverage(uv+directions[i]*1.4/bodySize);\n        outer+=imageCoverage(uv+directions[i]*3.4/bodySize);\n    }\n    return inner*(.70/8.)+outer*(.30/8.);\n}\n\n@fragment fn fs(o:Out)->@location(0) vec4f {\n    let css=o.p.xy/u.view.z;\n    let p=css-u.actor.xy;\n    let scale=u.actor.z/64.;\n    let q=p/scale;\n    let t=clamp(u.view.w/max(u.state.w,.001),0.,1.);\n\n    // R6 host packs sourceOn && mainOn && lifetime into gates.x.\n    let env=u.state.x*u.gates.x;\n    let variant=u.state.z;\n    let aa=max(.6,.8/(u.view.z*scale));\n\n    let transfer=select(\n        1.-pow(1.-clamp((t-.08)/.22,0.,1.),3.),\n        1.,u.gates.w>.5\n    );\n    let lock=smoothstep(.34,.52,t);\n    let orange=vec3f(1.,.26,.045);\n    let gold=vec3f(1.,.66,.13);\n    let hot=vec3f(1.,.93,.65);\n    let coreColor=mix(gold,hot,lock);\n\n    // Original actor sampling, aspect, placement and baseline.\n    let uv=p/vec2f(u.actor.z*u.actor.w,u.actor.z)+vec2f(.5);\n    let tex=textureSample(\n        img,samp,clamp(uv,vec2f(0.),vec2f(1.))\n    );\n    let inActor=select(\n        0.,1.,all(uv>=vec2f(0.)) && all(uv<=vec2f(1.))\n    );\n    let actorA=tex.a*inActor*u.gates.z;\n    let albedo=decode(tex.rgb);\n\n    let field=receivingField(q,t,variant,transfer);\n    let flowing=field.x*env;\n    let received=field.y*env;\n    let responseColor=mix(orange,gold,lock);\n\n    // Multiplicative warmth retains the supplied material's color variation.\n    // A bounded low-level lift lets dark material participate in the receipt\n    // without replacing the image with a flat white silhouette.\n    let materialRoot=sqrt(max(albedo,vec3f(0.)));\n    let movingLift=(\n        albedo*responseColor*1.30\n        +materialRoot*responseColor*.13\n    )*flowing;\n    let receivedLift=(\n        albedo*gold*1.65\n        +materialRoot*gold*.24\n        +gold*.026\n    )*received;\n    let reflected=accumulatorReflection(\n        q,t,variant,env,coreColor\n    );\n    let actor=vec4f(\n        (albedo*(vec3f(1.)+reflected)+movingLift+receivedLift)*actorA,\n        actorA\n    );\n\n    var aura=vec4f(0.);\n    let nearImage=all(uv>=vec2f(-.10))\n        && all(uv<=vec2f(1.10));\n    if(env>0. && u.gates.y>0. && u.gates.z>0. && nearImage) {\n        let spill=silhouetteSpill(uv);\n        let sourceWeight=clamp(field.x*.55+field.y,0.,1.);\n        let coverage=spill*sourceWeight*env\n            *u.gates.y*u.gates.z*.34;\n        aura=emitter(coverage,responseColor,1.9);\n    }\n    let materialBase=over(actor,aura);\n\n    // Original finite columns: nonlinear optical composition before averaging.\n    let apertureNodes=array<f32,4>(\n        .069431844203,.330009478208,.669990521792,.930568155797\n    );\n    let apertureWeights=array<f32,4>(\n        .173927422569,.326072577431,.326072577431,.173927422569\n    );\n    let pixelWidth=1./(u.view.z*scale);\n    let apertureLo=vec2f(-29.701,-11.901)-vec2f(pixelWidth*.5);\n    let apertureHi=vec2f(29.701,18.701)+vec2f(pixelWidth*.5);\n    var result=materialBase;\n\n    if(env>0. && all(q>=apertureLo) && all(q<=apertureHi)) {\n        result=vec4f(0.);\n        for(var iy=0u;iy<4u;iy++) {\n            for(var ix=0u;ix<4u;ix++) {\n                let sampleQ=q+(\n                    vec2f(apertureNodes[ix],apertureNodes[iy])-vec2f(.5)\n                )*pixelWidth;\n                let tau=cameraSourceTau(\n                    sampleQ,t,variant,env,transfer\n                );\n\n                let guideA=1.-exp(-tau.x);\n                let packetA=1.-exp(-tau.y);\n                let receiverA=1.-exp(-tau.z);\n                let guide=vec4f(orange*1.12*guideA,guideA);\n                let packet=vec4f(\n                    mix(gold,hot,.28)*1.34*packetA,packetA\n                );\n                let receiver=vec4f(\n                    coreColor*1.28*receiverA,receiverA\n                );\n\n                // Existing paths remain behind the supplied actor.\n                let paths=over(packet,guide);\n                let composite=over(\n                    receiver,over(materialBase,paths)\n                );\n                result+=composite\n                    *(apertureWeights[ix]*apertureWeights[iy]);\n            }\n        }\n    }\n\n    // Original fixed contact accents: topology, positions, angle and windows.\n    var spark=0.;\n    let ca=.906307787;\n    let sa=.422618262;\n    for(var j=0u;j<3u;j++) {\n        let pos=vec2f(\n            (f32(j)-1.)*19.,\n            -18.+f32(j%2u)*31.\n        );\n        let z=q-pos;\n        let v=vec2f(ca*z.x+sa*z.y,-sa*z.x+ca*z.y);\n        let a=.34+f32(j)*.07;\n        let life=pulse(t,a,a+.22);\n        let crossDistance=min(\n            capsule(v,vec2f(-4.8,0.),vec2f(4.8,0.)),\n            capsule(v,vec2f(0.,-2.7),vec2f(0.,2.7))\n        );\n        spark=max(\n            spark,\n            (1.-smoothstep(.72,.72+aa,crossDistance))*life\n        );\n    }\n    result=over(emitter(spark*env*.28,hot,3.),result);\n\n    // Observer-only optical spread, using the same finite paths and layers.\n    // This does not control the actor's intrinsic material response.\n    var broad=0.;\n    for(var k=0u;k<2u;k++) {\n        let side=select(-1.,1.,k==1u);\n        let c=conduitCoordinates(q,side);\n        let packet=packetOnPath(c,t,transfer);\n        broad=max(\n            broad,\n            exp(-c.x*c.x/24.)*(\n                .035*channelSupport(t)+.19*packet\n            )\n        );\n    }\n\n    var receiverGlow=0.;\n    for(var j=0u;j<4u;j++) {\n        let d=receiverDistance(q,j);\n        receiverGlow=max(\n            receiverGlow,\n            exp(-d*d/18.)*receivedLayer(t,j,variant)*.17\n        );\n    }\n    let observer=emitter(\n        (broad+receiverGlow)*env*u.gates.y,gold,2.2\n    );\n    result=over(observer,result);\n\n    // Linear-light premultiplied output; retain R6 target encoding convention.\n    if(result.a<=.000001) {\n        return vec4f(0.);\n    }\n    if(u.state.y>.5) {\n        return vec4f(\n            encode(result.rgb/result.a)*result.a,\n            result.a\n        );\n    }\n    return result;\n}\n";
export const VERSION_ID='fighter-energy-charge-cleanroom-sol61-r7';
export const DURATION_MS=1200;
export const SFX_OFFSET_MS=96;
export const SFX_DURATION_MS=660;
export const UNIFORM_FLOATS=16;
export const VARIANT_NAMES=Object.freeze(['ordinary-charge','cross100-resource-entitlement','cross500-iai-charge','cross1000-apex-perks']);
const clamp=x=>Math.max(0,Math.min(1,x));
const fin=(n,k)=>{if(!Number.isFinite(n))throw new TypeError(k+' finite required');return n;};
function variant(v){if(!Number.isInteger(v)||v<0||v>3)throw new RangeError('variantIndex 0..3 required');return v;}
export function durationForVariant(v=0){variant(v);return DURATION_MS;}
export function phaseAt(ageMs,v=0){
 fin(ageMs,'ageMs');const d=durationForVariant(v),t=ageMs/d;
 if(ageMs<0)return 'before';if(ageMs>=d)return 'expired';
 if(t<.08)return 'seed';if(t<.34)return 'transfer';if(t<.66)return 'lock';
 if(t<.80)return 'settled';return 'release';
}
export function motionState(ageMs,v=0,reducedMotion=false){
 fin(ageMs,'ageMs');const d=durationForVariant(v),t=clamp(ageMs/d);
 return {normalizedAge:t,transfer:reducedMotion?1:1-Math.pow(1-clamp((t-.08)/.22),3),
 lock:clamp((t-.34)/.18),energy:ageMs<0||ageMs>=d?0:Math.min(clamp(t/.08),1-clamp((t-.80)/.20)),
 lockCount:v+1,glintAngleRadians:25*Math.PI/180};
}
export function frameState(input={},actorAspect=134/222,targetLinear=false){
 const {width,height,dpr=1,actorCenterCss=[490,310],actorHeightCss=64,ageMs=0,variantIndex=0,
 sourceOn=true,mainOn=true,observerOn=true,showActor=true,reducedMotion=false}=input;
 variant(variantIndex);
 for(const [n,v]of Object.entries({width,height,dpr,actorHeightCss,ageMs,actorAspect}))fin(v,n);
 if(width<=0||height<=0||!Number.isInteger(width)||!Number.isInteger(height)||dpr<=0||actorHeightCss<=0||actorAspect<=0)
  throw new RangeError('positive backing dimensions/scales required');
 if(!Array.isArray(actorCenterCss)||actorCenterCss.length!==2)throw new TypeError('CSS center pair required');
 actorCenterCss.forEach(x=>fin(x,'actor center'));
 for(const [n,v]of Object.entries({sourceOn,mainOn,observerOn,showActor,reducedMotion}))
  if(typeof v!=='boolean')throw new TypeError(n+' boolean required');
 const d=durationForVariant(variantIndex),active=sourceOn&&mainOn&&ageMs>=0&&ageMs<d;
 const m=motionState(ageMs,variantIndex,reducedMotion),phase=phaseAt(ageMs,variantIndex);
 const uniforms=new Float32Array([width,height,dpr,ageMs/1000,...actorCenterCss,actorHeightCss,actorAspect,
  +active,+(active&&observerOn),+showActor,+reducedMotion,active?m.energy:0,+!targetLinear,variantIndex,d/1000]);
 if(!uniforms.every(Number.isFinite))throw new RangeError('float32 uniform overflow');
 return {active,phase,variantIndex,variantName:VARIANT_NAMES[variantIndex],durationMs:d,motion:m,uniforms};
}
export function createRenderer({device,format,actorTexture,actorAspect=134/222}){
 if(!device||!actorTexture)throw new TypeError('host device/actorTexture required');
 if(!['rgba8unorm','bgra8unorm','rgba8unorm-srgb','bgra8unorm-srgb','rgba16float'].includes(format))throw new TypeError('target format');
 fin(actorAspect,'actorAspect');if(actorAspect<=0)throw new RangeError('actorAspect');
 const targetLinear=format.endsWith('-srgb')||format==='rgba16float';
 const shader=device.createShaderModule({label:VERSION_ID,code:WGSL});
 const buffer=device.createBuffer({label:VERSION_ID+' uniform64',size:64,usage:0x40|0x08});
 const diagnostics={status:'PENDING',messages:[],error:null};
 const diagnosticsReady=shader.getCompilationInfo().then(info=>{
  diagnostics.messages=Array.from(info.messages,m=>({message:m.message,type:m.type,lineNum:m.lineNum,linePos:m.linePos,offset:m.offset,length:m.length}));
  diagnostics.status=diagnostics.messages.some(m=>m.type==='error')?'FAILED':'COMPILATION_INFO_RECEIVED';return diagnostics;
 }).catch(error=>{diagnostics.status='FAILED';diagnostics.error=String(error);return diagnostics;});
 let pipeline,bind;
 try{
  pipeline=device.createRenderPipeline({label:VERSION_ID,layout:'auto',vertex:{module:shader,entryPoint:'vs'},
   fragment:{module:shader,entryPoint:'fs',targets:[{format,blend:{
    color:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'},
    alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'}}}]},primitive:{topology:'triangle-list'}});
  bind=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[
   {binding:0,resource:{buffer}},{binding:1,resource:actorTexture.createView()},
   {binding:2,resource:device.createSampler({magFilter:'linear',minFilter:'linear'})}]});
 }catch(error){buffer.destroy();throw error;}
 let disposing=false,disposePromise=null,frames=0;
 return {diagnostics,diagnosticsReady,
  render(input){
   if(disposing)throw new Error('disposed renderer');
   if(!input?.encoder||!input?.view)throw new TypeError('host encoder/view required');
   const s=frameState(input,actorAspect,targetLinear);
   device.queue.writeBuffer(buffer,0,s.uniforms);
   const pass=input.encoder.beginRenderPass({label:VERSION_ID,colorAttachments:[{view:input.view,loadOp:'load',storeOp:'store'}]});
   pass.setPipeline(pipeline);pass.setBindGroup(0,bind);pass.draw(3);pass.end();frames++;
   return{versionId:VERSION_ID,passes:1,active:s.active,phase:s.phase,variantIndex:s.variantIndex,
    durationMs:s.durationMs,framesRecorded:frames,submitted:false,gpuCompletion:'HOST_OWNED_NOT_OBSERVED'};
  },
  dispose(){
   if(disposePromise)return disposePromise;disposing=true;
   disposePromise=(async()=>{try{await device.queue.onSubmittedWorkDone();}catch(error){if(!device.lost)throw error;await device.lost;}
    buffer.destroy();return{disposed:true,ownedBuffersDestroyed:1,hostTextureDestroyed:false};})();
   return disposePromise;
  }
 };
}
// Deterministic synthesis, no playback. First pressure contact is SFX_OFFSET_MS after cause origin.
export function synthesizeSfx(sampleRate=48000,v=0){
 if(!Number.isInteger(sampleRate)||sampleRate<8000||sampleRate>192000)throw new RangeError('sampleRate');
 const duration=durationForVariant(v),n=Math.round(sampleRate*SFX_DURATION_MS/1000),pcm=new Float32Array(n);
 const lockAt=duration*.44/1000-SFX_OFFSET_MS/1000;
 let seed=(0x4ecba921+v*9817)>>>0,low=0,previous=0;
 for(let i=0;i<n;i++){
  const t=i/sampleRate;seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;
  const noise=(seed>>>0)/2147483648-1;low+=.12*(noise-low);
  const edge=low-previous;previous=low;
  const intake=(1-Math.exp(-t/.005))*Math.exp(-t/.11);
  const gather=(.29*low+.44*edge)*intake;
  let contact=0;
  for(let j=0;j<=v;j++){
   const dt=t-lockAt-j*.045*duration/1000;
   if(dt>=0)contact+=(.13*Math.sin(2*Math.PI*(139+j*17)*dt)*Math.exp(-dt/.052)+
    .07*Math.sin(2*Math.PI*367*dt)*Math.exp(-dt/.024)+.12*noise*Math.exp(-dt/.007))/(1+v*.22);
  }
  const taper=clamp((n-1-i)/(sampleRate*.055));
  pcm[i]=(gather+contact)*taper;
 }
 return pcm;
}
