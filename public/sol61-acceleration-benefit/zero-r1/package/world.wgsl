struct Frame { viewport:vec4f, anchor:vec4f, flags:vec4f, extra:vec4f }
@group(0) @binding(0) var<uniform> f:Frame;
@vertex fn vertex(@builtin(vertex_index) i:u32)->@builtin(position) vec4f {
 let p=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));return vec4f(p[i],0.,1.);
}
fn box(p:vec2f,b:vec2f)->f32 {let q=abs(p)-b;return length(max(q,vec2f(0.)))+min(max(q.x,q.y),0.);}
fn head(p:vec2f)->f32 {
 // Isosceles triangle: horizontal base y=0; tip y=.23, half width=.18.
 return max(-p.y,max(p.y-.23,abs(p.x)*.787+p.y*.616-.142));
}
fn arrow(p:vec2f)->f32 {
 let stem=box(p-vec2f(0.,-.105),vec2f(.062,.145));
 return min(stem,head(p));
}
fn rise(t:f32)->f32 {let u=t/1.62;return .12+.2*u+1.12*u*u;}
@fragment fn fragment(@builtin(position) pixel:vec4f)->@location(0) vec4f {
 let t=f.viewport.z;
 if(t<0.||t>=1.8||f.flags.x<.5){return vec4f(0.);}
 let scale=f.anchor.z;
 let p=vec2f((pixel.x-f.anchor.x)/scale,(f.anchor.y-pixel.y)/scale);
 let aa=1.05/scale;
 var light=vec3f(0.);var spark=0.;
 for(var i=0;i<2;i++){
   let age=t-f32(i)*.18;
   if(age>=0.&&age<1.62){
     let u=age/1.62;let y=select(rise(age),.64,f.extra.x>.5);
     let x=select(-.28,.28,i==1);
     let q=p-vec2f(x,y);let d=arrow(q);
     let coverage=1.-smoothstep(-aa,aa,d);
     let envelope=min(1.,age/.1)*min(1.,(1.62-age)/.24);
     // Emissive declared digital field: coverage is not radiant flux.
     let core=1.-smoothstep(.012,.058,abs(q.x));
     let front=smoothstep(-.2,.21,q.y);
     let color=mix(vec3f(1.,.17,.018),vec3f(1.,.88,.18),front);
     let intensity=(2.4+1.6*u)*envelope;
     let inset=1.-smoothstep(.0,.028,abs(q.x)-.024);
     let slot=1.-smoothstep(.008,.018,abs(q.y+.13));
     // A single clean transverse gap in each shaft makes the digital packet readable.
     let signal=1.-.72*inset*slot*(1.-front);
     light+=color*coverage*intensity*signal*(.65+.35*core);
   }
 }
 if(f.flags.z>.5){
 for(var k=0;k<14;k++){
   let birth=.12+f32(k)*.09;let dt=t-birth;let life=.2+f32(k%3)*.045;
   let carrier=k%2;let sourceAge=birth-f32(carrier)*.18;
   if(dt>=0.&&dt<life&&sourceAge>=0.&&sourceAge<1.62){
     let side=select(-1.,1.,k%4>=2);
     let x=select(-.28,.28,carrier==1)+side*(.07+dt*.38);
     let velocity=(.2+2.24*sourceAge/1.62)/1.62;
     let sourceY=select(rise(sourceAge),.64,f.extra.x>.5);
     let drift=select(1.,.15,f.extra.x>.5);
     let y=sourceY+.25+drift*(dt*(.48+velocity*.35)-.18*dt*dt);
     let q=p-vec2f(x,y);let r=length(q);
     let radius=.017+f32(k%3)*.003;
     let radiance=3.2*sin(3.14159265*dt/life);
     let spot=(1.-smoothstep(radius-aa*.5,radius+aa*.5,r))*radiance;
     light+=vec3f(1.,.94,.42)*spot;spark+=spot;
   }
 }}
 // Alpha is a dedicated sparkle-source channel, not coverage; no alpha blending here.
 return vec4f(light,spark);
}
