// PH01入射境界/床、PH02金属反射、PH03青灰ビニル応答。原画linear RGB入力。
struct Frame{view:vec4f,rect:vec4f,state:vec4f,image:vec4f,obs:vec4f,kernel:vec4f};
@group(0) @binding(0)var<uniform> f:Frame;
@group(0) @binding(1)var original:texture_2d<f32>;
@group(0) @binding(2)var smp:sampler;
struct V{@builtin(position)position:vec4f,@location(0)pixel:vec2f};
@vertex fn vertex(@builtin(vertex_index)i:u32)->V{let q=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));var v:V;v.position=vec4f(q[i],0.,1.);v.pixel=(q[i]*vec2f(.5,-.5)+vec2f(.5))*f.view.xy;return v;}
fn rectMask(p:vec2f,r:vec4f)->f32{return smoothstep(r.x,r.x+2.,p.x)*(1.-smoothstep(r.z-2.,r.z,p.x))*smoothstep(r.y,r.y+2.,p.y)*(1.-smoothstep(r.w-2.,r.w,p.y));}
fn rayBox(a:vec2f,b:vec2f,r:vec4f)->bool{let d=b-a;let safe=select(d,vec2f(1e-8),abs(d)<vec2f(1e-8));let lo=(r.xy-a)/safe;let hi=(r.zw-a)/safe;let mn=min(lo,hi);let mx=max(lo,hi);let t0=max(max(mn.x,mn.y),0.);let t1=min(min(mx.x,mx.y),1.);return t0<=t1&&t1>1e-5&&t0<.99999;}
fn blocked(a:vec2f,p:vec2f)->bool{return rayBox(a,p,vec4f(331.,413.,592.,1080.))||rayBox(a,p,vec4f(195.,108.,489.,343.))||rayBox(a,p,vec4f(773.,106.,1008.,360.));}
fn transport(p:vec2f,occlude:bool)->f32{let dx=1004.-p.x;if(dx<=0.){return 0.;}let sigma=22.+.16*dx;var sum=0.;var weights=0.;for(var i=0u;i<8u;i++){let u=(f32(i)+.5)/8.;let y=632.+284.*u;let w=pow(sin(3.141592654*u),2.);weights+=w;if(!occlude||!blocked(vec2f(1004.,y),p)){let dy=p.y-y-.26*dx;sum+=w*exp(-.5*pow(dy/sigma,2.))*22./sigma;}}return sum/weights/(1.+pow(dx/570.,2.));}
fn floorCoverage(p:vec2f)->f32{return rectMask(p,vec4f(183.,184.,981.,1253.))*(1.-rectMask(p,vec4f(331.,413.,592.,1080.)))*(1.-rectMask(p,vec4f(195.,108.,489.,343.)))*(1.-rectMask(p,vec4f(773.,106.,1008.,360.)));}
struct Surface{mask:f32,normal:vec3f};
fn tube(p:vec2f,a:vec2f,b:vec2f,r:f32)->Surface{let axis=normalize(b-a);let across=vec2f(-axis.y,axis.x);let length=distance(a,b);let along=dot(p-a,axis);let side=dot(p-a,across);let mask=(1.-smoothstep(r-1.5,r+1.5,abs(side)))*smoothstep(0.,3.,along)*(1.-smoothstep(length-3.,length,along));let q=clamp(side/r,-.99,.99);var s:Surface;s.mask=mask;s.normal=vec3f(across*q,sqrt(1.-q*q));return s;}
fn metalSurface(p:vec2f)->Surface{var s:Surface;s.mask=0.;s.normal=vec3f(0.,0.,1.);let aa=array<vec2f,10>(vec2f(343.,444.),vec2f(579.,444.),vec2f(355.,419.),vec2f(355.,1010.),vec2f(209.,116.),vec2f(480.,116.),vec2f(211.,251.),vec2f(889.,119.),vec2f(891.,179.),vec2f(305.,270.));let bb=array<vec2f,10>(vec2f(343.,995.),vec2f(579.,995.),vec2f(568.,419.),vec2f(568.,1010.),vec2f(209.,247.),vec2f(480.,247.),vec2f(478.,251.),vec2f(889.,176.),vec2f(880.,190.),vec2f(371.,270.));let rr=array<f32,10>(7.,7.,6.,6.,5.,5.,5.,6.,4.,4.);for(var i=0u;i<10u;i++){let t=tube(p,aa[i],bb[i],rr[i]);if(t.mask>s.mask){s=t;}}return s;}
fn ggx(n:vec3f,rough:f32,F0:f32)->f32{let l=normalize(vec3f(.84,-.20,.50));let v=vec3f(0.,0.,1.);let h=normalize(l+v);let nl=max(dot(n,l),0.);let nv=max(dot(n,v),1e-4);let nh=max(dot(n,h),0.);let vh=max(dot(v,h),0.);let a2=pow(rough,4.);let D=a2/(3.141592654*pow(nh*nh*(a2-1.)+1.,2.));let k=pow(rough+1.,2.)/8.;let G=nl/(nl*(1.-k)+k)*nv/(nv*(1.-k)+k);let F=F0+(1.-F0)*pow(1.-vh,5.);return D*F*G/(4.*nv+1e-4);}
fn vinylCoverage(p:vec2f)->f32{return max(rectMask(p,vec4f(357.,433.,565.,546.)),rectMask(p,vec4f(357.,565.,565.,995.)));}
struct Output{@location(0)scene:vec4f,@location(1)sourceSignal:vec4f};
fn lightingFragment(v:V)->Output{
 let q=(v.pixel-f.rect.xy)/f.rect.zw;var o:Output;
 if(any(q<vec2f(0.))||any(q>vec2f(1.))){o.scene=vec4f(0.);o.sourceSignal=vec4f(0.);return o;}
 let p=q*f.image.xy;let base=textureSampleLevel(original,smp,q,0.);let gain=f.view.w*f.state.x*f.state.y;
 // 出口面の有限輝度は追加したランプではなく、既存ガラス開口の入射境界。
 let aperture=rectMask(p,vec4f(995.,632.,1014.,916.))*pow(sin(clamp((p.y-632.)/284.,0.,1.)*3.141592654),2.);
 let sourceColor=mix(vec3f(1.,.94,.82),vec3f(.83,.95,1.),clamp((p.y-632.)/284.,0.,1.));let source=sourceColor*12.*aperture*gain;
 // 床は元材質のreflectanceで受光。独立の床発光patchはない。
 let direct=base.rgb*vec3f(1.,.96,.87)*(12.*gain*.32*transport(p,true)*floorCoverage(p));
 let metal=metalSurface(p);let incident=12.*gain*(.065+.32*transport(p,false));
 let steel=vec3f(.96,.98,1.)*incident*ggx(metal.normal,.24,.82)*metal.mask;
 let vinyl=vinylCoverage(p);let vn=normalize(vec3f((p.x-461.)/280.,0.,1.));
 let bed=(base.rgb*.11+vec3f(.83,.92,1.)*ggx(vn,.36,.04))*incident*vinyl;
 let emission=source+steel;
 o.scene=vec4f(base.rgb+direct+steel+bed+source,base.a);
 o.sourceSignal=vec4f(emission,max(aperture,metal.mask)*gain);
 return o;
}

