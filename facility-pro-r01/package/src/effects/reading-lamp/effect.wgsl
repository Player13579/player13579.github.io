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
 let t=select(u.time,.94,u.reduced>.5);let focus=smoothstep(.18,.85,t);let life=e.g*u.alive*finiteMask(p);
 var body=vec4f(0.);var emission=vec3f(0.);
 // 指向する照明束。横方向の範囲円ではなく読書面で有限に止まる台形。
 let bottom=mix(31.,22.,focus);
 let cone=sdQuad(p,vec2f(-22.,12.),vec2f(-7.,12.),vec2f(bottom,-22.),vec2f(-32.,-22.));
 let beam=fill(cone);let down=clamp((12.-p.y)/34.,0.,1.);
 let density=.055+.14*down;
 body=over(color(mix(vec3f(.31,.18,.065),vec3f(.53,.30,.11),down),beam*density*focus),body);
 // 照明器具に沿う不透明な色本体と、別の高輝度フィラメント。
 let shade=sdQuad(p,vec2f(-29.,23.),vec2f(-9.,23.),vec2f(0.,13.),vec2f(-35.,13.));
 body=over(color(vec3f(.26,.105,.039),fill(shade)*.95),body);
 let lip=sdSeg(p,vec2f(-31.,13.),vec2f(-3.,13.));
 emission+=vec3f(3.5,1.8,.52)*stroke(lip,.95);
 emission+=vec3f(1.2,.38,.055)*stroke(shade,.55)*.32;
 let stem=sdSeg(p,vec2f(-21.,11.),vec2f(-24.,-17.));
 body=over(color(vec3f(.075,.12,.16),stroke(stem,1.7)),body);
 // 読書面の三本の焦点帯。ぼけ幅と間隔が収束し、輝度だけで変化を代用しない。
 for(var j=0u;j<3u;j++) {
  let k=f32(j);let y=-6.-k*6.4;let a=vec2f(-13.-k*2.,y);let b=vec2f(7.+k*4.,y+1.2);
  let width=mix(2.8,.56,focus);let line=sdSeg(p,a,b);
  let band=stroke(line,width)*beam*smoothstep(.25+k*.13,.48+k*.13,t);
  body=over(color(vec3f(.33,.21,.085),stroke(line,width+1.2)*beam*.46),body);
  emission+=mix(vec3f(.44,.16,.62),vec3f(2.6,1.48,.44),focus)*band*(.38+k*.10);
 }
 let plane=sdQuad(p,vec2f(-29.,-18.),vec2f(20.,-18.),vec2f(27.,-25.),vec2f(-35.,-25.));
 body=over(color(vec3f(.15,.14,.23),fill(plane)*.64),body);
 emission+=vec3f(1.3,.69,.20)*stroke(plane,.60)*focus*.52;
 // フィラメントから下方受光面へ。背景一面を明るくしない。
 let local=beam*(.12+.53*down)+exp(-dot((p-vec2f(-15.,9.))/vec2f(13.,7.),(p-vec2f(-15.,9.))/vec2f(13.,7.)))*.22;
 var o:WorldOut;o.body=body*life;o.emission=vec4f(emission*e.r*u.alive*finiteMask(p),1.);
 o.irradiance=vec4f(vec3f(.66,.36,.11)*local*e.b*u.alive*finiteMask(p),1.);return o;
}
