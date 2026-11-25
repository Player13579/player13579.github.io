struct View{
 size:vec2f,ageMs:f32,scale:f32,
 reduced:f32,activeFlag:f32,showSite:f32,pad:f32,landing:vec2f,spare:vec2f,
}
@group(0) @binding(0) var<uniform> view:View;
@vertex fn vs(@builtin(vertex_index) i:u32)->@builtin(position) vec4f{
 let v=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));return vec4f(v[i],0,1);
}
fn srgb(c:vec3f)->vec3f{
 let x=clamp(c,vec3f(0),vec3f(1));return select(12.92*x,1.055*pow(x,vec3f(1.0/2.4))-vec3f(.055),x>vec3f(.0031308));
}
fn cv(d:f32,w:f32)->f32{return 1.0-smoothstep(-w,w,d);}
fn floorColor(p:vec2f,aa:f32)->vec3f{
 let cell=vec2f(43.0,36.0);
 let uv=p+vec2f(3.0,11.0);
 let k=abs(fract(uv/cell+vec2f(.5))-.5)*cell;
 let mortar=1.0-smoothstep(.40-aa,.40+aa,min(k.x,k.y));
 return mix(vec3f(.027,.047,.062),vec3f(.018,.032,.044),mortar);
}
@fragment fn fs(@builtin(position) screen:vec4f)->@location(0) vec4f{
 let p=(screen.xy-view.size*.5)/view.scale;
 let aa=.65/view.scale;
 let q=p-view.landing;
 let rr=length(q);
 let normal=q/max(.01,rr);
 let t=view.ageMs;
 let live=view.activeFlag>.5 && view.showSite>.5 && t<880.0;
 var col=floorColor(p,aa);
 if(live){
   // The world-space radius of 180 is projected at 0.30 reference pixels per world unit.
   let bound=54.0;
   let phase=clamp(t/680.0,0.0,1.0);
   let travel=1.0-pow(1.0-phase,1.65);
   let radius=2.8+50.0*travel;
   let gap=rr-radius;
   let width=mix(3.05,2.15,travel);
   let innerBand=exp(-pow((gap+2.35)/(width*1.60),2.0));
   let crest=exp(-pow(gap/width,2.0));
   let taper=smoothstep(0.0,49.0,t)*(1.0-smoothstep(516.0,849.0,t));
   let inside=1.0-smoothstep(bound-aa,bound,rr);
   let activity=taper*inside;
   // Only optical refraction bends the local seam; its fixed coordinate returns after the wave.
   let refraction=(crest-.42*innerBand)*activity*mix(3.8,.45,view.reduced);
   col=floorColor(p-normal*refraction,aa);
   let facing=clamp(.54+.28*normal.x-.21*normal.y,.18,.98);
   col=mix(col,vec3f(.028,.115,.14),innerBand*activity*.77);
   col+=vec3f(.90,.46,.16)*crest*activity*(.69+.31*facing);
   let lip=cv(abs(gap+.32)-.50,aa);
   col+=vec3f(.49,.35,.19)*lip*activity*facing;
   let hub=exp(-dot(q,q)/44.0)*smoothstep(0.0,18.0,t)*(1.0-smoothstep(45.0,179.0,t));
   col+=vec3f(.66,.35,.13)*hub;
 }
 if(view.showSite>.5){
   // A stationary diamond only locates the synthetic landing; it never denotes a target or prop.
   let marker=(abs(q.x)+abs(q.y)-3.5)*.7071;
   col=mix(col,vec3f(.48,.52,.49),cv(abs(marker)-.63,aa));
 }
 return vec4f(srgb(col),1);
}
