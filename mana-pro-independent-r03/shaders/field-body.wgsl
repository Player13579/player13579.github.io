// B PH1/PH2/PH3を同じ座標・時計で描く。PH4は試験背景の受光。OBS1は本体保護の再合成前の局所拡散、OBS2は表示変換。
struct Globals {
  viewport: vec4f, // width, height, world-to-pixel scale, foot-pixel-y
  camera: vec4f,   // world-camera-x, world-camera-y, unused, unused
  settings: vec4u, // event count, theme(0 dark,1 light,2 both), layer bits, verify
  optical: vec4f,  // DOM上で可視のpixel矩形 left,top,right,bottom。witnessだけを制限。
}
struct Event {
  pose: vec4f, // worldX,worldY,phase,opacity
  attributes: vec4u, // token,reducedMotion,unused,unused
}
struct Field {rgb:vec3f, alpha:f32, primary:f32, light:vec3f, bloom:vec3f, fill:f32,}
struct Layer {rgb:vec3f, alpha:f32,}
@group(0) @binding(0) var<uniform> g:Globals;
@group(0) @binding(1) var<storage,read> events:array<Event>;
@group(0) @binding(2) var outputImage:texture_storage_2d<rgba8unorm,write>;
@group(0) @binding(3) var<storage,read_write> witnesses:array<atomic<u32>>;

