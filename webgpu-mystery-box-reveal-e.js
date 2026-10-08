/* Textureless, event-local mystery-box opening E. This pass only records the
 * world opening; reward state, acquisition flight, UI and sound have other owners. */
(function (root) {
  'use strict';
  const TYPE = 'mystery-box', DURATION = 2600, FLOATS = 16;
  const finite = Number.isFinite, clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
  function normalizeEffectStartTime(effect) {
    if (!effect || typeof effect !== 'object' || finite(effect.startedAt) ||
        (effect.startedAt !== undefined && effect.startedAt !== null) || !finite(effect.at))
      return effect;
    return Object.freeze({ ...effect, startedAt: effect.at });
  }
  const smooth = v => { const t = clamp(v); return t * t * (3 - 2 * t); };
  const shader = /* wgsl */`
struct Params { view:vec4f, shape:vec4f, timing:vec4f, tint:vec4f };
@group(0) @binding(0) var<uniform> p:Params;
struct V { @builtin(position) position:vec4f };
@vertex fn vs(@builtin(vertex_index) i:u32)->V {
 let a=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3))[i]; var o:V;
 o.position=vec4f(a,0,1); return o;
}
fn box2(q:vec2f,c:vec2f,h:vec2f)->f32 { let d=abs(q-c)-h; return length(max(d,vec2f(0)))+min(max(d.x,d.y),0.0); }
fn seg(q:vec2f,a:vec2f,b:vec2f,w:f32)->f32 { let d=b-a; let t=clamp(dot(q-a,d)/max(dot(d,d),.0001),0.0,1.0); return length(q-a-d*t)-w; }
fn ease(v:f32)->f32 {let x=clamp(v,0.0,1.0);return x*x*(3.0-2.0*x);}
@fragment fn fs(@builtin(position)px:vec4f)->@location(0)vec4f {
 let q=(px.xy-p.view.xy)/p.view.zw; let t=p.timing.x; let reduced=p.timing.y>.5; let ability=p.timing.z>.5;
 let visible=1.0-smoothstep(.91,1.0,t); let opening=select(ease((t-.054)/.238),ease((t-.054)/.046),reduced);
 let base=box2(q,vec2f(0.0,.27),vec2f(.96,.34));
 let body=1.0-smoothstep(.012,.030,base);
 // Lid is one broad slab pivoted at the rear edge; it never detaches from the box.
 let hinge=vec2f(-.96,-.06); let angle=-opening*1.02; let c=cos(angle); let s=sin(angle);
 let lidCenter=hinge+vec2f(c*.94,s*.94);
 let lidQ=vec2f(c*(q.x-lidCenter.x)+s*(q.y-lidCenter.y),-s*(q.x-lidCenter.x)+c*(q.y-lidCenter.y));
 let lid=1.0-smoothstep(.018,.038,box2(lidQ,vec2f(0),vec2f(.94,.13)));
 let aperture=opening*smoothstep(.18,.42,opening)*exp(-pow(q.x/.82,4.0))*exp(-pow((q.y+.11)/.19,2.0));
 let inner=aperture*(.38+.62*ease((t-.245)/.123))*visible;
 let envelope=select(smoothstep(.245,.38,t)*(1.0-smoothstep(.84,.99,t)),smoothstep(.25,.39,t)*(1.0-smoothstep(.84,.99,t)),reduced);
 // Product: a short inward fold. Ability: a wide, held sheet that gathers at the mouth.
 let fold=exp(-pow(seg(q,vec2f(.50,-.15),vec2f(.06,-.27),.04)/.11,2.0))*envelope*(1.0-smoothstep(.31,.44,t));
 let sheet=exp(-pow((q.y-(-.12-.15*ease((t-.25)/.13)))/.065,2.0))*exp(-pow(q.x/.58,4.0))*envelope;
 let signature=select(fold,sheet,ability);
 let bodyAlpha=body*.97*visible; let lidAlpha=lid*.99*visible;
 let gold=vec3f(.97,.67,.19); let light=vec3f(1.0,.75,.34);
 let bodyShade=clamp(.78+.30*(-q.y+.25),.58,1.02);
 var face=vec3f(.80,.035,.055)*bodyShade;
 face=mix(face,vec3f(.40,.022,.045),smoothstep(.35,.96,q.x)*.44);
 let ribbon=(1.0-smoothstep(.052,.088,abs(q.x+.55))) +
            (1.0-smoothstep(.052,.088,abs(q.x-.55)));
 let rim=1.0-smoothstep(.013,.045,abs(base));
 face=mix(face,gold,clamp(ribbon*.88+rim*.20,0.0,1.0));
 let cavity=opening*(1.0-smoothstep(.012,.034,box2(q,vec2f(0.0,-.065),vec2f(.82,.10))));
 face=mix(face,vec3f(.11,.035,.025),cavity*.93);
 let lidEdge=1.0-smoothstep(.012,.043,abs(box2(lidQ,vec2f(0),vec2f(.94,.13))));
 let lidBand=1.0-smoothstep(.08,.13,abs(lidQ.x));
 var lidMaterial=mix(vec3f(.87,.045,.06),gold,clamp(lidBand*.94+lidEdge*.32,0.0,1.0));
 lidMaterial*=clamp(.84+.55*(-lidQ.y),.76,1.12);
 var rgb=face*bodyAlpha+lidMaterial*lidAlpha;
 var alpha=bodyAlpha+lidAlpha;
 let glow=min(.90,inner*.86+signature*.76); rgb+=light*glow; alpha+=glow;
 let halo=exp(-pow(q.x/.94,2.0)-pow((q.y+.16)/.22,2.0))*opening*.17*visible;
 rgb+=vec3f(1.0,.53,.14)*halo; alpha+=halo;
 // The opening has a bright near lip, but the cavity remains visibly dark.
 let lip=exp(-pow((q.y+.13)/.025,2.0))*exp(-pow(q.x/.75,6.0))*opening*.54*visible;
 rgb+=vec3f(1.0,.68,.24)*lip; alpha+=lip;
 let a=clamp(alpha,0.0,.97); return vec4f(rgb*a/max(alpha,.001),a);
}`;

  function plan({effect, now, viewerId, selfId, camera, zoom, viewport, reducedMotion=false}={}) {
    if (!effect || effect.type !== TYPE || effect.viewerId == null || effect.playerId == null ||
        String(viewerId ?? '') !== String(selfId ?? '') || String(effect.viewerId) !== String(selfId ?? '') ||
        String(effect.playerId) !== String(selfId ?? '') || !String(effect.id || '') ||
        !finite(now) || !finite(effect.startedAt) || !finite(effect.durationMs) || effect.durationMs !== DURATION ||
        ![effect.x,effect.y,effect.radius].every(finite) || effect.radius <= 0 ||
        !['product','ability'].includes(effect.acquisitionKind) ||
        !String(effect.variant || '') || !String(effect.acquisitionId || '') ||
        String(effect.variant) !== String(effect.acquisitionId) || !camera ||
        ![camera.x,camera.y,zoom,viewport?.width,viewport?.height,viewport?.pixelWidth,viewport?.pixelHeight].every(finite) ||
        zoom <= 0 || viewport.width <= 0 || viewport.height <= 0 || viewport.pixelWidth <= 0 || viewport.pixelHeight <= 0 ||
        viewport.kind !== 'main') return null;
    const elapsed = now-effect.startedAt;
    if (elapsed < 0 || elapsed >= DURATION) return null;
    const sx=zoom*viewport.pixelWidth/viewport.width, sy=zoom*viewport.pixelHeight/viewport.height;
    const scale=clamp(effect.radius/78.5,.75,1.25);
    const centerX=(effect.x-camera.x)*sx, centerY=(effect.y-camera.y)*sy;
    const radiusX=78.5*scale*sx, radiusY=78.5*scale*sy;
    if (![centerX,centerY,radiusX,radiusY].every(finite) || centerX+radiusX<0 || centerX-radiusX>viewport.pixelWidth ||
        centerY+radiusY<0 || centerY-radiusY>viewport.pixelHeight) return null;
    return Object.freeze({effectId:String(effect.id),startedAt:effect.startedAt,durationMs:DURATION,elapsed,
      progress:elapsed/DURATION,kind:effect.acquisitionKind,variant:String(effect.variant||effect.acquisitionId),
      centerX,centerY,radiusX,radiusY,pixelWidth:viewport.pixelWidth,pixelHeight:viewport.pixelHeight,
      reducedMotion:Boolean(reducedMotion)});
  }
  function pack(v) {
    if (!v || ![v.progress,v.centerX,v.centerY,v.radiusX,v.radiusY,v.pixelWidth,v.pixelHeight].every(finite))
      throw new TypeError('Valid mystery-box opening plan required');
    const data=new Float32Array([v.centerX,v.centerY,v.radiusX,v.radiusY,v.pixelWidth,v.pixelHeight,0,0,
      clamp(v.progress),v.reducedMotion?1:0,v.kind==='ability'?1:0,0,0,0,0,0]);
    if (!data.every(finite)) throw new RangeError('Mystery-box opening exceeds float32 range');
    return data;
  }
  function planBatch({effects, ...context}={}) {
    if (!Array.isArray(effects)) throw new TypeError('Mystery-box opening E needs an effects array');
    const ids=new Set(),plans=[],diagnostics=[];
    for (const effect of effects) {
      if (effect?.type!==TYPE) continue;
      const id=String(effect.id||'');
      if (!id || ids.has(id)) { diagnostics.push(Object.freeze({id,reason:'duplicate-or-missing-id'})); continue; }
      ids.add(id);
      if (!['product','ability'].includes(effect.acquisitionKind)) {
        diagnostics.push(Object.freeze({id,reason:'unknown-acquisition-kind'})); continue;
      }
      const result=plan({...context,effect});
      if (result) plans.push(result);
    }
    return Object.freeze({plans:Object.freeze(plans),diagnostics:Object.freeze(diagnostics)});
  }
  function create({renderer,frameOwner=renderer}={}) {
    if(frameOwner?.state!=='ready'||!frameOwner.device?.createShaderModule||!frameOwner.device?.queue?.writeBuffer||
       typeof frameOwner.own!=='function'||typeof frameOwner.release!=='function'||typeof frameOwner.format!=='string')
      throw new TypeError('Mystery-box opening needs the shared ready WebGPU frame owner');
    const device=frameOwner.device,format=frameOwner.format;
    const module=device.createShaderModule({label:'DVA mystery-box opening E WGSL',code:shader});
    const pipeline=device.createRenderPipeline({label:'DVA mystery-box opening E',layout:'auto',vertex:{module,entryPoint:'vs'},
      fragment:{module,entryPoint:'fs',targets:[{format,blend:{color:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'},
        alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'}}}]},primitive:{topology:'triangle-list'}});
    const slots=[],indices=new WeakMap();let destroyed=false;
    function slot(i){if(slots[i])return slots[i];const uniform=frameOwner.own(device.createBuffer({label:`DVA mystery-box opening E ${i}`,size:FLOATS*4,usage:0x40|0x08}));
      const bindGroup=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:uniform}}]});return(slots[i]={uniform,bindGroup});}
    function record({frame,target,viewport,planned}={}){
      if(destroyed||frameOwner.state!=='ready')throw new Error('Mystery-box opening E unavailable');
      if(typeof frame?.add!=='function'||typeof frame?.stage!=='function'||typeof target!=='string'||!target||!planned||
         viewport?.kind!=='main'||viewport.pixelWidth!==planned.pixelWidth||viewport.pixelHeight!==planned.pixelHeight)
        throw new TypeError('Mystery-box opening E needs current shared frame, target and plan');
      const i=indices.get(frame)||0;const {uniform,bindGroup}=slot(i);device.queue.writeBuffer(uniform,0,pack(planned));
      frame.stage(`world:mystery-box-opening-e:${planned.effectId}`);
      frame.add({target,label:`DVA mystery-box opening E ${planned.effectId}`,encode(pass,info){
        if(info.device!==device||info.format!==format||info.width!==viewport.pixelWidth||info.height!==viewport.pixelHeight)
          throw new Error('Mystery-box opening E target device, format or backing size mismatch');
        pass.setPipeline(pipeline);pass.setBindGroup(0,bindGroup);pass.draw(3);
      }});
      indices.set(frame,i+1);
      return Object.freeze({effectId:planned.effectId,drawn:true,recorded:true});
    }
    return Object.freeze({plan,record,shader,get state(){return destroyed?'destroyed':frameOwner.state;},destroy(){if(destroyed)return;destroyed=true;
      for(const s of slots)if(frameOwner.release(s.uniform))s.uniform.destroy();slots.length=0;}});
  }
  const api=Object.freeze({TYPE,DURATION,shader,plan,planBatch,pack,create,normalizeEffectStartTime});
  root.DvaWebGPUMysteryBoxRevealE=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:window);
