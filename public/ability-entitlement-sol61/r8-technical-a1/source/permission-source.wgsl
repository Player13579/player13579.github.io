struct Params{viewport:vec4f,source:vec4f,rect:vec4f,time:vec4f,gates:vec4f}
@group(0) @binding(0) var<uniform> u:Params;
struct Out{@builtin(position) position:vec4f}
@vertex fn vs(@builtin(vertex_index)n:u32)->Out{var p=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));var o:Out;o.position=vec4f(p[n],0,1);return o;}
fn box(p:vec2f,b:vec2f)->f32{let d=abs(p)-b;return length(max(d,vec2f(0)))+min(max(d.x,d.y),0.0);}
fn rounded(p:vec2f,b:vec2f,r:f32)->f32{return box(p,b-vec2f(r))-r;}
fn coverage(d:f32)->f32{return 1.0-smoothstep(-0.65*u.viewport.z,0.65*u.viewport.z,d);}
fn edge(d:f32,w:f32)->f32{return exp(-pow(d/w,2.0));}
fn glint(p:vec2f,size:f32)->f32{let c=cos(0.34);let a=sin(0.34);let q=vec2f(c*p.x+a*p.y,-a*p.x+c*p.y);return exp(-abs(q.x)/size-pow(q.y/(0.65*u.viewport.z),2.0))+exp(-abs(q.y)/(size*0.68)-pow(q.x/(0.65*u.viewport.z),2.0));}
// Clockwise arclength of the nearest rounded-rectangle boundary, starting at the upper-left top tangent.
// The source is the registered UI contour itself; this is digital state inscription, not energy transport.
fn contourS(q:vec2f,h:vec2f,r:f32)->f32{
 let pi=3.141592653589793;let a=h-vec2f(r);let x=2.0*a.x;let y=2.0*a.y;let arc=0.5*pi*r;
 if(q.x>=a.x&&q.y<=-a.y){return x+r*clamp(atan2(q.y+a.y,q.x-a.x)+0.5*pi,0.0,0.5*pi);}
 if(q.x>=a.x&&q.y>=a.y){return x+arc+y+r*clamp(atan2(q.y-a.y,q.x-a.x),0.0,0.5*pi);}
 if(q.x<=-a.x&&q.y>=a.y){return 2.0*x+2.0*arc+y+r*clamp(atan2(q.y-a.y,q.x+a.x)-0.5*pi,0.0,0.5*pi);}
 if(q.x<=-a.x&&q.y<=-a.y){let theta=atan2(q.y+a.y,q.x+a.x);let turn=select(theta+pi,theta-pi,theta>0.0);return 2.0*x+3.0*arc+2.0*y+r*clamp(turn,0.0,0.5*pi);}
 if(q.y<=-a.y){return clamp(q.x+a.x,0.0,x);}
 if(q.x>=a.x){return x+arc+clamp(q.y+a.y,0.0,y);}
 if(q.y>=a.y){return x+2.0*arc+y+clamp(a.x-q.x,0.0,x);}
 if(q.x<=-a.x){return 2.0*x+3.0*arc+y+clamp(a.y-q.y,0.0,y);}
 // Inside the straight-edge core, choose the closest contour; optical spill stays within a few CSS pixels.
 if(h.x-abs(q.x)<h.y-abs(q.y)){
  return select(2.0*x+3.0*arc+y+clamp(a.y-q.y,0.0,y),x+arc+clamp(q.y+a.y,0.0,y),q.x>=0.0);
 }
 return select(x+2.0*arc+y+clamp(a.x-q.x,0.0,x),clamp(q.x+a.x,0.0,x),q.y<=0.0);
}
@fragment fn fs(@builtin(position)pixel:vec4f)->@location(0)vec4f{
 let t=u.time.x;let s=u.viewport.z;
 if(t<0.0||t>=1160.0||u.time.z==0.0||u.gates.x==0.0){return vec4f(0);}
 let p=pixel.xy;let center=u.rect.xy+u.rect.zw*0.5;let h=u.rect.zw*0.5;let q=p-center;let r=7.0*s;
 let d=rounded(q,h,r);let inside=coverage(d);let env=smoothstep(65.0,130.0,t)*(1.0-smoothstep(930.0,1160.0,t));
 let lengthS=4.0*(h.x+h.y-2.0*r)+6.283185307179586*r;let at=contourS(q,h,r);
 // Both fronts originate at the registered top centre and meet once at bottom centre.
 // A single mirrored distance field prevents additive doubling when they coalesce.
 let fromTopDelta=abs(at-(h.x-r));let fromTop=min(fromTopDelta,lengthS-fromTopDelta);
 let progress=smoothstep(90.0,520.0,t);let head=progress*lengthS*0.5;
 let stamp=smoothstep(95.0,190.0,t);let written=select(max(1.0-smoothstep(head-1.1*s,head+1.1*s,fromTop),smoothstep(500.0,520.0,t)),stamp,u.time.w>0.5);
 let headDistance=abs(fromTop-head);
 let headEnv=smoothstep(90.0,125.0,t)*(1.0-smoothstep(490.0,535.0,t))*select(1.0,0.0,u.time.w>0.5);
 let headLight=edge(headDistance,3.2*s)*headEnv;
 let trail=exp(-max(head-fromTop,0.0)/(18.0*s))*written*select(1.0,0.0,u.time.w>0.5);
 let commit=smoothstep(520.0,700.0,t);
 let seamEnv=smoothstep(500.0,530.0,t)*(1.0-smoothstep(580.0,710.0,t));
 let seam=edge(q.x,10.0*s)*edge(d,1.15*s)*smoothstep(h.y-8.0*s,h.y-2.0*s,q.y)*seamEnv;
 var direct=(vec3f(0.13,1.05,0.76)*edge(d,1.05*s)*written*(0.74+0.26*commit)
            +vec3f(0.75,2.30,1.48)*edge(d,1.65*s)*headLight
            +vec3f(0.12,0.70,0.47)*edge(d,1.10*s)*trail*(1.0-commit)
            +vec3f(0.07,0.53,0.34)*edge(max(-d,0.0),3.4*s)*inside*headLight
            +vec3f(0.40,1.35,0.90)*seam
            +vec3f(0.012,0.055,0.036)*inside*commit)*env;
 var nearby=vec3f(0.035,0.27,0.19)*edge(d,4.0*s)*written*env;
 nearby+=vec3f(0.08,0.46,0.30)*edge(d,5.2*s)*headLight*env;
 nearby+=vec3f(0.025,0.19,0.13)*edge(q.x,10.0*s)*edge(d,4.0*s)*smoothstep(h.y-8.0*s,h.y-2.0*s,q.y)*seamEnv*env;
 let sg=smoothstep(0.0,30.0,t)*(1.0-smoothstep(110.0,190.0,t));
 let actorSize=clamp(u.source.z*0.05,2.2*s,3.5*s);
 direct+=vec3f(1.40,2.20,1.45)*glint(p-u.source.xy,actorSize)*sg*u.gates.w;
 for(var j=0u;j<3u;j++){
  let n=f32(j);let onset=560.0+80.0*n;let pulse=smoothstep(onset,onset+20.0,t)*(1.0-smoothstep(onset+45.0,onset+130.0,t));
  var offset=vec2f(0,h.y-3.0*s);
  if(j==1u){offset=vec2f(-h.x+9.0*s,-h.y+5.0*s);}
  if(j==2u){offset=vec2f(h.x-9.0*s,-h.y+5.0*s);}
  direct+=vec3f(1.45,2.15,1.50)*glint(p-center-offset,3.4*s)*pulse*u.gates.w;
 }
 // Only this local source feeds nearby light and observer optics; source-off and expiry are exact zero.
 return vec4f((direct+nearby*u.gates.y)*u.time.y,0);
}