fn sq(x:f32)->f32 {return x*x;}
fn sat(x:f32)->f32 {return clamp(x,0.0,1.0);}
fn sm(a:f32,b:f32,x:f32)->f32 {let t=sat((x-a)/(b-a));return t*t*(3.0-2.0*t);}
fn poly(p:vec2f,v:array<vec2f,12>,n:u32)->f32 {
  var d=1e8;var inside=false;var j=n-1u;
  for(var i=0u;i<n;i=i+1u){
    let a=v[i];let b=v[j];let e=b-a;let w=p-a;let h=sat(dot(w,e)/dot(e,e));
    d=min(d,length(w-h*e));
    if((a.y>p.y)!=(b.y>p.y)){
      if(p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x){inside=!inside;}
    }
    j=i;
  }
  return select(d,-d,inside);
}
fn cover(d:f32,aa:f32)->f32{return 1.0-sm(-aa,aa,d);}
fn over(a:Layer,c:vec3f,alpha:f32)->Layer{
  let total=alpha+a.alpha*(1.0-alpha);
  return Layer((c*alpha+a.rgb*a.alpha*(1.0-alpha))/max(total,1e-7),total);
}
fn field(p:vec2f,phase:f32,reduced:bool,bits:u32)->Field{
  var f=Field(vec3f(0),0,0,vec3f(0),vec3f(0),0);
  if(phase<0.0||phase>=1.0||p.x< -66.0||p.x>66.0||p.y< -127.0||p.y>13.0){return f;}
  let aa=max(.4,.5/g.viewport.z);
  let ds=poly(p,SOURCE_POINTS,SOURCE_COUNT);let dt=poly(p,TRANSPORT_POINTS,TRANSPORT_COUNT);let dr=poly(p,RECEIVER_POINTS,RECEIVER_COUNT);
  let cs=cover(ds,aa);let ct=cover(dt,aa);let cr=cover(dr,aa);
  let emitted=sm(EMIT_START,EMIT_END,phase);let received=sm(EMIT_START,EMIT_END,phase-TRANSIT_DELAY);
  let source=1.0-emitted;let settled=sm(SETTLE_START,SETTLE_END,phase);
  let env=(1.0-.16*sm(.85,1.0,phase))*(.88+.12*sm(0.0,.035,phase));
  var layer=Layer(vec3f(0),0);
  // PH2: 空間連続な厚い体積。周期は密度変化であり、独立の線/粒子/残像ではない。
  let s=sat((-p.y-10.0)/53.0);let localTime=phase-TRANSIT_DELAY*s;
  let ft=sat((localTime-EMIT_START)/(EMIT_END-EMIT_START));let localFlux=4.0*ft*(1.0-ft);
  let face=sm(0.0,6.0,-dt);
  var band=.58;if(!reduced){band=.5+.5*cos(6.28318530718*(s*2.2-phase*5.1));}
  let filledPath=sm(EMIT_START-.012,EMIT_START+.020,localTime);
  var tc=mix(vec3f(.015,.060,.13),C_TRANSPORTLIT,sat(.10+filledPath*(.40+localFlux*(.16+.28*band))));
  tc=tc*(.46+.54*face);
  let front=exp(-sq((localTime-EMIT_START-.012)/.025))*face;
  tc=tc+vec3f(.28,.35,.38)*front*.80;
  if((bits&2u)!=0u){layer=over(layer,tc,ct);f.primary=max(f.primary,ct);}
  // PH1: 実際に見える供給面を足元に固定。供給後も支持場が残り、輸送路を切らない。
  let sf=sm(.5,5.0,-ds);
  let reservoir=(1.0-sm(6.0+35.0*source,10.0+35.0*source,abs(p.x)))*(1.0-sm(3.0,7.0,abs(p.y+5.0)));
  var sc=mix(C_SOURCE,C_SOURCELIT,reservoir*(.54+.35*source));sc=sc*(.40+.60*sf);
  let hot=exp(-(sq(p.x/12.0)+sq((p.y+7.0)/4.5)))*(.38+.42*source);
  sc=sc+vec3f(.56,.62,.65)*hot;
  if((bits&1u)!=0u){layer=over(layer,sc,cs);f.primary=max(f.primary,cs);}
  // PH3: 大きな受領領域の内側を下から満たす。内縁・自由境界・受領済み層を分ける。
  let wall=1.0-sm(2.6,6.0,-dr);let fillY=mix(RECEIVER_FLOOR,RECEIVER_CEILING,received);
  let fill=sm(fillY-1.2,fillY+1.2,p.y)*(1.0-wall*.65);let rf=sm(0.0,3.4,-dr);
  var rc=mix(C_RECEIVER,C_RIM,wall*.86);
  let depth=sat((p.y-fillY)/42.0);
  var fc=mix(C_FRESH,C_STORED,sat(.24+depth*.9));
  fc=fc*(.92+.08*cos((p.y+60.0)*.38))*(1.0-.11*settled);
  rc=mix(rc,fc,fill*rf);
  let meniscus=exp(-sq((p.y-fillY)/1.9))*rf*received;
  rc=rc+vec3f(.34,.40,.44)*meniscus*.48;
  let focus=exp(-sq(p.x/mix(36.0,13.0,settled))-sq((p.y-mix(-70.0,-83.0,settled))/11.0))*fill*rf*settled;
  rc=rc+vec3f(.14,.09,.19)*focus;
  if((bits&4u)!=0u){layer=over(layer,rc,cr);f.primary=max(f.primary,cr);}
  let ls=exp(-sq(max(0.0,ds)/7.4))*(.65+.35*source);
  let lt=exp(-sq(max(0.0,dt)/5.5))*(.24+.42*filledPath+.18*localFlux);
  let lr=exp(-sq(max(0.0,dr)/7.4))*(.36+.64*received);
  let edge=min(min(p.x+66.0,66.0-p.x),min(p.y+127.0,13.0-p.y));let clipping=sm(0.0,3.0,edge);
  if((bits&8u)!=0u){f.light=(vec3f(.06,.14,.40)*ls+vec3f(.04,.24,.26)*lt+vec3f(.24,.10,.38)*lr)*env*clipping;}
  if((bits&16u)!=0u){f.bloom=(vec3f(.006,.012,.026)*ls+vec3f(.004,.022,.023)*lt+vec3f(.018,.006,.027)*lr)*env*clipping;}
  f.rgb=layer.rgb;f.alpha=layer.alpha*.965*env;f.fill=fill*cr;return f;
}
fn srgb(x:f32)->f32{
  if(x<=.0031308){return 12.92*x;}return 1.055*pow(max(0.0,x),1.0/2.4)-.055;
}
fn display(c:vec3f)->vec3f{
  let v=max(c,vec3f(0));let t=v/(vec3f(1)+.16*v);return clamp(vec3f(srgb(t.x),srgb(t.y),srgb(t.z)),vec3f(0),vec3f(1));
}
fn maxChannel(c:vec3f)->f32{return max(c.x,max(c.y,c.z));}
@compute @workgroup_size(8,8,1)
fn render(@builtin(global_invocation_id) gid:vec3u){
  if(gid.x>=u32(g.viewport.x)||gid.y>=u32(g.viewport.y)){return;}
  let pixel=vec2f(gid.xy)+vec2f(.5);
  var panel=0u;var centerX=g.viewport.x*.5;var bg=C_DARK;
  if(g.settings.y==1u){bg=C_LIGHT;}
  if(g.settings.y==2u){panel=select(0u,1u,pixel.x>=g.viewport.x*.5);centerX=g.viewport.x*(.25+.5*f32(panel));if(panel==1u){bg=C_LIGHT;}}
  let relative=(pixel-vec2f(centerX,g.viewport.w))/g.viewport.z;
  var irradiance=vec3f(0);var bloom=vec3f(0);
  for(var i=0u;i<g.settings.x;i=i+1u){
    let e=events[i];let p=relative-(e.pose.xy-g.camera.xy);let f=field(p,e.pose.z,e.attributes.y==1u,g.settings.z);
    irradiance=irradiance+f.light*e.pose.w;bloom=bloom+f.bloom*e.pose.w;
  }
  var color=bg*(vec3f(1)+min(irradiance,vec3f(.45)))+min(bloom,vec3f(.075));
  var chosen=64u;var chosenDelta=vec3f(0);
  for(var i=0u;i<g.settings.x;i=i+1u){
    let e=events[i];let p=relative-(e.pose.xy-g.camera.xy);let f=field(p,e.pose.z,e.attributes.y==1u,g.settings.z);
    let a=f.alpha*e.pose.w;let before=color;color=f.rgb*a+before*(1.0-a);
    chosenDelta=chosenDelta*(1.0-a);
    let delta=color-before;
    // shaderへの入力やalpha>0だけで発音しない。最終像に残る有色本体の寄与を数える。
    if(f.primary>.40&&a>.22&&maxChannel(abs(display(color)-display(before)))>.022){chosen=i;chosenDelta=delta;}
  }
  let outColor=display(color);
  if(chosen<64u&&pixel.x>=g.optical.x&&pixel.y>=g.optical.y&&pixel.x<g.optical.z&&pixel.y<g.optical.w&&maxChannel(abs(outColor-display(color-chosenDelta)))>.016){atomicAdd(&witnesses[panel*64u+chosen],1u);}
  textureStore(outputImage,vec2i(gid.xy),vec4f(outColor,1));
}
