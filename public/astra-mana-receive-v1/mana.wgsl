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
    // PH1/2: a finite, thick absorption layer connects source and receiver.
    // The source is the emitting cross-section of this same volume, never an isolated ball.
    let entry=dst+vec2f(-3.,-6.);
    let axis=entry-src;let span=max(length(axis),1.);let direction=axis/span;
    let normal=vec2f(-direction.y,direction.x);
    let rel=p-src;let u=dot(rel,direction)/span;let cross=dot(rel,normal);
    let establish=ease(.035,.48,t);
    let transfer=ease(.58,1.03,t);
    let width=mix(12.0,8.8,transfer);
    let sustain=ease(.015,.11,t)*(1.-ease(.82,.93,t));
    // An open striated end face has a distinct purple outer density and cyan active interior.
    let sourceFace=exp(-pow(dot(rel,direction)/4.2,2.))*(1.-smoothstep(width-1.1,width+aa,abs(cross)))*sustain;
    let strata=.45+.55*pow(.5+.5*cos(cross*.76),2.);
    col=mix(col,linear(vec3f(.18,.065,.46)),sourceFace*.37);
    emission+=mix(vec3f(.24,.085,.48),vec3f(.13,.65,.82),strata)*sourceFace*(.28+.35*(1.-transfer));
    for(var layer=0u;layer<3u;layer++){
      let lag=array<f32,3>(0.,.055,.105)[layer];
      let head=ease(.04+lag,.48+lag,t);
      let layerEnd=1.-ease(.90+lag*.25,1.02+lag*.25,t);
      let funnel=1.-.67*ease(0.,1.,u);
      let localWidth=width*funnel;
      let shift=array<f32,3>(-.57,.56,.0)[layer]*localWidth;
      let bandWidth=localWidth*array<f32,3>(.41,.44,.43)[layer];
      let across=(cross-shift)/max(bandWidth,.2);
      let transverse=1.-smoothstep(.68,1.0,abs(across));
      let draining=ease(.91,1.055,t);
      let reach=ease(draining-.035,draining+.025,u)*(1.-ease(head-.045,head+.025,u));
      let coverage=transverse*reach*layerEnd;
      let rear=select(1.,1.-actorAlpha,layer==0u);
      let absorbed=1.-actorAlpha*ease(.78,1.,u)*.87;
      let depth=clamp(1.-across*across,0.,1.);
      let densityColor=mix(linear(vec3f(.12,.065,.37)),linear(vec3f(.045,.35,.48)),depth);
      col=mix(col,densityColor,coverage*.24*rear*absorbed);
      // Three broad compression fronts travel through a continuously present material.
      let pulsePosition=(t-(.10+f32(layer)*.13))/.54;
      let compression=exp(-pow((u-pulsePosition)/.18,2.));
      let wake=exp(-pow((u-pulsePosition+.21)/.33,2.))*.33;
      let outer=vec3f(.28,.06,.49)*(1.-depth)*.30;
      let flux=vec3f(.065,.24,.48)*depth*.22+mix(vec3f(.24,.12,.57),vec3f(.13,.82,.79),clamp(u,0.,1.))*depth*(compression+ wake)*.90;
      emission+=(outer+flux)*coverage*rear*absorbed;
    }
    // PH3: three discrete arrivals at the actual near-hand entry, then inward transfer.
    let bodyP=p-e.anchors.zw;
    let bodyMask=actorAlpha*ease(-40.,-33.,bodyP.y)*(1.-ease(-8.,-3.,bodyP.y));
    let luma=dot(actorColor,vec3f(.2126,.7152,.0722));
    let fabricResponse=.26+1.15*sqrt(luma);
    let hand=vec2f(-3.,-29.);
    let chest=vec2f(2.,-24.);
    let handD=length(bodyP-hand);
    let arrivalA=exp(-pow((t-.64)/.075,2.));
    let arrivalB=exp(-pow((t-.77)/.075,2.));
    let arrivalC=exp(-pow((t-.90)/.075,2.));
    let entryEnvelope=ease(.43,.55,t)*(1.-ease(.92,1.08,t));
    let entryCore=exp(-pow(handD/2.25,2.))*(.22+arrivalA*.65+arrivalB*.9+arrivalC*1.1)*entryEnvelope;
    let entryHalo=exp(-pow(handD/5.2,2.))*entryEnvelope;
    emission+=vec3f(.57,.96,.86)*entryCore*1.65+vec3f(.09,.33,.65)*entryHalo*.28;
    // An inward-moving light front crosses the actual sleeve and arrives at the collar.
    let progression=ease(.50,.94,t);
    let insidePoint=mix(hand,chest,progression);
    let inward=exp(-pow(length(bodyP-insidePoint)/4.3,2.))*bodyMask*ease(.50,.63,t)*(1.-ease(.94,1.10,t));
    emission+=vec3f(.10,.60,.72)*inward*fabricResponse*.93;
    col+=actorColor*vec3f(.08,.32,.46)*inward*.6;
    // Absorbed state spreads downward through folds, retaining both source cloth shading and alpha.
    let spread=ease(.61,1.05,t);
    let frontY=-31.+23.*spread;
    let received=(1.-ease(frontY-3.,frontY+3.,bodyP.y))*bodyMask;
    let tail=ease(.57,.92,t)*(1.-ease(1.22,1.48,t));
    let bodyLight=received*tail*fabricResponse;
    emission+=vec3f(.035,.18,.29)*bodyLight*.62;
    let foldA=exp(-pow((bodyP.x+1.5-(bodyP.y+28.)*.18)/1.35,2.));
    let foldB=exp(-pow((bodyP.x+5.4+(bodyP.y+24.)*.23)/.8,2.));
    let along=ease(-34.,-30.,bodyP.y)*(1.-ease(-11.,-6.,bodyP.y));
    emission+=(vec3f(.21,.78,.76)*foldA+vec3f(.36,.14,.60)*foldB)*along*bodyLight*.79;
    let peak=ease(.90,.96,t)*(1.-ease(1.01,1.10,t));
    let collar=exp(-pow((bodyP.y+30.+bodyP.x*.10)/1.6,2.))*exp(-pow(bodyP.x/6.,2.));
    let core=collar*bodyMask*peak*(.28+pow(clamp(luma*2.5,0.,1.),.55));
    emission+=vec3f(.72,.85,.62)*core*1.26;
    if(c.obs>.5){
      let f=exp(-pow((bodyP.x+1.)/10.,2.)-pow((bodyP.y+30.)/1.0,2.))*peak*bodyMask;
      emission+=vec3f(.32,.69,.86)*f*.22;
    }

  }
  var o:FOut;o.color=vec4f(col,1.);o.emission=vec4f(emission,1.);return o;
}
