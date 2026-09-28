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
struct FOut {@location(0) color:vec4f,@location(1) emission:vec4f}
@fragment fn fs(in:VOut)->FOut {
  let right=in.uv.x>=.5;let panel=select(.25,.75,right);
  let p=vec2f((in.uv.x-panel)*c.size.x,(in.uv.y-.53)*c.size.y)/c.scale+vec2f(0,-27);
  var col=linear(select(vec3f(.024,.037,.065),vec3f(.79,.81,.84),right));
  // Authored live character atlas, front frame 0, alpha bounds [27,6,100,121].
  // The 116px authored figure is registered to exactly H64; no 2D canvas extraction.
  let actorPx=vec2f(p.x*116./64.+63.5,p.y*116./64.+121.);
  let actorUV=(clamp(actorPx,vec2f(27.,6.),vec2f(100.,121.))+vec2f(.5))/vec2f(2560.,1536.);
  let inActor=all(actorPx>=vec2f(27.,6.)) && all(actorPx<=vec2f(100.,121.));
  let texel=textureSampleLevel(actorTexture,actorSampler,actorUV,0.);
  let actorAlpha=select(0.,texel.a,inActor)*c.guide;
  let actorColor=linear(texel.rgb);
  col=mix(col,actorColor,actorAlpha);
  var emission=vec3f(0.);
  let aa=max(.35,.8/c.scale);
  for(var i=0u;i<u32(c.count);i++){
    let e=effects[i];let t=e.timing.x;let reduced=e.timing.y>.5;
    let src=e.anchors.xy;let dst=e.anchors.zw-vec2f(0,23);
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
    // PH2: an open converging fan of three flux sheets, one behind the cloak.
    // Each sheet grows out of the live source, carries a luminous front, then drains.
    for(var layer=0u;layer<3u;layer++){
      let delay=array<f32,3>(.07,.15,.24)[layer];
      let travelDuration=array<f32,3>(.47,.57,.59)[layer];
      let travel=(t-delay)/travelDuration;
      if(travel>0. && travel<1.45){
        let arrivalPoint=dst+array<vec2f,3>(vec2f(-8.,3.),vec2f(-13.,-7.),vec2f(3.,-1.))[layer];
        let bend=select(1.,.55,reduced);
        let b=src+vec2f(delta.x*.30,-array<f32,3>(12.,27.,3.)[layer]*bend);
        let d=arrivalPoint-vec2f(delta.x*.28,array<f32,3>(0.,11.,-7.)[layer]);
        var centerDistance=1000.;var nearest=0.;var signed=0.;
        for(var n=0u;n<24u;n++){
          let s0=f32(n)/24.;let s1=f32(n+1u)/24.;
          let v0=bez(src,b,d,arrivalPoint,s0);let v1=bez(src,b,d,arrivalPoint,s1);let tangent=v1-v0;
          let projection=clamp(dot(p-v0,tangent)/max(dot(tangent,tangent),.001),0.,1.);
          let off=p-mix(v0,v1,projection);let dd=length(off);
          if(dd<centerDistance){centerDistance=dd;nearest=mix(s0,s1,projection);signed=(off.x*tangent.y-off.y*tangent.x)/max(length(tangent),.001);}
        }
        let head=1.-ease(travel-.09,travel+.04,nearest);
        let drained=ease(travel-.70,travel-.43,nearest);
        let widthAt=(array<f32,3>(4.5,2.6,1.6)[layer]+3.4*sin(nearest*3.14159))*head*drained;
        let distance=centerDistance-widthAt;
        let coverage=(1.-smoothstep(-aa,aa,distance))*ease(.02,.3,widthAt);
        let depth=clamp(-distance/max(widthAt,.1),0.,1.);
        let behind=select(1.,1.-actorAlpha,layer==1u);
        let absorption=1.-actorAlpha*ease(.78,1.,nearest)*.88;
        let outer=array<vec3f,3>(vec3f(.075,.26,.80),vec3f(.40,.10,.63),vec3f(.025,.60,.67))[layer];
        let flowColor=mix(linear(outer),linear(vec3f(.30,.95,1.)),depth*.65);
        col=mix(col,flowColor,coverage*(.13+.17*depth)*behind*absorption);
        let front=exp(-pow((nearest-travel+.09)/.16,2.));
        let seam=exp(-pow((signed-widthAt*.43)/.70,2.));
        let under=exp(-pow((signed+widthAt*.35)/1.5,2.));
        let radiance=vec3f(.08,.37,.74)*under*.40+vec3f(.29,.88,.95)*seam*(.40+.9*front)+vec3f(.38,.23,.69)*depth*.16;
        emission+=radiance*coverage*behind*absorption;
      }
    }
    // PH3: transmitted light follows actual dress/cape texture and alpha.
    // Preserve the authored folds: no flat white belly oval and no front-body loop.
    let bodyP=p-e.anchors.zw;
    let bodyMask=actorAlpha*ease(-39.,-32.,bodyP.y)*(1.-ease(-8.,-3.,bodyP.y));
    let propagation=ease(.48,.90,t);
    let frontX=-17.+34.*propagation;
    let frontLight=exp(-pow((bodyP.x-frontX+(bodyP.y+24.)*.30)/3.4,2.));
    let arrival=ease(.46,.57,t)*(1.-ease(.96,1.16,t));
    let luma=dot(actorColor,vec3f(.2126,.7152,.0722));
    let fabricResponse=.22+1.35*sqrt(luma);
    let received=ease(bodyP.x-2.,bodyP.x+2.,frontX);
    let illumination=arrival*bodyMask*(.22*received+.86*frontLight)*fabricResponse;
    col+=actorColor*vec3f(.12,.48,.65)*illumination*.48;
    emission+=vec3f(.04,.37,.54)*illumination;
    // Light catches two existing fabric folds rather than drawing a replacement torso.
    let foldA=exp(-pow((bodyP.x+4.2+(bodyP.y+20.)*.23)/1.3,2.));
    let foldB=exp(-pow((bodyP.x-6.1-(bodyP.y+20.)*.28)/.85,2.));
    let tail=ease(.63,.83,t)*(1.-ease(1.03,1.48,t));
    let along=ease(-34.,-29.,bodyP.y)*(1.-ease(-12.,-7.,bodyP.y));
    emission+=(vec3f(.16,.61,.66)*foldA+vec3f(.31,.14,.49)*foldB)*along*bodyMask*tail*fabricResponse*.53;
    // Brief arrival peak travels across the collar/sleeve seam, retaining fabric grain.
    let peak=ease(.77,.84,t)*(1.-ease(.89,1.01,t));
    let collar=exp(-pow((bodyP.y+29.+bodyP.x*.11)/1.5,2.));
    let core=collar*bodyMask*peak*pow(clamp(luma*2.5,0.,1.),.55);
    emission+=vec3f(.84,.78,.45)*core*1.8;
    if(c.obs>.5){
      let f=exp(-pow((bodyP.x+3.)/13.,2.)-pow((bodyP.y+29.)/1.05,2.))*peak*bodyMask;
      emission+=vec3f(.32,.69,.86)*f*.28;
    }

  }
  var o:FOut;o.color=vec4f(col,1.);o.emission=vec4f(emission,1.);return o;
}
