
struct View { geometry:vec4f, clock:vec4f }; // width,height,cameraX,cameraY; zoom
struct Field { centerKind:vec4f, axisSize:vec4f, state:vec4f };
@group(0) @binding(0) var<uniform> view:View;
@group(0) @binding(1) var<storage,read> fields:array<Field>;
struct Out { @builtin(position) position:vec4f, @location(0) local:vec2f, @location(1) @interpolate(flat) index:u32 };
@vertex fn vs(@builtin(vertex_index) v:u32,@builtin(instance_index) i:u32)->Out {
 let corners=array<vec2f,6>(vec2f(-1,-1),vec2f(1,-1),vec2f(-1,1),vec2f(-1,1),vec2f(1,-1),vec2f(1,1));
 let f=fields[i]; let uv=corners[v]; let axis=f.axisSize.xy; let side=vec2f(-axis.y,axis.x);
 let world=f.centerKind.xy+axis*uv.x*f.axisSize.z+side*uv.y*f.axisSize.w;
 let px=(world-view.geometry.zw)*view.clock.x+view.geometry.xy*0.5;
 var o:Out;o.position=vec4f(px.x/view.geometry.x*2-1,1-px.y/view.geometry.y*2,0,1);o.local=uv;o.index=i;return o;
}
fn blob(p:vec3f,c:vec3f,r:vec3f)->f32 { return length((p-c)/r); }
// Low-frequency, advected folds. No pixel noise, random speckles or micro-fragment carpet.
fn folds(p:vec3f,t:f32)->f32 {
 return 0.52*sin(p.x*5.1+p.y*3.4+t*1.7)+0.30*sin(p.y*6.3-p.z*3.2-t*1.1)+0.18*sin(p.z*7.1+p.x*2.8+t*0.9);
}
// Front-to-back emission/absorption integration of a finite local volume.
// R6: open combustion interfaces and carrier transport replace the R5 enclosed medium.
// R8: contact-rooted pressure unfolding; two thick curled near/far combustion media become transported smoke.
fn retainedSmoke(p:vec2f,t:f32,en:f32,reduced:f32,smoke:bool)->vec4f {
 let fireLife=pow(max(0.0,1.0-t/mix(620.0,700.0,en)),1.1);
 let smokeLife=smoothstep(220.0,500.0,t)*pow(max(0.0,1.0-t/mix(1040.0,1100.0,en)),0.66);
 let life=select(fireLife,smokeLife,smoke)*smoothstep(0.0,15.0,t);
 let unfold=smoothstep(8.0,120.0,t);let transport=smoothstep(170.0,980.0,t);let motion=1.0-reduced*0.67;
 let boundary=(1.0-smoothstep(0.88,1.0,abs(p.x)))*(1.0-smoothstep(0.90,1.0,abs(p.y)));
 var radiance=vec3f(0.0);var transmittance=1.0;
 for(var i=0u;i<20u;i++) {
  let z=1.0-(f32(i)+0.5)*0.1;var density=0.0;var weightedColor=vec3f(0.0);
  for(var k=0u;k<2u;k++) {
   let side=select(-1.0,1.0,k==1u);let phase=f32(k)*1.6;
   let cx=side*(0.12*unfold+0.08*transport)*motion;
   let cy=0.03+0.085*unfold+0.28*transport*motion;
   let rx=select(0.32+0.22*unfold-0.06*transport,0.40+0.12*unfold+0.10*transport,smoke);
   let ry=select(0.20+0.12*unfold+0.08*transport,0.23+0.13*unfold+0.14*transport,smoke);
   let u=(p.x-cx)/rx;
   let bend=0.12*sin(u*2.4+phase-t*0.005)*(0.3+0.7*unfold)*motion;
   let v=(p.y-cy-bend)/ry;
   let envelope=exp(-pow(u,4.0)-pow(v,4.0))*boundary;
   let fold=0.70+0.30*pow(cos(u*2.4+v*2.7-t*0.005+phase),2.0);
   let airX=0.08*sin((p.y-cy)*3.0-t*0.004)*motion;
   let airY=0.12+0.22*transport*motion;
   let cleftWidth=select(0.11,0.14,smoke);
   let cleft=exp(-pow((p.x-airX-0.24*(p.y-cy))/cleftWidth,2.0)-pow((p.y-airY)/0.31,2.0));
   let layerDepth=select(0.32,-0.34,k==1u)+0.11*sin(u*2.2+v*1.8-t*0.003+phase)*motion;
   let thickness=select(0.22+0.07*unfold,0.29+0.10*transport,smoke);
   let dz=(z-layerDepth)/thickness;
   let d=envelope*fold*(1.0-0.94*cleft*unfold)*exp(-dz*dz);
   var color=vec3f(0.0);
   if(smoke) {
    let rawNormal=vec3f(u/rx+0.24*sin(v*2.1-t*0.004+phase),v/ry,dz/thickness);
    let normal=rawNormal/max(length(rawNormal),0.0001);
    let key=clamp(dot(normal,normalize(vec3f(-0.45,0.70,0.60))),0.0,1.0);
    color=mix(vec3f(0.025,0.030,0.038),vec3f(0.50,0.52,0.55),pow(key,1.35));
    color+=vec3f(0.90,0.25,0.02)*exp(-t/170.0)*exp(-pow(v+0.30,2.0));
   }else {
    let heat=exp(-t/460.0);let hot=exp(-pow(u*0.85,2.0)-pow(v+0.15,2.0));
    let pulse=1.0+0.80*exp(-pow((t-80.0)/65.0,2.0));
    let nearHot=select(vec3f(16.0,10.4,4.0),vec3f(13.0,4.4,0.60),k==1u);
    let crease=exp(-pow((v-0.28*sin(u*2.0-t*0.004+phase))/0.34,2.0));
    color=mix(vec3f(2.8,0.13,0.008),nearHot,hot*heat)*pulse+vec3f(7.0,2.3,0.08)*crease*heat;
   }
   density+=d;weightedColor+=d*color;
  }
  let opacity=1.0-exp(-density*select(0.38,0.34,smoke)*life);let color=weightedColor/max(density,0.00001);
  radiance+=transmittance*opacity*color;transmittance*=1.0-opacity;
 }
 return vec4f(radiance,1.0-transmittance);
}

