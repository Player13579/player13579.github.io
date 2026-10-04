
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
  let offsets=array<f32,9>(-18.,-12.,-8.,-4.,0.,4.,8.,12.,18.);let weights=array<f32,9>(.04,.07,.11,.15,.26,.15,.11,.07,.04);
  var contact=0.;for(var i=0u;i<9u;i++){contact+=sourceAt(q+observer.route.xy*offsets[i]).a*weights[i];}
  scatter=(near*observer.gains.x+far*observer.gains.y+contact*vec3f(3.,1.8,.35)*observer.gains.z)*observerActive;
 }
 // R2 working RGB and exposure retained; tone mapping occurs exactly once after OBS.
 let rgb=1.-exp(-max(c.rgb+scatter,vec3f(0)));let alpha=max(c.a,max(rgb.r,max(rgb.g,rgb.b)));
 return vec4f(rgb,alpha);
}
