struct View{
 size:vec2f,ageMs:f32,scale:f32,
 reduced:f32,activeFlag:f32,present:f32,pad:f32,site:vec2f,unused:vec2f,
}
@group(0) @binding(0) var<uniform> view:View;
@vertex fn vs(@builtin(vertex_index) i:u32)->@builtin(position) vec4f{
 let v=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));return vec4f(v[i],0,1);
}
fn srgb(c:vec3f)->vec3f{
 let x=clamp(c,vec3f(0),vec3f(1));return select(12.92*x,1.055*pow(x,vec3f(1.0/2.4))-vec3f(.055),x>vec3f(.0031308));
}
fn cv(d:f32,w:f32)->f32{return 1.0-smoothstep(-w,w,d);}
fn segment(p:vec2f,a:vec2f,b:vec2f)->f32{
 let e=b-a;return length(p-a-e*clamp(dot(p-a,e)/dot(e,e),0.0,1.0));
}
fn ellipse(p:vec2f,r:vec2f)->f32{return (length(p/r)-1.0)*min(r.x,r.y);}
fn floorColor(p:vec2f,aa:f32)->vec3f{
 let v=abs(fract((p+vec2f(7,16))/vec2f(46,39)+vec2f(.5))-.5)*vec2f(46,39);
 let seam=cv(min(v.x,v.y)-.37,aa);
 return mix(vec3f(.023,.035,.054),vec3f(.017,.026,.042),seam);
}
fn bodyDistances(w:vec2f)->vec2f{
 let hood=ellipse(w-vec2f(0,-21.5),vec2f(7.3,9.0));
 let torso=segment(w,vec2f(0,-9.1),vec2f(0,10.5))-6.6;
 let arms=min(segment(w,vec2f(-6,-6.6),vec2f(-10.2,7.2)),segment(w,vec2f(6,-6.6),vec2f(10.2,7.2)))-2.35;
 let legs=min(segment(w,vec2f(-3,11),vec2f(-5.3,28.5)),segment(w,vec2f(3,11),vec2f(5.3,28.5)))-2.95;
 return vec2f(min(min(hood,torso),min(arms,legs)),hood);
}
const VIOLET:vec3f=vec3f(.76,.325,.96);
fn excitation(delta:f32,on:f32)->f32{return on*(1.0-smoothstep(-4.0,4.0,delta));}
// Projected optical depth inside the activated cross section, plus its lit boundary.
fn sectionValue(d:f32,delta:f32)->f32{
 let depth=max(0.0,-d);
 let fill=.48+.50*(1.0-exp(-depth/2.4));
 let contour=.52*exp(-abs(d)/1.05);
 let lip=.10*exp(-abs(delta)/3.6);
 return fill+contour+lip;
}
const STRIP:f32=2.45;
fn stripCap(y:f32,h:f32)->f32{return 1.0-smoothstep(h,h+2.0,abs(y));}
fn stripValue(s:vec2f,h:f32)->f32{
 return (1.0-smoothstep(0.0,STRIP,abs(s.x)))*stripCap(s.y,h);
}
// Local oblique chart: projected y = sole + pitch*z - elevation.
// Both receivers see the same emitting layer, just in front of the fabric.
fn coupling(r2:f32,normalGap:f32)->f32{
 let inv=inverseSqrt(r2);
 return normalGap*inv*inv*inv*(1.0-smoothstep(3025.0,7056.0,r2));
}
fn receivePair(q:vec2f,s:vec2f,cell:vec2f)->vec2f{
 let sole=31.45;let pitch=.36;let z=2.8;
 let elevation=max(.05,sole+pitch*z-s.y);
 let dx=q.x-s.x;
 let dz=(q.y-sole)/pitch-z;
 let dy=q.y-s.y+pitch*z;
 let soft2=.10*dot(cell,cell);
 let floorR2=dx*dx+dz*dz+elevation*elevation+soft2;
 let clothR2=dx*dx+dy*dy+z*z+soft2;
 return vec2f(coupling(floorR2,elevation),coupling(clothR2,z));
}
fn received(q:vec2f,width:f32,front:f32,on:f32,bodyGain:f32,h:f32,stripGain:f32)->vec2f{
 var light=vec2f(0);
 // Outside both finite receiver footprints (including the tilted floor).
 if(on<=0.0 || abs(q.x)>100.0 || q.y < -40.0 || q.y>68.0){return light;}
 if(bodyGain>0.0){
  let cell=vec2f(3.7*width,4.0);
  for(var j=0;j<16;j=j+1){
   let y=-30.0+4.0*f32(j);
   if(y-1.6>=front+4.0){continue;}
   for(var i=0;i<7;i=i+1){
    let w=vec2f((f32(i)-3.0)*3.7,y);
    let d=bodyDistances(w).x;
    let delta=y+.13*w.x-front;
    if(d<0.0 && delta<4.0){
     let power=cell.x*cell.y*bodyGain*excitation(delta,on)*sectionValue(d,delta);
     light+=power*receivePair(q,vec2f(width*w.x,y),cell);
    }
   }
  }
 }
 if(stripGain>0.0){
  // Integral of the transverse smoothstep profile is STRIP, not 2*STRIP.
  let stepY=(h+2.0)/6.0;
  let cell=vec2f(STRIP,stepY);
  for(var j=0;j<12;j=j+1){
   let y=(f32(j)-5.5)*stepY;
   let power=cell.x*cell.y*stripGain*stripCap(y,h);
   light+=power*receivePair(q,vec2f(0.0,y),cell);
  }
 }
 return light;
}
@fragment fn fs(@builtin(position) screen:vec4f)->@location(0) vec4f{
 let p=(screen.xy-view.size*.5)/view.scale;
 let aa=.62/view.scale;
 let baseFloor=floorColor(p,aa);
 if(view.present<.5){return vec4f(srgb(baseFloor),1);}
 let live=view.activeFlag>.5;
 let t=select(0.0,view.ageMs,live);
 if(t>=679.0){return vec4f(srgb(baseFloor),1);}
 let q=p-view.site;
 let collapse=smoothstep(156.0,505.0,t);
 let width=mix(1.0,mix(.055,.40,view.reduced),collapse);
 let alpha=1.0-smoothstep(433.0,579.0,t);
 let front=mix(-32.0,34.0,smoothstep(0.0,310.0,t));
 let on=select(0.0,smoothstep(0.0,48.0,t),live);
 let gather=smoothstep(335.0,500.0,t);
 let bodyGain=alpha*(1.0-.20*gather);
 let stripGain=on*gather*(1.0-.80*alpha)*(1.0-smoothstep(510.0,679.0,t));
 let h=mix(28.0,0.0,smoothstep(485.0,677.0,t));
 let incident=received(q,width,front,on,bodyGain,h,stripGain);
 let foot=(q-vec2f(0,31.8))/vec2f(12.4,2.7);
 let ambient=exp(-dot(foot,foot));
 var ground=mix(baseFloor,vec3f(.012,.017,.027),ambient*alpha*(1.0-collapse*.75));
 let floorResponse=baseFloor*vec3f(7.6,5.6,4.4);
 ground+=VIOLET*incident.x*floorResponse;
 var color=vec3f(0);
 // Resolve the narrowing silhouette across the pixel, in linear light.
 for(var k=0;k<4;k=k+1){
  let s=q+vec2f((f32(k)-1.5)*.25*collapse/view.scale,0.0);
  let w=vec2f(s.x/width,s.y);
  let ds=bodyDistances(w);let d=ds.x;
  let shapeAA=max(.30,.52*(mix(1.0,.25,collapse)*abs(dpdx(d))+abs(dpdy(d))));
  let body=cv(d,shapeAA);
  let cloth=mix(vec3f(.13,.23,.31),vec3f(.29,.42,.48),smoothstep(-12.0,15.0,-w.x));
  var material=mix(cloth,vec3f(.36,.50,.54),cv(ds.y,shapeAA));
  let visor=segment(w,vec2f(-2.5,-21.8),vec2f(4.2,-21.8))-1.1;
  material=mix(material,vec3f(.77,.77,.63),cv(visor,aa));
  let delta=w.y+.13*w.x-front;
  let act=excitation(delta,on);
  let reflectance=material*mix(vec3f(1),vec3f(.23,.17,.24),act);
  let fabric=reflectance+reflectance*(.36*incident.y)*VIOLET;
  let bodySource=body*bodyGain*act*sectionValue(d,delta);
  let seamSource=stripGain*stripValue(s,h);
  color+=.25*(mix(ground,fabric,body*alpha)+VIOLET*(bodySource+seamSource));
 }
 return vec4f(srgb(color),1);
}