// R15: one flared3D material body, coherently sheared and rolled from contact.
fn volume(p:vec2f,t:f32,en:f32,reduced:f32,smoke:bool)->vec4f {
 if(smoke){return retainedSmoke(p,t,en,reduced,true);}
 let life=pow(max(0.0,1.0-t/mix(620.0,700.0,en)),1.1)*smoothstep(0.0,15.0,t);
 let expand=smoothstep(20.0,160.0,t);let roll=smoothstep(160.0,420.0,t);
 let motion=1.0-reduced*0.67;
 let boundary=(1.0-smoothstep(0.88,1.0,abs(p.x)))*(1.0-smoothstep(0.90,1.0,abs(p.y)));
 let heat=exp(-t/460.0);let pulse=1.0+0.80*exp(-pow((t-80.0)/65.0,2.0));
 let height=0.13+0.30*expand+0.06*roll*motion;
 let depth=0.18+0.18*expand-0.025*roll*motion;
 let sigmaT=1.0;let ds=2.0/20.0;
 let emissionRate=1.65+2.15*smoothstep(120.0,mix(620.0,700.0,en),t);
 var radiance=vec3f(0.0);var transmittance=1.0;
 for(var i=0u;i<20u;i++) {
  let z=1.0-(f32(i)+0.5)*ds;
  // One continuous inverse material map: lateral shear, bowed front and depth roll.
  let rootY=p.y-0.015;
  let mappedX=p.x-(0.16*expand+0.20*roll)*rootY*z*motion;
  let bowedY=rootY-(0.10*expand+0.16*roll)*mappedX*mappedX*motion-0.30*roll*mappedX*motion-0.12*roll*mappedX*z*motion;
  let along=clamp(bowedY/max(height,0.0001),0.0,1.0);
  let angle=0.72*roll*along*along*motion;
  let pivot=height*0.62;
  let relativeY=bowedY-pivot;
  let mappedY=relativeY*cos(angle)+z*sin(angle)+pivot;
  let mappedZ=-relativeY*sin(angle)+z*cos(angle)-0.085*expand*along*along*motion;
  let v=mappedY/height;
  let width=0.11+(0.37*expand+0.04*roll*motion)*smoothstep(0.06,0.78,v);
  let u=mappedX/width;
  let w=mappedZ/(depth*(0.72+0.28*smoothstep(0.02,0.80,v)));
  // A single broad front/side contour, varying continuously through actual depth.
  let front=0.82+0.18*cos(u*2.0+w*0.9)-0.13*u+0.085*w;
  let sideShape=1.0-smoothstep(0.82,1.04,abs(u));
  let frontShape=1.0-smoothstep(front-0.16,front+0.03,v);
  let rootShape=smoothstep(-0.16,0.10,v);
  let depthShape=1.0-smoothstep(0.68,1.02,abs(w));
  let gas=sideShape*frontShape*rootShape*depthShape;
  // Thick leading material in the same support; no independently drawn ridge.
  let pressure=gas*(0.45+0.55*exp(-pow((v-(front-0.15))/0.20,2.0)));
  let seed=exp(-pow(length(vec3f(p.x/0.115,rootY/0.095,z/0.28)),4.0))*(1.0-smoothstep(75.0,190.0,t))*2.0;
  let gasDensity=gas*1.35;let lipDensity=pressure*0.8;
  let density=(gasDensity+lipDensity+seed)*boundary;
  // One material coordinate and one advected thermal stream, never reset per lobe.
  let flow=vec3f(u+0.18*sin(t*0.004)*motion,2.0*v-1.0-0.18*sin(t*0.006)*motion,w);
  let flowCore=exp(-pow((flow.x-0.28*flow.y-0.20*sin(t*0.005)*motion)/0.62,2.0)-pow((flow.y-0.24*flow.z-0.05)/0.65,2.0));
  let backHeat=exp(-pow((flow.x+0.40)/0.56,2.0)-pow((flow.y+0.18)/0.70,2.0)-pow((flow.z+0.35)/0.55,2.0));
  let hotColor=mix(vec3f(13.0,4.4,0.60),vec3f(16.0,10.4,4.0),smoothstep(-0.35,0.40,z));
  let temperature=clamp(0.12+0.72*flowCore+0.22*backHeat,0.0,1.0)*heat;
  let gasColor=mix(vec3f(2.8,0.13,0.008),hotColor,temperature)*pulse;
  let lipColor=mix(vec3f(7.0,2.3,0.08),hotColor,0.26+0.74*flowCore)*heat*pulse;
  let seedColor=vec3f(16.0,10.4,4.0)*heat*pulse;
  let color=(gasDensity*gasColor+lipDensity*lipColor+seed*seedColor)/max(gasDensity+lipDensity+seed,0.00001);
  let opacity=1.0-exp(-sigmaT*density*life*ds);
  radiance+=transmittance*opacity*color*(emissionRate/sigmaT);
  transmittance*=1.0-opacity;
 }
 return vec4f(radiance,1.0-transmittance);
}

