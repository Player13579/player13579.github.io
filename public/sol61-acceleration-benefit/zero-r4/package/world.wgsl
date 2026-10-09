fn box(p:vec2f,b:vec2f)->f32 {let q=abs(p)-b;return length(max(q,vec2f(0.)))+min(max(q.x,q.y),0.);}
fn head(p:vec2f)->f32 {return max(-p.y,max(p.y-.23,abs(p.x)*.787+p.y*.616-.142));}
fn arrow(p:vec2f)->f32 {return min(box(p-vec2f(0.,-.105),vec2f(.062,.145)),head(p));}
@fragment fn fragment(@builtin(position) pixel:vec4f)->@location(0) vec4f {
 let t=f.viewport.z;
 if(t<0.||t>=1.8||f.flags.x<.5){return vec4f(0.);}
 let scale=f.anchor.z;let aa=.7/scale;
 let p=vec2f((pixel.x-f.anchor.x)/scale,(f.anchor.y-pixel.y)/scale);
 var light=vec3f(0.);var spark=0.;
 for(var i=0;i<2;i++){
  let age=t-f32(i)*.18;
  if(age>=0.&&age<1.62){
   let u=age/1.62;let y=select(rise(age),.64,f.extra.x>.5);let x=select(-.28,.28,i==1);
   let q=p-vec2f(x,y);let d=arrow(q);
   let coverage=1.-smoothstep(-aa,aa,d);
   let envelope=smoothstep(0.,.1,age)*(1.-smoothstep(1.38,1.62,age));
   // Hollow field boundary retains crisp geometric reading without a flat yellow panel.
   let rim=1.-smoothstep(.012,.012+aa,abs(d));
   let front=smoothstep(-.23,.19,q.y);
   let color=mix(vec3f(1.,.21,.018),vec3f(1.,.83,.13),front);
   let travel=fract(age*(1.8+u*.8));
   let packetY=-.26+.5*travel;
   let packet=exp(-pow((q.y-packetY)/.047,2.))*pow(sin(3.14159265*travel),.6);
   // Two finite transverse breaks, not a full-screen scanline or noise.
   let slotA=1.-smoothstep(.008,.008+aa,abs(q.y+.165));
   let slotB=1.-smoothstep(.008,.008+aa,abs(q.y+.075));
   let stemGate=1.-smoothstep(.0,.014,q.y);
   let gate=1.-.88*max(slotA,slotB)*stemGate;
   let boundary=rim*(2.2+3.8*packet)*gate;
   let interior=coverage*(.07+.45*packet)*gate;
   light+=(color*boundary+mix(color,vec3f(1.,.97,.6),packet)*interior)*envelope;
  }
 }
 if(f.flags.z>.5){for(var k=0;k<32;k++){
  let e=emitter(t,k);
  if(e.flux>0.){
   let q=p-e.center;let r=length(q);
   let spot=(1.-smoothstep(e.radius-aa*.35,e.radius+aa*.65,r))*e.flux;
   light+=vec3f(1.,.94,.49)*spot;spark+=spot;
  }
 }}
 // Dedicated finite point-source channel, never opacity/coverage.
 return vec4f(light,spark);
}
