struct Params {screen:vec4f,anchor:vec4f,control:vec4f};
@group(0) @binding(0) var<uniform> u:Params;
@group(0) @binding(1) var actorImage:texture_2d<f32>;
@group(0) @binding(2) var actorSampler:sampler;
@vertex fn vs(@builtin(vertex_index) i:u32)->@builtin(position) vec4f{let p=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));return vec4f(p[i],0,1);}
fn encode(c:vec3f)->vec3f{return select(c*12.92,1.055*pow(max(c,vec3f(0.)),vec3f(1./2.4))-.055,c>vec3f(.0031308));}
@fragment fn fsBackground()->@location(0) vec4f{return vec4f(encode(vec3f(u.screen.w)),1.);}
fn bell(x:f32,w:f32)->f32{return exp(-x*x/(w*w));}
fn ease(a:f32,b:f32,x:f32)->f32{return smoothstep(a,b,x);}
fn actor(q:vec2f)->vec4f{let s=q*3.5+vec2f(128.,240.);let inside=select(0.,1.,all(s>=vec2f(0.))&&all(s<vec2f(256.)));return textureSampleLevel(actorImage,actorSampler,clamp(s,vec2f(.5),vec2f(255.5))/768.,0.)*inside;}
fn line(t:f32,uncoil:f32)->vec2f{
 let a=vec2f(-4.,-36.);let b=vec2f(56.+uncoil*14.,-37.-uncoil*9.);let c=vec2f(-49.-uncoil*22.,-10.-uncoil*5.);let d=vec2f(-3.,0.);
 let s=1.-t;return a*s*s*s+3.*b*s*s*t+3.*c*s*t*t+d*t*t*t;
}
fn along(q:vec2f,uncoil:f32)->vec2f{
 var nearest=1e5;var at=0.;var signed=0.;var old=line(0.,uncoil);
 for(var i=1;i<=24;i++){let p=line(f32(i)/24.,uncoil);let v=p-old;let k=clamp(dot(q-old,v)/dot(v,v),0.,1.);let off=q-old-k*v;let distance=length(off);if(distance<nearest){nearest=distance;at=(f32(i-1)+k)/24.;signed=select(-distance,distance,v.x*off.y-v.y*off.x>0.);}old=p;}return vec2f(signed,at);
}
@fragment fn fs(@builtin(position) p:vec4f)->@location(0) vec4f{
 let q=(p.xy-u.anchor.xy)/u.anchor.z;let t=u.screen.z;let alive=select(0.,1.,t>=0.&&t<1.38);let layers=i32(u.control.z);
 let sourceOn=select(0.,alive,(layers&1)!=0);let transferOn=select(0.,alive,(layers&2)!=0);let bodyOn=select(0.,alive,(layers&4)!=0);let obsOn=select(0.,1.,(layers&8)!=0);
 let skin=actor(q);let bg=vec3f(u.screen.w);
 // One asymmetric action line links the core across the waist to the loaded
 // left leg. Its large cross-section twists across the body rather than
 // forming independent side brackets, rings or an outside projectile.
 let loaded=ease(.27,.69,t);let release=ease(1.02,1.38,t);
 let uncoil=sin(3.14159*ease(.78,1.23,t))*(1.-u.control.y*.45);
 let local=vec2f(q.x/(1.-release*.35),q.y/(1.-release*.19));let r=along(local,uncoil);
 let width=(3.8+loaded*8.)*pow(max(0.,sin(r.y*3.14159)),.58)+.2;
 let x=r.x/width;let mass=(1.-ease(.77,1.05,abs(x)))*ease(0.,.055,r.y)*(1.-ease(.93,1.,r.y));
 let depth=sqrt(max(0.,1.-x*x));
 let front=ease(.10,.61,t);let flowing=(1.-ease(front-.025,front+.025,r.y))*ease(.05,.15,t)*(1.-ease(.59,.81,t))*transferOn;
 let stored=ease(.39,.67,t)*(1.-release)*ease(.27,.53,r.y)*bodyOn;
 let density=mass*(flowing*.74+stored*.80);
 // Width, front position, twist and thickness independently change. Light
 // crosses the volumetric section; the brighter seam remains broad at H64.
 let moving=bell(r.y-front+.045,.105)*flowing;
 let returnFront=mix(.95,.38,ease(.72,1.12,t));
 let returning=bell(r.y-returnFront,.14)*ease(.68,.83,t)*(1.-ease(1.11,1.31,t))*bodyOn;
 let inner=bell(x+.28*cos(r.y*5.),.38)*mass;
 let radiance=vec3f(.93,.28,.018)*density*(.24+depth*.34)+vec3f(1.,.82,.34)*(moving*.86+returning*.68)*inner+vec3f(1.,.59,.11)*inner*stored*.22;
 let coverage=clamp(density*.53,0.,.68);
 let fieldBack=bg*(1.-coverage)+radiance;
 var scene=mix(fieldBack,skin.rgb,skin.a);
 // A short segment crosses in front of the mid-body and upper left thigh;
 // another is behind the supporting leg. The torso-to-leg link stays visible.
 let frontOfBody=(ease(.29,.40,r.y)*(1.-ease(.68,.79,r.y)))*skin.a;
 scene=scene*(1.-coverage*frontOfBody*.68)+radiance*frontOfBody*.77;
 let birth=ease(0.,.08,t)*(1.-ease(.22,.40,t))*sourceOn;
 let source=bell(length((q-vec2f(-3.,-32.))/vec2f(1.2,.70)),7.)*birth*skin.a;
 scene+=vec3f(1.,.74,.30)*source*.58;
 // The loaded supporting foot briefly seats, then its light travels back up
 // the same action line. The opposite foot remains visually quiet.
 let heel=bell(length((q-vec2f(-4.,0.))/vec2f(1.4,.48)),7.5)*ease(.51,.68,t)*(1.-ease(.91,1.12,t))*bodyOn;
 scene=scene*(1.-heel*.11)+vec3f(1.,.58,.09)*heel*.36;
 let tip=line(front,uncoil);let reservoir=line(returnFront,uncoil);
 let glow=(birth*bell(length(q-vec2f(-3.,-32.)),10.)*.06+bell(length(q-tip),9.)*moving*.10+bell(length(q-reservoir),11.)*returning*.11+heel*.08)*obsOn;
 scene+=vec3f(1.,.43,.026)*glow;
 return vec4f(encode(scene),1.);
}
