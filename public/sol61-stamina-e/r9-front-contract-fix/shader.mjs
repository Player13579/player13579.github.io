import {DESIGN} from './design.mjs';
export const WGSL=`
struct U {size:vec2f,t:f32,bg:f32,h:f32,main:f32,obs:f32,stars:f32,ph3:f32};
@group(0) @binding(0) var<uniform> un:U;
@group(0) @binding(1) var body:texture_2d<f32>;
@group(0) @binding(2) var sam:sampler;
@vertex fn vs(@builtin(vertex_index)i:u32)->@builtin(position)vec4f{return vec4f(f32((i<<1u)&2u)*2.-1.,f32(i&2u)*2.-1.,0.,1.);}
fn source(p:vec2f)->vec3f{
 if(un.t<=0.||un.t>=1300.||p.y<=.39||p.y>=.94||un.main<.5){return vec3f(0.);}
 let end=smoothstep(900.,1300.,un.t);let ignite=smoothstep(0.,210.,un.t)*(1.-end);let full=smoothstep(380.,720.,un.t);
 let height=(.16+.35*smoothstep(160.,680.,un.t))*(1.-.30*end);let y=(.90-p.y)/height;if(y<0.||y>1.){return vec3f(0.);}
 let center=.16*sin(3.14159265*y)*(1.+.18*full);let width=.95*(1.-y)*sqrt(y+.09);let x=(p.x-center)/max(.012,width);
 let edge=1.-smoothstep(.70,1.12,abs(x));let root=smoothstep(0.,.15,y);let tip=1.-smoothstep(.84,1.,y);let density=edge*root*ignite;
 let crest=density*(.20+.65*exp(-pow((y-(.54+.12*full))/.22,2.)))*(1.-smoothstep(.32,1.1,abs(x+.28)));
 return vec3f(density,crest,edge*root*(.45+.55*tip)*ignite);
}
fn star(p:vec2f,at:vec2f,peak:f32)->f32{let q=(p-at)*un.h;let angle=${DESIGN.sparkle.angleDegrees}.*.01745329252;let a=vec2f(cos(angle),sin(angle));let b=vec2f(-a.y,a.x);let u=dot(q,a);let v=dot(q,b);let shape=max(exp(-pow(u/6.8,2.)*2.-pow(v/.50,2.)*2.),exp(-pow(v/3.5,2.)*2.-pow(u/.50,2.)*2.));return shape*exp(-pow((un.t-peak)/105.,2.))*source(at).y;}
@fragment fn fs(@builtin(position) frag:vec4f)->@location(0)vec4f{
 let p=vec2f((frag.x-un.size.x*.5)/un.h,(frag.y-(un.size.y*.5-un.h*.5))/un.h);let uv=vec2f(p.x/${DESIGN.fixture.ratio}+.5,p.y);var actor=vec4f(0.);
 if(all(uv>=vec2f(0.))&&all(uv<=vec2f(1.))){actor=textureSampleLevel(body,sam,(vec2f(62.,15.)+uv*vec2f(136.,225.))/vec2f(768.,512.),0.);}
 let src=source(p);var color=mix(vec3f(.017,.023,.036),vec3f(.88,.87,.83),un.bg);
 // PH2 rear density sits behind PH1 and is occluded by original actor alpha.
 let depth=mix(vec3f(.015,.16,.22),vec3f(.16,.48,.24),src.x);let opacity=1.-exp(-src.x*1.15);color=mix(color,depth,opacity);color=mix(color,actor.rgb,actor.a);
 // PH2 front/core uses the same authored volume and remains visible over PH1.
 // Actor alpha gates the front pass to the original silhouette; it never gates PH3.
 let frontCore=src.x*actor.a;color+=vec3f(.74,.91,.29)*frontCore*.48;
 color+=vec3f(.74,.91,.29)*src.y;
 // PH3は局所source incident、人体形/RGB操作の入力にしない。
 if(un.ph3>.5){color+=vec3f(.15,.24,.08)*src.z*actor.a*.4;}
 if(un.obs>.5){color+=vec3f(.07,.13,.025)*src.z*(1.-src.x)*.4;if(un.stars>.5){let light=star(p,vec2f(-.13,.76),330.)+star(p,vec2f(.24,.59),620.)+star(p,vec2f(-.05,.55),820.);color+=vec3f(1.25,1.15,.76)*light*2.4;}}
 return vec4f(color,1.);
}`;
