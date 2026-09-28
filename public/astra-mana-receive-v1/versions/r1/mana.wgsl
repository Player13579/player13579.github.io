struct Config { size: vec2f, scale:f32, count:f32, guide:f32, obs:f32, pad:vec2f }
struct Effect { anchors:vec4f, timing:vec4f }
@group(0) @binding(0) var<uniform> c:Config;
@group(0) @binding(1) var<storage,read> effects:array<Effect>;
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
struct FOut {@location(0) color:vec4f,@location(1) emission:vec4f}
@fragment fn fs(in:VOut)->FOut {
  let right=in.uv.x>=.5;let panel=select(.25,.75,right);
  let p=vec2f((in.uv.x-panel)*c.size.x,(in.uv.y-.53)*c.size.y)/c.scale+vec2f(0,-27);
  var col=linear(select(vec3f(.024,.037,.065),vec3f(.79,.81,.84),right));
  // Neutral registration mannequin is diagnostic geometry, not character artwork.
  if(c.guide>.5){
    var body=length(p-vec2f(0,-57.))-6.5;
    body=min(body,ellipse(p-vec2f(0,-35),vec2f(10,15)));
    body=min(body,capsule(p,vec2f(-6,-25),vec2f(-7,-4),3.5));
    body=min(body,capsule(p,vec2f(6,-25),vec2f(7,-4),3.5));
    body=min(body,capsule(p,vec2f(-9,-44),vec2f(-15,-26),3.));
    body=min(body,capsule(p,vec2f(9,-44),vec2f(15,-26),3.));
    col=mix(col,linear(select(vec3f(.13,.16,.21),vec3f(.40,.44,.5),right)),.72*(1.-smoothstep(-.6,.6,body)));
    let floorMark=(1.-smoothstep(.4,.8,abs(p.y)))*(1.-smoothstep(17.,21.,abs(p.x)));
    col=mix(col,linear(select(vec3f(.26,.32,.42),vec3f(.48,.51,.55),right)),floorMark*.5);
  }
  var emission=vec3f(0.);
  let aa=max(.35,.8/c.scale);
  for(var i=0u;i<u32(c.count);i++){
    let e=effects[i];let t=e.timing.x;let reduced=e.timing.y>.5;
    let src=e.anchors.xy;let dst=e.anchors.zw-vec2f(0,30);
    if(any(p<min(src,dst)-vec2f(28.,40.)) || any(p>max(src,dst)+vec2f(28.,25.))){continue;}
    let delta=dst-src;let side=select(-1.,1.,delta.x>=0.);
    let fade=1.-ease(1.22,1.48,t);
    // PH1: broad asymmetric folded source; its luminous inner mouth stays at actual source.
    let supply=ease(0.,.07,t)*(1.-ease(.28,.53,t));
    let q=p-src;
    let sr=vec2f(9.5*(1.-.46*ease(.22,.52,t)),6.5);
    let sourceD=ellipse(q+vec2f(1.6*side,0),sr)+.85*sin(q.x*.32+q.y*.21);
    let sourceMask=(1.-smoothstep(-aa,aa,sourceD))*supply;
    let sourceDepth=clamp(1.-length((q+vec2f(-2.*side,1.5))/sr),0.,1.);
    col=mix(col,pigment(sourceDepth,.0),sourceMask*.94);
    let sourceCore=exp(-dot(q-vec2f(2.*side,-1.),q-vec2f(2.*side,-1.))*.13)*supply;
    emission+=vec3f(.28,.8,1.)*sourceCore*2.7;
    // PH2: three finite thick packets move along the same source-to-owner path.
    // Width varies along each packet; moving filled volume is not a line with a halo.
    let bend=select(21.,10.,reduced);
    let b=src+vec2f(delta.x*.2,-bend);let d=dst-vec2f(delta.x*.33,12.);
    for(var k=0u;k<3u;k++){
      let delay=f32(k)*.125;let travel=(t-.09-delay)/.53;
      if(travel > -.18 && travel < 1.27){
        var dist=1000.;var nearest=0.;var widthAt=1.;
        for(var n=0u;n<24u;n++){
          let s0=f32(n)/24.;let s1=f32(n+1u)/24.;
          let v0=bez(src,b,d,dst,s0);let v1=bez(src,b,d,dst,s1);let tangent=v1-v0;
          let projection=clamp(dot(p-v0,tangent)/max(dot(tangent,tangent),.001),0.,1.);
          let s=mix(s0,s1,projection);let rel=(s-travel)/.19;
          let thickness=max(0.,1.-rel*rel);
          if(thickness>0.){
            let pos=mix(v0,v1,projection);
            let width=(4.2+2.2*sin(3.14159*s)) * thickness * (1.-.12*f32(k));
            let dd=length(p-pos)-width;
            if(dd<dist){dist=dd;nearest=s;widthAt=width;}
          }
        }
        let visible=(1.-smoothstep(-aa,aa,dist))*fade;
        let depth=clamp(-dist/max(widthAt,.1),0.,1.);
        col=mix(col,pigment(depth,nearest),visible*.93);
        let spine=pow(depth,5.)*visible*(.5+.7*nearest);
        emission+=vec3f(.18,.55,.90)*spine*1.25;
      }
    }
    // PH3: absorption changes a body-bound volume, not an external orbit or gauge.
    let received=ease(.53,.88,t);let lock=ease(.94,1.24,t);
    let mass=received*(1.-ease(1.21,1.46,t));
    let center=dst+vec2f(1.6*sin(received*2.8)*(1.-lock),-5.*lock);
    let local=p-center;
    let radii=vec2f(2.4+10.*received*(1.-.62*lock),3.+12.5*received*(1.-.52*lock));
    let ang=atan2(local.y,local.x);
    let shape=ellipse(local,radii)+sin(ang*2.+.7)*1.15*(1.-lock);
    let receiverMask=(1.-smoothstep(-aa,aa,shape))*mass;
    let inner=clamp(1.-length(local/radii),0.,1.);
    // Curved density folds contract towards the core; no random microtexture.
    let fold=.5+.5*sin(local.y*.35+local.x*.16+received*2.0);
    let receiverColor=pigment(clamp(inner*.75+fold*.22,0.,1.),received);
    col=mix(col,receiverColor,receiverMask*.95);
    let seam=exp(-pow((local.x+2.2+sin(local.y*.20)*2.)/2.2,2.))*pow(clamp(1.-abs(local.y)/radii.y,0.,1.),.65);
    let intake=ease(.55,.68,t)*(1.-ease(.90,1.18,t));
    let core=exp(-dot(local,local)*.035)*ease(.91,1.03,t)*(1.-ease(1.14,1.43,t));
    emission+=vec3f(.30,.8,1.)*(seam*receiverMask*intake*1.7+core*2.2);
    // OBS2 candidate: local finite display flare at the actual absorption core only.
    if(c.obs>.5){
      let f=exp(-pow(local.x/15.,2.)-pow(local.y/1.05,2.))*core;
      emission+=vec3f(.36,.72,1.)*f*.72;
    }
  }
  var o:FOut;o.color=vec4f(col,1.);o.emission=vec4f(emission,1.);return o;
}
