struct View { size:vec2f, ageMs:f32, scale:f32, reduced:f32, activeFlag:f32, pad:vec2f, }
@group(0) @binding(0) var<uniform> view:View;

@vertex fn vs(@builtin(vertex_index) i:u32)->@builtin(position) vec4f {
  let v=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));
  return vec4f(v[i],0,1);
}
fn srgb(c:vec3f)->vec3f {
  let x=clamp(c,vec3f(0),vec3f(1));
  return select(12.92*x,1.055*pow(x,vec3f(1.0/2.4))-vec3f(0.055),x>vec3f(0.0031308));
}
fn cov(d:f32,aa:f32)->f32 { return 1.0-smoothstep(-aa,aa,d); }
fn box(p:vec2f,h:vec2f,r:f32)->f32 {
  let v=abs(p)-h+vec2f(r);
  return length(max(v,vec2f(0)))+min(max(v.x,v.y),0.0)-r;
}
fn seg(p:vec2f,a:vec2f,b:vec2f)->f32 {
  let e=b-a;
  return length(p-a-e*clamp(dot(p-a,e)/dot(e,e),0.0,1.0));
}
fn imprint(p:vec2f)->f32 {
  let a=p-vec2f(-6,0);
  let letter=max(abs(length(a)-5.35)-1.35,a.x-3.65);
  let tip=vec2f(10.4,-4.45);
  let shaft=seg(p,vec2f(1.3,3.8),tip);
  let head=min(seg(p,vec2f(4.7,-4.45),tip),seg(p,tip,vec2f(10.4,1.25)));
  return min(letter,min(shaft,head)-1.22);
}
fn dieFrame(p:vec2f)->f32 {
  return max(box(p,vec2f(18,9.6),2.6),-box(p,vec2f(14.6,7.65),1.25));
}

