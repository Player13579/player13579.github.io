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
// An open, thick receiving chamber: a real cavity remains between near and far walls.
fn ellipsoid(q:vec3f,r:vec3f)->f32 {return (length(q/r)-1.)*min(r.x,min(r.y,r.z));}
fn storeField(point:vec3f,t:f32)->vec2f {
  let grown=ease(.34,.91,t);
  let q=ry(rx(rz(point,-.12),.18),-.40);
  let outer=ellipsoid(q,vec3f(9.8,11.6,5.3));
  let inner=ellipsoid(q-vec3f(-3.5,-1.0,-1.6),vec3f(7.6,8.4,24.0));
  // Offset the hollow completely through the near-left wall: no closed planar ring.
  let chamber=max(outer,-inner);
  let cutHeight=8.0-21.0*grown;
  var result=vec2f(max(chamber,cutHeight-q.y),0.);
  let gathered=ease(.58,.96,t);
  let corePos=vec3f(-2.5,5.0-4.5*gathered,2.0);
  let core=ellipsoid(q-corePos,vec3f(3.8,1.7+4.6*gathered,1.8));
  if(core<result.x && gathered>.01){result=vec2f(core,1.);}
  return vec2f(result.x*.72,result.y);
}
fn fieldNormal(q:vec3f,t:f32)->vec3f {let e=.09;return normalize(vec3f(storeField(q+vec3f(e,0,0),t).x-storeField(q-vec3f(e,0,0),t).x,storeField(q+vec3f(0,e,0),t).x-storeField(q-vec3f(0,e,0),t).x,storeField(q+vec3f(0,0,e),t).x-storeField(q-vec3f(0,0,e),t).x));}
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
    // PH1/2: one finite bowed intake front moves from actual source into the body.
    // It cannot read as a path projected outward from the actor: there is no persistent path.
    let travel=ease(.08,.62,t);
    let receive=e.anchors.zw+vec2f(-1.,-23.);
    let center=mix(src,receive,travel);
    let axis=normalize(receive-src);let ortho=vec2f(-axis.y,axis.x);
    let local=p-center;let along=dot(local,axis);let across=dot(local,ortho);
    let curtainHeight=mix(12.0,8.0,travel);
    let bow=2.2*cos(across*.14);
    let curtainD=max(abs(along+bow)-5.4,abs(across)-curtainHeight);
    let intake=ease(.005,.075,t)*(1.-ease(.53,.68,t));
    let curtain=(1.-smoothstep(-aa,aa,curtainD))*intake*(1.-actorAlpha*.91);
    let depth=clamp(1.-abs(along+bow)/5.4,0.,1.);
    col=mix(col,mix(linear(vec3f(.21,.06,.47)),linear(vec3f(.035,.30,.54)),depth),curtain*.30);
    let rim=exp(-pow((along+bow-1.2)/1.1,2.));
    emission+=(vec3f(.28,.08,.47)*(1.-depth)*.32+vec3f(.09,.41,.68)*depth*.70+vec3f(.31,.83,.85)*rim*.85)*curtain;
    // PH3: radiating surfaces build an open interior volume, not a uniform recolouring.
    let bodyP=p-e.anchors.zw;
    let bodyMask=actorAlpha*ease(-39.,-34.,bodyP.y)*(1.-ease(-7.,-3.,bodyP.y));
    if(t>.35 && t<1.48 && abs(bodyP.x)<17. && bodyP.y> -39. && bodyP.y< -7. && bodyMask>.01){
      let ending=1.-ease(1.14,1.48,t);
      let ro=vec3f(bodyP.x,(bodyP.y+23.),-25.);
      var distance=0.;var hit=false;var hitPoint=ro;var material=0.;
      for(var n=0u;n<64u;n++){
        let q=ro+vec3f(0.,0.,distance);let f=storeField(q,t);
        if(f.x<.09){hit=true;hitPoint=q;material=f.y;break;}
        distance+=max(.065,f.x*.84);if(distance>44.){break;}
      }
      if(hit){
        let normal=fieldNormal(hitPoint,t);
        let frontFacing=clamp(-normal.z,0.,1.);
        let upperFacing=clamp(-normal.y,0.,1.);
        let sideFacing=clamp(normal.x*.6+.4,0.,1.);
        let surface=mix(vec3f(.055,.20,.34),vec3f(.14,.055,.30),material);
        let bodyTexture=linear(texel.rgb);
        let coating=bodyMask*ending*.48;
        col=mix(col,surface*(.40+.48*frontFacing+.35*upperFacing)+bodyTexture*.25,coating);
        let charge=ease(.35,.90,t);
        let fillY=9.5-23.*charge;
        let filled=ease(fillY-1.5,fillY+1.5,hitPoint.y);
        let angular=.16+.60*frontFacing+1.1*upperFacing+.22*sideFacing;
        let cavityFacing=clamp(normal.z,0.,1.);
        let radiance=mix(mix(vec3f(.06,.52,.64),vec3f(.26,.10,.47),cavityFacing),vec3f(.32,.09,.43),material)*angular;
        emission+=radiance*bodyMask*ending*(.43+.80*filled);
        // A broad bright advancing section travels up through the actual 3D folded faces.
        let advancing=exp(-pow((hitPoint.y-fillY)/1.45,2.))*ease(.38,.46,t)*(1.-ease(.96,1.08,t));
        emission+=vec3f(.24,.85,.83)*advancing*angular*bodyMask*ending*.85;
        // Peak is tied to the junction of rear cradle and nearer fold, never the whole torso.
        let peak=ease(.88,.96,t)*(1.-ease(1.02,1.13,t));
        let junction=exp(-pow((hitPoint.y-1.8)/2.0,2.)-pow((hitPoint.x-1.)/4.3,2.));
        emission+=vec3f(.80,.84,.59)*junction*peak*bodyMask*angular*1.3;
        if(c.obs>.5){emission+=vec3f(.20,.52,.63)*junction*peak*bodyMask*.24;}
      }
    }

  }
  var o:FOut;o.color=vec4f(col,1.);o.emission=vec4f(emission,1.);return o;
}
