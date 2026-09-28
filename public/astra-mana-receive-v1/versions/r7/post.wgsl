struct Config {size:vec2f,scale:f32,count:f32,guide:f32,obs:f32,pad:vec2f}
@group(0) @binding(0) var<uniform> c:Config;
@group(0) @binding(1) var scene:texture_2d<f32>;
@group(0) @binding(2) var light:texture_2d<f32>;
struct Effect { anchors:vec4f, timing:vec4f }
@group(0) @binding(3) var<storage,read> effects:array<Effect>;
struct VOut {@builtin(position) position:vec4f}
@vertex fn vs(@builtin(vertex_index) i:u32)->VOut {let p=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));var o:VOut;o.position=vec4f(p[i],0,1);return o;}
fn sampleLight(p:vec2i)->vec3f{return textureLoad(light,clamp(p,vec2i(0),vec2i(c.size)-1),0).rgb;}
fn srgb(v:vec3f)->vec3f{return select(v*12.92,1.055*pow(max(v,vec3f(0)),vec3f(1./2.4))-.055,v>vec3f(.0031308));}
@fragment fn fs(i:VOut)->@location(0) vec4f {
  let p=vec2i(i.position.xy);let base=textureLoad(scene,p,0).rgb;let direct=sampleLight(p);
  let right=i.position.x/c.size.x>=.5;let panel=select(.25,.75,right);
  let world=vec2f(i.position.x-panel*c.size.x,i.position.y-.53*c.size.y)/c.scale+vec2f(0,-27);
  var near=false;
  for(var j=0u;j<u32(c.count);j++){
    let e=effects[j];let src=e.anchors.xy;let dst=e.anchors.zw-vec2f(0,30);
    near=near || (all(world>=min(src,dst)-vec2f(35.,47.)) && all(world<=max(src,dst)+vec2f(35.,32.)));
  }
  if(!near){return vec4f(srgb(base),1.);}
  var bloom=vec3f(0.);
  if(c.obs>.5){
    // OBS1: finite, source-derived light spread in linear working space.
    // Radius tracks H64 scale; no luminance/background-adaptive correction.
    for(var y=-2;y<=2;y++){for(var x=-2;x<=2;x++){
      let w=exp(-f32(x*x+y*y)*.48);
      bloom+=sampleLight(p+vec2i(vec2f(f32(x),f32(y))*c.scale*2.1))*w*.083;
    }}
  }
  return vec4f(srgb(base+direct+bloom*.63),1.);
}
