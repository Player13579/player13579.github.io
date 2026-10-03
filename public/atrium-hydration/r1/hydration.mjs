// GPT-6.1-Sol. New hydration material; no inherited facility E.
export const calibration=Object.freeze({sourceSha:'1d1618121e269801abe037f32ab873eb18394c7b6f4fbcffdb169dec55fec34f',sourceSize:[4800,3400],objectId:'v302-atrium-hydration-2',anchor:[2838,1314],tray:[[2856,1184],[2912,1184],[2912,1325],[2856,1325]],waterCenter:[2885,1303],waterRadii:[24,17],status:'preview-calibration-not-game-geometry'});
export function timeline(age){if(!Number.isFinite(age)||age<0)throw new TypeError('Finite nonnegative E age required');if(age>=2200)return {envelope:0,emission:0,expired:true};const ramp=(a,b,x)=>{let q=Math.max(0,Math.min(1,(x-a)/(b-a)));return q*q*(3-2*q)};let envelope=ramp(0,240,age)*(1-ramp(1550,2200,age));return {envelope,emission:envelope*(.38+.82*Math.exp(-(((age-600)/220)**2))+.40*Math.exp(-(((age-1060)/180)**2))),expired:false};}
export const SCENE_WGSL=`
struct U{bounds:vec4f,control:vec4f,visibility:vec4f};
@group(0) @binding(0)var image:texture_2d<f32>;
@group(0) @binding(1)var smp:sampler;
@group(0) @binding(2)var<uniform>u:U;
struct V{@builtin(position)p:vec4f,@location(0)uv:vec2f};
@vertex fn vs(@builtin(vertex_index)i:u32)->V{let q=vec2f(f32((i<<1u)&2u),f32(i&2u));var o:V;o.p=vec4f(q*vec2f(2,-2)+vec2f(-1,1),0,1);o.uv=q;return o;}
fn env(t:f32)->f32{return smoothstep(0,240,t)*(1-smoothstep(1550,2200,t));}
fn glow(t:f32)->f32{return env(t)*(.38+.82*exp(-pow((t-600)/220,2))+.40*exp(-pow((t-1060)/180,2)));}
fn lens(p:vec2f,t:f32)->f32{let growth=mix(.18,1.,smoothstep(0,520,t));let r=(p-vec2f(2885,1303))/vec2f(24,17)/growth;return (1-smoothstep(.84,1.,length(r)))*env(t);}
@fragment fn fs(v:V)->@location(0)vec4f{
 let p=u.bounds.xy+v.uv*u.bounds.zw;let t=u.control.x;let e=env(t);let w=lens(p,t);let r=(p-vec2f(2885,1303))/vec2f(24,17);let rad=length(r);
 // Two broad wavefronts travel across the finite water lens; no texture/noise carpet.
 let wave=sin(rad*10-t*.010+sin(r.y*2.2)*.55);let uv=p/vec2f(4800,3400);let refractOffset=normalize(r+vec2f(.0001))*wave*w*1.8/vec2f(4800,3400);
 var color=textureSample(image,smp,uv+refractOffset).rgb;
 let rim=exp(-pow((rad-.82)/.10,2))*w;let crest=pow(max(0.,wave),7)*w;
 let source=u.control.y*glow(t)*u.visibility.x;
 color=mix(color,color*vec3f(.83,.98,1.06)+vec3f(.015,.035,.042),w*.43);
 color+=vec3f(.72,.93,1.)*source*(rim*.9+crest*.48);
 // Clean water gathers into two finite droplets, rises and returns to the same dish.
 for(var i=0;i<2;i++){let birth=340.+f32(i)*280.;let q=clamp((t-birth)/600.,0.,1.);let height=sin(q*3.14159265)*16.;let center=vec2f(2878.+f32(i)*15.,1298.-height);let d=(p-center)/vec2f(2.5,4.0);let drop=(1-smoothstep(.70,1.,length(d)))*select(0.,1.,t>=birth&&t<birth+600.);color=mix(color,color*.67+vec3f(.16,.28,.33),drop*.6);color+=vec3f(.72,.93,1.)*source*drop*.72;}
 let tableMask=smoothstep(2846.,2853.,p.x)*(1-smoothstep(2920.,2928.,p.x))*smoothstep(1265.,1273.,p.y)*(1-smoothstep(1340.,1347.,p.y));
 let received=exp(-length((p-vec2f(2885,1303))/vec2f(40,30))*2.4)*tableMask;
 color+=vec3f(.08,.12,.14)*received*source*u.control.z;
 return vec4f(color,1);
}`;
export const OBS_WGSL=`
struct U{bounds:vec4f,control:vec4f,visibility:vec4f};
@group(0) @binding(0)var scene:texture_2d<f32>;
@group(0) @binding(1)var smp:sampler;
@group(0) @binding(2)var<uniform>u:U;
struct V{@builtin(position)p:vec4f,@location(0)uv:vec2f};
@vertex fn vs(@builtin(vertex_index)i:u32)->V{let q=vec2f(f32((i<<1u)&2u),f32(i&2u));var o:V;o.p=vec4f(q*vec2f(2,-2)+vec2f(-1,1),0,1);o.uv=q;return o;}
fn emit(p:vec2f)->f32{let t=u.control.x;let e=smoothstep(0,240,t)*(1-smoothstep(1550,2200,t));let g=e*(.38+.82*exp(-pow((t-600)/220,2))+.40*exp(-pow((t-1060)/180,2)));let r=length((p-vec2f(2885,1303))/vec2f(24,17)/mix(.18,1.,smoothstep(0,520,t)));return exp(-pow((r-.82)/.10,2))*g*u.control.y*u.visibility.x;}
@fragment fn fs(v:V)->@location(0)vec4f{let p=u.bounds.xy+v.uv*u.bounds.zw;var c=textureSample(scene,smp,v.uv).rgb;var halo=0.;let step=vec2f(4,4);for(var j=-1;j<=1;j++){for(var i=-1;i<=1;i++){let weight=select(1.,2.,i==0&&j==0);halo+=emit(p+vec2f(f32(i),f32(j))*step)*weight/10.;}}c+=vec3f(.72,.93,1.)*halo*.20*u.control.w;return vec4f(c/(vec3f(1)+max(c-vec3f(1),vec3f(0))*.16),1);}
`;
export async function createHydrationE({device,format,originalTexture}){
 if(!device||!originalTexture)throw new TypeError('Caller-owned shared device and exact original texture required');
 const sampler=device.createSampler({minFilter:'linear',magFilter:'linear'});const uniform=device.createBuffer({size:48,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
 async function pipeline(code,target){const module=device.createShaderModule({code});const info=await module.getCompilationInfo();if(info.messages.some(m=>m.type==='error'))throw new Error(info.messages.map(m=>m.message).join('\n'));return device.createRenderPipelineAsync({layout:'auto',vertex:{module,entryPoint:'vs'},fragment:{module,entryPoint:'fs',targets:[{format:target}]},primitive:{topology:'triangle-list'}});}
 let scenePipeline,postPipeline;
 try{scenePipeline=await pipeline(SCENE_WGSL,'rgba16float');postPipeline=await pipeline(OBS_WGSL,format);}
 catch(error){try{uniform.destroy();}catch{}throw error;}
 let hdr=null,extent='',destroyed=false;
 return {record({encoder,targetView,width,height,bounds,ageMs,source=true,receiver=true,observer=true,transmission,frameToken,isCurrent}){
 if(destroyed)throw new Error('Hydration destroyed');timeline(ageMs);if(!Number.isFinite(transmission)||transmission<0||transmission>1||!frameToken||typeof isCurrent!=='function'||!isCurrent(frameToken))throw new Error('Current visibility/frame lease required');
 if(!Array.isArray(bounds)||bounds.length!==4||!bounds.every(Number.isFinite)||bounds[2]<=0||bounds[3]<=0||!Number.isInteger(width)||!Number.isInteger(height)||width<=0||height<=0)throw new TypeError('Target geometry required');
 if(extent!==width+':'+height){hdr?.destroy();hdr=device.createTexture({size:[width,height],format:'rgba16float',usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING});extent=width+':'+height;}
 device.queue.writeBuffer(uniform,0,new Float32Array([...bounds,ageMs,source?1:0,receiver?1:0,observer?1:0,transmission,0,0,0]));
 const hv=hdr.createView();const bind=(pipe,view)=>device.createBindGroup({layout:pipe.getBindGroupLayout(0),entries:[{binding:0,resource:view},{binding:1,resource:sampler},{binding:2,resource:{buffer:uniform}}]});
 const draw=(pipe,view,input)=>{const pass=encoder.beginRenderPass({colorAttachments:[{view,loadOp:'clear',storeOp:'store',clearValue:{r:0,g:0,b:0,a:1}}]});pass.setPipeline(pipe);pass.setBindGroup(0,bind(pipe,input));pass.draw(3);pass.end();};
 draw(scenePipeline,hv,originalTexture.createView());draw(postPipeline,targetView,hv);return {passes:2,ageMs,expired:ageMs>=2200,frameToken};
 },destroy(){if(!destroyed){destroyed=true;hdr?.destroy();uniform.destroy();}}};
}
