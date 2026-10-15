struct Params{viewport:vec4f,source:vec4f,rect:vec4f,time:vec4f,gates:vec4f}
@group(0) @binding(0) var<uniform> u:Params;
struct Out{@builtin(position) position:vec4f}
@vertex fn vs(@builtin(vertex_index)n:u32)->Out{var p=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));var o:Out;o.position=vec4f(p[n],0,1);return o;}
fn box(p:vec2f,b:vec2f)->f32{let d=abs(p)-b;return length(max(d,vec2f(0)))+min(max(d.x,d.y),0.0);}
fn rounded(p:vec2f,b:vec2f,r:f32)->f32{return box(p,b-vec2f(r))-r;}
fn coverage(d:f32)->f32{return 1.0-smoothstep(-0.65*u.viewport.z,0.65*u.viewport.z,d);}
fn edge(d:f32,w:f32)->f32{return exp(-pow(d/w,2.0));}
fn glint(p:vec2f,size:f32)->f32{let c=cos(0.34);let a=sin(0.34);let q=vec2f(c*p.x+a*p.y,-a*p.x+c*p.y);return exp(-abs(q.x)/size-pow(q.y/(0.65*u.viewport.z),2.0))+exp(-abs(q.y)/(size*0.68)-pow(q.x/(0.65*u.viewport.z),2.0));}
@fragment fn fs(@builtin(position)pixel:vec4f)->@location(0)vec4f{
let t=u.time.x;let s=u.viewport.z;if(t<0.0||t>=1160.0||u.time.z==0.0||u.gates.x==0.0){return vec4f(0);}
let p=pixel.xy;let center=u.rect.xy+u.rect.zw*0.5;let h=u.rect.zw*0.5;let q=p-center;
let targetD=rounded(q,h,7.0*s);let inside=coverage(targetD);let env=smoothstep(65.0,130.0,t)*(1.0-smoothstep(940.0,1160.0,t));var direct=vec3f(0);var nearby=vec3f(0);
// Local acknowledgment of the same authority event; no transported physical token.
let ss=clamp(u.source.z*0.30,14.0*s,29.0*s);let sp=p-u.source.xy;let sourceD=rounded(sp,vec2f(ss*0.86,ss*0.56),3.0*s);let sg=smoothstep(0.0,30.0,t)*(1.0-smoothstep(140.0,230.0,t));
direct+=(vec3f(0.07,0.48,0.40)*coverage(sourceD)+vec3f(0.38,1.65,1.05)*edge(sourceD,0.95*s))*sg;nearby+=vec3f(0.025,0.30,0.22)*edge(sourceD,3.0*s)*sg;
// Face and contour share one writefront in the registered rounded target.
let progress=smoothstep(95.0,520.0,t);let axis=q.x+0.25*q.y;let span=h.x+0.25*h.y;let front=mix(-span-3.0*s,span+3.0*s,progress);
let sweep=1.0-smoothstep(-1.2*s,1.2*s,axis-front);let stamp=smoothstep(95.0,180.0,t);let written=select(sweep,stamp,u.time.w>0.5);
let frontLight=edge(axis-front,1.1*s)*inside*(1.0-smoothstep(480.0,540.0,t))*select(1.0,0.0,u.time.w>0.5);let commit=smoothstep(520.0,690.0,t);let rim=edge(targetD,1.2*s);
let gradient=0.65+0.35*clamp((q.y+h.y)/max(1.0,2.0*h.y),0.0,1.0);
direct+=(vec3f(0.025,0.24,0.19)*inside*written*gradient+vec3f(0.24,1.48,0.96)*rim*written+vec3f(0.32,1.32,0.94)*frontLight+vec3f(0.035,0.17,0.13)*inside*commit)*env;
nearby+=vec3f(0.04,0.36,0.25)*edge(targetD,4.0*s)*written*env;
for(var j=0u;j<3u;j++){let n=f32(j);let onset=600.0+70.0*n;let pulse=smoothstep(onset,onset+20.0,t)*(1.0-smoothstep(onset+45.0,onset+130.0,t));let anchor=center+vec2f((n-1.0)*(h.x-9.0*s),select(h.y-5.0*s,-h.y+5.0*s,j==1u));direct+=vec3f(1.4,2.1,1.5)*glint(p-anchor,3.6*s)*pulse*u.gates.w;}
return vec4f((direct+nearby*u.gates.y)*u.time.y,0);
}
