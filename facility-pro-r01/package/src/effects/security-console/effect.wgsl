// B: world PH2の非写実成功応答。未許可のゲーム効果は作らない。
struct Params { time:f32, alive:f32, reduced:f32, unused:f32, resolution:vec2f, pad:vec2f };
@group(0) @binding(0) var<uniform> u:Params;
@group(0) @binding(1) var envelopeTex:texture_2d<f32>;
@group(0) @binding(2) var lutSampler:sampler;
struct Vert { @builtin(position) position:vec4f, @location(0) uv:vec2f };
@vertex fn vs(@builtin(vertex_index) i:u32)->Vert {
 let p=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));
 var o:Vert;o.position=vec4f(p[i],0.,1.);o.uv=vec2f(p[i].x*.5+.5,.5-p[i].y*.5);return o;
}
struct WorldOut { @location(0) body:vec4f, @location(1) emission:vec4f, @location(2) irradiance:vec4f };
fn sdBox(p:vec2f,b:vec2f)->f32 {let q=abs(p)-b;return length(max(q,vec2f(0.)))+min(max(q.x,q.y),0.);}
fn sdSeg(p:vec2f,a:vec2f,b:vec2f)->f32 {let ba=b-a;return length(p-a-ba*clamp(dot(p-a,ba)/max(dot(ba,ba),.00001),0.,1.));}
fn cross2(a:vec2f,b:vec2f)->f32{return a.x*b.y-a.y*b.x;}
fn sdQuad(p:vec2f,a:vec2f,b:vec2f,c:vec2f,d:vec2f)->f32 {
 let signs=vec4f(cross2(b-a,p-a),cross2(c-b,p-b),cross2(d-c,p-c),cross2(a-d,p-d));
 let inside=all(signs>=vec4f(0.))||all(signs<=vec4f(0.));
 let dist=min(min(sdSeg(p,a,b),sdSeg(p,b,c)),min(sdSeg(p,c,d),sdSeg(p,d,a)));
 return select(dist,-dist,inside);
}
fn fill(d:f32)->f32 {return 1.-smoothstep(-.65,.65,d);}
fn stroke(d:f32,w:f32)->f32 {return 1.-smoothstep(w-.5,w+.5,abs(d));}
fn over(a:vec4f,b:vec4f)->vec4f {return a+b*(1.-a.a);}
fn color(c:vec3f,a:f32)->vec4f{return vec4f(c*a,a);}
fn gate(t:f32,a:f32,b:f32,c:f32,d:f32)->f32{return smoothstep(a,b,t)*(1.-smoothstep(c,d,t));}
fn finiteMask(p:vec2f)->f32 {return (1.-smoothstep(49.,54.,abs(p.x)))*(1.-smoothstep(31.,37.,abs(p.y)));}

@fragment fn fs(v:Vert)->WorldOut {
 let p=vec2f((v.uv.x-.5)*110.,(.5-v.uv.y)*76.);
 let e=textureSampleLevel(envelopeTex,lutSampler,vec2f(clamp(u.time/2.2,0.,1.),.5),0.);
 let t=select(u.time,1.25,u.reduced>.5);let life=e.g*u.alive*finiteMask(p);let done=smoothstep(1.02,1.13,t);
 var body=vec4f(0.);var emission=vec3f(0.);
 // 二つの面と直角の照合経路。円・レーダー・探索範囲・鍵アイコンは使わない。
 let lower=sdQuad(p,vec2f(-33.,-14.),vec2f(32.,-14.),vec2f(25.,-24.),vec2f(-38.,-24.));
 body=over(color(vec3f(.10,.20,.22),fill(lower)*.9),body);
 let panel=sdQuad(p,vec2f(-33.,20.),vec2f(30.,20.),vec2f(34.,-14.),vec2f(-33.,-14.));
 body=over(color(vec3f(.033,.115,.135),fill(panel)*.95),body);
 emission+=vec3f(.14,.95,1.2)*stroke(panel,.60)*.35;
 let a=vec2f(-25.,10.);let b=vec2f(-13.,10.);let c=vec2f(-13.,-4.);let d=vec2f(7.,-4.);let f=vec2f(7.,10.);let g=vec2f(25.,10.);
 let s0=stroke(sdSeg(p,a,b),.64);let s1=stroke(sdSeg(p,b,c),.64);let s2=stroke(sdSeg(p,c,d),.64);let s3=stroke(sdSeg(p,d,f),.64);let s4=stroke(sdSeg(p,f,g),.64);
 emission+=vec3f(.12,.65,.85)*(s0+s1+s2+s3+s4)*.25;
 emission+=vec3f(.18,1.8,1.15)*(s0*smoothstep(.10,.28,t)+s1*smoothstep(.25,.40,t)+s2*smoothstep(.39,.65,t)+s3*smoothstep(.64,.78,t)+s4*smoothstep(.77,1.02,t))*.56;
 // 不採用経路は控えめに消え、採用経路と区別する。別のゲーム判定はしない。
 let alternate=stroke(sdSeg(p,vec2f(-25.,3.),vec2f(-25.,-9.)),.45)+stroke(sdSeg(p,vec2f(-25.,-9.),vec2f(23.,-9.)),.45);
 emission+=vec3f(.30,.36,.66)*alternate*(1.-done)*.45;
 for(var j=0u;j<3u;j++) {
  let k=f32(j);let x=-20.+k*20.;let y=select(10.,-4.,j==1u);let ready=smoothstep(.24+k*.32,.37+k*.32,t);
  let separation=mix(4.8,1.8,ready);
  let l=sdBox(p-vec2f(x-separation,y),vec2f(1.0,3.0));let r=sdBox(p-vec2f(x+separation,y),vec2f(1.0,3.0));
  body=over(color(vec3f(.20,.30,.26),(fill(l)+fill(r))*.93),body);
  emission+=mix(vec3f(.20,.76,1.0),vec3f(1.85,1.05,.22),ready)*(stroke(l,.43)+stroke(r,.43))*.55;
 }
 let proof=sdBox(p-vec2f(25.,-5.),vec2f(2.3,5.0*done));
 body=over(color(vec3f(.37,.19,.05),fill(proof)*done),body);
 emission+=vec3f(2.9,1.7,.40)*stroke(proof,.73)*done;
 emission+=vec3f(.16,1.1,.73)*stroke(lower,.5)*done*.36;
 let local=exp(-dot(p/vec2f(37.,23.),p/vec2f(37.,23.)));
 var o:WorldOut;o.body=body*life;o.emission=vec4f(emission*e.r*u.alive*finiteMask(p),1.);
 o.irradiance=vec4f(mix(vec3f(.055,.27,.22),vec3f(.31,.25,.09),done)*local*e.b*u.alive*finiteMask(p),1.);return o;
}
