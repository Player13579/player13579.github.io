// Astra r11: angular adhered crust obscures separate body contours; split peel restores them.
export const shader=/*wgsl*/`
struct Uniforms { viewport:vec2f, center:vec2f, height:f32, phase:f32, light:f32, reduced:f32 };
@group(0) @binding(0) var<uniform> u:Uniforms;
@group(0) @binding(1) var actor:texture_2d<f32>;
@group(0) @binding(2) var samp:sampler;
@vertex fn vs(@builtin(vertex_index) i:u32)->@builtin(position) vec4f {
 let v=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));return vec4f(v[i],0.,1.);
}
fn ease(a:f32,b:f32,x:f32)->f32{return smoothstep(a,b,x);}
fn actorSample(uv:vec2f)->vec4f {
 let xy=uv*116.+vec2f(63.5,63.5);
 if(any(xy<vec2f(0.))||any(xy>=vec2f(128.))){return vec4f(0.);}
 return textureSampleLevel(actor,samp,xy/vec2f(2560.,1536.),0.);
}
fn face(uv:vec2f)->f32 {
 return (1.-ease(.13,.23,abs(uv.x)))*ease(-.44,-.32,uv.y)*(1.-ease(-.02,.085,uv.y));
}
fn bodyZone(uv:vec2f)->f32{return ease(-.19,-.12,uv.y)*(1.-ease(.43,.51,uv.y))*(1.-face(uv));}
fn sheathMask(uv:vec2f)->f32 {
 let pad=.065;
 let body=max(max(actorSample(uv+vec2f(pad,0.)).a,actorSample(uv-vec2f(pad,0.)).a),max(actorSample(uv+vec2f(0.,pad)).a,actorSample(uv-vec2f(0.,pad)).a));
 // Three broad, broken facets. Angular cut ends do not follow the skirt hem.
 let top=-.17+.17*abs(sin(uv.x*15.+.9));
 let bottom=.30+.11*cos(uv.x*18.-.8);
 let left=-.32-.08*abs(sin(uv.y*12.+.4));
 let right=.28+.10*abs(sin(uv.y*13.-.6));
 let outline=ease(left-.007,left+.007,uv.x)*(1.-ease(right-.007,right+.007,uv.x))*ease(top-.007,top+.007,uv.y)*(1.-ease(bottom-.007,bottom+.007,uv.y));
 return body*outline*(1.-face(uv));
}
fn coatColor(uv:vec2f,turn:f32)->vec3f {
 let ridge=abs(uv.y+.72*uv.x-.105);
 let facet=ease(.02,.08,ridge);
 let broadCut=ease(-.025,.025,uv.y-.52*uv.x-.16);
 let base=mix(vec3f(.24,.12,.32),vec3f(.052,.023,.082),facet);
 return base*(.82+.32*abs(cos(turn)))+vec3f(.06,.02,.09)*broadCut;
}
@fragment fn fs(@builtin(position) pix:vec4f)->@location(0) vec4f {
 let bg=mix(vec3f(.015,.028,.045),vec3f(.79,.825,.85),u.light);
 let uv=(pix.xy-u.center)/u.height;let p=u.phase;
 if(abs(uv.x)>1.1||abs(uv.y)>1.3){return vec4f(bg,1.);}
 let spr=actorSample(uv);let isLive=select(0.,1.,p>=0.&&p<1.);
 var behind=bg;var foreColor=vec3f(0.);var foreAlpha=0.;var contactAlpha=0.;var contactColor=vec3f(0.);var receiver=vec3f(0.);
 for(var n=0;n<2;n++){
  // The right half folds behind the receiver; the left half turns toward us.
  let side=select(1.,-1.,n==1);let frontSide=n==1;
  let start=select(.18,.10,n==1);let end=select(.83,.74,n==1);
  let r=ease(start,end,p);let rootX=side*(.012+.37*r);
  let half=ease(-.015,.015,side*uv.x);
  let stillAttached=ease(-.016,.016,side*(uv.x-rootX));
  let contact=sheathMask(uv)*half*stillAttached*(1.-ease(.84,1.,r))*isLive;
  let cc=coatColor(uv,0.);
  contactColor=contactColor*(1.-contact)+cc*contact;
  contactAlpha=contactAlpha+(1.-contactAlpha)*contact;
  // A hinge, not a translated sprite duplicate. Source point at the root has
  // exactly zero displacement until the late fully detached phase.
  let angle=2.52*ease(0.,.48,r)+.34*ease(.78,1.,r);
  let cosine=cos(angle);let projection=select(cosine,.035,abs(cosine)<.035);
  let release=.14*ease(.78,1.,r)*(1.-u.reduced*.55);
  let translatedRoot=rootX+side*release;
  let localX=(uv.x-translatedRoot)/projection;
  let depth=localX*sin(angle)*select(-1.,1.,frontSide);
  let bow=.12*ease(0.,.35,r)*pow(clamp(abs(localX)/.36,0.,1.4),2.);
  let source=vec2f(rootX+localX,uv.y+depth*.42+bow);
  let releasedHalf=(1.-ease(-.01,.012,side*(source.x-rootX)))*ease(-.01,.01,side*source.x);
  let hold=ease(0.,.04,r)*(1.-ease(.79,1.,r));
  let sheet=sheathMask(source)*releasedHalf*hold*isLive;
  let tip=exp(-pow(localX/.026,2.));
  let border=(1.-sheathMask(source+vec2f(side*.025,0.)))*sheet;
  let film=coatColor(source,angle)+vec3f(.10,.065,.17)*ease(.6,2.6,angle)+vec3f(.65,.50,.28)*(tip*.65+border*.36)*ease(.03,.17,r);
  let coverage=clamp(sheet*(.79+.17*abs(cosine)),0.,.98);
  if(frontSide){foreColor=foreColor*(1.-coverage)+film*coverage;foreAlpha=foreAlpha+(1.-foreAlpha)*coverage;}
  else{behind=mix(behind,film,coverage);}
  // Newly exposed body stays spatially registered. A broad reveal front and
  // inner-body response show the receiver changing, without recolouring all of it.
  let cleanFront=exp(-pow((uv.x-rootX)/.044,2.))*ease(.02,.12,r)*(1.-ease(.80,1.,r));
  let exposed=(1.-stillAttached)*half;
  let recovery=exposed*ease(.05,.22,r)*(1.-ease(.58,.95,p));
  receiver+=vec3f(.86,.74,.42)*cleanFront*bodyZone(uv)*isLive;
 }
 var color=mix(behind,spr.rgb+receiver,spr.a);
 color=color*(1.-contactAlpha)+contactColor;
 color=color*(1.-foreAlpha)+foreColor;
 // Short alpha-bound clean edge, never a freestanding ring around the actor.
 let step=1.5/u.height;
 let expanded=max(max(actorSample(uv+vec2f(step,0.)).a,actorSample(uv-vec2f(step,0.)).a),max(actorSample(uv+vec2f(0.,step)).a,actorSample(uv-vec2f(0.,step)).a));
 let rim=max(0.,expanded-spr.a)*bodyZone(uv);
 color+=vec3f(.44,.35,.16)*rim*ease(.42,.60,p)*(1.-ease(.64,.82,p))*isLive;
 return vec4f(color,1.);
}`;
