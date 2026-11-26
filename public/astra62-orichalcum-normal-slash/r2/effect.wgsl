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
fn foot2(p:vec2f,a:vec2f,b:vec2f)->vec2f{
 let v=b-a;return a+v*clamp(dot(p-a,v)/max(dot(v,v),.0001),0.0,1.0);
}
fn seg(p:vec2f,a:vec2f,b:vec2f)->f32{return length(p-foot2(p,a,b));}
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
const slitX:f32=19.95;
const slitZ:f32=4.0;
const amber:vec3f=vec3f(1.0,.57,.19);
// In the rotating hilt frame, +x points to the tip and +z to the viewer.
// Integrate three equal lengths of the exposed ribbon, not distance to the pivot.
fn ribbonLight(v:vec2f,z:f32,nrm:vec3f,ym:f32,hlen:f32,watt:f32)->f32{
 let faceN=normalize(vec3f(-1.0,0.0,.24));
 var irr=0.0;
 for(var k:u32=0u;k<3u;k=k+1u){
  let sy=ym+(f32(k)-1.0)*(2.0/3.0)*hlen;
  let delta=vec3f(vec2f(slitX,sy)-v,slitZ-z);
  let r2=max(dot(delta,delta),.001);
  let l=delta*inverseSqrt(r2);
  let coupling=max(dot(faceN,-l),0.0)*max(dot(nrm,l),0.0);
  irr+=coupling/(1.0+r2/46.0);
 }
 return watt*(hlen/3.35)*(irr/3.0);
}
fn figure(p:vec2f,aa:f32,bg:vec3f)->vec3f{
 let t=select(0.0,view.ageMs,view.activeFlag>.5);
 let theta=pose(t);
 let d=vec2f(cos(theta),sin(theta));let n=vec2f(-d.y,d.x);
 let shoulder=vec2f(-15,-3);let q=p-shoulder;
 let v=vec2f(dot(q,d),dot(q,n));
 let rm=clamp(view.reduced,0.0,1.0);
 // Normalized derivative of the forward smoothstep; no excitation on the return.
 let f=clamp((t-165.0)/278.0,0.0,1.0);
 let rate=4.0*f*(1.0-f);
 let spread=smoothstep(.08,.96,rate);
 let hlen=mix(.70,3.35,spread);let ym=mix(-2.55,0.0,spread);
 let watt=rate*rate;
 var col=bg;
 let rr=length(q);
 if(t>172.0 && t<468.0 && rr>24.0){
  let prev=pose(max(0.0,t-mix(75.0,32.0,rm)));
  let a=atan2(q.y,q.x);
  let u=clamp((a-prev)/max(theta-prev,.0001),0.0,1.0);
  let inner=mix(44.0,28.0,u);let outer=mix(44.3,48.0,u);
  let aw=aa/rr;
  let arc=cv(max(inner-rr,rr-outer),aa)*smoothstep(prev-aw,prev+aw,a)*(1.0-smoothstep(theta-aw,theta+aw,a));
  let fade=smoothstep(172.0,222.0,t)*(1.0-smoothstep(425.0,468.0,t));
  col=mix(col,vec3f(.49,.245,.089),arc*fade*(.10+.55*u));
 }
 // Stationary masses leave a notch of background between the boots.
 let hip=vec2f(-20,13);
 let rear=seg(p,hip,vec2f(-29,29))-3.5;
 let front=seg(p,hip+vec2f(2,0),vec2f(-8,29))-3.7;
 col=mix(col,vec3f(.105,.145,.17),cv(rear,aa));
 col=mix(col,vec3f(.21,.265,.28),cv(front,aa));
 let coat=min(seg(p,hip,vec2f(-19,-5))-6.2,triangle(p,vec2f(-23,-4),vec2f(-12,14),vec2f(-27,16)));
 col=mix(col,vec3f(.18,.27,.285),cv(coat,aa));
 let hood=length((p-vec2f(-19,-17.6))/vec2f(7.3,9.4))-1.0;
 col=mix(col,vec3f(.32,.405,.41),cv(hood,aa/8.0));
 let visor=seg(p,vec2f(-17,-18),vec2f(-12.5,-18))-1.25;
 col=mix(col,vec3f(.60,.57,.47),cv(visor,aa));
 // The bent sleeve and the glove present rounded surfaces to the same ribbon.
 let elbowV=vec2f(7,3.4);let handV=vec2f(15,0);
 let r0=v-foot2(v,vec2f(0),elbowV);let r1=v-foot2(v,elbowV,handV);
 let s0=length(r0)-3.5;let s1=length(r1)-2.65;
 let sleeve=min(s0,s1);
 if(sleeve<aa){
  let rad=select(r0/3.5,r1/2.65,s1<s0);
  let nz=sqrt(max(0.0,1.0-dot(rad,rad)));
  let li=ribbonLight(v,.35+1.15*nz,normalize(vec3f(rad,max(.18,nz))),ym,hlen,watt);
  let cloth=vec3f(.245,.31,.325);
  col=mix(col,cloth+cloth*amber*(3.2*li),cv(sleeve,aa));
 }
 let gripDist=seg(v,vec2f(11,0),vec2f(21,0))-1.5;
 if(gripDist<aa){
  let ny=clamp(v.y/1.5,-1.0,1.0);let nz=sqrt(max(0.0,1.0-ny*ny));
  let li=ribbonLight(v,.65+1.0*nz,normalize(vec3f(0.0,ny,max(.18,nz))),ym,hlen,watt);
  let wrapCol=vec3f(.30,.19,.12);
  col=mix(col,wrapCol+wrapCol*amber*(3.8*li),cv(gripDist,aa));
 }
 let spine=vec2f(22,0);let tip=vec2f(48,0);
 let top=triangle(v,spine,vec2f(22,-3.15),tip);
 let bottom=triangle(v,spine,tip,vec2f(22,2.2));
 col=mix(col,vec3f(.68,.47,.245),cv(top,aa));
 col=mix(col,vec3f(.40,.258,.155),cv(bottom,aa));
 // Solid guard, fixed dark seam, then only the excited length of that seam.
 let guard=seg(v,vec2f(20.65,-4.15),vec2f(20.65,4.15))-1.85;
 col=mix(col,vec3f(.56,.342,.163),cv(guard,aa));
 let bed=seg(v,vec2f(slitX,-3.4),vec2f(slitX,3.4))-1.02;
 let bedCov=cv(bed,aa)*cv(guard,aa);
 col=mix(col,vec3f(.136,.083,.049),bedCov);
 let slit=seg(v,vec2f(slitX,ym-hlen),vec2f(slitX,ym+hlen))-.89;
 col+=amber*(1.04*watt*cv(slit,aa)*bedCov);
 let gr=v-handV;let glove=length(gr)-2.85;
 if(glove<aa){
  let rad=gr/2.85;let nz=sqrt(max(0.0,1.0-dot(rad,rad)));
  let li=ribbonLight(v,1.0+1.50*nz,normalize(vec3f(rad,max(.18,nz))),ym,hlen,watt);
  let leather=vec3f(.435,.383,.30);
  col=mix(col,leather+leather*amber*(3.85*li),cv(glove,aa));
 }
 return col;
}
@fragment fn fs(@builtin(position) screen:vec4f)->@location(0) vec4f{
 let bg=vec3f(.016,.023,.032);var col=bg;
 if(view.visibleFlag>=.5){
  let sc=max(view.scale,.001);let center=(screen.xy-view.size*.5)/sc;
  col=figure(vec2f(center.x*view.facing,center.y),.65/sc,bg);
 }
 return vec4f(srgb(col),1);
}