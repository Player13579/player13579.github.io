struct Uniforms { viewport:vec4f, muzzle:vec4f, options:vec4f, dynamics:vec4f }
@group(0) @binding(0) var<uniform> u:Uniforms;
struct VOut { @builtin(position) position:vec4f }
@vertex fn vs(@builtin(vertex_index) i:u32)->VOut {var p=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));var o:VOut;o.position=vec4f(p[i],0,1);return o;}
fn box(p:vec2f,b:vec2f)->f32 {let q=abs(p)-b;return length(max(q,vec2f(0)))+min(max(q.x,q.y),0);}
fn shape(distance:f32)->f32 {return 1-smoothstep(-.55,.55,distance);}
fn gauss(p:vec2f,r:vec2f)->f32 {return exp(-dot(p/r,p/r)*2);}
fn gasBranch(p:vec2f,a:vec2f,b:vec2f,rootRadius:f32,tipRadius:f32)->f32 {
 let ab=b-a;let h=clamp(dot(p-a,ab)/dot(ab,ab),0.,1.);
 return shape(length(p-a-ab*h)-mix(rootRadius,tipRadius,h));
}
fn flame(p:vec2f,t:f32)->f32 {
 // Distinct forward gas tongues: gaps remain several pixels wide at scale 1.
 // This is a joined source silhouette, not a radial star or particle sprite.
 let shift=sin(t*39.+u.options.y)*.55;
 let trunk=gasBranch(p,vec2f(1.,0.),vec2f(42.,-2.+shift),4.5,.6);
 let upper=gasBranch(p,vec2f(7.,-1.),vec2f(29.,-17.+shift),3.3,.5);
 let lower=gasBranch(p,vec2f(9.,2.),vec2f(24.,13.+shift),2.8,.5);
 let shoulder=gasBranch(p,vec2f(15.,-1.),vec2f(34.,5.+shift),2.,.4);
 return max(max(trunk,upper),max(lower,shoulder))*step(-.5,p.x);
}
struct Targets { @location(0) color:vec4f, @location(1) emission:vec4f }
@fragment fn fs(@builtin(position) pos:vec4f)->Targets {
 let px=pos.xy;let t=max(0.,u.viewport.z);let scale=u.options.z;
 let d=u.muzzle.zw;let n=vec2f(-d.y,d.x);let delta=(px-u.muzzle.xy)/scale;
 let p=vec2f(dot(delta,d),dot(delta,n));
 let sourceAlive=u.viewport.w;let flash=u.dynamics.x;
 var col=mix(vec3f(.018,.024,.034),vec3f(.76,.78,.8),clamp(u.options.w,0.,1.));
 // Supporting physical fixture: muzzle is barrel local x=0, y=0.
 // The casing exits the moving slide port, never the muzzle.
 let g=p+vec2f(u.dynamics.y,0.);let slide=g+vec2f(u.dynamics.z,0.);
 let barrel=shape(box(g-vec2f(-21.,0.),vec2f(21.,5.8)));
 let receiver=shape(box(slide-vec2f(-35.,-1.5),vec2f(18.,7.3)));
 let grip=shape(box(g-vec2f(-40.,21.),vec2f(7.,17.)));
 let triggerOuter=shape(box(g-vec2f(-24.,12.),vec2f(9.,6.)));
 let triggerInner=shape(box(g-vec2f(-24.,12.),vec2f(6.,3.)));
 let metal=max(barrel,receiver);let gun=max(max(metal,grip),triggerOuter-triggerInner);
 let bevel=(1.-smoothstep(4.6,7.3,abs(slide.y+1.5)));
 // Rough steel conductor RGB approximation, grazing edge + broad rough lobe.
 let cosTheta=clamp(1.-abs(slide.y+1.5)/8.,.05,1.);
 let fresnel=.56+.44*pow(1.-cosTheta,5.);
 let steel=vec3f(.07,.095,.12)+vec3f(.15,.17,.2)*fresnel*bevel;
 let nearLight=flash*exp(-length(g)/31.)*metal;
 col=mix(col,mix(vec3f(.033,.041,.052),steel,metal)+nearLight*vec3f(.5,.2,.055),gun);
 // Gas starts in the barrel's forward half-space; smoke expands and cools.
 var smoke=0.;
 for(var i=0;i<4;i++){let fi=f32(i);let delay=.012+fi*.014;let a=max(0.,t-delay);let valid=step(delay,t)*sourceAlive;
  let travel=9.+(25.+fi*8.)*(1.-exp(-a/ .14));
  let center=u.muzzle.xy+d*travel*scale+vec2f(0.,-25.*a*a)*scale+n*sin(fi*2.4+a*5.)*4.*a*scale;
  let r=(5.+fi+19.*a)*scale;smoke+=gauss(px-center,vec2f(r,r*.75))*.14*valid*(1.-smoothstep(.32,.76,t));
 }
 // Direct coverage/scattering independent from thermal radiance.
 col=mix(col,vec3f(.31,.34,.36),clamp(smoke,0.,.45));
 let fireCoverage=flame(p,t)*flash*sourceAlive;
 // Small hot core sits inside the pressure jet. Branches retain warm color
 // and an observable boundary rather than all clipping to one white oval.
 let core=gasBranch(p,vec2f(1.,0.),vec2f(14.,-.4),2.1,.6);
 let tipCooling=clamp(p.x/43.,0.,1.);
 let gasColor=mix(vec3f(1.,.46,.055),vec3f(.95,.20,.012),tipCooling);
 let fireColor=mix(gasColor,vec3f(1.,.94,.69),core);
 let radiance=fireColor*fireCoverage*mix(1.65,4.2,core);
 col=mix(col,fireColor,clamp(fireCoverage*.75,0.,1.))+radiance;
 // One brass case follows port->ejection impulse->gravity, finite visibility.
 let a=max(0.,t-.026);let caseCenter=u.muzzle.xy+d*(-41.85)*scale+n*(-5.-52.*a)*scale+vec2f(0.,155.*a*a)*scale;
 let cp=(px-caseCenter)/scale;let angle=a*14.;let cr=vec2f(cp.x*cos(angle)+cp.y*sin(angle),-cp.x*sin(angle)+cp.y*cos(angle));
 let casing=shape(box(cr,vec2f(3.2,1.35)))*step(.026,t)*sourceAlive*(1.-smoothstep(.53,.68,t));
 let brassF0=vec3f(.75,.48,.15);let cf=brassF0+(vec3f(1.)-brassF0)*pow(1.-abs(cos(angle)),5.);
 col=mix(col,cf*(.35+.45*pow(max(0.,cos(angle-.8)),8.)),casing);
 // Physical fast projectile, not tracer/laser/afterimage; only forward movement.
 let bullet=shape(length((p-vec2f(t*8500.,0.))/vec2f(3.5,1.2))-1.)*step(.001,t)*(1.-step(.09,t))*sourceAlive;
 col=mix(col,vec3f(.56,.48,.33),bullet);
 var out:Targets;out.color=vec4f(col,1.);out.emission=vec4f(radiance,1.);return out;
}
