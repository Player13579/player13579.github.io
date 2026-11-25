struct Uniforms { resolution: vec2<f32>, age: f32, outcome: f32, zoom: f32, mainOn: f32, observerOn: f32, reduced: f32 };
@group(0) @binding(0) var<uniform> u: Uniforms;
@vertex fn vs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4<f32> {
 let positions = array<vec2<f32>,3>(vec2<f32>(-1.,-1.),vec2<f32>(3.,-1.),vec2<f32>(-1.,3.));
 return vec4<f32>(positions[i],0.,1.);
}
fn box(p:vec2<f32>, b:vec2<f32>)->f32 { let q=abs(p)-b; return length(max(q,vec2<f32>(0.)))+min(max(q.x,q.y),0.); }
fn capsule(p:vec2<f32>, a:vec2<f32>, b:vec2<f32>, r:f32)->f32 { let v=b-a; let h=clamp(dot(p-a,v)/dot(v,v),0.,1.); return length(p-a-v*h)-r; }
fn person(p:vec2<f32>)->f32 {
 var d=length(p-vec2<f32>(0.,-25.))-6.;
 d=min(d,box(p-vec2<f32>(0.,-4.),vec2<f32>(8.,12.)));
 d=min(d,capsule(p,vec2<f32>(-10.,-12.),vec2<f32>(-14.,8.),3.));
 d=min(d,capsule(p,vec2<f32>(10.,-12.),vec2<f32>(14.,8.),3.));
 d=min(d,capsule(p,vec2<f32>(-4.,8.),vec2<f32>(-7.,29.),3.));
 return min(d,capsule(p,vec2<f32>(4.,8.),vec2<f32>(7.,29.),3.));
}
fn cov(d:f32)->f32 { return 1.-smoothstep(-.65,.65,d); }
fn pulse(t:f32,a:f32,b:f32,c:f32)->f32 { return smoothstep(a,b,t)*(1.-smoothstep(b,c,t)); }
fn glow(d:f32,w:f32)->f32 { return exp(-abs(d)/w); }
fn arc(p:vec2<f32>,radius:f32,width:f32,side:f32)->f32 {
 let gate=smoothstep(-5.,7.,p.x*side);
 return glow(length(p)-radius,width)*gate;
}
fn commitFace(p:vec2<f32>,t:f32,reverse:f32)->vec3<f32> {
 let approach=smoothstep(.06,.40,t);
 let closure=mix(54.,5.,approach);
 let sweep=clamp((t-.16)/.38,0.,1.);
 let cut=abs(p.x*.86+p.y*.51);
 let extent=1.-smoothstep(39.,44.,abs(-p.x*.51+p.y*.86));
 let skin=glow(cut-closure,1.15)*extent;
 let broad=glow(cut-closure,4.8)*extent*.22;
 let intensity=pulse(t,.02,.36,.68);
 let cyan=vec3<f32>(.10,.88,1.22); let amber=vec3<f32>(1.4,.34,.09);
 let col=mix(cyan,amber,reverse);
 return col*(skin*2.3+broad)*intensity;
}
@fragment fn fs(@builtin(position) pos:vec4<f32>)->@location(0) vec4<f32> {
 let scale=min(u.resolution.x/800.,u.resolution.y/440.)*u.zoom;
 let p=(pos.xy-u.resolution*.5)/scale+vec2<f32>(400.,220.);
 let t=u.age;
 let src=p-vec2<f32>(260.,225.); let dst=p-vec2<f32>(540.,225.);
 let sd=person(src); let td=person(dst);
 let effectEnabled=select(0.,u.mainOn,t>=0.);
 let success=select(0.,1.,u.outcome<.5);
 let failure=select(0.,1.,u.outcome>=.5 && u.outcome<1.5);
 let body=select(0.,1.,u.outcome>=1.5 && u.outcome<2.5);
 let blocked=select(0.,1.,u.outcome>=2.5);
 let erase=smoothstep(.34,.72,t);
 let eraseFront=clamp(erase*43.,0.,43.);
 let targetRemaining=1.-success*effectEnabled*smoothstep(.31,.35,t)*(1.-smoothstep(eraseFront-1.,eraseFront+1.,abs(dst.y)));
 let dead=smoothstep(.32,.68,t)*failure*effectEnabled;
 var col=vec3<f32>(.052,.074,.108);
 let sourceBase=mix(vec3<f32>(.50,.61,.69),vec3<f32>(.17,.20,.24),dead);
 col=mix(col,sourceBase,cov(sd));
 col=mix(col,vec3<f32>(.57,.64,.70),cov(td)*targetRemaining);
 let baseline1=cov(box(src-vec2<f32>(0.,43.),vec2<f32>(25.,.55)));
 let baseline2=cov(box(dst-vec2<f32>(0.,43.),vec2<f32>(25.,.55)));
 col+=vec3<f32>(.10,.14,.19)*(baseline1+baseline2);
 var light=vec3<f32>(0.);
 if(effectEnabled>0.){
   light+=commitFace(dst,t,0.)*success;
   let edge=glow(abs(dst.y)-eraseFront,1.1)*cov(td)*pulse(t,.20,.48,.80)*success;
   light+=vec3<f32>(.42,1.12,1.45)*edge*3.;
   let finalSeam=glow(length(dst*vec2<f32>(1.,.25)),2.1)*pulse(t,.59,.72,.94)*success;
   light+=vec3<f32>(.65,1.12,1.4)*finalSeam*2.;
   let launch=pulse(t,.65,.88,1.34)*success;
   let stride=select(t,t*.35,u.reduced>.5);
   let tracks=glow(abs(src.y-7.)-12.,1.1)*(1.-smoothstep(9.,42.,abs(src.x)));
   let trackGate=smoothstep(-37.,-8.,src.x)*(1.-smoothstep(8.,35.,src.x));
   light+=vec3<f32>(.14,.80,1.20)*tracks*trackGate*launch;
   for(var i=0u;i<3u;i++){
     let j=f32(i);
     let center=vec2<f32>(-18.+j*12.+sin(stride*8.+j)*1.5,15.-j*12.);
     let q=src-center;
     let star=max(glow(q.x,0.65)*glow(q.y,2.9),glow(q.y,0.65)*glow(q.x,2.9));
     light+=vec3<f32>(.65,1.05,1.3)*star*launch*(.65+j*.18);
   }
   light+=commitFace(src,t,1.)*failure;
   let breaks=glow(sd,1.0)*(1.-smoothstep(.24,.70,t))*pulse(t,.04,.22,.62)*failure;
   light+=vec3<f32>(1.4,.30,.12)*breaks*2.;
   let extinguish=cov(box(src-vec2<f32>(0.,mix(-29.,31.,smoothstep(.24,.71,t))),vec2<f32>(17.,1.1)))*pulse(t,.21,.40,.76)*failure;
   light+=vec3<f32>(1.2,.31,.09)*extinguish;
   let shell=arc(dst,36.,1.1,1.);
   light+=vec3<f32>(.12,.68,1.18)*shell*pulse(t,.03,.17,.44)*body*2.;
   let impact=glow(length((dst-vec2<f32>(10.,-5.))*vec2<f32>(.7,1.)),7.)*cov(td);
   light+=vec3<f32>(1.5,.60,.18)*impact*pulse(t,.17,.29,.59)*body*2.3;
   let preserve=cov(box(dst-vec2<f32>(0.,43.),vec2<f32>(25.,.8)))*pulse(t,.40,.65,1.05)*body;
   light+=vec3<f32>(.25,.62,.86)*preserve;
   let stopDistance=mix(61.,38.,smoothstep(.03,.24,t));
   let incoming=glow(dst.x-stopDistance,1.3)*(1.-smoothstep(12.,19.,abs(dst.y)));
   let stopShell=arc(dst,36.,1.2,1.)*pulse(t,.19,.32,.53);
   light+=vec3<f32>(.28,.78,1.15)*(incoming*pulse(t,.02,.23,.44)+stopShell)*blocked*2.;
   let retract=arc(dst,mix(36.,51.,smoothstep(.32,.68,t)),1.0,1.);
   light+=vec3<f32>(.18,.55,.90)*retract*pulse(t,.29,.40,.76)*blocked;
 }
 light*=effectEnabled;
 let emission=light;

 col+=emission;
 let mapped=col/(vec3<f32>(1.)+col*.45);
 return vec4<f32>(mapped,1.);
}
