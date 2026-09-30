// Host supplies its actual device/pass/targets, source-alpha and original actor surface.
export const worldWGSL=/*wgsl*/`
struct Frame{viewport:vec4f,sourceAge:vec4f,gates:vec4f,observer:vec4f,phase:vec4f,bounds:vec4f,owner:vec4f,reserved:vec4f};
@group(0) @binding(0) var<uniform> f:Frame;
@group(0) @binding(1) var foreground:texture_2d<f32>;
@group(0) @binding(2) var bodySurface:texture_2d<f32>;
struct VSOut{@builtin(position) position:vec4f,@location(0) pixel:vec2f};
@vertex fn quadVS(@builtin(vertex_index) idx:u32)->VSOut{
 let uv=array<vec2f,6>(vec2f(0.,0.),vec2f(1.,0.),vec2f(0.,1.),vec2f(0.,1.),vec2f(1.,0.),vec2f(1.,1.));
 let p=f.sourceAge.xy+mix(f.bounds.xy,f.bounds.zw,uv[idx])*f.viewport.z;
 var o:VSOut;o.position=vec4f(p/f.viewport.xy*vec2f(2.,-2.)+vec2f(-1.,1.),0.,1.);o.pixel=p;return o;
}
fn boxSdf(p:vec3f,b:vec3f)->f32{let q=abs(p)-b;return length(max(q,vec3f(0.)))+min(max(q.x,max(q.y,q.z)),0.);}
fn turn(p:vec3f,a:f32)->vec3f{return vec3f(cos(a)*p.x+sin(a)*p.y,-sin(a)*p.x+cos(a)*p.y,p.z);}
fn envelope(i:u32)->f32{let t=f.sourceAge.z;let start=f32(i)*.16;let endDelay=f32(i)*.045;return smoothstep(start,start+.16,t)*(1.-smoothstep(.9+endDelay,1.18,t));}
fn execute(i:u32)->f32{let a=.48+f32(i)*.14;return smoothstep(a,a+.035,f.sourceAge.z)*(1.-smoothstep(a+.14,a+.26,f.sourceAge.z));}
fn nodeCentre(i:u32)->vec3f{let a=f32(i)*2.094395102;return vec3f(.20+cos(a)*.27,-.50+sin(a)*.27,(f32(i)-1.)*.08);}
fn sourcePoint(i:u32)->vec3f{let a=f32(i)*2.094395102;return nodeCentre(i)+vec3f(cos(a)*.12+sin(a)*.17,sin(a)*.12-cos(a)*.17,.055);}
fn forkSdf(p:vec3f)->f32{
 let spine=boxSdf(p-vec3f(-.19,0.,0.),vec3f(.05,.26,.06));
 let branchA=boxSdf(p-vec3f(.025,-.17,0.),vec3f(.265,.05,.06));
 let branchB=boxSdf(p-vec3f(.025,.17,0.),vec3f(.265,.05,.06));
 return min(spine,min(branchA,branchB));
}
fn field(p:vec3f)->vec3f{
 var best=100.;var item=0.;var energy=0.;
 for(var j=0u;j<3u;j++){let e=envelope(j);let q=turn(p-nodeCentre(j),f32(j)*2.094395102);let d=forkSdf(q);let writeClip=q.y-(e*.65-.33);let v=max(d,writeClip);if(e>.00001&&v<best){best=v;item=f32(j);energy=execute(j);}}
 return vec3f(best,item,energy);
}
struct MRT{@location(0) material:vec4f,@location(1) radiance:vec4f,@location(2) signal:vec4f};
@fragment fn worldFS(v:VSOut)->MRT{
 var o:MRT;o.material=vec4f(0.);o.radiance=vec4f(0.);o.signal=vec4f(0.);
 if(f.sourceAge.w<.5||f.gates.x<=0.||f.gates.y<.5){return o;}
 let local=(v.pixel-f.sourceAge.xy)/f.viewport.z;
 let occ=textureLoad(foreground,vec2i(v.pixel),0).a;
 let transmission=(1.-occ)*f.gates.x;
 let z0=select(-.50,0.,f.phase.z>0.);let dz=.5/24.;
 var alpha=0.;var rgb=vec3f(0.);var light=vec3f(0.);var signal=vec3f(0.);
 for(var k=0u;k<24u;k++){
  let z=z0+(f32(k)+.5)*dz;let p=vec3f(local.x-.35*z,local.y+.24*z,z);let hit=field(p);
  let rho=1.-smoothstep(-.015,.012,hit.x);let a=1.-exp(-rho*1.8*dz);let remain=1.-alpha;
  let col=mix(vec3f(.03,.44,.60),vec3f(.13,.12,.54),clamp(z+.5,0.,1.));
  let rim=exp(-abs(hit.x)*150.);let emitted=(vec3f(.3,3.4,5.5)*rho+vec3f(14.,14.,12.)*rim*(.24+.76*hit.z))*dz;
  rgb+=remain*col*a;light+=remain*emitted;alpha+=remain*a;
  if(hit.y<.5){signal.r+=remain*emitted.g;}else if(hit.y<1.5){signal.g+=remain*emitted.g;}else{signal.b+=remain*emitted.g;}
 }
 o.material=vec4f(rgb*transmission,alpha*transmission);o.radiance=vec4f(light*transmission,0.);o.signal=vec4f(signal*transmission,0.);return o;
}
@fragment fn sparkleFS(v:VSOut)->MRT{
 var o:MRT;o.material=vec4f(0.);o.radiance=vec4f(0.);o.signal=vec4f(0.);
 if(f.sourceAge.w<.5||f.gates.x<=0.||f.gates.z<.5||f.phase.z<0.){return o;}
 let ax=vec2f(.601815023,-.798635510);let ay=vec2f(-ax.y,ax.x);var c=vec3f(0.);
 for(var i=0u;i<3u;i++){let n=sourcePoint(i);let S=f.sourceAge.xy+vec2f(n.x+.35*n.z,n.y-.24*n.z)*f.viewport.z;let d=(v.pixel-S)*(64./f.viewport.z);let u=dot(d,ax);let w=dot(d,ay);let shape=(exp(-u*u/12.-w*w/.42)+.72*exp(-w*w/7.-u*u/.42))*(1.-smoothstep(5.,6.,abs(u)))*(1.-smoothstep(3.,4.,abs(w)));c+=vec3f(14.,14.,12.)*shape*execute(i);}
 let occ=textureLoad(foreground,vec2i(v.pixel),0).a;o.radiance=vec4f(c*f.gates.x*(1.-occ),0.);return o;
}
@fragment fn receiverFS(v:VSOut)->MRT{
 var o:MRT;o.material=vec4f(0.);o.radiance=vec4f(0.);o.signal=vec4f(0.);
 if(f.sourceAge.w<.5||f.gates.x<=0.||f.gates.w<.5||f.phase.z<0.){return o;}
 let skin=textureLoad(bodySurface,vec2i(v.pixel),0);let p=(v.pixel-f.sourceAge.xy)/f.viewport.z;var incoming=vec3f(0.);
 for(var j=0u;j<3u;j++){let n=sourcePoint(j);let q=vec2f(n.x+.35*n.z,n.y-.24*n.z);incoming+=vec3f(.14,.62,.86)*envelope(j)*(.3+execute(j))/(1.+50.*dot(p-q,p-q));}
 o.radiance=vec4f(skin.rgb*skin.a*incoming*f.gates.x,0.);return o;
}
`;
export const observerWGSL=/*wgsl*/`
struct Frame{viewport:vec4f,sourceAge:vec4f,gates:vec4f,observer:vec4f,phase:vec4f,bounds:vec4f,owner:vec4f,reserved:vec4f};
@group(0) @binding(0) var<uniform> f:Frame;
@group(0) @binding(1) var emission:texture_2d<f32>;
@group(0) @binding(2) var signal:texture_2d<f32>;
@group(0) @binding(3) var smoothSampler:sampler;
@vertex fn fullVS(@builtin(vertex_index)i:u32)->@builtin(position)vec4f{let a=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));return vec4f(a[i],0.,1.);}
@fragment fn observeFS(@builtin(position)p:vec4f)->@location(0)vec4f{
 if(f.sourceAge.w<.5||f.gates.x<=0.){return vec4f(0.);}
 let k=f.viewport.z/64.;var nearLight=vec3f(0.);var weight=0.;
 for(var x=-2;x<=2;x++){for(var y=-2;y<=2;y++){let a=exp(-f32(x*x+y*y)/2.);nearLight+=textureSampleLevel(emission,smoothSampler,(p.xy+vec2f(f32(x),f32(y))*4.*k)/f.viewport.xy,0.).rgb*a;weight+=a;}}
 var lens=vec3f(0.);let axis=vec2f(.601815023,-.798635510);let other=vec2f(-axis.y,axis.x);
 for(var j=0u;j<3u;j++){let a=f32(j)*2.094395102;let n=vec3f(.20+cos(a)*.39+sin(a)*.17,-.50+sin(a)*.39-cos(a)*.17,(f32(j)-1.)*.08+.055);let S=f.sourceAge.xy+vec2f(n.x+.35*n.z,n.y-.24*n.z)*f.viewport.z;let C=f.observer.zw;let offset=S-C;let axisScale=1.+.45*abs(dot(offset/max(length(offset),.0001),axis));let d=(p.xy-S)/k;let u=dot(d,axis)/axisScale;let v=dot(d,other);let cross=(exp(-u*u/30.-v*v/.24)+.65*exp(-v*v/18.-u*u/.24))*(1.-smoothstep(8.,10.,abs(u)))*(1.-smoothstep(5.,7.,abs(v)));let visible=textureSampleLevel(signal,smoothSampler,S/f.viewport.xy,0.)[j];lens+=vec3f(1.05,1.05,1.)*cross*visible*.42;}
 return vec4f(nearLight/max(weight,.001)*.45*f.observer.x+lens*f.observer.y,0.);
}
`;
const additive={color:{srcFactor:'one',dstFactor:'one',operation:'add'},alpha:{srcFactor:'zero',dstFactor:'one',operation:'add'}};
const premult={color:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'},alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'}};
export function createKernel(device,{worldFormats,observerFormat}={}){
 if(worldFormats?.length!==3||worldFormats.some(x=>x!=='rgba16float')||observerFormat!=='rgba16float')throw Error('strict unsupported target contract');
 const world=device.createShaderModule({label:'vibe-r1-world',code:worldWGSL}),post=device.createShaderModule({label:'vibe-r1-observer',code:observerWGSL});
 const targets=worldFormats.map((format,i)=>({format,blend:i===0?premult:additive}));
 const worldBindings=device.createBindGroupLayout({entries:[{binding:0,visibility:3,buffer:{type:'uniform',minBindingSize:128}},{binding:1,visibility:2,texture:{sampleType:'unfilterable-float'}},{binding:2,visibility:2,texture:{sampleType:'unfilterable-float'}}]});
 const worldLayout=device.createPipelineLayout({bindGroupLayouts:[worldBindings]});
 const make=entry=>device.createRenderPipeline({label:'vibe-r1-'+entry,layout:worldLayout,vertex:{module:world,entryPoint:'quadVS'},fragment:{module:world,entryPoint:entry,targets},primitive:{topology:'triangle-list'}});
 const result={world:make('worldFS'),sparkle:make('sparkleFS'),receiver:make('receiverFS'),observer:device.createRenderPipeline({label:'vibe-r1-observer',layout:'auto',vertex:{module:post,entryPoint:'fullVS'},fragment:{module:post,entryPoint:'observeFS',targets:[{format:observerFormat,blend:additive}]},primitive:{topology:'triangle-list'}}),modules:[world,post]};
 return Object.freeze({...result,worldBindings});
}
export function recordWorld(pass,kernel,prepared,{kind='world',bindGroup}={}){
 if(prepared.status!=='prepared'||!prepared.live)return false;
 if(!['world','sparkle','receiver'].includes(kind)||!bindGroup)throw Error('strict unsupported binding');
 pass.setPipeline(kernel[kind]);pass.setBindGroup(0,bindGroup);pass.setScissorRect(...prepared.scissor);pass.draw(6,1);return true;
}
export function recordObserver(pass,kernel,prepared,{bindGroup}={}){
 if(prepared.status!=='prepared'||!prepared.live)return false;
 if(!bindGroup)throw Error('strict unsupported observer binding');
 pass.setPipeline(kernel.observer);pass.setBindGroup(0,bindGroup);pass.setScissorRect(...prepared.scissor);pass.draw(3,1);return true;
}
