// GPT-6.1-Sol R3 draft: gap-free normalized 5x5 binomial point spread.
struct Out { @location(0) color:vec4f };
@group(0) @binding(0) var scene:texture_2d<f32>;
@group(0) @binding(1) var emission:texture_2d<f32>;
struct Observer { enabled:f32, _pad0:f32, _pad1:f32, _pad2:f32 };
@group(0) @binding(2) var<uniform> observer:Observer;
struct V { @builtin(position) position:vec4f };
@vertex fn vertex(@builtin(vertex_index) i:u32)->V {
  let p=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));
  var o:V; o.position=vec4f(p[i],0.,1.); return o;
}
fn encodeSRGB(linear:vec3f)->vec3f {
  return select(1.055*pow(max(linear,vec3f(0.)),vec3f(1./2.4))-.055,
    12.92*linear,linear<=vec3f(.0031308));
}
@fragment fn fragment(input:V)->Out {
  let dims=vec2i(textureDimensions(scene));
  let p=clamp(vec2i(input.position.xy),vec2i(0),dims-vec2i(1));
  let s=textureLoad(scene,p,0);
  let weights=array<f32,5>(1.,4.,6.,4.,1.);
  var spread=vec3f(0.);
  for(var y=0u;y<5u;y++) {
    for(var x=0u;x<5u;x++) {
      let q=clamp(p+vec2i(i32(x)-2,i32(y)-2),vec2i(0),dims-vec2i(1));
      spread+=textureLoad(emission,q,0).rgb*(weights[x]*weights[y]/256.);
    }
  }
  let bloom=spread*(.16*clamp(observer.enabled,0.,1.));
  let background=vec3f(.012,.02,.03);
  let radiance=background*(1.-s.a)+s.rgb+bloom;
  let mapped=radiance/(vec3f(1.)+radiance);
  var o:Out; o.color=vec4f(encodeSRGB(mapped),1.); return o;
}