struct Cloth{state:vec4f,cart:vec4f,sink:vec4f,material:vec4f};
@group(2) @binding(0)var<uniform>c:Cloth;
fn fabric(v:V,p:vec2f,o:Output)->Output{if(c.state.w<.5||f.view.w<.5){return o;}var rect=c.cart;var bend=c.state.x;var peak=c.material.x;if(p.x>=c.sink.x&&p.x<=c.sink.z&&p.y>=c.sink.y&&p.y<=c.sink.w){rect=c.sink;bend=c.state.y;peak=c.material.y;}
 if(p.x<rect.x||p.x>rect.z||p.y<rect.y||p.y>rect.w){return o;}
 let uv=(p-rect.xy)/(rect.zw-rect.xy);let across=sin(3.141592654*uv.x);let supported=pow(sin(3.141592654*uv.y),2.);let mode=across*supported;
 // Fixed margins keep the original supported silhouette. Fold texture flexes inside that actual material.
 let delta=vec2f(.18*bend*sin(6.283185307*uv.y)*across,bend*mode);
 let sampleP=clamp(p-delta,rect.xy,rect.zw);var vv=v;vv.pixel=f.rect.xy+sampleP/f.image.xy*f.rect.zw;var r=lightingFragment(vv);
 let slopeX=bend*3.141592654*cos(3.141592654*uv.x)*supported/(rect.z-rect.x);let slopeY=bend*6.283185307*across*sin(6.283185307*uv.y)/(rect.w-rect.y);let normal=normalize(vec3f(-slopeX,-slopeY,1.));
 let light=normalize(vec3f(.84,-.20,.50));let response=max(dot(normal,light),0.)/.50;
 let materialMask=smoothstep(0.,.04,uv.x)*(1.-smoothstep(.96,1.,uv.x))*smoothstep(0.,.04,uv.y)*(1.-smoothstep(.96,1.,uv.y));
 // Relative Lambert response is a 2.5D cloth approximation; motion is also explicit source-UV transport.
 r.scene=vec4f(mix(o.scene.rgb,r.scene.rgb*mix(1.,response,c.material.z),materialMask),o.scene.a);
 r.sourceSignal=o.sourceSignal;return r;
}

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
