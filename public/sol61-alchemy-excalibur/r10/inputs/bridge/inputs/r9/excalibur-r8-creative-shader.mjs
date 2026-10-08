export const WORLD_WGSL=/*wgsl*/`
struct U {view:vec4f,blade:vec4f,stage:vec4f,inv:vec4f,atlas:vec4f,sourceBlade:vec4f,widths:vec4f,release:vec4f,releasedBlade:vec4f,releaseMeta:vec4f,lens:vec4f,controls:vec4f,mainCrop:vec4f,patchCrop:vec4f};
@group(0) @binding(0) var<uniform> u:U;
@group(0) @binding(1) var atlasTexture:texture_2d<f32>;
@group(0) @binding(2) var linearSampler:sampler;
struct V{@builtin(position)position:vec4f};
@vertex fn vs(@builtin(vertex_index)i:u32)->V{let p=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));var o:V;o.position=vec4f(p[i],0.,1.);return o;}
fn capsule(p:vec2f,a:vec2f,b:vec2f)->f32{let d=b-a;let t=clamp(dot(p-a,d)/max(dot(d,d),.0001),0.,1.);return length(p-a-d*t);}
fn taper(p:vec2f,a:vec2f,b:vec2f,w:f32)->f32{let d=b-a;let len=max(length(d),.01);let axis=d/len;let q=p-a;let t=dot(q,axis)/len;let halfWidth=w*(1.-clamp(t,0.,1.));return max(abs(dot(q,vec2f(-axis.y,axis.x)))-halfWidth,max(-t*len,(t-1.)*len));}
fn inCrop(p:vec2f,c:vec4f)->bool{return c.z>0.&&c.w>0.&&all(p>=c.xy)&&all(p<c.xy+c.zw);}
struct F{@location(0)main:vec4f,@location(1)radiance:vec4f};
@fragment fn fs(v:V)->F{
 var out:F;out.main=vec4f(0.);out.radiance=vec4f(0.);
 if(u.controls.w<.5||u.controls.x<.5||u.stage.z<.5||u.view.z<0.||u.view.z>=u.view.w){return out;}
 let px=v.position.xy;let gold=vec3f(2.8,1.5,.20);var light=0.;var support=0.;
 if(u.stage.y>.5){
  let root=u.blade.xy;let tip=u.blade.zw;let axis=tip-root;let len=max(length(axis),1.);let normal=vec2f(-axis.y,axis.x)/len;let p=u.stage.x;
  let source=vec2f(u.inv.x*px.x+u.inv.z*px.y+u.atlas.x,u.inv.y*px.x+u.inv.w*px.y+u.atlas.y);
  let uv=source/u.atlas.zw;var alpha=0.;if((inCrop(source,u.mainCrop)||inCrop(source,u.patchCrop))&&all(uv>=vec2f(0.))&&all(uv<=vec2f(1.))){alpha=textureSampleLevel(atlasTexture,linearSampler,uv,0.).a;}
  // The tapered metal region is provisional calibrated source geometry;
  // actual atlas alpha additionally removes transparent RGB/background.
  let sd=taper(source,u.sourceBlade.xy,u.sourceBlade.zw,u.widths.x);
  let inside=(1.-smoothstep(-1.,1.,sd))*alpha;
  let edge=exp(-pow(abs(sd)/1.7,2.))*inside;
  let charged=smoothstep(.07,.21,p);
  let cut=smoothstep(.30,.43,p)*(1.-smoothstep(.57,.90,p));
  light+=edge*(1.8*charged+5.2*cut)+inside*.20*charged;
  support=max(support,edge*.9+inside*.12*charged);
  let gather=smoothstep(.015,.06,p)*(1.-smoothstep(.26,.35,p));
  let progress=smoothstep(.02,.28,p);
  for(var i=0u;i<14u;i++){
   let fi=f32(i);let landing=mix(root,tip,.05+.88*(fi+.5)/14.);
   let side=select(-1.,1.,i%2u==0u);let angle=fi*2.399963;
   let start=landing+normal*(side*len*(.30+.10*sin(angle)))+axis*(.25*cos(angle));
   // Luminous guided packets follow current actual blade support, not a
   // simulated free sword or inferred angular velocity from pose jumps.
   let mote=mix(start,landing,progress)+normal*side*len*.10*sin(progress*3.14159265)*(1.-progress);
   let radius=max(.78*u.widths.y,len*.018);let r=length(px-mote)/radius;
   let core=exp(-r*r*1.5)*gather;
   light+=core*(1.1+.5*progress);support=max(support,core*.8);
  }
 }
 if(u.widths.w>.5&&u.view.z>=u.releaseMeta.x){
  let available=max(.001,u.releaseMeta.y-u.releaseMeta.x);
  let n=clamp((u.view.z-u.releaseMeta.x)/available,0.,1.);
  let travel=u.release.zw-u.release.xy;let advance=travel*smoothstep(0.,1.,n);
  let a=u.releasedBlade.xy+advance;let b=u.releasedBlade.zw+advance;
  let bladeLength=max(length(b-a),4.*u.widths.y);
  let width=max(1.15*u.widths.y,bladeLength*.055);
  let front=exp(-pow(capsule(px,a,b)/width,2.));
  let impulse=smoothstep(0.,.07,n)*pow(1.-n,1.65);
  // One emitted sheet carries the actual release-time blade support to the
  // collision-resolved endpoint; no continuing idle-hand emitter exists.
  light+=front*12.*impulse;support=max(support,front*.9*impulse);
  let behind=advance-travel*min(n,.08);
  let wake=exp(-pow(capsule(px,u.releasedBlade.xy+behind,u.releasedBlade.zw+behind)/(width*2.1),2.));
  light+=wake*1.1*impulse;support=max(support,wake*.20*impulse);
 }
 let alpha=1.-exp(-support*1.5);let rgb=gold*light;
 out.main=vec4f(rgb,alpha);out.radiance=vec4f(rgb,1.);return out;
}`;

