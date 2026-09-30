// OBS1 source-bound display bloom + OBS2 sparse glint response. No lens ghost claim.
struct U { view:vec4f,time:vec4f,actorRect:vec4f,atlasUv:vec4f,flags:vec4f,layers:vec4f,spare0:vec4f,spare1:vec4f,spare2:vec4f,spare3:vec4f,spare4:vec4f,spare5:vec4f };
@group(0) @binding(0) var<uniform> u:U;
struct V { @builtin(position) clip:vec4f,@location(0) p:vec2f };
@vertex fn vs(@builtin(vertex_index) i:u32)->V {
  let xy=array<vec2f,6>(vec2f(-.65,-1.12),vec2f(.85,-1.12),vec2f(-.65,.12),vec2f(-.65,.12),vec2f(.85,-1.12),vec2f(.85,.12));
  let p=xy[i];let pixel=u.view.zw+p*u.time.x;
  var o:V;o.clip=vec4f(pixel.x/u.view.x*2.-1.,1.-pixel.y/u.view.y*2.,0.,1.);o.p=p;return o;
}
fn ss(a:f32,b:f32,x:f32)->f32 {let q=clamp((x-a)/(b-a),0.,1.);return q*q*(3.-2.*q);}
fn gauss(p:vec2f,c:vec2f,w:vec2f)->f32 {let q=(p-c)/w;return exp(-dot(q,q));}
@fragment fn fs(v:V)->@location(0) vec4f {
  if(u.time.z<.5||u.layers.y<.5||u.time.y<0.||u.time.y>=1.){return vec4f(0.);}
  let t=u.time.y;let p=v.p;let gate=ss(0.,.045,t)*(1.-ss(.88,1.,t));
  let opening=ss(.055,.36,t)*(1.-.25*ss(.72,.88,t));
  let r=clamp((p.y+.82)/.66,0.,1.);let a=sin(3.14159265359*r);
  let center=.13+.29*a*(.34+.66*opening)-.025*r;
  let w=.035+.115*a*(.25+.75*opening);
  let extent=ss(-.87,-.80,p.y)*(1.-ss(-.18,-.11,p.y));
  let surrounding=exp(-pow((p.x-center)/(w+.065),2.))*extent*ss(r-.08,r+.06,ss(0.,.36,t))*gate*u.flags.z;
  let sourceEnv=ss(0.,.035,t)*(1.-.60*ss(.40,.76,t))*(1.-ss(.88,1.,t));
  let source=gauss(p,vec2f(.13,-.79),vec2f(.085))*sourceEnv*u.flags.x;
  // Neither global luma lift nor image-center ghosts: this is a display spread approximation.
  let protection=1.-gauss(p,vec2f(0.,-.79),vec2f(.145,.12));
  let rgb=(vec3f(.08,.30,.46)*surrounding*.34+vec3f(.45,.70,.82)*source*.28)*protection;
  return vec4f(rgb,0.);
}
