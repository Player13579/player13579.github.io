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
@fragment fn fragment(v:V)->Output{
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
