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
    let sr=vec2f(15.*(1.-.28*ease(.22,.52,t)),10.5);
    let sourceD=ellipse(q+vec2f(1.6*side,0),sr)+1.2*sin(q.x*.24+q.y*.17);
    let sourceFill=(1.-smoothstep(-aa,aa,sourceD))*supply;
    let sourceRim=sourceFill*ease(-4.5,-1.,sourceD);
    let mouth=1.-ease(1.,5.,q.x*side)*ease(-4.,1.,-q.y);
    let sourceMask=(sourceFill*.12+sourceRim*.66)*mouth;
    let sourceDepth=clamp(1.-length((q+vec2f(-2.*side,1.5))/sr),0.,1.);
    col=mix(col,pigment(sourceDepth,.0),sourceMask);
    let sourceCore=exp(-pow((q.x-4.*side)/4.1,2.)-pow((q.y+1.)/6.,2.))*supply;
    emission+=vec3f(.28,.8,1.)*(sourceCore*2.7+sourceRim*.37*mouth);
    // PH2: bulk, surface and fine flux have different trajectories and arrival clocks.
    for(var layer=0u;layer<3u;layer++){
      let delay=array<f32,3>(.08,.16,.23)[layer];
      let travelDuration=array<f32,3>(.51,.62,.60)[layer];
      let travel=(t-delay)/travelDuration;
      if(travel>-.19 && travel<1.19){
        let arrivalPoint=dst+array<vec2f,3>(vec2f(0.,4.),vec2f(-3.,-8.),vec2f(4.,-1.))[layer];
        let bend=select(1.,.55,reduced);
        var b=src+vec2f(delta.x*.24,-15.*bend);
        var d=arrivalPoint-vec2f(delta.x*.29,7.);
        if(layer==1u){b=src+vec2f(-5.*side,-36.*bend);d=arrivalPoint-vec2f(delta.x*.64,24.*bend);}
        if(layer==2u){b=src+vec2f(delta.x*.46,9.*bend);d=arrivalPoint-vec2f(delta.x*.36,-18.*bend);}
        var distance=1000.;var nearest=0.;var widthAt=1.;
        for(var n=0u;n<16u;n++){
          let s0=f32(n)/16.;let s1=f32(n+1u)/16.;
          let v0=bez(src,b,d,arrivalPoint,s0);let v1=bez(src,b,d,arrivalPoint,s1);let tangent=v1-v0;
          let projection=clamp(dot(p-v0,tangent)/max(dot(tangent,tangent),.001),0.,1.);
          let progress=mix(s0,s1,projection);let rel=(progress-travel)/.21;
          let thickness=max(0.,1.-rel*rel);
          if(thickness>0.){
            let width=(array<f32,3>(8.2,5.2,3.3)[layer]+2.7*sin(progress*3.14159))*thickness;
            let dd=length(p-mix(v0,v1,projection))-width;
            if(dd<distance){distance=dd;nearest=progress;widthAt=width;}
          }
        }
        let coverage=1.-smoothstep(-aa,aa,distance);
        let depth=clamp(-distance/max(widthAt,.1),0.,1.);
        let outer=array<vec3f,3>(vec3f(.12,.20,.72),vec3f(.35,.09,.64),vec3f(.06,.55,.75))[layer];
        let flowColor=mix(linear(outer),linear(vec3f(.25,.92,1.)),nearest*.66+depth*.20);
        col=mix(col,flowColor,coverage*(.18+.25*depth));
        let ridge=exp(-pow((depth-.52)/.22,2.));
        emission+=mix(vec3f(.04,.12,.43),vec3f(.13,.65,.90),nearest)*coverage*(ridge*.94+pow(depth,5.)*.17);
      }
    }
    // PH3: receiving energy is light inside the registered body, not an object in front of it.
    // Standalone uses the same torso mask as the diagnostic owner; host integration supplies
    // the real skin/clothing coverage and depth instead of this measurement mannequin.
    let bodyP=p-e.anchors.zw;
    let torsoD=ellipse(bodyP-vec2f(0.,-35.),vec2f(10.,15.));
    let bodyMask=(1.-smoothstep(-aa,aa,torsoD))*c.guide;
    let propagation=ease(.48,.87,t);
    let frontY=-22.-29.*propagation+pow(bodyP.x/11.,2.)*4.5+bodyP.x*.16;
    let receivedMask=ease(frontY-2.5,frontY+2.5,bodyP.y)*bodyMask;
    let reception=ease(.47,.59,t)*(1.-ease(.94,1.18,t));
    let frontLight=exp(-pow((bodyP.y-frontY)/3.4,2.))*bodyMask*reception;
    let internal=receivedMask*reception;
    col=mix(col,linear(vec3f(.18,.10,.42)),internal*.22);
    emission+=vec3f(.06,.29,.47)*internal*.62+vec3f(.25,.77,.78)*frontLight*.82;
    // Front and deeper currents run within the torso, then narrow after the brief peak.
    let tail=ease(.58,.85,t)*(1.-ease(1.15,1.48,t));
    let filamentWidth=mix(2.8,.72,ease(.92,1.15,t));
    let x1=2.4*sin((bodyP.y+36.)*.15)-.8;
    let x2=-3.3+1.2*sin((bodyP.y+27.)*.19);
    let vein1=exp(-pow((bodyP.x-x1)/filamentWidth,2.));
    let vein2=exp(-pow((bodyP.x-x2)/(filamentWidth*.63),2.))*.48;
    let along=1.-ease(10.,16.,abs(bodyP.y+35.));
    emission+=(vec3f(.14,.63,.70)*vein1+vec3f(.25,.10,.48)*vein2)*along*bodyMask*tail;
    let local=p-dst;
    let core=exp(-pow(local.x/5.8,2.)-pow((local.y+5.)/8.,2.))*ease(.76,.84,t)*(1.-ease(.91,1.05,t))*bodyMask;
    emission+=vec3f(.93,.88,.68)*core*1.5;
    // OBS2 candidate: local finite display flare at the actual absorption core only.
    if(c.obs>.5){
      let f=exp(-pow(local.x/15.,2.)-pow(local.y/1.05,2.))*core;
      emission+=vec3f(.36,.72,1.)*f*.72;
    }
  }
  var o:FOut;o.color=vec4f(col,1.);o.emission=vec4f(emission,1.);return o;
}
