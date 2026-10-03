
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
// R12: coupled pressure-front / entrained interior transport, not isolated kernel wisps.
fn volume(p:vec2f,t:f32,en:f32,reduced:f32,smoke:bool)->vec4f {
 let fireLife=pow(max(0.0,1.0-t/mix(620.0,700.0,en)),1.1);
 let smokeLife=smoothstep(220.0,500.0,t)*pow(max(0.0,1.0-t/mix(1040.0,1100.0,en)),0.66);
 let life=select(fireLife,smokeLife,smoke)*smoothstep(0.0,15.0,t);
 let unfold=smoothstep(8.0,180.0,t);let transport=smoothstep(150.0,980.0,t);let motion=1.0-reduced*0.67;
 let boundary=(1.0-smoothstep(0.94,1.0,abs(p.x)))*(1.0-smoothstep(0.94,1.0,abs(p.y)));
 var radiance=vec3f(0.0);var transmittance=1.0;
 for(var i=0u;i<20u;i++) {
  let z=1.0-(f32(i)+0.5)*0.1;var density=0.0;var weightedColor=vec3f(0.0);
  for(var k=0u;k<4u;k++) {
   let kk=f32(k);let advance=smoothstep(8.0+kk*28.0,180.0+kk*28.0,t);
   // Each front expands from a shared seed, then carries the same smoke parcel.
   var center=vec3f(0.0,0.04,0.30);var radii=vec3f(0.25,0.20,0.30);var angle=0.0;var weight=1.0;
   if(k==0u){center=vec3f(-0.10*unfold,0.04+0.17*transport*motion,0.32);radii=vec3f(0.25+0.34*advance,0.20+0.22*advance,0.36);angle=-0.16;weight=1.0-0.52*smoothstep(350.0,900.0,t);}
   if(k==1u){center=vec3f(-0.27*advance-0.04*transport*motion,0.08+0.28*advance+0.13*transport*motion,-0.36);radii=vec3f(0.22+0.18*advance,0.23+0.22*advance,0.38);angle=-0.36;weight=0.90;}
   if(k==2u){center=vec3f(0.25*advance+0.06*transport*motion,0.04+0.18*advance+0.26*transport*motion,0.10);radii=vec3f(0.23+0.18*advance,0.22+0.23*advance,0.37);angle=0.38;weight=0.94;}
   if(k==3u){center=vec3f(0.02-0.10*transport*motion,0.10+0.40*advance+0.11*transport*motion,-0.08);radii=vec3f(0.22+0.18*advance,0.22+0.15*advance,0.40);angle=-0.10;weight=0.82;}
   if(smoke){radii+=vec3f(0.065,0.065,0.055);center.y+=0.045*transport*motion;}
   let q=vec3f(p,z)-center;let co=cos(angle);let si=sin(angle);
   let xy=vec2f(co*q.x+si*q.y,-si*q.x+co*q.y);
   // A turning three-dimensional parcel maps density inward/outward, never a whole-volume cut.
   let turn=q.z*3.4+kk*1.3-t*0.0035;
   let local=vec3f(xy.x-0.075*sin(turn)*motion,xy.y+0.080*cos(turn+xy.x*3.0)*motion,q.z)/radii;
   let radial2=dot(local,local);let compact=1.0-smoothstep(select(0.05,0.18,smoke),1.0,radial2);
   let front=local.y+0.38*local.z-(-0.65+1.2*smoothstep(20.0+kk*30.0,280.0+kk*30.0,t));
   let ridge=exp(-pow(front/0.28,2.0));
   let roll=0.62+0.38*sin(local.y*3.0-local.z*3.5+kk*1.4-t*0.005);
   // Interconnected smoke interior persists behind the moving pressure front.
   let material=select(0.28+0.72*ridge,0.70+0.30*roll,smoke);
   let d=compact*material*weight*boundary;
   var color=vec3f(0.0);
   if(smoke){
    let normal=local/max(length(local),0.0001);let key=clamp(dot(normal,normalize(vec3f(-0.45,0.70,0.60))),0.0,1.0);
    let inner=clamp(1.0-radial2,0.0,1.0);
    color=mix(vec3f(0.025,0.032,0.043),vec3f(0.67,0.69,0.71),pow(key,1.1))*(0.72+0.28*(1.0-inner));
    color+=vec3f(0.90,0.25,0.02)*exp(-t/170.0)*inner;
   }else{
    let heat=exp(-t/460.0);let hot=ridge*exp(-pow((local.z-0.24)/0.70,2.0));
    let pulse=1.0+0.80*exp(-pow((t-80.0-kk*28.0)/65.0,2.0));
    let nearHot=select(vec3f(16.0,10.4,4.0),vec3f(13.0,4.4,0.60),k==1u || k==3u);
    color=mix(vec3f(2.8,0.13,0.008),nearHot,hot*heat)*pulse+vec3f(7.0,2.3,0.08)*ridge*heat;
   }
   density+=d;weightedColor+=d*color;
  }
  let opacity=1.0-exp(-density*select(0.48,0.47,smoke)*life);let color=weightedColor/max(density,0.00001);
  radiance+=transmittance*opacity*color;transmittance*=1.0-opacity;
 }
 return vec4f(radiance,1.0-transmittance);
}

fn r8Field(o:Out)->vec4f {
 let f=fields[o.index];let kind=u32(f.centerKind.z);let t=f.state.x;let en=f.state.y;let reduced=f.state.z;
 let launchEnd=mix(360.0,400.0,en);let p=o.local;
 if(kind==2u){return volume(p,t,en,reduced,false);}
 if(kind==3u){return volume(p,t,en,reduced,true);}
 // R10: thick coherent pressure projection; brief true rear vent, never a second shot.
 let rear=kind==1u;let q=vec2f(select(p.x,-p.x,rear),p.y);let axis=q.x;
 let travel=smoothstep(0.0,select(65.0,35.0,rear),t);let extent=select(0.93,0.94,rear)*travel;
 let motion=1.0-reduced*0.70;
 let bend=select(sin(axis*9.0-t*0.024)*0.024*axis,sin(axis*6.0-t*0.011)*0.060*axis,rear)*motion;
 let leadingWidth=0.18+0.08*max(axis,0.0);
 let ventWidth=0.13+0.40*max(axis,0.0)*(0.80+0.20*smoothstep(25.0,125.0,t));
 let width=select(leadingWidth,ventWidth,rear);
 let root=smoothstep(-0.022,0.025,axis);let tip=1.0-smoothstep(extent-select(0.12,0.22,rear),extent,axis);
 let edge=1.0-smoothstep(0.72,0.98,abs(q.y));let inside=root*tip*edge;
 let jetEnd=select(launchEnd,mix(160.0,190.0,en),rear);
 let envelope=smoothstep(0.0,12.0,t)*pow(max(0.0,1.0-t/jetEnd),0.65);let transverse=(q.y-bend)/max(width,0.02);
 let shell=(1.0-smoothstep(0.80,1.04,abs(transverse)))*inside;
 let core=exp(-transverse*transverse*5.0)*inside*exp(-max(axis,0.0)*select(1.1,4.4,rear));
 let leadingCells=0.60+0.40*pow(0.5+0.5*cos(axis*6.0-t*0.025),2.0);
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