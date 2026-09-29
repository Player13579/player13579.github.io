struct Settings { view: vec4f, sourceTarget: vec4f, rect:vec4f, phase:vec4f, flags:vec4f };
@group(0) @binding(0) var<uniform> u:Settings;
struct VOut { @builtin(position) pos:vec4f };
@vertex fn vs(@builtin(vertex_index) i:u32)->VOut {
 let v=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3)); var o:VOut; o.pos=vec4f(v[i],0,1); return o;
}
fn sdBox(p:vec2f,b:vec2f)->f32 { let q=abs(p)-b; return length(max(q,vec2f(0)))+min(max(q.x,q.y),0.0); }
fn aa(d:f32)->f32{return 1.0-smoothstep(-.55,.55,d);}
fn cover(d:f32,w:f32)->f32{return 1.0-smoothstep(w-.65,w+.65,d);}
fn env(t:f32,a:f32,b:f32,c:f32)->f32 {if(t<a||t>=c){return 0;}if(t<b){return sin((t-a)/(b-a)*1.5707963);}return cos((t-b)/(c-b)*1.5707963);}
fn pointAt(v:f32)->vec2f {
 let a=u.sourceTarget.xy;let b=u.sourceTarget.zw;let c=mix(a,b,.49)+vec2f(0,-min(38.0,length(b-a)*.23));
 return (1-v)*(1-v)*a+2*v*(1-v)*c+v*v*b;
}
fn star(p:vec2f,size:f32)->f32 {
 let cs=cos(.2617994);let sn=sin(.2617994);let q=vec2f(cs*p.x+sn*p.y,-sn*p.x+cs*p.y);
 let horizontal=exp(-abs(q.x)/size*3.0)*exp(-q.y*q.y/.72);
 let vertical=exp(-abs(q.y)/(size*.58)*3.0)*exp(-q.x*q.x/.72);
 return (horizontal+vertical)*cover(length(q),size);
}
fn bottle(p:vec2f)->f32 {return max(aa(sdBox(p-vec2f(0,2),vec2f(4.3,6))),aa(sdBox(p-vec2f(0,-6),vec2f(2.0,2.0))));}
@fragment fn fs(@builtin(position) pos:vec4f)->@location(0) vec4f {
 let p=pos.xy/u.view.z;let t=u.view.w;let source=u.sourceTarget.xy;let receiver=u.sourceTarget.zw;let rect=u.rect;
 let dark=u.flags.x<.5;var bg=select(vec3f(.80,.82,.86),vec3f(.027,.039,.06),dark);var color=bg;
 let slotCenter=rect.xy+rect.zw*.5;let slotSdf=sdBox(p-slotCenter,rect.zw*.5);
 // Existing scene/UI fixture. This is not an E-generated reward overlay.
 let frame=cover(abs(slotSdf),.85);let inside=aa(slotSdf+1.0);
 color=mix(color,select(vec3f(.33,.37,.43),vec3f(.11,.15,.20),dark),inside*.95);
 color=mix(color,vec3f(.42,.49,.57),frame*.8);
 let originItem=bottle(p-source)*select(1.0,0.0,t>=.18);
 color=mix(color,vec3f(.27,.58,.67),originItem);
 let receivedItem=bottle(p-slotCenter)*select(0.0,1.0,t>=.80);
 color=mix(color,vec3f(.27,.58,.67),receivedItem);
 var body=vec3f(0);var emission=vec3f(0);var obs=vec3f(0);var alpha=0.0;
 let release=env(t,0,.075,.22);let transport=env(t,.10,.25,.84);let receipt=env(t,.76,.85,1.48);
 let motion=clamp((t-.12)/.66,0.0,1.0);let reduced=u.flags.z>.5;
 let head=pointAt(motion);let sourceFlash=env(t,.015,.065,.17)*u.flags.w;let receiptFlash=env(t,.77,.82,1.0);
 let sourceDistance=length(p-source);let opening=cover(abs(length((p-source)/vec2f(1.0,.6))-9.0),2.0)*release*u.flags.w;
 body+=vec3f(.96,.43,.035)*opening*.64;alpha=max(alpha,opening*.64);
 emission+=vec3f(1.15,.71,.17)*opening*.68;
 if(u.flags.w>.5&&!reduced&&transport>.001&&length(receiver-source)>4.0){
  var nearest=1e5;var at=0.0;
  // Numerical projection is deterministic; distance to continuous segment avoids dots.
  for(var k=0u;k<40u;k++){
   let a=f32(k)/40.0;let b=f32(k+1u)/40.0;let pa=pointAt(a);let pb=pointAt(b);let dv=pb-pa;
   let h=clamp(dot(p-pa,dv)/max(dot(dv,dv),.0001),0.0,1.0);let d=length(p-mix(pa,pb,h));
   if(d<nearest){nearest=d;at=mix(a,b,h);}
  }
  let lag=motion-at;let packet=smoothstep(-.018,.015,lag)*(1.0-smoothstep(.17,.29,lag));
  let tip=1.0-smoothstep(.015,.18,lag); // Width is a broad head, tapered wake, not three parallel rods.
  let width=mix(2.1,6.5,tip)*(1.0-.3*motion);
  let carrier=cover(nearest,width)*packet*transport;
  let core=cover(nearest,1.25)*packet*transport;
  alpha=max(alpha,carrier*.72);body+=mix(vec3f(.93,.31,.025),vec3f(1.0,.72,.16),tip)*carrier*.72;
  emission+=vec3f(1.2,.79,.24)*carrier*.86+vec3f(2.2,1.92,1.21)*core*.92;
  // A concave lower wake gives an independently phased return face.
  let lower=cover(length(p-(pointAt(max(0.0,motion-.13))+vec2f(0,4.2))),4.0)*transport*(1.0-motion);
  body+=vec3f(.73,.30,.04)*lower*.40;alpha=max(alpha,lower*.40);emission+=vec3f(.72,.39,.09)*lower*.35;
  obs+=vec3f(1.45,.81,.20)*exp(-dot(p-head,p-head)/98.0)*transport*.75;
 }
 // Contact front travels in two directions from the real slot's left-middle.
 let local=p-slotCenter;let rx=rect.z*.5;let ry=rect.w*.5;var distanceAlong=0.0;
 if(abs(local.x)>abs(local.y)*rx/ry){
  if(local.x<0.0){distanceAlong=abs(local.y);}else{distanceAlong=ry+2*rx+(ry-abs(local.y));}
 }else{distanceAlong=ry+(local.x+rx);}
 let total=2*(rx+ry);let fill=clamp((t-.78)/.29,0.0,1.0)*total;
 let arrived=1.0-smoothstep(fill-.8,fill+.8,distanceAlong);
 let rim=cover(abs(slotSdf),1.8)*arrived*receipt;
 body+=vec3f(1.0,.60,.07)*rim*.73;alpha=max(alpha,rim*.73);emission+=vec3f(1.6,1.03,.26)*rim;
 let contact=exp(-dot(p-receiver,p-receiver)/80.0)*receiptFlash;
 obs+=vec3f(1.80,.91,.26)*contact;
 let sweepProgress=clamp((t-1.02)/.35,0.0,1.0);let sweepX=rect.x+sweepProgress*rect.z;
 let settle=exp(-pow((p.x-sweepX)/5.0,2.0))*inside*env(t,.98,1.12,1.48);
 body+=vec3f(.94,.60,.13)*settle*.25;alpha=max(alpha,settle*.25);emission+=vec3f(.98,.67,.24)*settle*.75;
 let flashed=star(p-source,14.0)*sourceFlash+star(p-receiver,14.0)*receiptFlash;
 obs+=vec3f(2.4,2.09,1.4)*flashed;
 if(reduced){obs+=vec3f(.94,.68,.24)*(exp(-dot(p-source,p-source)/55.0)*release+contact);}
 // Every RGB term has its own coverage applied exactly once, then premultiplied source-over.
 color=color*(1.0-alpha)+body+emission;
 if(u.flags.y>.5){color+=obs;}
 return vec4f(color,1.0);
}

