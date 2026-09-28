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
 let deformed=vec2f(local.x+.065*local.y*local.y,local.y);
 let notch=ease(.70,1.06,length((local-vec2f(-3.,-7.))/vec2f(9.,5.)));
 let sourceMass=(1.-ease(.78,1.02,length(deformed/vec2f(14.-consume*5.,8.-consume*3.))))*notch;
 let sourceCore=bell(local.y-2.+.018*local.x*local.x,2.3)*bell(local.x-1.,8.)*sourceMass;
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
 // Different transit times reveal where the received supply goes. A quick
 // chest/shoulder rise seats first, followed by the central reservoir and
 // two broad downward streams at unequal speeds. Everything is alpha-bound.
 let upward=ease(.54,.77,t);let downLeft=ease(.67,1.05,t);let downRight=ease(.76,1.15,t);
 let upCenter=mix(vec2f(-8.,-27.),vec2f(0.,-42.),upward);
 let upper=bell(length((q-upCenter)/vec2f(1.,1.3)),6.2)*ease(.51,.60,t)*(1.-ease(.80,.97,t));
 let leftAxis=-3.8+2.*sin((q.y+25.)*.12);
 let rightAxis=3.8-1.3*sin((q.y+23.)*.11);
 let leftStream=bell(q.x-leftAxis,4.3)*bell(q.y-mix(-26.,-1.,downLeft),8.)*ease(.64,.75,t)*(1.-ease(1.07,1.24,t));
 let rightStream=bell(q.x-rightAxis,4.5)*bell(q.y-mix(-25.,-1.,downRight),7.)*ease(.73,.84,t)*(1.-ease(1.17,1.34,t));
 let seat=bell(q.x,8.5)*bell(q.y+27.,12.)*ease(.66,.83,t)*(1.-ease(.91,1.20,t));
 let streams=bodyMask*(upper*.62+leftStream*.56+rightStream*.46+seat*.18)*bodyOn;
 let folds=.55+.45*bell(q.x+sin((q.y+27.)*.105)*4.,8.);
 let volume=bodyMask*filled*folds;
 let entry=bell(length(rq/vec2f(1.,.85)),5.)*ease(.48,.59,t)*(1.-ease(.74,.92,t))*bodyOn;
 let surfaceLight=skin.a*(volume*.18+bodyMask*front*.18+entry*.32+streams*.82);
 base+=skin.rgb*vec3f(.85,.43,.035)*surfaceLight;
 let bodyCoverage=volume*.09;
 let bodyEmission=vec3f(1.,.44,.035)*(volume*.045+bodyMask*front*.10+streams*.54)+vec3f(1.,.87,.38)*(entry*.46+streams*streams*.66);
 base=base*(1.-bodyCoverage)+bodyEmission;
 // A few broad, short secondary layers leave the actual silhouette where
 // the inner front arrives. Their moving local peaks are readable at H64.
 // They are neither free particles nor persistent contour decoration.
 let shoulderPhase=ease(.62,.82,t);let hipPhase=ease(.79,1.00,t);let hemPhase=ease(.94,1.20,t);
 let shoulderPulse=ease(.62,.70,t)*(1.-ease(.77,.90,t))*bodyOn;
 let hipPulse=ease(.79,.87,t)*(1.-ease(.95,1.09,t))*bodyOn;
 let hemPulse=ease(.94,1.03,t)*(1.-ease(1.14,1.30,t))*bodyOn;
 let leftShell=max(0.,actor(q+vec2f(2.+shoulderPhase*4.,0.)).a-skin.a)*select(0.,1.,q.x<0.);
 let rightShell=max(0.,actor(q-vec2f(2.+hipPhase*5.,0.)).a-skin.a)*select(0.,1.,q.x>0.);
 let lowerShell=max(0.,actor(q+vec2f(2.+hemPhase*5.,0.)).a-skin.a)*select(0.,1.,q.x<0.);
 let shoulderLayer=leftShell*bell(q.y-mix(-32.,-39.,shoulderPhase),8.)*shoulderPulse;
 let hipLayer=rightShell*bell(q.y-mix(-29.,-16.,hipPhase),9.)*hipPulse;
 let hemLayer=lowerShell*bell(q.y-mix(-17.,-4.,hemPhase),8.)*hemPulse;
 let secondary=shoulderLayer+hipLayer+hemLayer;
 let movingPeak=bodyMask*(bell(length((q-vec2f(-5.,mix(-32.,-39.,shoulderPhase)))/vec2f(1.,1.4)),4.)*shoulderPulse+bell(length((q-vec2f(7.,mix(-29.,-16.,hipPhase)))/vec2f(1.,1.4)),4.5)*hipPulse+bell(length((q-vec2f(-4.,mix(-17.,-4.,hemPhase)))/vec2f(1.,1.4)),4.5)*hemPulse);
 base=base*(1.-secondary*.25)+vec3f(1.,.57,.10)*(secondary*.48+movingPeak*.32)+vec3f(1.,.90,.49)*movingPeak*.26;
 let exterior=sourceMass*src*.68+transferMass*.64;
 let externalRadiance=vec3f(1.,.49,.045)*(sourceMass*src*.64+transferMass*.48)+vec3f(1.,.91,.47)*(sourceCore*src*.56+transferCore*.20);
 // OBS: near-field diffusion follows physical source/contact, with no full-frame lift.
 let nearGlow=(src*bell(length(sq),13.)*.15+feed*bell(length(q-curve(travel)),9.)*.14+entry*bell(length(rq),11.)*.15+boundary*filled*.17)*obsOn;
 let flare=bell(q.y+27.,.75)*bell(q.x+8.,10.)*entry*.2*obsOn;
 let rgb=base*(1.-clamp(exterior,0.,.84))+externalRadiance+vec3f(1.,.60,.14)*(nearGlow+flare);
 return vec4f(encode(rgb),1.);
}
