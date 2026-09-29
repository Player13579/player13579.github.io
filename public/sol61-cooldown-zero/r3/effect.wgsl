struct Params { size:vec2f, time:f32, stars:f32, obs:f32, actor:f32, light:f32, reduced:f32 };
@group(0) @binding(0) var<uniform> u:Params;
@group(0) @binding(1) var actorTex:texture_2d<f32>;
@group(0) @binding(2) var actorSampler:sampler;
struct VertexOut { @builtin(position) pos:vec4f };
@vertex fn vs(@builtin(vertex_index) i:u32)->VertexOut { var a=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));var o:VertexOut;o.pos=vec4f(a[i],0,1);return o; }
fn band(d:f32,width:f32)->f32 { return 1.0-smoothstep(width-0.55,width+0.55,abs(d)); }
fn env(t:f32,a:f32,b:f32,c:f32,d:f32)->f32 { return smoothstep(a,b,t)*(1.0-smoothstep(c,d,t)); }
fn star(p:vec2f,c:vec2f,size:f32,life:f32)->vec3f {
  // 光条角度は全光点・全時刻22度で統一する。縦横比も固定。
  let q=p-c;let cs=0.92718385;let sn=0.37460659;let r=vec2f(q.x*cs+q.y*sn,-q.x*sn+q.y*cs);
  let a=band(r.y,0.45)*exp(-abs(r.x)/size);let b=band(r.x,0.45)*exp(-abs(r.y)/(size*0.65));
  let core=exp(-dot(q,q)/1.5);let glow=exp(-dot(q,q)/(size*size*0.4));
  return life*(vec3f(1.55,1.38,0.96)*(a+b+core*1.6)+vec3f(0.25,0.55,0.65)*glow*u.obs);
}
@fragment fn fs(v:VertexOut)->@location(0) vec4f {
  let p=v.pos.xy;let center=vec2f(128,66);let q=p-center;
  let t=u.time;let live=env(t,0.0,0.10,1.29,1.5);
  var bg=mix(vec3f(0.045,0.055,0.085),vec3f(0.84,0.86,0.88),u.light);
  // 既存原画の第一コマ。cropは256x256、alphaの高さ222をH64へ等方登録。
  let rect=vec4f(91.1,27.0,73.8,73.8);let xy=(p-rect.xy)/rect.zw;
  var a=vec4f(0);if(all(xy>=vec2f(0))&&all(xy<=vec2f(1))) { a=textureSampleLevel(actorTex,actorSampler,xy*vec2f(1.0/3.0,0.5),0.0); }
  bg=mix(bg,a.rgb,a.a*u.actor);
  var field=vec3f(0);var coverage=0.0;var spread=vec3f(0);
  // PH1: 長く曲がった身体上の位相面が、同じ前腕登録点を保ったまま短い直達面へ畳まれる。
  // 容器/クランプの外部物体は無い。受領から定着まで、この主面自体が身体応答を担う。
  let compression=smoothstep(.28,.92,t);let release=smoothstep(1.14,1.48,t);
  let width=18.0;let xn=clamp(q.x/width,-1.0,1.0);
  let bow=mix(mix(24.0,17.0,u.reduced),1.0,compression);
  let routeY=3.0+bow*(1.0-xn*xn)+1.6*xn;
  let derivative=-2.0*bow*xn/width+1.6/width;
  let distance=(q.y-routeY)/sqrt(1.0+derivative*derivative);
  let halfThickness=mix(4.8,6.0,compression);
  let side=1.0-smoothstep(width-.7,width+.7,abs(q.x));
  let revealX=mix(-25.0,25.0,smoothstep(.01,.26,t));
  let reveal=1.0-smoothstep(revealX-2.5,revealX+2.5,q.x);
  let surface=band(distance,halfThickness)*side*reveal;
  let cross=clamp(distance/halfThickness,-1.0,1.0);
  let color=mix(vec3f(.90,.42,.065),vec3f(.045,.78,.83),compression);
  // 二面の応答と厚さの違いを、中心芯と同一の色面コピーにしない。
  let convexFace=.68+.40*smoothstep(-1.0,.55,cross);
  let foldCore=band(distance+1.0,1.15)*side*reveal;
  field=surface*color*convexFace+foldCore*vec3f(.90,1.08,.94)*.66;
  coverage=surface*.49;
  let outside=max(abs(distance)-halfThickness,0.0);
  spread=exp(-outside*outside/13.0)*side*reveal*color*.18;
  // 圧縮後は短い同じ主面を保持し、接点へ収束しながら全幅を有限に閉じる。
  let contraction=1.0-release;
  let terminalMask=1.0-smoothstep(width*contraction+1.0,width*contraction+3.0,abs(q.x));
  let foldLife=live*terminalMask;
  bg=mix(bg,field,coverage*foldLife*.40)+field*foldLife*.71+spread*foldLife*u.obs;
  // OBS1: 折面の最大曲率/接合に追従する局所フレア。接点の存在にのみ応答。
  let hotspot=q-vec2f(-2.0,3.0+bow*.988);
  let flare=exp(-dot(hotspot,hotspot)/34.0)*env(t,.53,.88,1.11,1.35)*foldLife*u.obs;
  bg+=flare*vec3f(.09,.37,.32);
  if(u.stars>0.5) {
    bg+=star(q,vec2f(-18,1),4.0,env(t,.05,.13,.25,.34));
    bg+=star(q,vec2f(17,5),4.3,env(t,.24,.34,.44,.56));
    bg+=star(q,vec2f(-3.0,3.0+bow*.98),4.2,env(t,.54,.66,.79,.87));
    bg+=star(q,vec2f(-18,1),4.8,env(t,.84,.95,1.07,1.19));
    bg+=star(q,vec2f(18,5),4.8,env(t,.92,1.05,1.18,1.31));
  }
  return vec4f(bg,1);
}


