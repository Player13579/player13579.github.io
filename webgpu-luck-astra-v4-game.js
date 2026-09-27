/* Game-frame adapter for the quality-approved, independent Luck Astra v4.
 * The frame owner supplies device, viewport, target, clock and eventual sound
 * receipt. This module owns neither a canvas nor audio or scheduling. */
(function(root){
  'use strict';
  const PROFILE=Object.freeze({type:'gain-luckBoost',kind:'luckBoost',durationMs:1500,anchorY:54});
  const finite=Number.isFinite;

  // This is the v4 study shader with only its standalone pixel-space vertex
  // placement replaced by the main-frame center/scale uniforms. The anatomy,
  // palette, raymarch, offsets, and every temporal threshold are preserved.
  const shader=`
struct U { size:vec2f, p:f32, height:f32, reduced:f32, glow:f32, center:vec2f };
@group(0) @binding(0) var<uniform> u:U;
struct V { @builtin(position) pos:vec4f, @location(0) local:vec2f, @location(1) @interpolate(flat) id:u32 };
fn emergence()->f32{return smoothstep(.015,.21,u.p)*(1.-smoothstep(.73,.85,u.p));}
fn offset(id:u32)->vec3f{
  let spread=emergence()*mix(1.,.32,u.reduced);
  if(id==0u){return vec3f(-26.,3.,-12.)*spread;}
  if(id==1u){return vec3f(21.,-3.,15.)*spread*(1.-smoothstep(.55,.81,u.p));}
  if(id==2u){return vec3f(9.,7.,-21.)*spread;}
  return vec3f(0.);
}
@vertex fn vs(@builtin(vertex_index) vi:u32,@builtin(instance_index) id:u32)->V{
  let q=array<vec2f,6>(vec2f(-1.,-1.),vec2f(1.,-1.),vec2f(-1.,1.),vec2f(-1.,1.),vec2f(1.,-1.),vec2f(1.,1.));
  let local=q[vi]*vec2f(26.,38.);let off=offset(id);let px=(local+off.xy)*(u.height/64.);
  let pos=u.center+px;
  var o:V;o.pos=vec4f(pos.x*2./u.size.x-1.,1.-pos.y*2./u.size.y,0.,1.);o.local=local;o.id=id;return o;
}
fn capsule(q:vec3f,a:vec3f,b:vec3f,r:f32)->f32{let v=q-a;let w=b-a;return length(v-w*clamp(dot(v,w)/dot(w,w),0.,1.))-r;}
fn anatomy(v:vec3f,id:u32)->f32{
  var q=v;
  let unclear=select(1.-smoothstep(.40,.61,u.p),1.,id!=1u);
  let block=floor((q.y+33.)/10.);
  if(id<3u){q.x+=sin(block*2.2+f32(id)*2.5)*unclear*3.3*emergence();}
  let pose=select(0.,sin(f32(id)*2.1+1.)*emergence(),id<3u);
  var d=length(q-vec3f(0.,25.,0.))-7.;
  d=min(d,capsule(q,vec3f(0.,12.,0.),vec3f(0.,-4.,0.),8.));
  d=min(d,capsule(q,vec3f(-4.5,-7.,0.),vec3f(-7.5,-29.,2.),3.));
  d=min(d,capsule(q,vec3f(4.5,-7.,0.),vec3f(8.,-29.,-1.),3.));
  d=min(d,capsule(q,vec3f(-6.,11.,0.),vec3f(-16.-pose*3.,-6.+pose*5.,1.),2.7));
  d=min(d,capsule(q,vec3f(6.,11.,0.),vec3f(16.+pose*2.,-6.-pose*4.,2.),2.7));return d;
}
@fragment fn fs(v:V)->@location(0) vec4f{
  let id=v.id;let actual=id==3u;let chosen=id==1u;
  if(!actual&&(u.p<=0.||u.p>=1.)){discard;}
  var life=smoothstep(.015,.16,u.p)*(1.-smoothstep(.77,.85,u.p));
  if(!actual&&!chosen){life*=1.-smoothstep(.44,.65,u.p);}
  if(!actual&&life<.001){discard;}
  var ray=vec3f(v.local,42.);var closest=100.;var hit=false;var d=0.;
  for(var i=0;i<44;i++){
    d=anatomy(ray,id);closest=min(closest,d);
    if(d<.07){hit=true;break;}
    ray.z-=max(.1,d*.86);if(ray.z< -30.){break;}
  }
  let gold=smoothstep(.40,.59,u.p)*select(0.,1.,chosen);
  let color=mix(vec3f(.16,.42,.68),vec3f(1.,.62,.18),gold);
  if(!hit){
    if(actual){discard;}
    let halo=exp(-closest*.78)*life*.15*u.glow;
    return vec4f(color*halo,halo*.12);
  }
  let e=.13;
  let normal=normalize(vec3f(anatomy(ray+vec3f(e,0.,0.),id)-anatomy(ray-vec3f(e,0.,0.),id),anatomy(ray+vec3f(0.,e,0.),id)-anatomy(ray-vec3f(0.,e,0.),id),anatomy(ray+vec3f(0.,0.,e),id)-anatomy(ray-vec3f(0.,0.,e),id)));
  let facing=max(normal.z,0.);let edge=pow(1.-facing,2.1);
  if(actual){
    let arrive=smoothstep(.65,.79,u.p)*(1.-smoothstep(.87,.99,u.p));
    let wave=exp(-pow((ray.y-mix(13.,-14.,smoothstep(.65,.90,u.p)))/14.,2.));
    let response=arrive*wave;
    let shade=.21+.10*max(dot(normal,normalize(vec3f(-.5,.9,1.))),0.);
    return vec4f(vec3f(shade*.92,shade,shade*1.08)+vec3f(1.,.62,.18)*response*(.42+edge*.40),1.);
  }
  let band=.52+.48*smoothstep(-.35,.7,sin(ray.y*.30+f32(id)*2.3));
  let settled=mix(band,1.,gold);
  let shell=(.20+.80*edge)*settled;
  let radiance=color*(.66+edge*.85)+vec3f(1.,.93,.70)*gold*pow(facing,5.)*.65;
  let opacity=life*shell*mix(.58,.83,gold);
  return vec4f(radiance*opacity,opacity*.73);
}`;

  function plan({effect,player,now,phase,camera,zoom,viewport,reducedMotion=false,alpha=1}={}){
    if(!effect||effect.cancelled||effect.type!==PROFILE.type||effect.effectKind!=='luckBoost'||
      (typeof effect.id!=='string'&&typeof effect.id!=='number')||String(effect.id)===''||
      !player||!player.alive||player.ejected||player.inVent||player.invisible||player.visible===false||
      !['playing','meeting'].includes(phase)||
      (effect.playerId!=null&&String(effect.playerId)!==String(player.id))||
      !camera||viewport?.kind!=='main'||
      ![effect.startedAt,player.x,player.y,camera.x,camera.y,zoom,now,alpha,
        viewport.width,viewport.height,viewport.pixelWidth,viewport.pixelHeight].every(finite)||
      zoom<=0||alpha<=0||alpha>1||viewport.width<=0||viewport.height<=0||
      !Number.isInteger(viewport.pixelWidth)||!Number.isInteger(viewport.pixelHeight)||
      viewport.pixelWidth<=0||viewport.pixelHeight<=0)return null;
    const elapsed=now-effect.startedAt;
    const durationMs=Math.min(PROFILE.durationMs,
      finite(effect.duration)&&effect.duration>0?effect.duration:
      finite(effect.durationMs)&&effect.durationMs>0?effect.durationMs:PROFILE.durationMs);
    if(elapsed<0||elapsed>=durationMs)return null;
    const dprX=viewport.pixelWidth/viewport.width,dprY=viewport.pixelHeight/viewport.height;
    const centerX=(player.x-camera.x)*zoom*dprX;
    const centerY=(player.y-PROFILE.anchorY-camera.y)*zoom*dprY;
    const scale=zoom*Math.min(dprX,dprY);
    if(![centerX,centerY,scale].every(finite)||scale<=0)return null;
    const radiusX=52*(100/64)*scale,radiusY=76*(100/64)*scale;
    if(centerX+radiusX<0||centerX-radiusX>viewport.pixelWidth||
      centerY+radiusY<0||centerY-radiusY>viewport.pixelHeight)return null;
    return Object.freeze({effectId:String(effect.id),kind:PROFILE.kind,elapsed,durationMs,
      progress:elapsed/durationMs,reducedMotion:Boolean(reducedMotion),alpha,
      centerX,centerY,height:100*scale,pixelWidth:viewport.pixelWidth,pixelHeight:viewport.pixelHeight});
  }

  function create({renderer,frameOwner=renderer}={}){
    if(frameOwner?.state!=='ready'||!frameOwner.device?.createShaderModule||
      !frameOwner.device?.queue?.writeBuffer||typeof frameOwner.own!=='function'||
      typeof frameOwner.release!=='function'||typeof frameOwner.format!=='string')
      throw new TypeError('Luck Astra v4 requires the shared ready WebGPU frame owner');
    const device=frameOwner.device,format=frameOwner.format;
    const module=device.createShaderModule({label:'Luck Astra v4 game adapter WGSL',code:shader});
    const pipeline=device.createRenderPipeline({label:'Luck Astra v4 game-frame E',layout:'auto',
      vertex:{module,entryPoint:'vs'},fragment:{module,entryPoint:'fs',targets:[{format,blend:{
        color:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'},
        alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'}}}]},
      primitive:{topology:'triangle-list'}});
    const slots=[],frameIndices=new WeakMap(),frameEvents=new WeakMap();let destroyed=false;
    function slot(index){if(slots[index])return slots[index];
      const uniform=frameOwner.own(device.createBuffer({label:`Luck Astra v4 frame ${index}`,size:32,usage:0x40|0x08}));
      const bindGroup=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:uniform}}]});
      return slots[index]={uniform,bindGroup};}
    function record({frame,target,viewport,planned}={}){
      if(destroyed||frameOwner.state!=='ready')throw new Error('Luck Astra v4 game pass unavailable');
      if(typeof frame?.add!=='function'||typeof frame?.stage!=='function'||typeof target!=='string'||!target||
        !planned||planned.kind!=='luckBoost'||viewport?.kind!=='main'||
        viewport.pixelWidth!==planned.pixelWidth||viewport.pixelHeight!==planned.pixelHeight||
        ![planned.progress,planned.alpha,planned.centerX,planned.centerY,planned.height].every(finite)||
        planned.progress<0||planned.progress>=1||planned.alpha<=0||planned.alpha>1||
        !planned.effectId)throw new TypeError('Luck Astra v4 needs the current shared frame and plan');
      let ids=frameEvents.get(frame);if(!ids){ids=new Set();frameEvents.set(frame,ids);}
      if(ids.has(planned.effectId))return Object.freeze({effectId:planned.effectId,kind:'luckBoost',drawn:false,duplicate:true});
      const index=frameIndices.get(frame)||0,{uniform,bindGroup}=slot(index);
      device.queue.writeBuffer(uniform,0,new Float32Array([viewport.pixelWidth,viewport.pixelHeight,
        planned.progress,planned.height,planned.reducedMotion?1:0,planned.alpha,planned.centerX,planned.centerY]));
      const label=`world:luck-astra-v4:${planned.effectId}`;frame.stage(label);
      frame.add({target,label,encode(pass,info){if(info.device!==device||info.format!==format||
        info.width!==viewport.pixelWidth||info.height!==viewport.pixelHeight)
        throw new Error('Luck Astra v4 target device, format or backing size mismatch');
        pass.setPipeline(pipeline);pass.setBindGroup(0,bindGroup);pass.draw(6,4);}});
      frameIndices.set(frame,index+1);ids.add(planned.effectId);
      return Object.freeze({effectId:planned.effectId,kind:'luckBoost',drawn:true});
    }
    return Object.freeze({device,plan,record,shader,get state(){return destroyed?'destroyed':frameOwner.state;},
      destroy(){if(destroyed)return;destroyed=true;for(const item of slots)if(frameOwner.release(item.uniform))item.uniform.destroy();slots.length=0;}});
  }
  const api=Object.freeze({PROFILE,shader,plan,create});root.DvaWebGPULuckAstraV4Game=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:window);
