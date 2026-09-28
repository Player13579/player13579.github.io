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
// Broad elastic reserve: the upper root stays near the hips, while the lower
// belly grows laterally under load. Signed coordinates retain an open top.
fn reserve(q:vec2f,side:f32,load:f32,stretch:f32)->vec3f{
 let y=(q.y+38.)/40.;let yy=clamp(y,0.,1.);let center=side*(5.+yy*11.+(12.+stretch*7.)*pow(sin(yy*3.14159),1.25));
 let width=(5.+load*8.)*pow(max(0.,sin(yy*3.14159)),.55)+.25;
 let dx=(q.x-center)/width;let ends=ease(0.,.10,y)*(1.-ease(.91,1.06,y));
 let mass=(1.-ease(.72,1.05,abs(dx)))*ends;
 let depth=sqrt(max(0.,1.-dx*dx));let core=bell(dx+side*.22,.43)*mass;
 return vec3f(mass,depth*mass,core);
}
@fragment fn fs(@builtin(position) p:vec4f)->@location(0) vec4f{
 let q=(p.xy-u.anchor.xy)/u.anchor.z;let t=u.screen.z;let alive=select(0.,1.,t>=0.&&t<1.38);let layers=i32(u.control.z);
 let sourceOn=select(0.,alive,(layers&1)!=0);let transferOn=select(0.,alive,(layers&2)!=0);let reserveOn=select(0.,alive,(layers&4)!=0);let obsOn=select(0.,1.,(layers&8)!=0);
 let skin=actor(q);let bg=vec3f(u.screen.w);
 // PH1: energy is generated within the load-bearing mid-body, not delivered
 // by a projectile. A broad vertical source seats once then empties downward.
 let birth=ease(0.,.09,t)*(1.-ease(.25,.46,t))*sourceOn;
 let source=bell(length((q-vec2f(0.,-29.))/vec2f(.75,1.2)),7.)*birth;
 // PH2: a pressure front travels from the core to both legs. Its path is a
 // continuous filled volume; no particle travel or floating icon.
 let descent=ease(.13,.58,t);let load=ease(.28,.71,t);let release=ease(1.03,1.38,t);
 let stretch=sin(3.14159*ease(.76,1.17,t))*(1.-u.control.y*.45);
 let local=vec2f(q.x/(1.-release*.40),(q.y+18.)/(1.-release*.30)-18.);
 let left=reserve(local,-1.,load,stretch);let right=reserve(local,1.,load,stretch*.78);
 let frontY=mix(-32.,2.,descent);let frontMask=1.-ease(frontY-3.,frontY+2.,q.y);
 let transport=ease(.11,.24,t)*(1.-ease(.60,.79,t))*transferOn;
 let arrival=bell(q.y-frontY,6.)*frontMask*transport;
 let stored=ease(.39,.68,t)*(1.-release)*reserveOn;
 let field=max(left,right);let filled=field.x*frontMask*(transport*.65+stored*.80);
 // The accumulated outside volume is translucent and behind the intact body.
 // It has a dark amber thickness gradient, a travelling bright inner layer,
 // and a later stretch wave that opens beyond the lower body's silhouette.
 let liftY=mix(0.,-28.,ease(.70,1.10,t));
 let recoil=bell(q.y-liftY,8.)*ease(.67,.82,t)*(1.-ease(1.10,1.29,t))*reserveOn;
 let leading=(arrival*.74+recoil*.66)*field.y;
 let backing=vec3f(.85,.22,.017)*filled*(.19+field.y*.23)+vec3f(1.,.66,.19)*(leading+field.z*stored*.25);
 let coverage=clamp(filled*.58,0.,.65);
 var scene=bg*(1.-coverage)+backing;
 scene=mix(scene,skin.rgb,skin.a);
 // On-body transfer remains a small localized front, never a uniform recolor.
 let bodyTransit=skin.a*bell(q.x,7.)*bell(q.y-frontY,6.)*transport;
 let sourceFaceMask=ease(-47.,-40.,q.y);
 scene+=vec3f(1.,.65,.22)*(source*.58*sourceFaceMask+bodyTransit*.31);
 // PH4: two broad, delayed compressions at the ankles show stored movement
 // potential. Their upward return is joined to the reserve rather than shed.
 let ankleLeft=bell(length((q-vec2f(-6.,-1.))/vec2f(1.2,.55)),7.)*ease(.48,.67,t)*(1.-ease(.82,1.03,t));
 let ankleRight=bell(length((q-vec2f(6.,-1.))/vec2f(1.2,.55)),7.)*ease(.57,.75,t)*(1.-ease(.94,1.14,t));
 let seat=(ankleLeft+ankleRight)*reserveOn;
 scene=scene*(1.-seat*.13)+vec3f(1.,.55,.10)*seat*.27;
 // OBS remains source-bound: local diffusion plus a brief pressure-front
 // flare. No global bloom, particles, new effect textures or screen flash.
 let halo=(source*.10+bell(length((q-vec2f(0.,-12.))/vec2f(1.2,1.)),23.)*stored*.07+seat*.11)*obsOn;
 let glint=bell(q.y-frontY,.85)*bell(q.x,12.)*transport*.11*obsOn;
 scene+=vec3f(1.,.46,.035)*(halo+glint);
 return vec4f(encode(scene),1.);
}
