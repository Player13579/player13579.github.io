struct Params { viewport: vec4f, background: vec4f, switches: vec4f, anchor: vec4f, reserved0: vec4f, reserved1: vec4f }
@group(0) @binding(0) var<uniform> u: Params;
@group(0) @binding(1) var actorTexture: texture_2d<f32>;
@group(0) @binding(2) var actorSampler: sampler;
@vertex fn vs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
  let p = array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));
  return vec4f(p[i],0,1);
}
fn ease(x:f32)->f32 { let k=clamp(x,0.,1.);return k*k*(3.-2.*k); }
fn pulse(t:f32,start:f32,peak:f32,end:f32)->f32 {return ease((t-start)/(peak-start))*(1.-ease((t-peak)/(end-peak)));}
fn linear(c:vec3f)->vec3f {return pow(max(c,vec3f(0)),vec3f(2.2));}
fn display(c:vec3f)->vec3f {return pow(max(c,vec3f(0)),vec3f(1./2.2));}
fn cross(p:vec2f,center:vec2f,amp:f32)->vec3f {
  let d=p-center;
  if(abs(d.x)>9. || abs(d.y)>9. || amp<.001){return vec3f(0);}
  let q=vec2f(.951057*d.x+.309017*d.y,-.309017*d.x+.951057*d.y);
  let a=max(0.,1.-abs(q.x)/.78)*pow(max(0.,1.-abs(q.y)/6.2),1.4);
  let b=max(0.,1.-abs(q.y)/.68)*pow(max(0.,1.-abs(q.x)/4.0),1.4);
  let core=max(0.,1.-length(q)/1.35);
  return vec3f(2.5,3.5,1.8)*(a+b+core)*amp;
}
@fragment fn fs(@builtin(position) frag:vec4f)->@location(0) vec4f {
  let t=u.viewport.z;
  let p=vec2f(frag.x-u.anchor.x,u.anchor.y-frag.y)*64./u.viewport.w;
  // Registration uses only the adopted fixture, preserving source aspect ratio.
  let uv=vec2f(128.+p.x*225./64.,240.-p.y*225./64.)/256.;
  let texel=textureSampleLevel(actorTexture,actorSampler,clamp(uv,vec2f(0),vec2f(1)),0.);
  let aa=select(0.,texel.a*u.switches.w,all(uv>=vec2f(0))&&all(uv<=vec2f(1)));
  let base=linear(u.background.xyz);
  var color=mix(base,linear(texel.rgb),aa);
  if(t<=0. || t>=1.5){return vec4f(display(color),1);}
  let life=ease(t/.12)*(1.-ease((t-1.12)/.38));
  let fill=ease((t-.09)/.61);
  let top=mix(2.,30.,fill);
  let lateral=1.-smoothstep(10.,16.,abs(p.x));
  // PH1: finite received reserve. Rising convex interface and filled interior are
  // confined to the actual beneficiary, so they cannot turn into attached armor.
  let curve=top-2.7*pow(p.x/13.,2.);
  let behind=1.-smoothstep(curve-1.,curve+1.2,p.y);
  let lower=smoothstep(-.5,2.,p.y);
  let body=aa*lateral*lower*(1.-smoothstep(29.,33.,p.y))*life*u.switches.z;
  let reserve=behind*body;
  let face=(1.-smoothstep(1.5,7.,abs(p.y-curve+2.3)))*body;
  let core=(1.-smoothstep(0.,11.,abs(p.x)))*reserve;
  // Transmitting emerald medium, independent body coverage and emitted energy.
  let coverage=reserve*.38;
  color=color*(1.-coverage)+vec3f(.025,.29,.115)*coverage;
  color+=vec3f(.08,.72,.26)*reserve*.44+vec3f(.55,1.5,.40)*face*.74+vec3f(.08,.34,.11)*core;
  // OBS1: body/source-bound near response. Finite support, no full-screen bloom.
  let q=vec2f(p.x/17.,(p.y-mix(4.,19.,fill))/21.);
  let halo=pow(max(0.,1.-dot(q,q)),3.)*life;
  color+=vec3f(.035,.15,.055)*halo*u.switches.y;
  // OBS2: sparse delayed highlights at receiving legs and the final hip arrival.
  let s0=pulse(t,.16,.32,.60);
  let s1=pulse(t,.67,.87,1.18);
  let stars=cross(p,vec2f(-13.,10.),s0)+cross(p,vec2f(13.,15.),s0*.82)+cross(p,vec2f(-12.,28.),s1);
  color+=stars*u.switches.x;
  return vec4f(display(color),1);
}
