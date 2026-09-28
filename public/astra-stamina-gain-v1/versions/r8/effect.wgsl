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
@fragment fn fs(@builtin(position) p:vec4f)->@location(0) vec4f{
 let q=(p.xy-u.anchor.xy)/u.anchor.z;let t=u.screen.z;let alive=select(0.,1.,t>=0.&&t<1.38);let layers=i32(u.control.z);
 let sourceOn=select(0.,alive,(layers&1)!=0);let transferOn=select(0.,alive,(layers&2)!=0);let bodyOn=select(0.,alive,(layers&4)!=0);let obsOn=select(0.,1.,(layers&8)!=0);
 let skin=actor(q);let bg=vec3f(u.screen.w);var scene=mix(bg,skin.rgb,skin.a);
 let body=skin.a*ease(-43.,-37.,q.y);
 // PH1: a finite pressure source inside the actual trunk. The face and
 // authored silhouette remain untouched; no outside object is received.
 let birth=ease(0.,.075,t)*(1.-ease(.22,.42,t))*sourceOn;
 let sq=q-vec2f(2.,-31.);let birthShape=vec2f(7.+3.*sin(3.14159*ease(0.,.25,t)),4.+6.*ease(.06,.24,t));
 let sourceBody=exp(-dot(sq/birthShape,sq/birthShape))*body*birth;
 let sourceCore=bell(length((sq-vec2f(-1.,1.))/vec2f(.80,1.)),3.4)*body*birth;
 // PH2: a thick, tapered internal flow follows the trunk, pelvis and existing
 // supporting leg. A travelling front empties the upper part as it fills below.
 let down=ease(.14,.58,t);let frontY=mix(-31.,-1.,down);
 let along=clamp((q.y+31.)/32.,0.,1.);let axis=2.-7.*ease(.08,.78,along);
 let width=7.4-2.0*ease(.60,1.,along);let cross=(q.x-axis)/width;
 let section=bell(cross,1.)*body;
 let flow=ease(.12,.23,t)*(1.-ease(.59,.79,t))*transferOn;
 let trail=ease(-36.,-30.,q.y)*(1.-ease(frontY-.4,frontY+3.,q.y))*exp(-max(0.,frontY-q.y)/14.);
 let head=bell(q.y-frontY,5.6)*section*flow;
 let interior=section*trail*flow;
 // PH3: load compresses onto the real support foot, then stretches upward
 // along the same leg. This is a moving volume, not a changed garment color.
 let load=ease(.48,.68,t)*(1.-ease(1.03,1.38,t))*bodyOn;
 let stretch=ease(.76,1.12,t);let stretchAmount=stretch*(1.-u.control.y*.30);
 let coreY=mix(-13.,-25.,stretchAmount);let lengthY=mix(13.,20.,stretchAmount);
 let reserve=bell(length((q-vec2f(-4.,coreY))/vec2f(.58,1.)),lengthY)*body*load;
 let peakY=mix(-2.,-28.,stretchAmount);
 let livePeak=bell(length((q-vec2f(-4.,peakY))/vec2f(.72,1.)),4.4)*body*load;
 let skinLight=sourceBody*.18+interior*.14+reserve*.13;
 scene+=skin.rgb*vec3f(.7,.39,.10)*skinLight;
 // Deliberately separate hot load points, broad internal volume, and a thin
 // translucent outside diffusion. High source luminance is local, not global.
 let volume=sourceBody*.40+interior*.48+head*.30+reserve*.45;
 let hot=sourceCore*1.60+head*head*.72+livePeak*1.10;
 scene=scene*(1.-clamp(volume*.15,0.,.20))+vec3f(1.,.46,.055)*volume+vec3f(1.,.89,.55)*hot;
 let extent=max(max(actor(q+vec2f(3.,0.)).a,actor(q-vec2f(3.,0.)).a),max(actor(q+vec2f(0.,2.)).a,actor(q-vec2f(0.,2.)).a));
 let outside=max(0.,extent-skin.a)*ease(-43.,-37.,q.y);
 let localLayer=outside*(bell(q.y-frontY,11.)*flow*.24+bell(q.y-coreY,17.)*load*.26)*bell(q.x+2.,15.);
 scene=scene*(1.-localLayer*.23)+vec3f(1.,.64,.15)*localLayer;
 // PH4: one shallow support reaction, filled rather than ring-shaped, seats
 // under the existing foot. Its brief expansion follows load, then drains.
 let contact=ease(.49,.60,t)*(1.-ease(.79,1.00,t))*bodyOn;
 let release=ease(.77,1.05,t);
 let heel=bell(length((q-vec2f(-4.,.6))/vec2f(1.0,.44)),4.8)*contact;
 let ground=bell((q.x+5.)/(1.+release*.28),11.)*bell(q.y-2.3+.025*(q.x+5.),1.5)*contact;
 scene=scene*(1.-ground*.10)+vec3f(1.,.89,.53)*heel*1.9+vec3f(1.,.52,.06)*ground*.24;
 // OBS: physically local diffusion from the actual pressure source/front/load.
 let diffuse=(bell(length(sq),10.)*birth*.09+bell(length(q-vec2f(axis,frontY)),9.)*flow*.07+bell(length(q-vec2f(-4.,coreY)),9.)*load*.08+bell(length(q-vec2f(-4.,.6)),7.)*contact*.14)*obsOn;
 let flare=bell(q.y-.6,.60)*bell(q.x+4.,11.)*contact*.32*obsOn;
 scene+=vec3f(1.,.53,.06)*(diffuse+flare);
 return vec4f(encode(scene),1.);
}

