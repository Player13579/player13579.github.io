
@group(0) @binding(0) var scene:texture_2d<f32>;
@group(0) @binding(1) var opticalSource:texture_2d<f32>;
@group(0) @binding(2) var linearSource:sampler;
struct Observation { gains:vec4f, geometry:vec4f, route:vec4f } // near/far/streak/intensity; width/height/sourceOn/obsOn; axisXY/alive/reserved
@group(0) @binding(3) var<uniform> observer:Observation;
struct V { @builtin(position) position:vec4f }
@vertex fn vs(@builtin(vertex_index) i:u32)->V {let a=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));var v:V;v.position=vec4f(a[i],0,1);return v;}
fn sourceAt(logicalPixel:vec2f)->vec4f {
 let uv=logicalPixel/vec2f(320.,160.);
 if(any(uv<vec2f(0)) || any(uv>vec2f(1))){return vec4f(0);}
 return max(textureSampleLevel(opticalSource,linearSource,uv,0.),vec4f(0));
}
@fragment fn fs(v:V)->@location(0)vec4f {
 let c=textureLoad(scene,vec2i(v.position.xy),0);let q=v.position.xy/observer.geometry.xy*vec2f(320.,160.);var scatter=vec3f(0);
 let observerActive=observer.geometry.z*observer.geometry.w*observer.route.z*observer.gains.w;
 if(observerActive>0.){
  let directions=array<vec2f,9>(vec2f(0),vec2f(1,0),vec2f(-1,0),vec2f(0,1),vec2f(0,-1),vec2f(1,1),vec2f(-1,1),vec2f(1,-1),vec2f(-1,-1));
  let nearWeights=array<f32,9>(.25,.125,.125,.125,.125,.0625,.0625,.0625,.0625);
  var near=vec3f(0);for(var i=0u;i<9u;i++){near+=sourceAt(q+directions[i]*1.6).rgb*nearWeights[i];}
  var far=vec3f(0);for(var i=0u;i<5u;i++){far+=sourceAt(q+directions[i]*4.).rgb*select(.15,.40,i==0u);}
  // Smooth, nonnegative broadband diffraction-envelope approximation.
  // The numerical support is apodized; there are no filled ray polygons or hard arm endpoints.
  var ray=0.;var norm=0.;
  for(var i=0u;i<65u;i++){
   let offset=(f32(i)-32.)*.75;let r=abs(offset);
   let z=clamp((r-20.)/4.,0.,1.);let weight=(1.-z*z*(3.-2.*z))/(1.+pow(offset/5.,2.));
   ray+=(sourceAt(q+vec2f(offset,0.)).a+sourceAt(q+vec2f(0.,offset)).a)*weight*.5;
   norm+=weight;
  }
  scatter=(near*observer.gains.x+far*observer.gains.y+ray/norm*vec3f(42.,32.,12.)*observer.gains.z)*observerActive;
 } else {
  // OBS-off diagnostic keeps the compact source's entire direct energy.
  // Source-off and expiry do not acquire energy from an independent procedural star.
  scatter=sourceAt(q).a*vec3f(42.,32.,12.)*.18*observer.geometry.z*observer.route.z;

 }
 // R2 working RGB and exposure retained; tone mapping occurs exactly once after OBS.
 let rgb=1.-exp(-max(c.rgb+scatter,vec3f(0)));let alpha=max(c.a,max(rgb.r,max(rgb.g,rgb.b)));
 return vec4f(rgb,alpha);
}