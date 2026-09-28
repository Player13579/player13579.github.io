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
    // PH1/2: finite folded charges detach from one source and are absorbed in sequence.
    // No rendered path connects the body to the source; travelling mass carries the direction.
    var accumulation=0.;
    for(var k=0u;k<3u;k++){
      let launch=array<f32,3>(.06,.22,.38)[k];
      let arrival=array<f32,3>(.44,.62,.80)[k];
      let progress=clamp((t-launch)/(arrival-launch),0.,1.);
      let advance=progress*progress*(3.-2.*progress);
      let offset=array<vec2f,3>(vec2f(-4.,-6.),vec2f(3.,-2.),vec2f(-1.,5.))[k];
      let receive=e.anchors.zw+array<vec2f,3>(vec2f(-8.,-27.),vec2f(2.,-22.),vec2f(0.,-33.))[k];
      let start=src+offset;
      let path=receive-start;
      let normal=normalize(vec2f(-path.y,path.x));
      let bend=array<f32,3>(-7.,5.,-3.)[k]*select(1.,.45,reduced);
      let center=mix(start,receive,advance)+normal*sin(advance*3.14159)*bend;
      let tangent=normalize(path+normal*cos(advance*3.14159)*bend*3.14159);
      let sideN=vec2f(-tangent.y,tangent.x);
      let local=p-center;
      // Two interpenetrating density facets inside one thick rounded asymmetric volume.
      let compression=1.-.54*ease(.72,1.,progress);
      let x=dot(local,tangent)/(8.7*compression);
      let y=dot(local,sideN)/(5.2*compression)+x*.19;
      let d=pow(pow(abs(x),2.5)+pow(abs(y+.14*x*x),1.65),.5)-1.;
      let envelope=ease(.005,.10,t)*(1.-ease(arrival-.015,arrival+.07,t));
      let coverage=(1.-smoothstep(-aa/6.,aa/6.,d))*envelope;
      let depth=clamp(-d,0.,1.);
      let absorption=1.-actorAlpha*ease(.72,1.,progress)*.8;
      col=mix(col,mix(linear(vec3f(.18,.065,.49)),linear(vec3f(.05,.33,.54)),depth),coverage*.28*absorption);
      let fold=exp(-pow((y+.23*x+.10)/.24,2.));
      let shallow=exp(-pow((y-.40*x-.22)/.36,2.));
      let front=exp(-pow((x-.33)/.48,2.));
      emission+=(vec3f(.30,.075,.52)*depth*.25+vec3f(.09,.43,.75)*shallow*.46+vec3f(.24,.86,.85)*fold*(.53+front*.75))*coverage*absorption;
      accumulation+=ease(arrival-.035,arrival+.095,t)/3.;
    }
    // PH3: the receiving figure visibly fills in three steps as the carried mass disappears.
    let bodyP=p-e.anchors.zw;
    let bodyMask=actorAlpha*ease(-39.,-32.,bodyP.y)*(1.-ease(-8.,-3.,bodyP.y));
    let luma=dot(actorColor,vec3f(.2126,.7152,.0722));
    let fabric=.36+.83*sqrt(luma);
    let ending=1.-ease(1.08,1.48,t);
    // First arrival fills left sleeve/chest; second crosses the waist; third reaches the far cloak.
    let fillEdge=mix(-16.,19.,accumulation);
    let filled=(1.-ease(fillEdge-3.,fillEdge+3.,bodyP.x))*bodyMask;
    let vertical=ease(-36.,-30.,bodyP.y)*(1.-ease(-10.,-5.,bodyP.y));
    let stored=filled*vertical*ending*ease(.005,.12,accumulation);
    col+=actorColor*vec3f(.05,.26,.24)*stored*accumulation;
    emission+=mix(vec3f(.055,.16,.43),vec3f(.055,.46,.48),accumulation)*stored*fabric*(.46+.6*accumulation);
    // The moving boundary is broad enough to read at H64 and cannot float off the actual cloth.
    let receivingFront=exp(-pow((bodyP.x-fillEdge)/2.5,2.))*bodyMask*vertical*ease(.40,.50,t)*(1.-ease(.86,.96,t));
    emission+=vec3f(.16,.75,.72)*receivingFront*fabric*.65;
    // A small warm-white response follows the final arrival, then resolves into cloth-bound traces.
    let peak=ease(.87,.94,t)*(1.-ease(1.00,1.10,t));
    let collar=exp(-pow((bodyP.y+29.+bodyP.x*.10)/1.4,2.))*exp(-pow(bodyP.x/6.,2.));
    let waist=exp(-pow((bodyP.y+18.-bodyP.x*.12)/2.2,2.))*.37;
    let response=(collar+waist)*bodyMask*peak*(.24+sqrt(luma));
    emission+=vec3f(.74,.88,.66)*response*1.05;
    let fine=ease(1.03,1.20,t)*(1.-ease(1.30,1.48,t));
    let foldA=exp(-pow((bodyP.x+1.5-(bodyP.y+28.)*.18)/.9,2.));
    let foldB=exp(-pow((bodyP.x+5.4+(bodyP.y+24.)*.23)/.6,2.));
    emission+=(vec3f(.13,.65,.65)*foldA+vec3f(.29,.11,.49)*foldB)*bodyMask*vertical*fine*fabric;
    if(c.obs>.5){
      emission+=vec3f(.19,.56,.64)*response*exp(-pow(bodyP.x/12.,2.))*.14;
    }

  }
  var o:FOut;o.color=vec4f(col,1.);o.emission=vec4f(emission,1.);return o;
}