export const OBSERVER_WGSL=/*wgsl*/`
struct U {view:vec4f,blade:vec4f,stage:vec4f,inv:vec4f,atlas:vec4f,sourceBlade:vec4f,widths:vec4f,release:vec4f,releasedBlade:vec4f,releaseMeta:vec4f,lens:vec4f,controls:vec4f,mainCrop:vec4f,patchCrop:vec4f};
@group(0) @binding(0) var<uniform> u:U;
@group(0) @binding(1) var mainTexture:texture_2d<f32>;
@group(0) @binding(2) var sourceTexture:texture_2d<f32>;
@group(0) @binding(3) var linearSampler:sampler;
struct V{@builtin(position)position:vec4f};
@vertex fn vs(@builtin(vertex_index)i:u32)->V{let p=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));var o:V;o.position=vec4f(p[i],0.,1.);return o;}
fn sourceAt(px:vec2f)->vec3f{let uv=px/u.view.xy;if(any(uv<vec2f(0.))||any(uv>vec2f(1.))){return vec3f(0.);}return textureSampleLevel(sourceTexture,linearSampler,uv,0.).rgb;}
fn psf(px:vec2f,r:f32)->vec3f{let offsets=array<vec2f,9>(vec2f(-1.,-1.),vec2f(0.,-1.),vec2f(1.,-1.),vec2f(-1.,0.),vec2f(0.),vec2f(1.,0.),vec2f(-1.,1.),vec2f(0.,1.),vec2f(1.,1.));let weights=array<f32,9>(1.,2.,1.,2.,4.,2.,1.,2.,1.);var value=vec3f(0.);for(var i=0u;i<9u;i++){value+=sourceAt(px+offsets[i]*r)*weights[i]/16.;}return value;}
@fragment fn fs(v:V)->@location(0)vec4f{
 if(u.controls.w<.5||u.controls.x<.5||u.stage.z<.5||u.view.z<0.||u.view.z>=u.view.w){return vec4f(0.);}
 let px=v.position.xy;let main=textureSampleLevel(mainTexture,linearSampler,px/u.view.xy,0.);
 var halo=vec3f(0.);var ghost=vec3f(0.);
 if(u.stage.w>.5){
  halo=psf(px,u.lens.z)*.28+psf(px,u.lens.z*2.8)*.10;
  // One declared parasitic optical image: C-.38*(S-C). It samples actual
  // current source radiance, including its extended shape, not a symbol or
  // a CPU-invented flux. The inverse mapping follows the source/optical axis.
  let sourceCoordinate=u.lens.xy+(u.lens.xy-px)/.38;
  ghost=psf(sourceCoordinate,u.lens.z*2.5)*u.lens.w*vec3f(.85,1.,.75);
 }
 let optical=halo+ghost;let opticalAlpha=1.-exp(-dot(optical,vec3f(.2126,.7152,.0722)));
 let alpha=main.a+(1.-main.a)*opticalAlpha;
 // Linear HDR premultiplied emission. The existing shared display/composite
 // encodes once; do not put another sRGB transform in this effect module.
 return vec4f(main.rgb+optical,alpha);
}`;
