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
// PH1 -> PH3: a finite thick open volume folds around the actor at full-body scale.
// Angular support stays open: there is no closed ring, planar halo, or beam path.
fn storeField(point:vec3f,t:f32)->vec2f {
  let fold=ease(.30,.90,t);
  let rad=mix(vec2f(10.,17.),vec2f(23.,29.),fold);
  let q=rz(ry(point,mix(-.42,.10,fold)),mix(-.48,.07,fold));
  var theta=atan2(q.y/rad.y,q.x/rad.x);if(theta<0.){theta+=6.2831853;}
  let startAngle=mix(.15,.50,fold);let to=mix(4.5,4.23,fold);
  let angle=clamp(theta,startAngle,to);
  let bending=sin(angle*1.2+.3);
  let bulge=1.+.14*sin(angle*2.2+.8)*fold;
  let center=vec3f(rad.x*cos(angle)*bulge,rad.y*sin(angle),mix(-6.,13.,fold)*bending+fold*7.*cos(angle*2.));
  let radial=normalize(vec2f(cos(angle)/rad.x,sin(angle)/rad.y));
  let offset=q-center;
  let across=dot(offset.xy,radial);
  let along=dot(offset.xy,vec2f(-radial.y,radial.x));
  let taper=.30+.70*pow(max(0.,sin((angle-startAngle)/(to-startAngle)*3.14159265)),.5);
  let breadth=mix(7.8,9.0+2.0*sin(angle*.8),fold)*taper;
  let axial=mix(5.0,2.5,fold);
  // A thick flattened section, torsion varies across the same finite volume.
  let section=vec2f(across,offset.z);
  let twist=1.05*sin(angle*1.3+fold*1.8);
  let co=cos(twist);let si=sin(twist);
  let uv=vec2f(co*section.x-si*section.y,si*section.x+co*section.y);
  let edge=(length(uv/vec2f(breadth,axial))-1.)*min(breadth,axial);
  let cap=abs(along)-2.0;
  let endCap=select(-100.,cap,theta<startAngle||theta>to);
  return vec2f(max(edge,endCap)*.65,angle);
}
fn fieldNormal(q:vec3f,t:f32)->vec3f {let e=.15;return normalize(vec3f(storeField(q+vec3f(e,0,0),t).x-storeField(q-vec3f(e,0,0),t).x,storeField(q+vec3f(0,e,0),t).x-storeField(q-vec3f(0,e,0),t).x,storeField(q+vec3f(0,0,e),t).x-storeField(q-vec3f(0,0,e),t).x));}
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
    let fold=ease(.30,.90,t);
    let center=bez(src,src+vec2f(3.,-31.),e.anchors.zw+vec2f(-19.,-34.),e.anchors.zw+vec2f(0.,-31.),ease(.03,.78,t));
    if(any(abs(p-center)>vec2f(39.,41.))||t>=1.48){continue;}
    let bodyP=p-center;
    let ro=vec3f(bodyP,-40.);
    var distance=0.;var hit=false;var point=ro;var angle=0.;
    for(var n=0u;n<72u;n++){
      let q=ro+vec3f(0.,0.,distance);let f=storeField(q,t);
      if(f.x<.10){hit=true;point=q;angle=f.y;break;}
      distance+=max(.08,f.x*.90);if(distance>72.){break;}
    }
    if(hit){
      let normal=fieldNormal(point,t);
      let ending=1.-ease(1.14,1.48,t);
      let onset=ease(.015,.10,t);
      // The entire input shifts behind the silhouette during receipt; later near lip returns.
      let orbitDepth=18.*sin(ease(.08,.85,t)*3.14159265)-6.;
      let behind=ease(-2.,2.,point.z+orbitDepth);
      let visibility=(1.-actorAlpha*behind)*ending*onset;
      let front=clamp(-normal.z,0.,1.);
      let side=clamp(normal.x*.6+.4,0.,1.);
      let lip=pow(1.-front,1.6);
      let charged=ease(.42,.98,t);
      let advancing=ease(.42,.93,t)*4.2;
      let filled=1.-ease(advancing-.65,advancing+.65,angle);
      let hue=mix(vec3f(.19,.045,.39),vec3f(.055,.39,.48),front*.6+filled*.3);
      col=mix(col,hue*(.35+.5*front)+actorColor*actorAlpha*.18,visibility*.58);
      emission+=(mix(vec3f(.18,.055,.35),vec3f(.065,.45,.55),filled)*(.22+.50*front)+vec3f(.08,.34,.47)*lip*.30)*visibility;
      let fillFront=exp(-pow((angle-advancing)/.30,2.))*charged*(1.-ease(.97,1.10,t));
      emission+=vec3f(.20,.68,.69)*fillFront*visibility*.48;
      let peak=ease(.90,.98,t)*(1.-ease(1.04,1.14,t));
      emission+=vec3f(.58,.71,.49)*peak*exp(-pow((angle-1.3)/.35,2.))*visibility*.48;
    }
  }
  var o:FOut;o.color=vec4f(col,1.);o.emission=vec4f(emission,1.);return o;
}

