// Astra r0.6: actual actor, removal front, peeling status fixture, clean afterglow.
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
 // Frame 0: cell 128x128, inclusive alpha bounds [27,6,100,121], H=116.
 let xy=uv*116.+vec2f(63.5,63.5);
 if(any(xy<vec2f(0.))||any(xy>=vec2f(128.))){return vec4f(0.);}
 return textureSampleLevel(actor,samp,xy/vec2f(2560.,1536.),0.);
}
fn boundary(p:f32)->f32{return -.59+1.29*ease(.09,.72,p);}
fn radial(q:vec3f,p:f32)->f32 {
 let theta=atan2(q.z,q.x);
 return length(q.xz)-(.41+.025*cos(theta*3.+.3)+.14*ease(.56,.90,p));
}
fn normal(q:vec3f)->vec3f{return normalize(vec3f(q.x,0.,q.z));}
@fragment fn fs(@builtin(position) pix:vec4f)->@location(0) vec4f {
 let bg=mix(vec3f(.015,.028,.045),vec3f(.79,.825,.85),u.light);
 let uv=(pix.xy-u.center)/u.height;let p=u.phase;
 if(abs(uv.x)>.95||abs(uv.y)>1.3){return vec4f(bg,1.);}
 let isLive=select(0.,1.,p>=0.&&p<1.);
 let env=ease(.01,.10,p)*(1.-ease(.78,1.,p))*isLive;
 let front=boundary(clamp(p-.045*(1.-ease(-.10,.10,uv.x)),0.,1.));let worldY=-uv.y;
 let spr=actorSample(uv);var actorColor=spr.rgb;
 // A preview-only adverse veil. It is not an invented poison/burn game event.
 let uncleared=(1.-ease(worldY-.025,worldY+.035,front))*isLive;
 let luminance=dot(actorColor,vec3f(.21,.72,.07));
 let stained=mix(actorColor,vec3f(luminance)*vec3f(.60,.39,.72),.72);
 actorColor=mix(actorColor,stained,uncleared*.80);
 let localAge=front-worldY;
 let localRelease=ease(0.,.06,localAge)*exp(-max(0.,localAge)*5.)*env;
 actorColor+=vec3f(.16,.27,.15)*localRelease;
 let px=1.6/u.height;
 let dilated=max(max(actorSample(uv+vec2f(px,0.)).a,actorSample(uv-vec2f(px,0.)).a),max(actorSample(uv+vec2f(0.,px)).a,actorSample(uv-vec2f(0.,px)).a));
 let rim=max(0.,dilated-spr.a);
 var afterglow=vec3f(.40,.80,.56)*rim*localRelease*.7;
 // Residue peels to two broad flaps immediately ahead of the front, no particles.
 let outward=mix(.065,.105,ease(.1,.7,p))*(1.-u.reduced*.55);
 let side=select(-1.,1.,uv.x>=0.);
 let peeled=actorSample(uv-vec2f(side*outward,0.));
 let peelWindow=exp(-pow((worldY-front-.07)/.17,2.))*env;
 let exposed=max(0.,peeled.a-spr.a*.8)*ease(.12,.27,abs(uv.x));
 let peelAlpha=exposed*peelWindow*.63;
 let peelColor=mix(vec3f(.22,.12,.32),vec3f(.59,.38,.64),ease(-.08,.16,worldY-front));
 // The sheet wraps in front and behind the true alpha sprite.
 let origin=vec3f(uv.x,-uv.y-.51,1.50);let ray=normalize(vec3f(0.,.34,-1.));
 var accum=vec3f(0.);var trans=1.;var previous=radial(origin,p);var actorDone=false;
 for(var i=1;i<=104;i++){
  let distance=f32(i)*.034;let q0=origin+ray*distance;let current=radial(q0,p);
  if(!actorDone&&q0.z<=0.){
   accum+=trans*(actorColor*spr.a+afterglow);trans*=1.-spr.a;
   accum+=trans*peelColor*peelAlpha;trans*=1.-peelAlpha;actorDone=true;
  }
  if(previous*current<0.){
   let crossing=distance-.034+.034*previous/(previous-current);let q=origin+ray*crossing;
   let theta=atan2(q.z,q.x);let y=boundary(clamp(p-.045*(1.-ease(-.10,.10,q.x)),0.,1.))+.055*cos(theta*2.+.4);
   let local=q.y-y;let aa=1.1/u.height;
   let bounds=ease(-.40,-.30,local)*(1.-ease(-aa,aa,local));
   let edge=exp(-pow((local+.017)/.027,2.));
   let lower=ease(-.40,-.03,local);
   let view=pow(1.-abs(dot(normal(q),ray)),1.5);
   let arc=ease(.24,.64,abs(cos(theta)));
   let faceProtection=(1.-ease(.15,.24,abs(uv.x)))*ease(-.42,-.29,uv.y)*(1.-ease(.00,.10,uv.y));
   let faceGate=1.-faceProtection*spr.a*select(0.,1.,q.z>0.);
   let openness=arc*faceGate*(1.-ease(.72,.97,p)*.5);
   let a=clamp((.24+.24*view+edge*.43)*env*bounds*openness,0.,.8);
   let face=mix(vec3f(.02,.36,.40),vec3f(.13,.73,.50),lower);
   let crest=mix(vec3f(.45,1.,.79),vec3f(1.,.98,.76),edge);
   let radiance=face*(.46+.30*view)+crest*edge*1.85;
   accum+=trans*a*radiance;trans*=1.-a;
  }
  previous=current;
 }
 var color=bg*trans+accum;
 return vec4f(color,1.);
}`;


