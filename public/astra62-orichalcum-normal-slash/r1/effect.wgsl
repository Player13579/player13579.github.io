struct View{
 size:vec2f,ageMs:f32,scale:f32,reduced:f32,activeFlag:f32,facing:f32,visibleFlag:f32,
}
@group(0) @binding(0) var<uniform> view:View;
@vertex fn vs(@builtin(vertex_index) i:u32)->@builtin(position) vec4f{
 let v=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));return vec4f(v[i],0,1);
}
fn srgb(c:vec3f)->vec3f{
 let x=clamp(c,vec3f(0),vec3f(1));return select(12.92*x,1.055*pow(x,vec3f(1.0/2.4))-vec3f(.055),x>vec3f(.0031308));
}
fn cv(d:f32,w:f32)->f32{return 1.0-smoothstep(-w,w,d);}
fn seg(p:vec2f,a:vec2f,b:vec2f)->f32{
 let v=b-a;return length(p-a-v*clamp(dot(p-a,v)/max(dot(v,v),.0001),0.0,1.0));
}
fn wedge(x:vec2f,y:vec2f)->f32{return x.x*y.y-x.y*y.x;}
fn triangle(p:vec2f,a:vec2f,b:vec2f,c:vec2f)->f32{
 let ab=wedge(b-a,p-a);let bc=wedge(c-b,p-b);let ca=wedge(a-c,p-c);
 let inside=(ab>=0.0&&bc>=0.0&&ca>=0.0)||(ab<=0.0&&bc<=0.0&&ca<=0.0);
 return select(1.0,-1.0,inside)*min(seg(p,a,b),min(seg(p,b,c),seg(p,c,a)));
}
fn pose(t:f32)->f32{
 let ready=-1.12;
 let coil=mix(ready,-1.63,smoothstep(12.0,165.0,t));
 let swing=mix(coil,.61,smoothstep(165.0,443.0,t));
 return mix(swing,ready,smoothstep(552.0,900.0,t));
}
@fragment fn fs(@builtin(position) screen:vec4f)->@location(0) vec4f{
 let bg=vec3f(.016,.023,.032);
 if(view.visibleFlag<.5){return vec4f(srgb(bg),1);}
 let center=(screen.xy-view.size*.5)/view.scale;
 let p=vec2f(center.x*view.facing,center.y);
 let aa=.65/view.scale;
 let t=select(0.0,view.ageMs,view.activeFlag>.5);
 let theta=pose(t);
 let d=vec2f(cos(theta),sin(theta));
 let n=vec2f(-d.y,d.x);
 let shoulder=vec2f(-15,-3);
 let q=p-shoulder;
 let x=dot(q,d);
 let y=dot(q,n);
 let v=vec2f(x,y);
 var col=bg;
 // The trail consists only of recent angles of this blade around the same projected pivot.
 let prev=pose(max(0.0,t-mix(75.0,32.0,view.reduced)));
 let a=atan2(q.y,q.x);
 let gap=max(theta-prev,.0001);
 let u=clamp((a-prev)/gap,0.0,1.0);
 let rr=length(q);
 let inner=mix(43.5,28.0,u);
 let outer=mix(44.0,48.0,u);
 let arc=cv(max(inner-rr,rr-outer),aa)*smoothstep(prev,prev+.035,a)*(1.0-smoothstep(theta-.045,theta,a));
 let emission=smoothstep(172.0,222.0,t)*(1.0-smoothstep(425.0,468.0,t));
 col=mix(col,vec3f(.67,.34,.13),arc*emission*(.18+.74*u));
 let edge=cv(abs(rr-outer)-.75,aa)*arc*emission;
 col+=edge*vec3f(.42,.24,.08);
 // Anonymous H64-scale figure. Feet provide a fixed visual reference for the attached effect.
 let hip=vec2f(-20,13);
 let rear=seg(p,hip,vec2f(-29,29)) - 3.5;
 let front=seg(p,hip+vec2f(2,0),vec2f(-8,29)) - 3.7;
 col=mix(col,vec3f(.13,.19,.23),cv(rear,aa));
 col=mix(col,vec3f(.25,.33,.36),cv(front,aa));
 let coat=seg(p,hip,vec2f(-19,-5))-6.2;
 col=mix(col,vec3f(.20,.37,.39),cv(coat,aa));
 let hood=length((p-vec2f(-19,-17))/vec2f(7.3,9.2))-1.0;
 col=mix(col,vec3f(.36,.48,.47),cv(hood,aa/8.0));
 let visor=seg(p,vec2f(-17,-18),vec2f(-12.5,-18)) - 1.25;
 col=mix(col,vec3f(.78,.72,.55),cv(visor,aa));
 let elbow=shoulder+d*7.0+n*3.4;
 let hand=shoulder+d*15.0;
 let sleeve=min(seg(p,shoulder,elbow)-3.5,seg(p,elbow,hand)-2.65);
 col=mix(col,vec3f(.33,.46,.46),cv(sleeve,aa));
 let gripDist=seg(v,vec2f(11,0),vec2f(21,0))-1.5;
 col=mix(col,vec3f(.35,.23,.16),cv(gripDist,aa));
 let guard=seg(v,vec2f(20.5,-4.1),vec2f(20.5,4.1))-1.28;
 col=mix(col,vec3f(.80,.53,.27),cv(guard,aa));
 let spine=vec2f(22,0);
 let tip=vec2f(48,0);
 let top=triangle(v,spine,vec2f(22,-3.15),tip);
 let bottom=triangle(v,spine,tip,vec2f(22,2.2));
 col=mix(col,vec3f(.84,.63,.37),cv(top,aa));
 col=mix(col,vec3f(.48,.33,.25),cv(bottom,aa));
 let nose=cv(seg(v,vec2f(23,-2.7),tip)-.56,aa)*cv(min(top,bottom),aa);
 col+=vec3f(.21,.18,.095)*nose;
 let glove=length(p-hand)-2.85;
 col=mix(col,vec3f(.67,.60,.47),cv(glove,aa));
 return vec4f(srgb(col),1);
}
