// PH04 free water / PH05 contact film / PH06 retained drops. No self emission.
struct Water{time:vec4f,anchors:vec4f,gravity:vec4f,projection:vec4f,film:vec4f,optics:vec4f,residual:vec4f,splash:vec4f};
@group(1) @binding(0)var<uniform>w:Water;
fn valve(t:f32)->f32{if(t<0.||t>=5.85){return 0.;}if(t<.35){return smoothstep(0.,.35,t);}if(t<5.4){return 1.;}return 1.-smoothstep(5.4,5.85,t);}
fn projectWater(xy:vec2f,z:f32)->vec2f{return w.anchors.zw+xy*w.projection.yz-vec2f(0.,w.projection.w*z);}
fn bowlMask(p:vec2f,aa:f32)->f32{let q=(p-vec2f(888.,233.))/vec2f(63.,37.);return 1.-smoothstep(.92,1.,length(q));}
struct Wet{mask:f32,normal:vec3f};
fn filmAt(p:vec2f,aa:f32)->Wet{var a:Wet;a.mask=0.;a.normal=vec3f(0.,0.,1.);let q=(p-w.anchors.zw)/w.projection.yz;let radius=length(q);if(w.time.z<=0.||w.film.x<=0.){return a;}
 let edge=1.-smoothstep(max(0.,w.film.x-aa/w.projection.y),w.film.x+aa/w.projection.y,radius);let phase=radius*w.film.z-w.film.y;
 // Outward gravity-capillary mode, normal gradients and central drain shear. No emissive ring.
 let envelope=exp(-radius/.08);let slope=w.time.w*envelope*(w.film.z*cos(phase)-sin(phase)/.08);let radial=q/max(radius,.001);let swirl=.026*exp(-pow(radius/.022,2.))*sin(w.time.x*3.2-radius*90.);
 a.mask=edge*bowlMask(p,aa);a.normal=normalize(vec3f(-radial*slope+vec2f(-radial.y,radial.x)*swirl,1.));return a;
}
fn jetAt(p:vec2f,aa:f32)->Wet{var a:Wet;a.mask=0.;a.normal=vec3f(0.,0.,1.);let z=(w.anchors.w-p.y)/w.projection.w;if(z<0.||z>w.gravity.x){return a;}
 let age=(sqrt(w.gravity.z*w.gravity.z+2.*w.gravity.y*(w.gravity.x-z))-w.gravity.z)/w.gravity.y;let q=valve(w.time.x-age);if(q<=0.){return a;}
 let speed=w.gravity.z+w.gravity.y*age;let radius=w.projection.x*sqrt(q*w.gravity.z/speed)*w.projection.y;
 // Three broad advected surface undulations, not spawned generic particles.
 let undulation=.18*sin(24.*(w.time.x-age))+ .09*sin(39.*(w.time.x-age)+1.4);let center=w.anchors.x+(w.anchors.z-w.anchors.x)*age/w.gravity.w+radius*.13*undulation;
 let side=(p.x-center)/max(radius,.05);let aaCoverage=1.-smoothstep(radius-aa*.5,radius+aa*.5,abs(p.x-center));
 let end=smoothstep(w.anchors.y-.5,w.anchors.y+.8,p.y)*(1.-smoothstep(w.anchors.w-.5,w.anchors.w+aa,p.y));
 // Cylindrical cross-section plus moving flow-aligned surface perturbation.
 a.mask=aaCoverage*end;let nx=clamp(side,-.97,.97);a.normal=normalize(vec3f(nx,-.14+undulation,sqrt(max(.01,1.-nx*nx))));return a;
}
fn dropAt(p:vec2f,aa:f32,emission:f32)->Wet{var a:Wet;a.mask=0.;a.normal=vec3f(0.,0.,1.);let age=w.time.x-emission;if(age<0.||age>w.splash.x){return a;}
 let z=w.gravity.x-w.splash.y*age-.5*w.gravity.y*age*age;let center=projectWater(vec2f((w.anchors.x-w.anchors.z)/w.projection.y*(1.-age/w.splash.x),0.),max(0.,z));
 let radius=w.residual.w*w.projection.y;let delta=p-center;let dist=length(delta);a.mask=1.-smoothstep(radius-aa*.5,radius+aa*.5,dist);let q=delta/max(radius,.05);a.normal=normalize(vec3f(q,sqrt(max(.02,1.-dot(q,q)))));return a;
}
fn splashAt(p:vec2f,aa:f32,impact:f32,strength:f32)->Wet{var a:Wet;a.mask=0.;a.normal=vec3f(0.,0.,1.);let age=w.time.x-impact;let life=2.*w.splash.w/w.gravity.y;if(age<0.||age>life){return a;}
 let z=w.splash.w*age-.5*w.gravity.y*age*age;
 for(var j=0u;j<4u;j++){let angle=f32(j)*1.570796327+.45;let xy=vec2f(cos(angle),sin(angle))*w.splash.z*age;let center=projectWater(xy,max(0.,z));let radius=w.residual.w*w.projection.y*.58;let q=p-center;let mask=(1.-smoothstep(radius-aa*.5,radius+aa*.5,length(q)))*strength*bowlMask(p,aa);if(mask>a.mask){a.mask=mask;let n=q/max(radius,.05);a.normal=normalize(vec3f(n,sqrt(max(.02,1.-dot(n,n)))));}}
 return a;
}
fn wetter(a:Wet,b:Wet)->Wet{if(b.mask>a.mask){return b;}return a;}
fn waterMaterial(v:V,p:vec2f,n:vec3f,coverage:f32,o:Output)->Output{var r=o;
 // Same immutable room image supplies reflected radiance. This is a declared 2.5D lookup, not measured ray tracing.
 let reflected=textureSampleLevel(original,smp,(vec2f(995.,290.)+n.xy*vec2f(95.,70.))/f.image.xy,0.).rgb;
 let shifted=clamp(p+n.xy*w.optics.yz,vec2f(811.,190.),vec2f(967.,273.));var vv=v;vv.pixel=f.rect.xy+shifted/f.image.xy*f.rect.zw;let transmitted=lightingFragment(vv).scene.rgb;
 let F=w.optics.x+(1.-w.optics.x)*pow(1.-max(n.z,0.),5.);let tint=vec3f(.965,.990,1.);let incident=12.*f.view.w*f.state.x*f.state.y*(.065+.32*transport(p,false));
 let highlight=vec3f(.98,.99,1.)*incident*ggx(n,w.film.w,w.optics.x);
 let material=transmitted*tint*(1.-F)+reflected*F+highlight;
 r.scene=vec4f(mix(o.scene.rgb,material,clamp(coverage,0.,1.)),o.scene.a);
 // Only actual positive reflected highlight enters source optics; dark refraction and film coverage cannot glow.
 r.sourceSignal=vec4f(o.sourceSignal.rgb+highlight*coverage,max(o.sourceSignal.a,coverage*clamp(incident,0.,1.)));return r;
}
@fragment fn fragment(v:V)->Output{let q=(v.pixel-f.rect.xy)/f.rect.zw;let p=q*f.image.xy;let o=fabric(v,p,lightingFragment(v));if(w.time.y<.5||f.view.w<.5){return o;}if(p.x<811.||p.x>967.||p.y<187.||p.y>274.){return o;}
 let aa=max(.3,f.image.x/f.rect.z);var wet=filmAt(p,aa);wet=wetter(wet,jetAt(p,aa));
 let emissions=array<f32,3>(w.residual.x,w.residual.y,w.residual.z);
 for(var i=0u;i<3u;i++){wet=wetter(wet,dropAt(p,aa,emissions[i]));wet=wetter(wet,splashAt(p,aa,emissions[i]+w.splash.x,1.));}
 // Running impacts are sparse four-drop crowns, each causally emitted by nonzero jet impact flow.
 let spacing=.19;let impact=floor(w.time.x/spacing)*spacing;let flow=valve(impact-w.gravity.w);wet=wetter(wet,splashAt(p,aa,impact,flow*.8));
 if(w.time.x>=10.){return o;}if(wet.mask<=.0001){return o;}
 return waterMaterial(v,p,wet.normal,wet.mask,o);
}