fn r8Field(o:Out)->vec4f {
 let f=fields[o.index];let kind=u32(f.centerKind.z);let t=f.state.x;let en=f.state.y;let reduced=f.state.z;
 let launchEnd=mix(360.0,400.0,en);let p=o.local;
 if(kind==2u){return volume(p,t,en,reduced,false);}
 if(kind==3u){return volume(p,t,en,reduced,true);}
 // R7 separates leading pressure from rear vent without creating a second shot.
 let rear=kind==1u;let q=vec2f(select(p.x,-p.x,rear),p.y);let axis=q.x;
 let travel=smoothstep(0.0,select(65.0,35.0,rear),t);let extent=select(0.93,0.94,rear)*travel;
 let motion=1.0-reduced*0.70;
 let bend=select(sin(axis*9.0-t*0.024)*0.012*axis,sin(axis*6.0-t*0.011)*0.060*axis,rear)*motion;
 let leadingWidth=0.055+0.085*max(axis,0.0)+0.012*pow(sin(axis*14.0-t*0.034),2.0)*max(axis,0.0);
 let ventWidth=0.13+0.40*max(axis,0.0)*(0.80+0.20*smoothstep(25.0,125.0,t));
 let width=select(leadingWidth,ventWidth,rear);
 let root=smoothstep(-0.022,0.025,axis);let tip=1.0-smoothstep(extent-select(0.12,0.22,rear),extent,axis);
 let edge=1.0-smoothstep(0.72,0.98,abs(q.y));let inside=root*tip*edge;
 let envelope=smoothstep(0.0,12.0,t)*pow(max(0.0,1.0-t/launchEnd),0.65);let transverse=(q.y-bend)/max(width,0.02);
 let shell=exp(-transverse*transverse*1.3)*inside;
 let core=exp(-transverse*transverse*5.0)*inside*exp(-max(axis,0.0)*select(1.1,4.4,rear));
 let leadingCells=0.60+0.40*pow(0.5+0.5*cos(axis*18.0-t*0.038),2.0);
 let ventFold=0.70+0.30*pow(0.5+0.5*cos(axis*5.5-t*0.012),2.0);
 let cells=select(leadingCells,ventFold,rear);let rim=exp(-pow(abs(transverse)-0.83,2.0)*20.0)*inside;
 let flameLife=exp(-t/select(340.0,145.0,rear));
 var rgb=select(vec3f(2.5,0.25,0.02),vec3f(3.4,0.75,0.08),rear)*shell*envelope*flameLife;
 rgb+=select(vec3f(9.0,6.8,3.2),vec3f(6.8,3.2,0.45),rear)*core*cells*envelope*flameLife;
 rgb+=vec3f(1.4,0.40,0.07)*rim*envelope*flameLife*0.35;
 let optical=exp(-transverse*transverse*0.32)*inside*envelope*flameLife*0.055;rgb+=vec3f(2.0,0.65,0.13)*optical;
 let exhaust=smoothstep(select(85.0,50.0,rear),select(210.0,180.0,rear),t)*shell*envelope;
 let shade=clamp(0.45+transverse*0.20+sin(axis*select(8.0,5.5,rear)-t*select(0.007,0.011,rear))*0.15,0.0,1.0);
 let exhaustGain=select(0.38,0.55,rear);rgb+=mix(vec3f(0.035,0.046,0.061),vec3f(0.29,0.27,0.23),shade)*exhaust*exhaustGain;
 let alpha=clamp(shell*envelope*(flameLife+exhaust*exhaustGain)+optical,0.0,1.0);
 return vec4f(rgb,alpha); // same HDR/premultiplied source-over interface
}
@group(0) @binding(2)var transmission:texture_2d_array<f32>;
@fragment fn sourceFS(o:Out)->@location(0)vec4f{
 let kind=u32(fields[o.index].centerKind.z);
 if(kind==3u){return vec4f(0.);}
 let raw=r8Field(o);let xy=vec2i(o.position.xy);
 let visible=clamp(textureLoad(transmission,xy,i32(o.index),0).r,0.,1.);
 // Optical sensor responds to radiant hot cores; smoke material is not a source.
 let radiant=max(raw.rgb-vec3f(.9),vec3f(0.));
 return vec4f(radiant*visible,raw.a*visible);
}