// PH1: 銃口放射/圧力形、PH2: 有限の輸送形、PH3: 既存受光面への応答。
// ノイズ粒子・終点火花・命中輪を持たない。全長の均一発光管も持たない。
struct Globals {
  viewport: vec4f, // width,height,pixelsPerWorldUnit,unused
  camera: vec4f,   // world中心 x/y,cos(rotation),sin(rotation)
  options: vec4f,  // reducedMotion,occluderCount,bloomStrength,lightGain
  extra: vec4f,
};
struct Shot {
  origin: vec4f,   // screen source x/y, screen unit direction x/y
  motion: vec4f,   // lengthPx,age,life,transit
  shape: vec4f,    // widthPx,muzzleLengthPx,variant,seed
  depth: vec4f,    // startDepth,endDepth,ppu,unused
  body: vec4f,    // linear RGB,peak
  light: vec4f,
  world: vec4f,   // world source x/y,world direction x/y
};
struct Occluder { rect: vec4f, flags: vec4f };
@group(0) @binding(0) var<uniform> g: Globals;
@group(0) @binding(1) var<storage,read> shots: array<Shot>;
@group(0) @binding(2) var sceneDepth: texture_2d<f32>;
@group(0) @binding(3) var receiverMask: texture_2d<f32>;
@group(0) @binding(4) var<storage,read> occluders: array<Occluder>;
struct VOut { @builtin(position) position:vec4f, @location(0) @interpolate(flat) id:u32 };
@vertex fn vs(@builtin(vertex_index) vi:u32,@builtin(instance_index) ii:u32)->VOut {
  let corner = array<vec2f,6>(vec2f(0,0),vec2f(1,0),vec2f(0,1),vec2f(0,1),vec2f(1,0),vec2f(1,1))[vi];
  let s=shots[ii];let margin=48.0*s.depth.w;
  let p=vec2f(mix(-margin,s.motion.x+margin,corner.x),mix(-margin,margin,corner.y));
  let n=vec2f(-s.origin.w,s.origin.z);
  let screen=s.origin.xy+s.origin.zw*p.x+n*p.y;
  var o:VOut;o.position=vec4f(screen.x/g.viewport.x*2.0-1.0,1.0-screen.y/g.viewport.y*2.0,0,1);o.id=ii;return o;
}
fn env(t:f32,a:f32,h:f32,z:f32)->f32 {
  return smoothstep(0.0,a,t)*(1.0-smoothstep(h,z,t));
}
fn fill(sd:f32)->f32 {return 1.0-smoothstep(-0.65,0.65,sd);}
fn oval(p:vec2f,rx:f32,ry:f32)->f32 {
  return (length(p/vec2f(max(rx,0.01),max(ry,0.01)))-1.0)*min(rx,ry);
}
fn diamond(p:vec2f,rx:f32,ry:f32)->f32 {
  return (abs(p.x)/max(rx,0.01)+abs(p.y)/max(ry,0.01)-1.0)*min(rx,ry);
}
fn petal(p:vec2f,l:f32,w:f32,sweep:f32)->f32 {
  let t=clamp(p.x/l,0.0,1.0);
  let halfWidth=w*pow(max(sin(t*3.14159265),0.0),0.72);
  let center=sweep*sin(t*3.14159265*0.84);
  return max(max(-p.x,p.x-l),abs(p.y-center)-halfWidth);
}
struct Shape { coverage:f32,hot:f32,gas:f32,packet:f32 };
fn intrinsic(p:vec2f,s:Shot)->Shape {
  let age=s.motion.y;let life=s.motion.z;let transit=s.motion.w;
  let unit=s.depth.w;let w=s.shape.x;let kind=u32(s.shape.z);
  let pulse=env(age,0.003,0.013,life*0.69);
  let gasEnv=env(age,0.009,0.030,life);
  let relaxation=1.0+0.18*(1.0-g.options.x)*smoothstep(0.018,life,age);
  let len=min(s.shape.y*(1.0+0.08*(1.0-g.options.x)*smoothstep(0.0,0.05,age)),max(s.motion.x,0.001));
  let q=vec2f(p.x,p.y/relaxation);
  var body=0.0;var hot=0.0;
  if(kind==0u) {
    let top=fill(petal(q-vec2f(0.0,-0.16*w),len,0.51*w,-0.64*w));
    let bottom=fill(petal(q-vec2f(0.0,0.16*w),len*0.84,0.43*w,0.60*w));
    body=max(top,bottom);
    hot=fill(oval(q-vec2f(0.46*w,0),0.65*w,0.44*w))*pulse;
    hot+=0.25*fill(petal(q,len*0.78,0.15*w,-0.13*w))*pulse;
  } else if(kind==1u) {
    let tongue=fill(petal(q,len,0.65*w,-0.42*w));
    let notch=fill(oval(q-vec2f(len*0.62,0.26*w),0.27*len,0.44*w));
    body=tongue*(1.0-notch);
    hot=fill(petal(q,len*0.76,0.18*w,-0.42*w))*pulse;
    hot=max(hot,fill(oval(q-vec2f(0.3*w,0),0.50*w,0.41*w))*pulse);
  } else if(kind==2u) {
    let upper=fill(petal(q-vec2f(0,-0.46*w),len,0.40*w,-0.30*w));
    let lower=fill(petal(q-vec2f(0,0.46*w),len*0.93,0.33*w,0.28*w));
    let spine=fill(diamond(q-vec2f(len*0.43,0),len*0.42,0.31*w));
    body=max(max(upper,lower),spine*0.72);
    hot=fill(oval(q-vec2f(0.4*w,0),0.64*w,0.52*w))*pulse;
    hot+=0.22*max(upper,lower)*pulse*(1.0-smoothstep(len*0.35,len,q.x));
  } else if(kind==3u) {
    let outer=fill(diamond(q-vec2f(len*0.43,0),len*0.57,1.05*w));
    let slit=fill(diamond(q-vec2f(len*0.35,0),len*0.39,0.50*w));
    body=outer*(1.0-slit*0.93);
    hot=fill(oval(q-vec2f(0.43*w,0),0.74*w,0.43*w))*pulse;
    let edge=outer*(1.0-fill(diamond(q-vec2f(len*0.43,0),len*0.54,0.82*w)));
    hot+=edge*0.28*pulse;
  } else {
    let a=fill(diamond(q-vec2f(len*0.42,-0.75*w),len*0.48,0.46*w));
    let b=fill(diamond(q-vec2f(len*0.42,0.75*w),len*0.48,0.46*w));
    body=max(a,b);
    hot=max(a,b)*env(age,0.004,0.021,life*0.43)*0.75;
  }
  let t=clamp(age/transit,0.0,1.0);
  let front=s.motion.x*t;
  let transfer=env(age,0.003,transit*0.64,transit*1.13)*(1.0-smoothstep(0.83,1.0,t));
  let v=vec2f(p.x-front,p.y);
  var packet=0.0;var packetHot=0.0;
  if(kind==0u) {
    packet=fill(diamond(v,7.2*unit,0.68*w));
    let cleft=fill(diamond(v+vec2f(5.6*unit,0),3.6*unit,0.30*w));
    packet*=1.0-cleft;
    packetHot=fill(diamond(v-vec2f(1.6*unit,0),3.8*unit,0.18*w));
  } else if(kind==1u) {
    let tear=fill(oval(v-vec2f(0,-0.14*w),4.5*unit,0.65*w));
    let cut=fill(oval(v+vec2f(3.2*unit,-0.40*w),3.8*unit,0.54*w));
    packet=tear*(1.0-cut);packetHot=fill(diamond(v-vec2f(1.5*unit,-0.19*w),2.4*unit,0.22*w));
  } else if(kind==2u) {
    let spear=fill(diamond(v,12.0*unit,0.72*w));
    let shoulder=fill(diamond(v+vec2f(6.8*unit,0),4.6*unit,0.98*w));
    let cut=fill(diamond(v+vec2f(9.8*unit,0),3.6*unit,0.41*w));
    packet=max(spear,shoulder)*(1.0-cut);
    packetHot=fill(diamond(v-vec2f(2*unit,0),7.0*unit,0.18*w));
  } else if(kind==3u) {
    let outer=fill(diamond(v,20.0*unit,0.41*w));
    let hollow=fill(diamond(v+vec2f(4.0*unit,0),13.0*unit,0.18*w));
    packet=outer*(1.0-hollow*0.9);
    packetHot=fill(diamond(v-vec2f(11*unit,0),7.0*unit,0.18*w));
  } else {
    let a=fill(diamond(v-vec2f(0,-1.20*w),6.3*unit,0.53*w));
    let b=fill(diamond(v-vec2f(0,1.20*w),6.3*unit,0.53*w));
    packet=max(a,b);packetHot=max(a,b)*0.52;
    // 導体は発射端子の後方だけ。終点に新しい放電を出さない。
    let u=clamp(p.x/max(front,1.0),0.0,1.0);
    let normal=vec2f(-s.origin.w,s.origin.z);
    let gravityScreen=vec2f(-g.camera.w,g.camera.z);
    let sag=dot(normal,gravityScreen)*1.6*w*sin(u*3.14159265)*smoothstep(0.01,transit,age);
    let aWire=abs(p.y+mix(0.75,1.20,u)*w-sag);
    let bWire=abs(p.y-mix(0.75,1.20,u)*w-sag);
    let wire=fill(min(aWire,bWire)-max(0.28*unit,0.37))
      *smoothstep(0.0,2.0*unit,p.x)*(1.0-smoothstep(front-3.0*unit,front,p.x));
    body=max(body,wire*0.60*(1.0-smoothstep(transit,life,age)));
  }
  let finite=(1.0-smoothstep(s.motion.x-0.5,s.motion.x+0.2,p.x))*smoothstep(-0.30,0.45,p.x);
  var result:Shape;
  result.coverage=max(body*gasEnv,packet*transfer)*finite;
  result.hot=(hot+packetHot*transfer)*finite;
  result.gas=body*gasEnv*finite;
  result.packet=packet*transfer*finite;
  return result;
}
fn worldFromScreen(p:vec2f)->vec2f {
  let v=vec2f((p.x-g.viewport.x*0.5)/g.viewport.z,-(p.y-g.viewport.y*0.5)/g.viewport.z);
  return g.camera.xy+vec2f(g.camera.z*v.x-g.camera.w*v.y,g.camera.w*v.x+g.camera.z*v.y);
}
fn segmentBlocked(a:vec2f,b:vec2f)->bool {
  for(var i=0u;i<u32(g.options.y);i++) {
    let r=occluders[i].rect;let d=b-a;var lo=0.0001;var hi=0.9999;var ok=true;
    for(var ax=0u;ax<2u;ax++) {
      if(abs(d[ax])<0.000001){if(a[ax]<r[ax]||a[ax]>r[ax+2u]){ok=false;}}
      else{let u=(r[ax]-a[ax])/d[ax];let v=(r[ax+2u]-a[ax])/d[ax];lo=max(lo,min(u,v));hi=min(hi,max(u,v));}
    }
    if(ok&&lo<=hi&&occluders[i].flags.x>0.5){return true;}
  }return false;
}
fn pointLight(p:vec2f,source:vec2f,power:f32,radius:f32)->f32 {
  let r=length(p-source)/radius;
  if(r>=1.0||power<=0.00001||segmentBlocked(source,p)){return 0.0;}
  let cut=1.0-r*r;return power*cut*cut/(1.0+5.0*r*r);
}
struct FOut { @location(0) body:vec4f, @location(1) emission:vec4f, @location(2) illumination:vec4f };
@fragment fn fs(vIn:VOut)->FOut {
  let s=shots[vIn.id];let p=vIn.position.xy;let n=vec2f(-s.origin.w,s.origin.z);
  let q=p-s.origin.xy;let local=vec2f(dot(q,s.origin.zw),dot(q,n));
  let sh=intrinsic(local,s);let xy=vec2i(p);
  let z=mix(s.depth.x,s.depth.y,clamp(local.x/max(s.motion.x,1.0),0.0,1.0));
  let visible=select(0.0,1.0,z<=textureLoad(sceneDepth,xy,0).x+0.00001);
  let alpha=clamp(sh.coverage*0.84,0.0,0.92)*visible;
  let bodyColor=s.body.xyz*(0.76+0.34*sh.packet);
  // coverage/有色本体/放射は別量。白い外形をbloomで生成しない。
  let emissive=(sh.hot*s.body.w+sh.gas*0.16)*s.light.xyz*visible;
  let worldP=worldFromScreen(p);
  let rootEnv=env(s.motion.y,0.003,0.013,s.motion.z*0.69);
  let t=clamp(s.motion.y/s.motion.w,0.0,1.0);
  let front=s.world.xy+s.world.zw*(s.motion.x/s.depth.z)*t;
  let transfer=env(s.motion.y,0.003,s.motion.w*0.64,s.motion.w*1.13)*(1.0-smoothstep(0.83,1.0,t));
  let root=s.world.xy+s.world.zw*1.2*s.light.w;
  let power=pointLight(worldP,root,rootEnv*s.body.w*0.25,34.0*s.light.w)
     +pointLight(worldP,front,transfer*0.24,15.0*s.light.w);
  let receive=textureLoad(receiverMask,xy,0).x;
  var result:FOut;result.body=vec4f(bodyColor*alpha,alpha);
  result.emission=vec4f(emissive,0.0);
  result.illumination=vec4f(s.light.xyz*power*receive*g.options.w,0.0);return result;
}
