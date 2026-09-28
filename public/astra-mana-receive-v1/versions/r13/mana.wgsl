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
  let actorPx=vec2f(p.x*116./64.+63.5,p.y*116./64.+121.);
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
    // Three large depth-resolved storage folds fill sequentially; support is not circumferential.
    let endFold=ease(1.06,1.44,t);let fade=1.-ease(1.24,1.48,t);
    for(var layer=0;layer<3;layer++){
      let k=f32(layer);let grow=ease(.34+k*.14,.64+k*.14,t);
      if(grow<.001){continue;}
      let front=layer==2;
      let base=owner+select(select(vec2f(-12.,3.),vec2f(14.,2.),layer==1),vec2f(0.,1.),front);
      let maxHeight=select(select(73.,64.,layer==1),38.,front);
      let h=mix(9.,maxHeight,grow)*mix(1.,.44,endFold);
      let w=select(select(17.,15.,layer==1),17.,front)*mix(.55,1.,grow)*mix(1.,.18,endFold);
      let lean=select(select(-5.,-3.,layer==1),-7.,front)*mix(1.,.12,endFold);
      let v=volume(p,base,w,h,lean);
      let material=v.x;let fillingFront=ease(.40+k*.14,.83+k*.09,t);
      let level=v.y+v.z*.13;
      let filled=1.-ease(fillingFront-.055,fillingFront+.055,level);
      let facing=clamp(.60-v.z*.36,0.,1.);
      let depthVisibility=select(1.-actorAlpha,1.-actorAlpha*.52,front);
      let visibility=depthVisibility*fade;
      // Sparse broad inner interfaces express growing depth, not line geometry.
      let core=exp(-pow((v.z+.42-.78*v.y)/.22,2.));
      let color=select(vec3f(.105,.035,.24),vec3f(.028,.23,.27),layer!=0);
      col=mix(col,color,material*visibility*.46);
      let blue=select(vec3f(.12,.085,.36),vec3f(.045,.36,.44),layer!=0);
      emission+=(blue*(.10+.58*filled)*material*facing+vec3f(.14,.55,.62)*core*material*(.18+.65*filled))*visibility;
      let advancing=exp(-pow((level-fillingFront)/.04,2.))*(1.-ease(.95,1.03,t));
      emission+=vec3f(.18,.60,.59)*advancing*material*visibility*1.65;
      let peak=ease(.86,.95,t)*(1.-ease(1.02,1.13,t));
      if(front){emission+=vec3f(.62,.73,.48)*peak*exp(-pow((v.y-.48)/.10,2.))*core*material*visibility*.65;}
    }
  }
  var o:FOut;o.color=vec4f(col,1.);o.emission=vec4f(emission,1.);return o;
}
