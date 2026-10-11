struct Params { viewport:vec4f, source:vec4f, rect:vec4f, time:vec4f, gates:vec4f }
@group(0) @binding(0) var<uniform> u:Params;
struct Out { @builtin(position) position:vec4f }
@vertex fn vs(@builtin(vertex_index) n:u32)->Out {
  var p=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));
  var o:Out; o.position=vec4f(p[n],0,1); return o;
}
fn box(p:vec2f,b:vec2f)->f32 {let d=abs(p)-b; return length(max(d,vec2f(0)))+min(max(d.x,d.y),0.0);}
fn rounded(p:vec2f,b:vec2f,r:f32)->f32{return box(p,b-vec2f(r))-r;}
fn mask(d:f32)->f32{return 1.0-smoothstep(-0.65*u.viewport.z,0.65*u.viewport.z,d);}
fn envelope(t:f32)->f32{return smoothstep(70.0,180.0,t)*(1.0-smoothstep(760.0,980.0,t));}
// Direct colored source, analytic local display radiance; no independent noise/particles.
@fragment fn fs(@builtin(position) pixel:vec4f)->@location(0) vec4f {
  let t=u.time.x; let s=u.viewport.z;
  if(t<0.0 || t>=980.0 || u.time.z==0.0 || u.gates.x==0.0){return vec4f(0);}
  let p=pixel.xy; var direct=vec3f(0); var nearby=vec3f(0);
  let gain=envelope(t);
  let opening=smoothstep(150.0,580.0,t);
  let open=select(opening,0.0,u.time.w>0.5);
  let sourceGain=smoothstep(0.0,65.0,t)*(1.0-smoothstep(180.0,300.0,t));
  // A compact receipt membrane on the registered self projection. Display annotation only.
  let sourceSize=clamp(u.source.z*0.24,12.0*s,28.0*s);
  let sp=p-u.source.xy;
  let shrink=select(1.0-0.38*smoothstep(180.0,300.0,t),1.0,u.time.w>0.5);
  let sd=rounded(sp,vec2f(sourceSize*0.42,sourceSize*0.62)*shrink,2.0*s);
  let inner=mask(sd);
  let stripe=0.25+0.75*smoothstep(-sourceSize*0.42,sourceSize*0.18,sp.x);
  let notch=1.0-mask(box(sp-vec2f(-sourceSize*0.3,0),vec2f(sourceSize*0.14,sourceSize*0.13)));
  let seam=exp(-pow((sp.y-sourceSize*0.12)/(1.2*s),2.0));
  direct+=(vec3f(0.05,0.8,0.9)*stripe+vec3f(0.42,1.6,1.1)*seam)*inner*notch*sourceGain;
  nearby+=vec3f(0.03,0.52,0.48)*exp(-pow(max(sd,0.0)/(5.0*s),2.0))*sourceGain;
  let center=u.rect.xy+u.rect.zw*0.5;
  let halfSize=u.rect.zw*0.5;
  let local=p-center;
  let targetD=rounded(local,halfSize,4.0*s);
  let inside=mask(targetD);
  // Three broad panels retract into their own real target edges. Every panel remains clipped
  // to the registered rectangle; there is no new off-target button, projectile or shortcut.
  let third=u.rect.z/3.0;
  for(var n=0u;n<3u;n++) {
    let index=f32(n);
    var pc=center+vec2f((index-1.0)*third,0);
    var hs=vec2f(third*0.5-1.0*s,halfSize.y-1.5*s);
    if(n==0u){pc.x-=third*open;}
    if(n==1u){pc.y-=u.rect.w*open;}
    if(n==2u){pc.x+=third*open;}
    let d=rounded(p-pc,hs,2.0*s);
    let coverage=mask(d)*inside*select(1.0,1.0-opening,u.time.w>0.5);
    let panel=p-pc;
    let face=0.28+0.72*smoothstep(-hs.y,hs.y,panel.y);
    let front=exp(-pow((panel.y-hs.y*0.68)/(2.3*s),2.0));
    direct+=(vec3f(0.025,0.45,0.72)*face+vec3f(0.2,1.3,1.04)*front)*coverage*gain;
    nearby+=vec3f(0.025,0.2,0.24)*exp(-pow(max(d,0.0)/(4.0*s),2.0))*inside*gain*(1.0-opening);
  }
  // Availability result fits the receiving contour. Broad internal corner shoulder separates
  // this result from a uniform luminous line; geometry opens rather than tracing a gauge.
  let result=smoothstep(280.0,580.0,t)*gain;
  let boundary=exp(-pow(targetD/(1.4*s),2.0));
  let shoulder=mask(rounded(local-vec2f(halfSize.x-8.0*s,-halfSize.y+5.0*s),vec2f(7.0*s,4.0*s),1.5*s))*inside;
  let contrast=0.42+0.58*smoothstep(-halfSize.x,halfSize.x,local.x);
  direct+=(vec3f(0.1,1.05,0.73)*boundary*contrast+vec3f(0.5,1.5,0.83)*shoulder)*result;
  nearby+=vec3f(0.045,0.35,0.24)*exp(-pow(abs(targetD)/(7.0*s),2.0))*result;
  let rgb=(direct+nearby*u.gates.y)*u.time.y;
  // HDR radiance carrier, additive at final composition: alpha is zero, not opacity/density.
  return vec4f(rgb,0);
}
