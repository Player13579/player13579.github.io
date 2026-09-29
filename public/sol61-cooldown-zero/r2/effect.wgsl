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
  // PH1: 受益者の側方で二つの幅広い湾曲面が、間にある待ちの抜けを畳む。
  let compression=smoothstep(0.20,0.79,t);let arrival=smoothstep(0.72,0.96,t);
  let x=mix(mix(-30.0,-19.0,u.reduced),-16.0,arrival);let cy=mix(11.0,7.0,arrival);
  let halfW=mix(14.0,10.0,compression);let local=q-vec2f(x,cy);
  let nx=clamp((local.x+halfW)/(halfW*2.0),0.0,1.0);
  let side=1.0-smoothstep(halfW-0.6,halfW+0.6,abs(local.x));
  let gap=mix(6.7,0.0,compression);
  // 大きい外側曲率と内側の短い開口を別の界面へ。透ける面の厚さは開始時6〜12px。
  let outer=gap+4.5+8.0*pow(max(0.0,1.0-pow((nx-.46)*1.75,2.0)),0.75)*(1.0-0.40*compression);
  let inner=gap+2.1*(1.0-nx)*(1.0-compression);
  let ay=abs(local.y);let surface=side*smoothstep(inner-0.65,inner+0.65,ay)*(1.0-smoothstep(outer-0.65,outer+0.65,ay));
  let depth=clamp((ay-inner)/max(outer-inner,1.0),0.0,1.0);
  let bodyColor=mix(vec3f(0.86,0.36,0.045),vec3f(0.045,0.69,0.77),compression);
  // 主面自体に色と放射を持たせ、光る内縁だけが残る失敗を避ける。
  field=surface*bodyColor*(0.9+0.42*(1.0-depth));coverage=surface*0.76;
  let seam=band(ay-inner,0.70)*side;
  field+=seam*vec3f(1.0,0.88,0.56)*0.68;
  // 真ん中の抜けが閉じる接合時だけ、連続した厚い接合芯が生じる。
  let joined=band(local.y,2.8)*side*smoothstep(.60,.84,t);
  field+=joined*vec3f(0.64,1.05,0.98);coverage=max(coverage,joined*.78);
  let outside=max(max(ay-outer,inner-ay),0.0);
  spread=exp(-outside*outside/13.0)*side*bodyColor*0.16;
  // 終盤は縮んだ体積が手へ入って消える。状態保持や実CTゼロを宣言しない。
  let foldLife=live*(1.0-smoothstep(0.94,1.13,t));
  bg=mix(bg,field,coverage*foldLife*0.45)+field*foldLife*0.67+spread*foldLife*u.obs;
  // PH2:受け手の前腕・体側への到着応答。前面の主作用は体外→腕→胴の有限接触。
  let response=env(t,0.73,0.87,1.23,1.46);
  let shift=clamp((t-0.80)/0.40,0.0,1.0);
  let responseCenter=vec2f(mix(-14.0,-3.0,shift),mix(9.0,8.0,shift));
  let rr=q-responseCenter;let responseSdf=length(rr/vec2f(13.0,8.0));
  let receiverMask=(1.0-smoothstep(0.5,1.15,responseSdf))*response*a.a;
  let rim=exp(-pow((responseSdf-0.6)*3.0,2.0))*response;
  bg+=receiverMask*vec3f(0.32,0.92,0.84)+rim*vec3f(0.09,0.28,0.27)*u.obs;
  // OBS1: 圧縮された発光接合点にだけ広がる表示フレア。無関係なレンズ列・光球は置かない。
  let hotspot=q-vec2f(x+halfW-1.0,cy);let flare=exp(-dot(hotspot,hotspot)/42.0)*env(t,0.50,0.76,0.99,1.16)*foldLife*u.obs;
  bg+=flare*vec3f(0.12,0.42,0.35);
  if(u.stars>0.5) {
    bg+=star(q,vec2f(-36,0),3.9,env(t,0.12,0.20,0.33,0.45));
    bg+=star(q,vec2f(-29,23),4.5,env(t,0.29,0.40,0.55,0.66));
    bg+=star(q,vec2f(-17,9),5.0,env(t,0.60,0.72,0.86,0.96));
    // 受け手側の外側光条が衣装発光に埋もれず、腕で定着する短いピーク。
    bg+=star(q,vec2f(-13,1),4.5,env(t,0.87,0.96,1.12,1.28));
    bg+=star(q,vec2f(7,8),3.7,env(t,1.02,1.10,1.24,1.41));
  }
  return vec4f(bg,1);
}

