// Astra r04: newly authored 3D folded temporal lamellae. Ray integration, not screen outlines.
export const shader=/* wgsl */`
struct U { screen:vec4f, body:vec4f, state:vec4f };
@group(0) @binding(0) var<uniform> u:U;
@group(0) @binding(1) var actor:texture_2d<f32>;
@group(0) @binding(2) var samp:sampler;
struct V { @builtin(position) p:vec4f };
@vertex fn vs(@builtin(vertex_index) i:u32)->V{var v:V;let p=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));v.p=vec4f(p[i],0,1);return v;}
fn win(t:f32,a:f32,b:f32)->f32{return smoothstep(a,a+.08,t)*(1-smoothstep(b-.15,b,t));}
fn over(a:vec4f,b:vec4f)->vec4f{return vec4f(a.rgb+b.rgb*(1-a.a),a.a+b.a*(1-a.a));}
fn sheet(pos:vec3f,t:f32,k:f32)->vec4f{
 let local=clamp((t-k*.025)/.57,0,1);let compress=pow(local,1.8);let release=smoothstep(.56,.94,t);
 let motion=select(1.,.18,u.state.y>.5);let collapse=compress*motion;
 let r=length(pos.xz);let angle=atan2(pos.z,pos.x);
 let turn=k*1.67-.70+collapse*1.35-release*.5;
 let theta=atan2(sin(angle-turn),cos(angle-turn));
 let angularWidth=mix(1.55,.82,release);
 let inner=mix(.245,.055,collapse)+release*.17;
 let outer=mix(.66,.21,collapse)+release*.50;
 let radial=(r-inner)/max(.06,outer-inner);
 let fold=.18*sin(theta*1.7)+.095*(radial-.5);
 let middle=mix(.15+k*.32,.48,collapse)+release*(k-.75)*.16;
 let surfaceY=middle+fold*(1-collapse*.35+release*.65);
 let width=.030+.016*sin(clamp(radial,0,1)*3.14159);
 let dy=pos.y-surfaceY;
 let thick=1-smoothstep(width,width+.018,abs(dy));
 let radialMask=smoothstep(inner-.012,inner+.025,r)*(1-smoothstep(outer-.025,outer+.012,r));
 let angularMask=1-smoothstep(angularWidth-.12,angularWidth,abs(theta));
 let density=thick*radialMask*angularMask*win(t,k*.018,.98);
 if(density<.002){return vec4f(0);}
 let dTheta=.306*cos(theta*1.7)*(1-collapse*.35+release*.65);
 let normal=normalize(vec3f(dTheta*pos.z/max(r*r,.01),1.,-dTheta*pos.x/max(r*r,.01)));
 let top=select(-normal,normal,dy>=0.);
 let light=.25+.75*max(0.,dot(top,normalize(vec3f(-.38,.81,.44))));
 let conversion=smoothstep(.20,.64,t)*(1-smoothstep(.18,.98,radial))+release;
 let amber=mix(vec3f(.21,.07,.035),vec3f(.88,.42,.14),light);
 let mint=mix(vec3f(.018,.15,.20),vec3f(.17,.75,.61),light);
 var color=mix(amber,mint,clamp(conversion,0,1));
 let edge=pow(1-clamp((outer-r)/.085,0,1),2.)*.85+pow(1-clamp((angularWidth-abs(theta))/.15,0,1),2.)*.5;
 let crest=exp(-pow((t-.55)/.09,2.));
 color+=mix(vec3f(1.,.68,.32),vec3f(.58,1.,.84),clamp(conversion,0,1))*(edge*.38+crest*.12);
 let alpha=clamp(density*.36,0,.80);return vec4f(color*alpha,alpha);
}
fn integrate(p:vec2f,t:f32,front:bool)->vec4f{
 var result=vec4f(0.);if(abs(p.x)>.89||p.y<-.25||p.y>1.35||t<=0.||t>=1.){return result;}
 // Orthographic camera looks down at the ground by atan(.28); actor lies at z=0.
 for(var i=0;i<34;i++){
  let z=select(-f32(i)*.026-.013,.875-f32(i)*.026,front);
  let pos=vec3f(p.x,p.y+.28*z,z);
  var here=vec4f(0.);
  for(var k=0;k<3;k++){here=over(here,sheet(pos,t,f32(k)));}
  result=over(result,here);if(result.a>.995){break;}
 }return result;
}
@fragment fn fs(v:V)->@location(0) vec4f{
 let pixel=v.p.xy/u.screen.z;let p=vec2f(pixel.x-u.body.x,u.body.y-pixel.y)/u.body.z;let t=u.state.x;
 var c=mix(vec3f(.035,.061,.102),vec3f(.77,.81,.79),u.state.z);
 let alive=select(0.,1.,t>0.&&t<1.);let pulse=exp(-pow((t-.56)/.085,2.))*alive;
 let ground=exp(-pow(p.x/.58,2.)-pow(p.y/.072,2.));
 c+=mix(vec3f(.10,.05,.02),vec3f(.035,.17,.10),smoothstep(.18,.66,t))*ground*win(t,.02,.97);
 c*=1-exp(-pow(p.x/.19,2.)-pow(p.y/.025,2.))*.23;
 let back=integrate(p,t,false);c=back.rgb+c*(1-back.a);
 let source=vec2f(128.+p.x*222.,240.-p.y*222.);let uv=source/vec2f(textureDimensions(actor));
 let inside=source.x>=0&&source.x<256&&source.y>=0&&source.y<256;let tex=textureSampleLevel(actor,samp,uv,0);let alpha=select(0.,tex.a,inside)*u.state.w;
 let sweep=exp(-pow((p.y-mix(.15,1.10,smoothstep(.48,.88,t)))/.11,2.))*win(t,.43,.98);
 let light=vec3f(.12,.34,.22)*(pulse*.35+sweep*.63);
 c=mix(c,tex.rgb+light,alpha);
 let front=integrate(p,t,true);c=front.rgb+c*(1-front.a);
 // Only the body-coupled compression phase radiates; no autonomous decorative ring or particles.
 c+=vec3f(.35,.69,.45)*exp(-pow(p.x/.21,4.)-pow((p.y-.48)/.067,2.))*pulse*.46;
 return vec4f(c,1);
}`;
