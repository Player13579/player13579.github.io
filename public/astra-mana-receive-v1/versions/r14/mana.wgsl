struct Config { size: vec2f, scale:f32, count:f32, guide:f32, obs:f32, pad:vec2f }
struct Effect { anchors:vec4f, timing:vec4f }
@group(0) @binding(0) var<uniform> c:Config;
@group(0) @binding(1) var<storage,read> effects:array<Effect>;
@group(0) @binding(2) var actorTexture:texture_2d<f32>;
@group(0) @binding(3) var actorSampler:sampler;
struct VOut {@builtin(position) position:vec4f,@location(0) uv:vec2f}
@vertex fn vs(@builtin(vertex_index) i:u32)->VOut {
  let p=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));
  var o:VOut;o.position=vec4f(p[i],0,1);o.uv=vec2f(p[i].x*.5+.5,.5-p[i].y*.5);return o;
}
fn ease(a:f32,b:f32,x:f32)->f32{return smoothstep(a,b,x);}
fn capsule(p:vec2f,a:vec2f,b:vec2f,r:f32)->f32 {let v=b-a;return length(p-a-v*clamp(dot(p-a,v)/max(dot(v,v),.001),0.,1.))-r;}
fn ellipse(p:vec2f,r:vec2f)->f32 {return (length(p/r)-1.)*min(r.x,r.y);}
fn linear(v:vec3f)->vec3f {return select(v/12.92,pow((v+.055)/1.055,vec3f(2.4)),v>vec3f(.04045));}
fn bez(a:vec2f,b:vec2f,d:vec2f,e:vec2f,s:f32)->vec2f {let q=1.-s;return a*q*q*q+3.*b*q*q*s+3.*d*q*s*s+e*s*s*s;}
fn pigment(depth:f32,along:f32)->vec3f {
  let violet=vec3f(.12,.035,.46);let blue=vec3f(.055,.27,.90);let cyan=vec3f(.23,.94,1.);
  return mix(mix(linear(violet),linear(blue),clamp(depth*1.7,0.,1.)),linear(cyan),clamp(depth*depth*.75+along*.19,0.,1.));
}
fn rx(p:vec3f,a:f32)->vec3f {let co=cos(a);let si=sin(a);return vec3f(p.x,co*p.y-si*p.z,si*p.y+co*p.z);}
fn ry(p:vec3f,a:f32)->vec3f {let co=cos(a);let si=sin(a);return vec3f(co*p.x+si*p.z,p.y,-si*p.x+co*p.z);}
fn rz(p:vec3f,a:f32)->vec3f {let co=cos(a);let si=sin(a);return vec3f(co*p.x-si*p.y,si*p.x+co*p.y,p.z);}
fn roundBox(q:vec3f,b:vec3f,r:f32)->f32 {let d=abs(q)-b;return length(max(d,vec3f(0)))+min(max(d.x,max(d.y,d.z)),0.)-r;}
// Finite depth volumes with tapered vertical support; no angular/ring coordinate.
// xz sections are ellipses, integrated analytically along the orthographic eye ray.
fn volume(p:vec2f,base:vec2f,width:f32,height:f32,lean:f32)->vec3f {
  let y=(base.y-p.y)/height;
  if(y<=0.||y>=1.){return vec3f(0.);}
  let profile=ease(0.,.16,y)*(1.-ease(.48,1.,y));
  let radius=width*pow(profile,.48);
  let center=base.x+lean*y+sin(y*3.14159265)*lean*.25;
  let x=(p.x-center)/max(radius,.01);
  if(abs(x)>=1.){return vec3f(0.);}
  let thickness=1.-pow(abs(x),1.35);
  let density=thickness*ease(0.,.08,y)*(1.-ease(.86,1.,y));
  return vec3f(density,y,x);
}
struct FOut {@location(0) color:vec4f,@location(1) emission:vec4f}
@fragment fn fs(in:VOut)->FOut {
  let right=in.uv.x>=.5;let panel=select(.25,.75,right);
  let p=vec2f((in.uv.x-panel)*c.size.x,(in.uv.y-.53)*c.size.y)/c.scale+vec2f(0,-27);
  let background=linear(select(vec3f(.024,.037,.065),vec3f(.79,.81,.84),right));
  var col=background;
  // Presentation-only receiving impulse. Feet stay near the world anchor.
  var pose=vec2f(0.);var tilt=0.;
  if(c.count>0.){
    let hitAge=effects[0].timing.x;
    let side=select(-1.,1.,effects[0].anchors.x<effects[0].anchors.z);
    let brace=ease(.37,.49,hitAge)*(1.-ease(.57,.88,hitAge));
    pose=vec2f(side*1.4*brace,-sin(brace*3.14159265)*.9);
    tilt=side*.055*brace;
  }
  let posed=p-pose;let co=cos(tilt);let si=sin(tilt);
  let ap=vec2f(co*posed.x+si*posed.y,-si*posed.x+co*posed.y);
  let actorPx=vec2f(ap.x*116./64.+63.5,ap.y*116./64.+121.);
  let actorUV=(clamp(actorPx,vec2f(27.,6.),vec2f(100.,121.))+vec2f(.5))/vec2f(2560.,1536.);
  let inActor=all(actorPx>=vec2f(27.,6.)) && all(actorPx<=vec2f(100.,121.));
  let texel=textureSampleLevel(actorTexture,actorSampler,actorUV,0.);
  let actorAlpha=select(0.,texel.a,inActor)*c.guide;
  let actorColor=linear(texel.rgb);
  col=mix(col,actorColor,actorAlpha);
  var emission=vec3f(0.);
  for(var i=0u;i<u32(c.count);i++){
    let e=effects[i];let t=e.timing.x;let owner=e.anchors.zw;let src=e.anchors.xy;
    if(t>=1.48){continue;}
    // A single broad finite charge moves toward the receiver and is consumed.
    let travel=ease(.04,.49,t);
    let receiver=owner+vec2f(-7.,-15.);
    let intakeBase=bez(src+vec2f(0.,13.),src+vec2f(5.,10.),receiver+vec2f(-14.,14.),receiver,travel);
    let intake=volume(p,intakeBase,mix(18.,13.,travel),mix(30.,29.,travel),mix(9.,-4.,travel));
    let intakeLife=ease(.01,.09,t)*(1.-ease(.39,.57,t));
    let intakeVis=intakeLife*(1.-actorAlpha*ease(.27,.43,t));
    let density=intake.x;
    col=mix(col,vec3f(.10,.035,.20),density*intakeVis*.25);
    let travellingCore=exp(-pow((intake.z+.22-.70*intake.y)/.28,2.));
    emission+=(vec3f(.15,.065,.34)*density+vec3f(.09,.47,.58)*travellingCore*density*.9)*intakeVis;
    // Contact opens one broad receiving field; it contracts inwards instead of surrounding the actor.
    let open=ease(.32,.49,t);let settle=ease(.53,.99,t);
    let life=open*(1.-ease(1.13,1.48,t));
    let cp=p-owner-vec2f(0.,-25.);
    let width=mix(30.,13.,settle);let height=mix(18.,23.,settle);
    let nx=(cp.x+cp.y*.12)/width;let ny=cp.y/height;
    let radius=nx*nx+ny*ny;
    if(radius<1. && life>.001){
      let depth=sqrt(1.-radius);
      let bound=1.-ease(.80,1.,radius);
      // After contact the outer field vanishes into the authored body silhouette.
      let conform=mix(1.,actorAlpha,ease(.64,.96,t));
      let surface=depth*life*conform;
      let progression=ease(.39,.96,t);
      let fillLevel=-.8+progression*1.6;
      let filled=1.-ease(fillLevel-.22,fillLevel+.22,ny+nx*.34);
      let leading=exp(-pow((ny+nx*.34-fillLevel)/.15,2.));
      let rear=(1.-actorAlpha)*(.45+.55*depth);
      let front=actorAlpha*.55;
      let shade=vec3f(.025,.11,.18);
      col=mix(col,shade+actorColor*actorAlpha*.50,surface*(rear*.43+front*.18));
      // Broad deposited layers have separate depths and slopes; no uniform torso tint.
      let upper=exp(-pow((ny+.28+nx*.46)/.27,2.));
      let lower=exp(-pow((ny-.38-nx*.27)/.23,2.));
      let stored=upper*.58+lower*.43;
      emission+=(vec3f(.08,.18,.37)*depth*(.2+.45*filled)+vec3f(.06,.43,.48)*stored*filled)*surface*(rear+front);
      emission+=vec3f(.19,.60,.60)*leading*surface*(rear*.5+front)*.85;
      let impact=ease(.42,.49,t)*(1.-ease(.53,.67,t));
      let impactPlane=exp(-pow((nx+.20)/.22,2.));
      emission+=vec3f(.28,.74,.66)*impact*impactPlane*surface*.80;
      let peak=ease(.88,.97,t)*(1.-ease(1.05,1.15,t));
      emission+=vec3f(.65,.74,.47)*peak*lower*exp(-pow(nx/.40,2.))*surface*actorAlpha*.60;
    }
  }
  var o:FOut;o.color=vec4f(col,1.);o.emission=vec4f(emission,1.);return o;
}
