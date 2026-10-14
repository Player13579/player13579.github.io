struct U { viewport: vec4f, endpoints: vec4f, state: vec4f, controls: vec4f }
@group(0) @binding(0) var<uniform> u: U;
@group(0) @binding(1) var light: texture_2d<f32>;
@group(0) @binding(2) var samp: sampler;
struct V { @builtin(position) position: vec4f, @location(0) uv: vec2f }
@vertex fn vs(@builtin(vertex_index) i:u32)->V { let p=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3))[i]; var v:V; v.position=vec4f(p,0,1); v.uv=p*vec2f(.5,-.5)+vec2f(.5); return v; }
fn box(p:vec2f,b:vec2f)->f32 { let q=abs(p)-b; return length(max(q,vec2f(0)))+min(max(q.x,q.y),0); }
fn fixture(p:vec2f,c:vec2f,h:f32)->f32 {
 let head=length(p-c-vec2f(0,-h*.385))-h*.115;
 let body=box(p-c-vec2f(0,h*.03),vec2f(h*.135,h*.27));
 let legs=min(box(p-c-vec2f(-h*.08,h*.385),vec2f(h*.045,h*.115)),box(p-c-vec2f(h*.08,h*.385),vec2f(h*.045,h*.115)));
 return 1-smoothstep(-.6,.6,min(head,min(body,legs)));
}
fn encode(c:vec3f)->vec3f { return select(12.92*c,1.055*pow(c,vec3f(1./2.4))-.055,c>vec3f(.0031308)); }
@fragment fn fs(v:V)->@location(0) vec4f {
 let direct=textureSample(light,samp,v.uv).rgb;
 var blur=vec3f(0); var weight=0.;
 // R4: positive normalized pixel-cell aperture core + weak scatter wing.
 // RGB is transported independently; total .58 response and direct light are unchanged.
 let core=array<f32,3>(0.04779009148478508,0.9044198393821716,0.04779009148478508);
 let wing=array<f32,7>(0.03500032424926758,0.1098480075597763,0.21809996664524078,0.27410340309143066,0.21809996664524078,0.1098480075597763,0.03500032424926758);
 // Reuse the same 49 source fetches for both components. No separated duplicate images.
 for(var y:i32=-3;y<=3;y++){for(var x:i32=-3;x<=3;x++){
  let q=vec2f(f32(x),f32(y));
  var w=0.14*wing[u32(x+3)]*wing[u32(y+3)];
  if(abs(x)<=1&&abs(y)<=1){w+=0.86*core[u32(x+1)]*core[u32(y+1)];}
  blur+=textureSample(light,samp,v.uv+q*u.viewport.zw*u.state.y).rgb*w; weight+=w;
 }}
 let observed=blur/weight*.58*u.controls.y;
 let p=v.uv*u.viewport.xy;
 let f0=fixture(p,u.endpoints.xy,u.state.z); let f1=fixture(p,u.endpoints.zw,u.state.z);
 let base=vec3f(.006,.009,.017)+vec3f(.024,.034,.052)*f0+vec3f(.052,.057,.065)*f1;
 // Display-source response only. No camera lens ghost or world illumination.
 let radiance=base+direct+observed;
 return vec4f(encode(radiance),1);
}

