/* Heal receiving scintillation. 十字光条多数でキラキラ演出。
 * Adopted source remains immutable; each glint belongs to its arriving ribbon crest.
 * OBS diffraction is screen-axis aligned, finite, and split at the source depth. */
(function(root){
 'use strict';
 const clamp=x=>Math.max(0,Math.min(1,x));
 const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
 const pulse=(t,birth,duration)=>t<birth||t>birth+duration?0:Math.pow(Math.sin(Math.PI*(t-birth)/duration),1.7);
 function anchors(planned){
  if(!planned)return [];
  const g=root.DvaHealAstraE.geometry(planned),p=planned.phase,out=[];
  const sample=(u,lane)=>{const j=Math.min(63,Math.floor(u*64))*6+lane*384;return {x:(g[j*8]+g[(j+1)*8])/2,y:(g[j*8+1]+g[(j+1)*8+1])/2,z:g[j*8+4]};};
  // A travelling broad crest lights registered sites; no independent drifting particles.
  for(let lane=0;lane<2;lane++)for(let i=0;i<11;i++){
   const u=.045+i*.091;
   const birth=.06+u*.87+lane*.075;
   let strength=pulse(p.wall,birth,.38);
   if(p.wall>1.15&&p.wall<10.4){
    const cycle=(Math.max(0,p.actor-2.07)*(planned.reducedMotion?.075:.16)+.47*lane)%1;
    const delta=Math.min(Math.abs(u-cycle),1-Math.abs(u-cycle));
    strength=Math.max(strength,Math.pow(clamp(1-delta/.11),1.4)*.64*smooth(1.15,1.6,p.wall));
   }
   const closeBirth=10.45+u*1.12+lane*.06;
   strength=Math.max(strength,pulse(p.wall,closeBirth,.29)*.8);
   strength*=p.source;
   if(strength>.003){const a=sample(u,lane);out.push({...a,strength,radius:(5.4+2.0*(i%3===1))*planned.zoom,kind:0});}
  }
  // The receiving catch comes after the initial crest reaches the chest.
  for(const [i,x,y] of [[0,-9,-20],[1,8,-13],[2,-3,-29]]){
   const strength=Math.max(pulse(p.wall,.83+i*.075,.47),pulse(p.wall,11.55+i*.055,.31)*.8)*p.source;
   if(strength>.003)out.push({x:planned.origin.x+x*planned.zoom,y:planned.origin.y+y*planned.zoom,z:3,strength,radius:(i===0?8.8:6.9)*planned.zoom,kind:1});
  }
  return out;
 }
 const shader=`
 struct F { screen:vec4f }; @group(0) @binding(0) var<uniform> f:F;
 struct O {@builtin(position) pos:vec4f,@location(0) uv:vec2f,@location(1) data:vec3f};
 @vertex fn vs(@location(0) xy:vec2f,@location(1) uv:vec2f,@location(2) data:vec4f)->O {
  var o:O;o.pos=vec4f(xy.x/f.screen.x*2.-1.,1.-xy.y/f.screen.y*2.,0.,1.);o.uv=uv;o.data=data.xyz;return o;
 }
 @fragment fn fs(o:O)->@location(0) vec4f {
  if((f.screen.z<.5 && o.data.x>=0.) || (f.screen.z>=.5 && o.data.x<0.)){discard;}
  let q=abs(o.uv);let a=o.data.y;
  // Tapered cardinal rays, not X-shapes or circular billboards. Narrow waist stays readable at H64.
  let vertical=(1.-smoothstep(.015,.085*(1.-q.y)+.015,q.x))*pow(max(0.,1.-q.y),.65);
  let horizontal=(1.-smoothstep(.012,.075*(1.-q.x)+.012,q.y))*pow(max(0.,1.-q.x),.8);
  let core=exp(-dot(o.uv,o.uv)/.013);
  let scatter=exp(-dot(o.uv,o.uv)/.10)*.16;
  let rays=max(vertical,horizontal);
  let gate=1.-smoothstep(.86,1.,max(q.x,q.y));
  let coverage=(rays*.65+core*.18+scatter*.12)*a*gate;
  let green=vec3f(.22,.90,.55);let pearl=vec3f(1.,.98,.72);
  let rgb=green*coverage+mix(green,pearl,clamp(core+rays*.82,0.,1.))*(rays*.96+core*.78+scatter)*a*gate;
  return vec4f(rgb,coverage);
 }`;
 function create({renderer}){
  const d=renderer.device,m=d.createShaderModule({label:'Heal source-bound crosses',code:shader});let pipeline,dead=false;
  const readiness={compilationErrors:[],warnings:[],pipeline:false};const slots=new Map();
  const ready=(async()=>{const info=await m.getCompilationInfo();readiness.compilationErrors=info.messages.filter(x=>x.type==='error').map(x=>x.message);readiness.warnings=info.messages.filter(x=>x.type==='warning').map(x=>x.message);if(readiness.compilationErrors.length)throw Error(readiness.compilationErrors.join('\n'));
   pipeline=await d.createRenderPipelineAsync({layout:'auto',vertex:{module:m,entryPoint:'vs',buffers:[{arrayStride:32,attributes:[{shaderLocation:0,offset:0,format:'float32x2'},{shaderLocation:1,offset:8,format:'float32x2'},{shaderLocation:2,offset:16,format:'float32x4'}]}]},fragment:{module:m,entryPoint:'fs',targets:[{format:renderer.format,blend:{color:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'},alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'}}}]},primitive:{topology:'triangle-list'}});readiness.pipeline=true;})();
  function record({frame,target,planned,side}){
   if(dead)throw Error('Sparkle pass disposed');if(!pipeline)throw Error('Await sparkle ready');if(!planned)return {drawn:false,count:0};if(!['back','front'].includes(side))throw TypeError('Invalid side');
   let s=slots.get(planned.id);if(!s){s={vertex:renderer.own(d.createBuffer({size:25*6*32,usage:GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST})),uniforms:[0,1].map(()=>renderer.own(d.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST})))};s.groups=s.uniforms.map(buffer=>d.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer}}]}));slots.set(planned.id,s);}
   if(s.last!==planned){const points=anchors(planned),data=[];for(const a of points)for(const [x,y] of [[-1,-1],[1,-1],[-1,1],[-1,1],[1,-1],[1,1]])data.push(a.x+x*a.radius,a.y+y*a.radius,x,y,a.z,a.strength,a.kind,0);s.count=points.length;s.vertices=data.length/8;if(data.length)d.queue.writeBuffer(s.vertex,0,new Float32Array(data));s.last=planned;}
   const i=side==='front'?1:0;d.queue.writeBuffer(s.uniforms[i],0,new Float32Array([planned.viewport.width,planned.viewport.height,i,0]));if(s.vertices)frame.add({target,label:'Heal cross '+side,encode(pass){pass.setPipeline(pipeline);pass.setBindGroup(0,s.groups[i]);pass.setVertexBuffer(0,s.vertex);pass.draw(s.vertices);}});return {drawn:s.vertices>0,count:s.count};
  }
  function release(id){const s=slots.get(id);if(!s)return false;for(const r of [s.vertex,...s.uniforms]){renderer.release(r);r.destroy();}slots.delete(id);return true;}
  return {ready,readiness,record,release,destroy(){if(dead)return;dead=true;for(const id of [...slots.keys()])release(id);}};
 }
 const api={anchors,create,shader};root.DvaHealSparkle=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
