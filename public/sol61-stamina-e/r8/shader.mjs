import {DESIGN} from './design.mjs';
export const WGSL=`
struct U { size:vec2f,t:f32,bg:f32,h:f32,main:f32,obs:f32,stars:f32 };
@group(0) @binding(0) var<uniform> un:U;
@group(0) @binding(1) var body:texture_2d<f32>;
@group(0) @binding(2) var sam:sampler;
@vertex fn vs(@builtin(vertex_index) i:u32)->@builtin(position) vec4f { let x=f32((i<<1u)&2u);let y=f32(i&2u);return vec4f(x*2.-1.,y*2.-1.,0.,1.); }
fn gate(a:f32,b:f32,x:f32)->f32{return smoothstep(a,b,x);}
fn source(p:vec2f)->vec3f{
 if(un.t<=0.||un.t>=1280.||p.y<=.39||p.y>=.93||un.main<.5){return vec3f(0.);}
 let rise=gate(120.,740.,un.t);let term=gate(930.,1280.,un.t);let on=gate(0.,180.,un.t);
 let center=mix(vec2f(-.11,.79),vec2f(.17,.47),rise);
 let extent=(.72+.28*gate(100.,520.,un.t))*(1.-.35*term);
 let delta=p-center;let u=dot(delta,vec2f(.86,.51))/(.195*extent);let v=dot(delta,vec2f(.51,-.86))/(.155*extent);
 let vv=abs(v+.15*u*u);let q=u*u+vv*vv*vv;
 let den=(1.-gate(.45,1.14,q))*on*(1.-term);
 let rear=1.-.72*exp(-pow((v+.53)/.24,2.));
 let crest=den*exp(-pow((v-.43)/.18,2.))*(1.-gate(.15,1.,u*u))*on*(1.-term)*(.65+.35*gate(180.,680.,un.t));
 let light=exp(-q/1.5)*on*(1.-term)*(.65+.35*gate(180.,680.,un.t));
 return vec3f(den*rear,crest,light);
}
fn star(p:vec2f,at:vec2f,peak:f32)->f32{
 let q=(p-at)*un.h;let angle=${DESIGN.sparkle.angleDegrees}.*.01745329252;
 let a=vec2f(cos(angle),sin(angle));let b=vec2f(-a.y,a.x);
 let axis=dot(q,a);let cross=dot(q,b);
 let shape=max(exp(-pow(axis/6.5,2.)*2.-pow(cross/.48,2.)*2.),exp(-pow(cross/3.,2.)*2.-pow(axis/.48,2.)*2.));
 let time=exp(-pow((un.t-peak)/105.,2.));return shape*time*source(at).y;
}
@fragment fn fs(@builtin(position) frag:vec4f)->@location(0) vec4f{
 let p=vec2f((frag.x-un.size.x*.5)/un.h,(frag.y-(un.size.y*.5-un.h*.5))/un.h);
 let uv=vec2f(p.x/${DESIGN.fixture.ratio}+.5,p.y);
 var actor=vec4f(0.);if(all(uv>=vec2f(0.))&&all(uv<=vec2f(1.))){actor=textureSampleLevel(body,sam,(vec2f(62.,15.)+uv*vec2f(136.,225.))/vec2f(768.,512.),0.);}
 var color=mix(vec3f(.017,.023,.036),vec3f(.88,.87,.83),un.bg);color=mix(color,actor.rgb,actor.a);
 let src=source(p);let opacity=(1.-exp(-src.x*1.35))*(1.-actor.a*.58);
 let depth=mix(vec3f(.018,.10,.32),vec3f(.07,.54,.68),src.x);
 color=mix(color,depth,opacity);
 // PH2前面crest、PH3局所入射、OBS有限近光は別量。
 color+=vec3f(1.25,1.16,.88)*src.y;
 color+=vec3f(.10,.25,.30)*src.z*actor.a*.42;
 if(un.obs>.5){color+=vec3f(.07,.16,.18)*src.z*(1.-src.x)*.56;
  if(un.stars>.5&&un.t>0.&&un.t<1280.){let rise=gate(120.,740.,un.t);let center=mix(vec2f(-.11,.79),vec2f(.17,.47),rise);let ext=(.72+.28*gate(100.,520.,un.t))*(1.-.35*gate(930.,1280.,un.t));
   let front=vec2f(.51,-.86)*.155*ext*.43;
   let sparkle=star(p,center+front+vec2f(-.055,-.033),290.)+star(p,center+front+vec2f(.055,.033),570.)+star(p,center+front,820.);color+=vec3f(1.3,1.11,.73)*sparkle*2.;}}
 return vec4f(color,1.);
}`;