@fragment fn fs(@builtin(position) screen:vec4f)->@location(0) vec4f {
  let bg=vec3f(.018,.021,.034);
  let t=view.ageMs;
  if (view.activeFlag<.5 || t>=1800.0 || t<=0.0) { return vec4f(srgb(bg),1); }
  let p=(screen.xy-view.size*.5)/view.scale;
  let aa=.63/view.scale;
  if (any(abs(p)>vec2f(43.0+aa))) { return vec4f(srgb(bg),1); }
  let q=p-vec2f(-2,9);
  let m=q-vec2f(4,-2);
  let stroke=clamp((t-105.0)/360.0,0.0,1.0);
  let retreat=clamp((t-670.0)/335.0,0.0,1.0);
  let lift=1.0-stroke*stroke*(.35+.65*stroke)+retreat*(2.0-retreat);
  let travel=vec2f(7.6,-26)*lift*mix(1.0,.43,clamp(view.reduced,0.0,1.0));
  let tool=m-travel;
  let dieOn=smoothstep(50.0,150.0,t)*(1.0-smoothstep(825.0,1038.0,t));

  // One pressure-fed glass bar. The live interval grows out from the striker.
  let feed=smoothstep(465.0,478.0,t)*(1.0-.18*smoothstep(490.0,567.0,t));
  let heat=feed*(1.0-.22*smoothstep(670.0,855.0,t))*(1.0-smoothstep(1260.0,1660.0,t));
  let reach=mix(1.2,15.1,smoothstep(465.0,535.0,t));
  let bar=m-vec2f(0,11);
  let glassDist=length(vec2f(max(abs(bar.x)-15.1,0.0),bar.y));
  let liveDist=length(vec2f(max(abs(bar.x)-reach,0.0),bar.y));

  let back=box(q-vec2f(-.6,2.4),vec2f(39.2,18.8),3.0);
  var col=mix(bg,vec3f(.072,.10,.145),cov(back,aa));
  // Light intercepted by the inclined brass return below the page edge.
  // Project the finite emitting interval onto this face, not onto the viewport.
  let ledge=box(q-vec2f(2,16.15),vec2f(34.8,4.05),1.15);
  let depth=max(bar.y,0.0);
  let lateral=bar.x-.24*depth;
  let width=2.0+.72*depth;
  let ends=vec2f(lateral+reach,lateral-reach);
  let angles=ends*inverseSqrt(ends*ends+vec2f(width*width));
  let fall=length(vec2f(max(abs(lateral)-reach,0.0),depth));
  let arriving=heat*.5*(angles.x-angles.y)*(1.0-smoothstep(2.0,15.5,fall));
  let bevel=cov(abs(q.y-13.35)-.68,aa);
  let brass=mix(vec3f(.135,.116,.096),vec3f(.26,.222,.16),bevel);
  let reflected=arriving*(vec3f(.78,.32,.047)+bevel*vec3f(.48,.29,.096));
  col=mix(col,brass+reflected,cov(ledge,aa));

  let page=cov(box(q+vec2f(0,2.8),vec2f(38,14.8),2.2),aa);
  let stock=mix(vec3f(.34,.405,.425),vec3f(.245,.31,.35),smoothstep(-15.0,12.0,q.y));
  col=mix(col,stock,page);
  col=mix(col,vec3f(.53,.41,.26),page*cov(abs(q.x+31.0)-1.35,aa));
  col=mix(col,vec3f(.17,.235,.26),page*cov(seg(q,vec2f(-25,-13),vec2f(31,-13))-.48,aa));
  let made=smoothstep(465.0,483.0,t);
  col=mix(col,vec3f(.78,.66,.46),made*cov(imprint(m-vec2f(.65,.95)),aa));
  col=mix(col,vec3f(.041,.054,.068),made*cov(imprint(m),aa));
  let projectedShadow=dieFrame(m-.32*travel-vec2f(.7,1.0));
  col*=1.0-.26*page*dieOn*cov(projectedShadow,aa+.8+1.7*lift);

  // Dark ferrule, vitreous jacket and a much hotter filament; no screen bloom.
  col=mix(col,vec3f(.052,.055,.062),cov(glassDist-2.95,aa));
  col=mix(col,vec3f(.19,.083,.039),cov(glassDist-2.05,aa));
  let jacket=cov(liveDist-2.05,aa);
  let filament=cov(liveDist-.86,aa);
  col+=heat*(jacket*vec3f(1.18,.295,.022)+filament*vec3f(.94,1.10,.69));

  // The open steel chase leaves the struck glyph visible even at full pressure.
  let frame=dieFrame(tool);
  let foot=box(tool-vec2f(0,9.3),vec2f(3.3,1.8),.7);
  let steel=mix(vec3f(.31,.37,.39),vec3f(.115,.15,.175),smoothstep(-8.5,8.0,tool.y));
  let arris=cov(abs(box(tool,vec2f(18,9.6),2.6)+.72)-.48,aa);
  col=mix(col,steel+arris*vec3f(.19,.18,.145),dieOn*cov(frame,aa));
  let bounce=heat*(1.0-smoothstep(0.0,6.5,length(travel)))*smoothstep(8.2,11.1,tool.y);
  col=mix(col,vec3f(.42,.31,.20)+bounce*vec3f(.57,.25,.06),dieOn*cov(foot,aa));
  let stem=box(tool+vec2f(0,12.25),vec2f(3.7,4.55),1.1);
  col=mix(col,mix(vec3f(.43,.48,.49),vec3f(.19,.24,.27),smoothstep(-2.6,2.0,tool.x)),dieOn*cov(stem,aa));
  let grip=box(tool+vec2f(0,17.1),vec2f(8.5,3.45),2.1);
  col=mix(col,vec3f(.112,.17,.205),dieOn*cov(grip,aa));
  let cover=smoothstep(0.0,94.0,t)*(1.0-smoothstep(1420.0,1800.0,t));
  return vec4f(srgb(mix(bg,col,cover)),1);
}