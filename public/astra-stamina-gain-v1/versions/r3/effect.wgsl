struct Params { screen:vec4f, anchor:vec4f, control:vec4f };
@group(0) @binding(0) var<uniform> u:Params;
@group(0) @binding(1) var actorImage:texture_2d<f32>;
@group(0) @binding(2) var actorSampler:sampler;
@vertex fn vs(@builtin(vertex_index) i:u32)->@builtin(position) vec4f {
 let p=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));return vec4f(p[i],0,1);
}
fn encode(rgb:vec3f)->vec3f{return select(rgb*12.92,1.055*pow(max(rgb,vec3f(0.)),vec3f(1./2.4))-.055,rgb>vec3f(.0031308));}
@fragment fn fsBackground()->@location(0) vec4f {return vec4f(encode(vec3f(u.screen.w)),1.);}
fn ease(a:f32,b:f32,v:f32)->f32{return smoothstep(a,b,v);}
fn bell(x:f32,r:f32)->f32{return exp(-x*x/(r*r));}
fn actor(q:vec2f)->vec4f{
 let source=q*3.5+vec2f(128.,240.);let inside=select(0.,1.,all(source>=vec2f(0.))&&all(source<vec2f(256.)));
 return textureSampleLevel(actorImage,actorSampler,clamp(source,vec2f(.5),vec2f(255.5))/768.,0.)*inside;
}
fn curve(t:f32)->vec2f{
 let a=vec2f(-28.,-22.);let b=vec2f(-28.,-39.);let c=vec2f(-13.,-41.);let d=vec2f(-8.,-27.);let s=1.-t;
 return a*s*s*s+3.*b*s*s*t+3.*c*s*t*t+d*t*t*t;
}
fn route(q:vec2f)->vec2f{
 var nearest=1e5;var along=0.;var old=curve(0.);
 for(var i=1;i<=18;i++){
  let p=curve(f32(i)/18.);let dv=p-old;let k=clamp(dot(q-old,dv)/dot(dv,dv),0.,1.);let dist=length(q-old-k*dv);
  if(dist<nearest){nearest=dist;along=(f32(i-1)+k)/18.;}old=p;
 }return vec2f(nearest,along);
}
@fragment fn fs(@builtin(position) p:vec4f)->@location(0) vec4f {
 let q=(p.xy-u.anchor.xy)/u.anchor.z;let t=u.screen.z;let layers=i32(u.control.z);
 let alive=select(0.,1.,t>=0.&&t<1.38);
 let sourceOn=select(0.,alive,(layers&1)!=0);let flowOn=select(0.,alive,(layers&2)!=0);let bodyOn=select(0.,alive,(layers&4)!=0);let obsOn=select(0.,1.,(layers&8)!=0);
 let skin=actor(q);var base=mix(vec3f(u.screen.w),skin.rgb,skin.a);
 // PH1: a finite source contracts as its contents travel to the left waist.
 let consume=ease(.22,.61,t);let sourceCenter=vec2f(-32.+consume*5.,-19.-consume*5.);let sq=q-sourceCenter;
 let local=vec2f(.85*sq.x-.53*sq.y,.53*sq.x+.85*sq.y);
 let sourceMass=1.-ease(.78,1.02,length(local/vec2f(14.-consume*5.,8.-consume*3.)));
 let sourceCore=bell(length((local-vec2f(2.,.8))*vec2f(.7,1.4)),4.5)*sourceMass;
 let src=ease(0.,.11,t)*(1.-ease(.32,.64,t))*sourceOn;
 // PH2: a continuous, full-width tongue has an advancing front and draining tail.
 let travel=ease(.12,.54,t);let r=route(q);let width=8.*sqrt(max(0.,sin(3.14159265*r.y)))+1.;
 let section=min(width,8.*sqrt(clamp((travel+.02-r.y)/.18,0.,1.)))+.1;
 let tail=ease(.38,.76,t);
 let transfer=(1.-ease(section-.6,section+.6,r.x))*(1.-ease(travel-.02,travel+.02,r.y))*ease(tail-.22,tail,r.y);
 let feed=ease(.12,.23,t)*(1.-ease(.64,.80,t))*flowOn;
 let pathVisibility=mix(1.-skin.a,1.,ease(.58,.85,r.y));
 let transferMass=transfer*feed*pathVisibility;let transferCore=transferMass*bell(r.x,max(1.,section*.52));
 // PH3: source touches the actual body. Continuous supply propagates through
 // the sprite's alpha volume, illuminating cloth; no independent body icon.
 let rq=q-vec2f(-8.,-27.);
 let distance=length(rq*vec2f(1.,.87))+.13*abs(rq.x*rq.y)/12.;
 let release=ease(1.06,1.38,t);let contraction=select(.83,.45,u.control.y>0.);
 let radius=ease(.47,.98,t)*47.*(1.-release*contraction);
 let bodyMask=skin.a*ease(-48.,-40.,q.y);
 let expanded=max(max(actor(q+vec2f(2.,0.)).a,actor(q-vec2f(2.,0.)).a),max(actor(q+vec2f(0.,2.)).a,actor(q-vec2f(0.,2.)).a));
 let boundary=max(0.,expanded-skin.a)*ease(-48.,-40.,q.y);
 let filled=(1.-ease(radius-5.,radius+2.,distance))*ease(.46,.60,t)*(1.-release)*bodyOn;
 let front=bell(distance-radius+3.,4.5)*ease(.47,.61,t)*(1.-ease(.96,1.08,t))*bodyOn;
 let folds=.70+.30*bell((q.x+sin((q.y+27.)*.105)*4.)/1.2,9.);
 let volume=bodyMask*filled*folds;
 let entry=bell(length(rq/vec2f(1.,.85)),5.)*ease(.48,.59,t)*(1.-ease(.74,.92,t))*bodyOn;
 let surfaceLight=skin.a*(volume*.55+bodyMask*front*.70+entry*.42);
 base+=skin.rgb*vec3f(.85,.43,.035)*surfaceLight;
 let bodyCoverage=volume*.17;
 let bodyEmission=vec3f(1.,.54,.075)*(volume*.24+bodyMask*front*.68)+vec3f(1.,.93,.56)*entry*.60;
 base=base*(1.-bodyCoverage)+bodyEmission;
 let exterior=sourceMass*src*.68+transferMass*.64;
 let externalRadiance=vec3f(1.,.49,.045)*(sourceMass*src*.72+transferMass*.56)+vec3f(1.,.91,.47)*(sourceCore*src*.68+transferCore*.40);
 // OBS: near-field diffusion follows physical source/contact, with no full-frame lift.
 let nearGlow=(src*bell(length(sq),13.)*.15+feed*bell(length(q-curve(travel)),9.)*.14+entry*bell(length(rq),11.)*.15+boundary*filled*.17)*obsOn;
 let flare=bell(q.y+27.,.75)*bell(q.x+8.,10.)*entry*.2*obsOn;
 let rgb=base*(1.-clamp(exterior,0.,.84))+externalRadiance+vec3f(1.,.60,.14)*(nearGlow+flare);
 return vec4f(encode(rgb),1.);
}
