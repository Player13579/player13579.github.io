export const WORLD_SHADER = /* wgsl */ `
struct RoomU { viewport:vec4f, fit:vec4f, flags:vec4f, optics:vec4f, draw:vec4f, bounds:vec4f }
@group(0) @binding(0) var<uniform> u:RoomU;
@group(0) @binding(1) var roomSampler:sampler;
@group(0) @binding(2) var roomBitmap:texture_2d<f32>;
struct VOut { @builtin(position) clip:vec4f, @location(0) px:vec2f }
struct FOut { @location(0) scene:vec4f, @location(1) bright:vec4f }
fn ease(a:f32,b:f32,x:f32)->f32 {let q=clamp((x-a)/(b-a),0.,1.);return q*q*(3.-2.*q);}
fn softBox(p:vec2f,h:vec2f,edge:f32)->f32 {return (1.-ease(h.x-edge,h.x,abs(p.x)))*(1.-ease(h.y-edge,h.y,abs(p.y)));}
fn ellipse(p:vec2f,h:vec2f)->f32 {let q=p/h;return 1.-ease(.10,1.,dot(q,q));}
fn outValue(rgb:vec3f,a:f32,bright:vec3f)->FOut {var o:FOut;o.scene=vec4f(rgb,a);o.bright=vec4f(bright,a);return o;}
fn linearRGB(rgb:vec3f)->vec3f {return select(rgb/12.92,pow((rgb+.055)/1.055,vec3f(2.4)),rgb>vec3f(.04045));}
@vertex fn vs(@builtin(vertex_index) i:u32)->VOut {
 let corners=array<vec2f,6>(vec2f(0,0),vec2f(1,0),vec2f(0,1),vec2f(0,1),vec2f(1,0),vec2f(1,1));
 let p=mix(u.bounds.xy,u.bounds.zw,corners[i]);let screen=u.fit.xy+p*u.fit.z;
 var v:VOut;v.clip=vec4f(screen.x/u.viewport.x*2.-1.,1.-screen.y/u.viewport.y*2.,0.,1.);v.px=p;return v;
}
fn lampPos(i:u32)->vec2f {let a=array<vec2f,7>(vec2f(263,38),vec2f(430,38),vec2f(619,38),vec2f(1251,475),vec2f(51,283),vec2f(394,1139),vec2f(1019,1139));return a[i];}
fn lampHalf(i:u32)->vec2f {return select(vec2f(12,2),vec2f(2,12),i==3u||i==4u);}
fn floorPos(i:u32)->vec2f {let a=array<vec2f,7>(vec2f(263,143),vec2f(0),vec2f(619,151),vec2f(1177,490),vec2f(124,294),vec2f(400,1060),vec2f(1019,1060));return a[i];}
fn floorMask(p:vec2f)->f32 {
 // 原画床の内側のみ。バイアスを含むauthor proxyでcollision geometryではない。
 var m=softBox(p-vec2f(653,601),vec2f(541,500),8.);
 if(p.x<150.&&p.y<160.){m=0.;}if(p.x>1150.&&p.y<160.){m=0.;}
 if(p.x<150.&&p.y>1010.){m=0.;}if(p.x>1150.&&p.y>1010.){m=0.;}
 if(p.x>264.&&p.x<490.&&p.y>255.&&p.y<386.){m=0.;}
 if(p.x>860.&&p.x<1050.&&p.y>252.&&p.y<386.){m=0.;}
 if(p.x>293.&&p.x<452.&&p.y>819.&&p.y<924.){m=0.;}return m;
}
fn lampLevel(t:f32)->f32 {return ease(0.,160.,t)*(1.-ease(11500.,12000.,t));}
fn drawLamp(p:vec2f,i:u32,t:f32)->FOut {
 let q=p-lampPos(i);let f=softBox(q,lampHalf(i),.8)*lampLevel(t)*u.flags.x;
 let warm=vec3f(5.8,4.9,3.3)*f;return outValue(warm,0.,warm);
}
fn drawFloor(p:vec2f,i:u32,t:f32)->FOut {
 let centre=floorPos(i);var q=p-centre;if(i==3u||i==4u){q=q.yx;}
 let diffuse=ellipse(q,vec2f(42,76))*.055;let spec=ellipse(q,vec2f(12,36))*.35;
 let colour=vec3f(1.,.78,.44)*(diffuse+spec)*lampLevel(t)*u.flags.x*u.flags.w*floorMask(p);
 // 既存床の上へ源が増やす放射だけ。別の描画textureや床模様は作らない。
 return outValue(colour,0.,vec3f(0));
}
fn steamPos(i:u32)->vec2f {return select(vec2f(329,321),vec2f(406,321),i==1u);}
fn drawSteam(p:vec2f,i:u32,j:u32,t:f32)->FOut {
 let born=500.+f32(j)*1800.-select(0.,220.,j==5u)+f32(i)*220.;let phase=(t-born)/2400.;
 if(phase<0.||phase>=1.||u.flags.y==0.){return outValue(vec3f(0),0.,vec3f(0));}
 let drift=select(9.*sin(phase*2.4+f32(i)*.7)*phase,0.,u.viewport.w>0.);let centre=steamPos(i)+vec2f(drift,-68.*phase);
 let q=p-centre;let width=5.+9.*phase;
 let curl=q.x-select(3.5*sin(q.y*.085+phase*3.5+f32(i)),0.,u.viewport.w>0.);
 let sheet=ellipse(vec2f(curl,q.y),vec2f(width,16.));
 let density=sheet*ease(0.,.12,phase)*(1.-ease(.70,1.,phase))*.21;
 // 熱い食品の自己発光ではなくlamp lightで照らされたdroplet散乱。
 let radiance=vec3f(1.18,1.11,.93)*density*(.6+.4*lampLevel(t)*u.flags.x);
 return outValue(radiance,density,vec3f(0));
}
fn drawPurge(p:vec2f,j:u32,t:f32)->FOut {
 let start=select(2800.,7200.,j==1u);let a=t-start;
 if(a<0.||a>=1660.||u.flags.z==0.){return outValue(vec3f(0),0.,vec3f(0));}
 let flow=ease(0.,60.,a)*(1.-ease(1320.,1400.,a));let reached=clamp(a/60.,0.,1.);
 let q=p-vec2f(920,323);let side=1.-ease(.60,1.8,abs(q.x-select(.35*sin(q.y*.6+a*.015),0.,u.viewport.w>0.)));
 let vertical=ease(-.5,1.,q.y)*(1.-ease(20.*reached-1.,20.*reached+1.,q.y));
 let stream=side*vertical*flow;
 let basinQ=p-vec2f(920,343);let r=length(basinQ/vec2f(11,3));
 let waveFront=fract(max(a-60.,0.)/440.);let ring=(1.-ease(.10,.23,abs(r-waveFront)))*(1.-ease(.80,1.,r));
 let receiver=ring*flow*ease(55.,75.,a);
 let tailPhase=clamp((a-1400.)/260.,0.,1.);let droplet=ellipse(p-vec2f(920,323.+20.*tailPhase),vec2f(1.6,2.3))*select(0.,1.-tailPhase,a>=1400.);
 let alpha=(stream*.38+receiver*.14+droplet*.32);
 let scatter=vec3f(.68,.95,1.12)*alpha;
 let bright=vec3f(3.5,3.5,3.4)*ellipse(basinQ,vec2f(2.2,1.4))*flow*ease(55.,75.,a);
 return outValue(scatter+bright,alpha,bright);
}
@fragment fn fs(v:VOut)->FOut {
 let kind=u32(u.draw.x);let i=u32(u.draw.y);let j=u32(u.draw.z);let t=u.viewport.z;
 if(kind==0u){let tex=textureSample(roomBitmap,roomSampler,v.px/vec2f(1305,1206));return outValue(linearRGB(tex.rgb),1.,vec3f(0));}
 if(u.fit.w==0.||u.optics.z>0.||t<0.||t>=12000.){return outValue(vec3f(0),0.,vec3f(0));}
 if(kind==1u){return drawLamp(v.px,i,t);}if(kind==2u){return drawFloor(v.px,i,t);}
 if(kind==3u){return drawSteam(v.px,i,j,t);}if(kind==4u){return drawPurge(v.px,j,t);}
 return outValue(vec3f(0),0.,vec3f(0));
}
`;
