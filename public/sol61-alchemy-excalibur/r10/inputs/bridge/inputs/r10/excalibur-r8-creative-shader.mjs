// Final R10 creative edition. Uniform/attachment ABI is the original 56 floats.
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
fn ease(x:f32)->f32{let t=clamp(x,0.,1.);return t*t*t*(t*(t*6.-15.)+10.);}
fn guided(start:vec2f,end:vec2f,normal:vec2f,bend:f32,t:f32)->vec2f{return mix(start,end,t)+normal*bend*sin(t*3.14159265)*(1.-t);}
struct F{@location(0)main:vec4f,@location(1)radiance:vec4f};
@fragment fn fs(v:V)->F{
 var out:F;out.main=vec4f(0.);out.radiance=vec4f(0.);
 if(u.controls.w<.5||u.controls.x<.5||u.stage.z<.5||u.view.z<0.||u.view.z>=u.view.w){return out;}
 let px=v.position.xy;let gold=vec3f(3.5,1.65,.16);var rgb=vec3f(0.);var support=0.;
 if(u.stage.y>.5){
  let root=u.blade.xy;let tip=u.blade.zw;let axis=tip-root;let len=max(length(axis),1.);let normal=vec2f(-axis.y,axis.x)/len;let p=u.stage.x;
  let source=vec2f(u.inv.x*px.x+u.inv.z*px.y+u.atlas.x,u.inv.y*px.x+u.inv.w*px.y+u.atlas.y);
  let uv=source/u.atlas.zw;var alpha=0.;if((inCrop(source,u.mainCrop)||inCrop(source,u.patchCrop))&&all(uv>=vec2f(0.))&&all(uv<=vec2f(1.))){alpha=textureSampleLevel(atlasTexture,linearSampler,uv,0.).a;}
  let sd=taper(source,u.sourceBlade.xy,u.sourceBlade.zw,u.widths.x);
  let inside=(1.-smoothstep(-1.,1.,sd))*alpha;
  let sourceAxis=normalize(u.sourceBlade.zw-u.sourceBlade.xy);
  let sourceNormal=vec2f(-sourceAxis.y,sourceAxis.x);
  let q=source-u.sourceBlade.xy;let axial=clamp(dot(q,sourceAxis)/max(length(u.sourceBlade.zw-u.sourceBlade.xy),.01),0.,1.);
  let lateral=dot(q,sourceNormal)/max(u.widths.x*(1.-axial),1.);
  // Analytic beveled conductor response, constrained to actual atlas alpha.
  // RGB Schlick is a gold-F0 approximation, not measured complex IOR.
  let roll=.22*sin(p*3.14159265)-.12;
  let facet=normalize(vec3f(sourceNormal*(.55*lateral+roll),1.));
  let lightDirection=normalize(vec3f(-.35,-.55,1.));
  let halfVector=normalize(lightDirection+vec3f(0.,0.,1.));
  let f0=vec3f(.98,.76,.30);
  let fresnel=f0+(vec3f(1.)-f0)*pow(1.-clamp(dot(facet,halfVector),0.,1.),5.);
  let specular=pow(max(dot(facet,halfVector),0.),26.)*max(dot(facet,lightDirection),0.);
  let charged=smoothstep(.04,.28,p)*(1.-smoothstep(.66,.96,p));
  let cut=smoothstep(.30,.43,p)*(1.-smoothstep(.60,.86,p));
  let edge=exp(-pow(abs(sd)/1.5,2.))*inside;
  let axialFront=exp(-pow((axial-(.08+.90*ease(p/.32)))/.16,2.));
  let spine=exp(-pow(lateral/.24,2.))*inside;
  rgb+=fresnel*specular*inside*(.35+.75*charged);
  rgb+=gold*(edge*(2.1*charged+7.0*cut)+spine*(.65*charged+2.3*cut)+inside*axialFront*1.35*charged);
  support=max(support,inside*(.14+.40*charged)+edge*.78+spine*.25*cut);
  // Six staggered arrivals with short curved wakes; no simultaneous dot ring.
  for(var i=0u;i<6u;i++){
   let fi=f32(i);let side=select(-1.,1.,i%2u==0u);
   let landing=mix(root,tip,.17+.70*(fi+.5)/6.);
   let start=landing+normal*side*len*(.24+.045*fi)+axis*(.09-.035*fi);
   let t=ease((p-(.015+.018*fi))/.20);
   let live=smoothstep(0.,.045,p-(.015+.018*fi))*(1.-smoothstep(.82,1.,t));
   let radius=max(1.05*u.widths.y,len*.023);
   let head=guided(start,landing,normal,side*len*.07,t);
   let prior=guided(start,landing,normal,side*len*.07,max(0.,t-.12));
   let prior2=guided(start,landing,normal,side*len*.07,max(0.,t-.24));
   let core=exp(-pow(length(px-head)/radius,2.)*1.3)*live;
   let thread=exp(-pow(capsule(px,prior,head)/(radius*.42),2.))*live;
   let tail=exp(-pow(capsule(px,prior2,prior)/(radius*.58),2.))*live;
   rgb+=gold*(core*2.8+thread*1.15+tail*.26);
   support=max(support,(core*.85+thread*.35+tail*.10));
  }
 }
 if(u.widths.w>.5&&u.view.z>=u.releaseMeta.x){
  let available=max(.001,u.releaseMeta.y-u.releaseMeta.x);
  let n=clamp((u.view.z-u.releaseMeta.x)/available,0.,1.);
  let travel=u.release.zw-u.release.xy;
  // Rapid launch followed by continued travel; endpoint is the real collision path.
  let position=1.-pow(1.-n,2.2);let advance=travel*position;
  let a=u.releasedBlade.xy+advance;let b=u.releasedBlade.zw+advance;
  let bladeLength=max(length(b-a),4.*u.widths.y);
  let width=max(1.2*u.widths.y,bladeLength*.060);
  let distance=capsule(px,a,b);
  let core=exp(-pow(distance/(width*.45),2.));
  let sheath=exp(-pow(distance/(width*1.8),2.));
  let impulse=smoothstep(0.,.025,n)*(1.-smoothstep(.72,1.,n));
  rgb+=gold*(core*17.+sheath*2.0)*impulse;
  support=max(support,(core*.96+sheath*.20)*impulse);
  let priorAdvance=travel*(1.-pow(1.-max(0.,n-.055),2.2));
  let wakeA=u.releasedBlade.xy+priorAdvance;let wakeB=u.releasedBlade.zw+priorAdvance;
  let wake=exp(-pow(capsule(px,wakeA,wakeB)/(width*2.7),2.));
  rgb+=gold*wake*.95*impulse;support=max(support,wake*.14*impulse);
 }
 let coverage=1.-exp(-support*1.5);
 out.main=vec4f(rgb,coverage);out.radiance=vec4f(rgb,1.);return out;
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
  // Sensor response is driven only by current HDR source radiance.
  halo=psf(px,u.lens.z)*.32+psf(px,u.lens.z*3.4)*.13;
  let sourceCoordinate=u.lens.xy+(u.lens.xy-px)/.38;
  ghost=psf(sourceCoordinate,u.lens.z*2.5)*u.lens.w*vec3f(.85,1.,.75);
 }
 let optical=halo+ghost;let opticalAlpha=1.-exp(-dot(optical,vec3f(.2126,.7152,.0722)));
 let coverage=main.a+(1.-main.a)*opticalAlpha;
 // Existing shared HDR composition/display encodes once, without extra sRGB.
 return vec4f(main.rgb+optical,coverage);
}`;
