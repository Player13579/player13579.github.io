struct Params{viewport:vec4f,source:vec4f,rect:vec4f,time:vec4f,gates:vec4f}
@group(0) @binding(0) var<uniform> u:Params;
struct Out{@builtin(position) position:vec4f}
@vertex fn vs(@builtin(vertex_index)n:u32)->Out{var p=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));var o:Out;o.position=vec4f(p[n],0,1);return o;}
fn box(p:vec2f,b:vec2f)->f32{let d=abs(p)-b;return length(max(d,vec2f(0)))+min(max(d.x,d.y),0.0);}
fn rounded(p:vec2f,b:vec2f,r:f32)->f32{return box(p,b-vec2f(r))-r;}
fn coverage(d:f32)->f32{return 1.0-smoothstep(-0.65*u.viewport.z,0.65*u.viewport.z,d);}
fn soft(d:f32,w:f32)->f32{return exp(-pow(max(d,0.0)/w,2.0));}
fn edge(d:f32,w:f32)->f32{return exp(-pow(d/w,2.0));}
// Every supplemental sparkle has the same chosen display axis, 0.34 radians.
fn glint(p:vec2f,size:f32)->f32{let c=cos(0.34);let a=sin(0.34);let q=vec2f(c*p.x+a*p.y,-a*p.x+c*p.y);return exp(-abs(q.x)/size-pow(q.y/(0.65*u.viewport.z),2.0))+exp(-abs(q.y)/(size*0.68)-pow(q.x/(0.65*u.viewport.z),2.0));}
@fragment fn fs(@builtin(position)pixel:vec4f)->@location(0)vec4f{
 let t=u.time.x;let s=u.viewport.z;if(t<0.0||t>=1160.0||u.time.z==0.0||u.gates.x==0.0){return vec4f(0);}
 let p=pixel.xy;let center=u.rect.xy+u.rect.zw*0.5;let h=u.rect.zw*0.5;let q=p-center;
 let targetD=rounded(q,h,4.0*s);let inside=coverage(targetD);let env=smoothstep(40.0,140.0,t)*(1.0-smoothstep(940.0,1160.0,t));
 let opening=smoothstep(150.0,640.0,t);let eased=select(opening,0.0,u.time.w>0.5);var direct=vec3f(0);var nearby=vec3f(0);
let ss=clamp(u.source.z*0.30,14.0*s,29.0*s);let sp=p-u.source.xy;let outer=rounded(sp,vec2f(ss*0.83,ss*0.64),3.0*s);let aperture=rounded(sp-vec2f(ss*0.16,0),vec2f(ss*0.35,ss*0.28),2.0*s);let sd=max(outer,-aperture);let sg=smoothstep(0.0,45.0,t)*(1.0-smoothstep(240.0,410.0,t));
 direct+=(vec3f(0.08,1.0,0.86)*coverage(sd)+vec3f(0.68,1.95,1.27)*edge(sd,0.95*s))*sg;
 nearby+=vec3f(0.03,0.45,0.31)*soft(sd,3.0*s)*sg;
let ah=max(vec2f(0.5*s),h*eased);let ad=rounded(q,ah,min(4.0*s,ah.y*0.4));let face=inside*(1.0-coverage(ad))*(1.0-opening);let front=edge(ad,1.8*s)*inside*(1.0-opening);let faceDepth=0.32+0.68*clamp((abs(q.x)/h.x+abs(q.y)/h.y)*0.5,0.0,1.0);direct+=(vec3f(0.025,0.63,0.61)*faceDepth*face+vec3f(0.6,2.05,1.15)*front)*env;nearby+=vec3f(0.028,0.31,0.22)*edge(ad,4.0*s)*inside*env*(1.0-opening);let resolved=smoothstep(520.0,690.0,t)*env;let rim=edge(targetD,1.35*s);let lip=edge(rounded(q,h-vec2f(3.5*s),3.0*s),1.0*s)*inside;
 direct+=(vec3f(0.22,1.35,0.9)*rim+vec3f(0.07,0.58,0.58)*lip)*resolved;
 nearby+=vec3f(0.06,0.46,0.32)*edge(targetD,4.8*s)*resolved;
 // Benefits use sparse target-bound sparkle. Their centers do not fly from actor into inventory.
 for(var j=0u;j<3u;j++){let n=f32(j);let onset=570.0+58.0*n;let pulse=smoothstep(onset,onset+20.0,t)*(1.0-smoothstep(onset+45.0,onset+130.0,t));
 let anchor=center+vec2f((n-1.0)*(h.x-9.0*s),select(h.y-5.0*s,-h.y+5.0*s,j==1u));direct+=vec3f(1.6,2.3,1.62)*glint(p-anchor,3.8*s)*pulse*u.gates.w;}
 // Additive linear HDR radiance, not opacity. Source OFF and expiry zero all subsequent OBS input.
 return vec4f((direct+nearby*u.gates.y)*u.time.y,0);
}
