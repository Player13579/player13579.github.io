struct Params { screen:vec4f, anchor:vec4f, control:vec4f };
@group(0) @binding(0) var<uniform> u:Params;
@vertex fn vs(@builtin(vertex_index) i:u32)->@builtin(position) vec4f {
 let p=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));return vec4f(p[i],0,1);
}
@fragment fn fsBackground()->@location(0) vec4f {
 let v=u.screen.w;let c=select(v*12.92,1.055*pow(v,1./2.4)-.055,v>.0031308);return vec4f(c,c,c,1.);
}
fn ease(a:f32,b:f32,v:f32)->f32{return smoothstep(a,b,v);}
fn bell(x:f32,r:f32)->f32{return exp(-x*x/(r*r));}
fn curve(a:vec2f,b:vec2f,c:vec2f,d:vec2f,t:f32)->vec2f{
 let s=1.-t;return a*s*s*s+3.*b*s*s*t+3.*c*s*t*t+d*t*t*t;
}
// Nearest centreline coordinate and signed cross-section. The sections widen
// independently; the interior slit preserves folds at the 64 px body scale.
fn ribbon(q:vec2f,a:vec2f,b:vec2f,c:vec2f,d:vec2f)->vec2f{
 var nearest=1e5;var along=0.;var signed=0.;var old=a;
 for(var i=1;i<=20;i++){
  let t=f32(i)/20.;let p=curve(a,b,c,d,t);let dv=p-old;let k=clamp(dot(q-old,dv)/dot(dv,dv),0.,1.);let off=q-old-k*dv;
  let dist=length(off);if(dist<nearest){nearest=dist;along=(f32(i-1)+k)/20.;signed=select(-dist,dist,dv.x*off.y-dv.y*off.x>0.);}
  old=p;
 }return vec2f(signed,along);
}
fn lobe(q:vec2f,a:vec2f,b:vec2f,c:vec2f,d:vec2f,w:f32,fill:f32)->vec3f{
 let k=ribbon(q,a,b,c,d);let width=w*pow(max(0.,sin(k.y*3.14159265)),.62)+.15;
 let aa=.55/u.anchor.z;let field=(1.-smoothstep(width-aa,width+aa,abs(k.x)))*ease(0.,.045,k.y)*(1.-ease(fill-.055,fill+.02,k.y));
 let cross=k.x/width;let ridge=bell(cross-.26,.18)*field;let hollow=1.-.72*bell(cross+.40,.20);
 return vec3f(field*hollow,ridge,field*max(0.,1.-abs(cross)));
}
@fragment fn fs(@builtin(position) p:vec4f)->@location(0) vec4f {
 let q=(p.xy-u.anchor.xy)/u.anchor.z;
 let t=u.screen.z;let reduced=u.control.y;let layers=i32(u.control.z);
 let sourceOn=select(0.,1.,(layers&1)!=0);let flowOn=select(0.,1.,(layers&2)!=0);let bodyOn=select(0.,1.,(layers&4)!=0);let obsOn=select(0.,1.,(layers&8)!=0);
 let alive=select(0.,1.,t>=0.&&t<1.38);
 let source=ease(0.,.10,t)*(1.-ease(.32,.57,t))*sourceOn;
 let feed=ease(.11,.23,t)*(1.-ease(.59,.77,t))*flowOn;
 let stored=ease(.52,.80,t)*(1.-ease(1.08,1.38,t))*bodyOn;
 // Source PH1: an oblique, hollow, yielding pod. It collapses from its rear,
 // leaving the receiving end lit while the transferred tongue arrives.
 let collapse=ease(.23,.55,t);let sq=q-vec2f(-27.+collapse*5.,-9.-collapse*7.);
 let local=vec2f(.80*sq.x-.60*sq.y,.60*sq.x+.80*sq.y);
 let outer=length(local/vec2f(9.-collapse*3.,4.4));
 let cut=length((local-vec2f(-2.,-4.1))/vec2f(7.0,3.0));
 let pod=(1.-ease(.87,1.03,outer))*ease(.72,1.05,cut);
 let podCore=pod*bell(local.y-.8,1.0)*bell(local.x-2.,5.0);
 // PH2 transport: a full tapered curl, not a uniform line or a particle path.
 let travel=ease(.13,.53,t);let tip=curve(vec2f(-22.,-12.),vec2f(-28.,-34.),vec2f(-9.,-46.),vec2f(0.,-32.),travel);
 let moving=lobe(q,vec2f(-22.,-12.),vec2f(-28.,-34.),vec2f(-9.,-46.),vec2f(0.,-32.),4.6,travel);
 let tailErase=ease(.39,.76,t);let route=ribbon(q,vec2f(-22.,-12.),vec2f(-28.,-34.),vec2f(-9.,-46.),vec2f(0.,-32.));
 let routeMask=ease(tailErase-.18,tailErase+.02,route.y);
 // PH3 receiver: paired load-bearing folds unfurl downward from the pelvis;
 // a short upward fold connects the accumulated supply to the body's axis.
 let f=ease(.52,.89,t);let settle=ease(.89,1.15,t)*(1.-reduced);
 let receiveQ=vec2f(q.x,q.y);
 let legA=lobe(receiveQ,vec2f(-1.,-32.),vec2f(-16.,-26.),vec2f(-4.-settle*2.,-16.),vec2f(-10.,-1.),6.3,f);
 let legB=lobe(receiveQ,vec2f(2.,-31.),vec2f(15.,-29.),vec2f(5.,-15.),vec2f(11.,-3.),5.5,f);
 let trunk=lobe(receiveQ,vec2f(0.,-31.),vec2f(-3.,-38.),vec2f(3.,-44.),vec2f(1.,-49.),5.5,ease(.59,.89,t));
 let folds=legA+legB+trunk;
 let entry=bell(length((q-vec2f(0.,-32.))/vec2f(1.,.7)),3.8)*ease(.49,.58,t)*(1.-ease(.77,.94,t))*bodyOn;
 let supplyRadiance=source*(pod*.88+podCore*2.8);
 let transferRadiance=feed*routeMask*(moving.x*.62+moving.y*2.5);
 let receiveRadiance=stored*(folds.x*.70+folds.y*2.1);
 let glow=(source*bell(length(sq),10.)*.20+feed*bell(length(q-tip),7.)*.24+entry*bell(length(q-vec2f(0.,-32.)),10.)*.30+stored*bell(length((q-vec2f(0.,-24.))/vec2f(.9,1.3)),15.)*.16)*obsOn;
 let localLight=(source*bell(length(q-vec2f(-23.,0.)),15.)*.16+stored*bell(length((q-vec2f(0.,-20.))/vec2f(.85,1.5)),16.)*.08)*obsOn;
 // Source-bound display flare at the arrival only; never a screen-wide lift.
 let flare=(bell(q.y+32.,.65)*bell(q.x,11.)*.27+bell(q.x,.7)*bell(q.y+32.,7.)*.10)*entry*obsOn;
 let radiance=vec3f(1.0,.53,.045)*(supplyRadiance+transferRadiance+receiveRadiance)+vec3f(1.,.90,.58)*(source*podCore*.95+stored*folds.y*.8+entry*2.3+flare)+vec3f(.92,.42,.03)*(glow+localLight);
 let coverage=alive*clamp(source*pod*.76+feed*moving.x*routeMask*.66+stored*folds.x*.68+entry*.30,0.,.90);
 let bg=vec3f(u.screen.w);let rgb=bg*(1.-coverage)+alive*radiance;
 // Linear light composition and explicit sRGB OETF; no alpha double multiply.
 return vec4f(select(rgb*12.92,1.055*pow(max(rgb,vec3f(0.)),vec3f(1./2.4))-.055,rgb>vec3f(.0031308)),1.);
}
