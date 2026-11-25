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
@fragment fn fs(@builtin(position) screen:vec4f)->@location(0) vec4f{
 let p=(screen.xy-view.size*.5)/view.scale;
 let aa=.62/view.scale;
 var color=floorColor(p,aa);
 if(view.present<.5){return vec4f(srgb(color),1);}
 let q=p-view.site;
 let live=view.activeFlag>.5;
 let t=select(0.0,view.ageMs,live);
 let collapse=smoothstep(156.0,505.0,t);
 let width=mix(1.0,mix(.055,.40,view.reduced),collapse);
 let alpha=1.0-smoothstep(433.0,579.0,t);
 let w=vec2f(q.x/width,q.y);
 let hood=ellipse(w-vec2f(0,-21.5),vec2f(7.3,9.0));
 let torso=segment(w,vec2f(0,-9.1),vec2f(0,10.5))-6.6;
 let arms=min(segment(w,vec2f(-6,-6.6),vec2f(-10.2,7.2)),segment(w,vec2f(6,-6.6),vec2f(10.2,7.2)))-2.35;
 let legs=min(segment(w,vec2f(-3,11),vec2f(-5.3,28.5)),segment(w,vec2f(3,11),vec2f(5.3,28.5)))-2.95;
 let d=min(min(hood,torso),min(arms,legs));
 // Use the local signed-distance derivative for antialiasing as the projected width contracts.
 let shapeAA=max(.52*fwidth(d),.30);
 let ambient=exp(-dot((q-vec2f(0,31.8))/vec2f(12.4,2.7),(q-vec2f(0,31.8))/vec2f(12.4,2.7)));
 color=mix(color,vec3f(.012,.017,.027),ambient*alpha*(1.0-collapse*.75));
 let body=cv(d,shapeAA);
 let cloth=mix(vec3f(.13,.23,.31),vec3f(.29,.42,.48),smoothstep(-12.0,15.0,-w.x));
 var material=mix(cloth,vec3f(.36,.50,.54),cv(hood,shapeAA));
 let visor=segment(w,vec2f(-2.5,-21.8),vec2f(4.2,-21.8))-1.1;
 material=mix(material,vec3f(.77,.77,.63),cv(visor,aa));
 let edgePosition=mix(-32.0,34.0,smoothstep(0.0,310.0,t));
 let reached=1.0-smoothstep(edgePosition-4.0,edgePosition+4.0,w.y+.13*w.x);
 let on=select(0.0,smoothstep(0.0,48.0,t),live);
 let edge=exp(-abs(d)/1.65)*reached*on;
 let vapor=vec3f(.49,.56,.96);
 material=mix(material,vec3f(.29,.37,.57),reached*on*.68);
 color=mix(color,material,body*alpha);
 color+=vapor*edge*alpha;
 let wake=smoothstep(335.0,500.0,t)*(1.0-smoothstep(510.0,679.0,t));
 let h=mix(28.0,0.0,smoothstep(485.0,677.0,t));
 let seam=exp(-abs(q.x)*.72)*(1.0-smoothstep(h,h+2.0,abs(q.y)));
 color+=vec3f(.52,.56,.92)*wake*seam;
 return vec4f(srgb(color),1);
}
