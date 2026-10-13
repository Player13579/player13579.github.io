struct Uniforms { viewport:vec4f, timing:vec4f, anchor:vec4f, shape:vec4f };
@group(0) @binding(0) var<uniform> u:Uniforms;
struct Vertex { @builtin(position) position:vec4f, @location(0) uv:vec2f };
@vertex fn vs(@builtin(vertex_index) i:u32)->Vertex {
 var pos=array<vec2f,3>(vec2f(-1.0,-1.0),vec2f(3.0,-1.0),vec2f(-1.0,3.0));
 var o:Vertex; o.position=vec4f(pos[i],0.0,1.0); o.uv=vec2f((pos[i].x+1.0)*0.5,(1.0-pos[i].y)*0.5); return o;
}
fn ease(a:f32,b:f32,t:f32)->f32 { return smoothstep(a,b,t); }
fn seam(x:f32)->f32 { return 0.09*sin(x*7.0)+0.06*sin(x*14.0+0.4)+0.10*x; }
struct WorldOut { @location(0) body:vec4f, @location(1) emission:vec4f };
@fragment fn fs(in:Vertex)->WorldOut {
 var o:WorldOut; o.body=vec4f(0.0); o.emission=vec4f(0.0);
 let t=u.timing.x;
 if(t<=0.0 || t>=1.42) { return o; }
 // H64 is actor reference in CSS px; DPR conversion belongs only to runtime.
 let screen=(in.uv-u.anchor.xy)*u.viewport.xy/u.viewport.z;
 let ca=cos(u.anchor.z); let sa=sin(u.anchor.z);
 let p=vec2f(ca*screen.x+sa*screen.y,-sa*screen.x+ca*screen.y);
 let halfSize=u.shape.xy*0.5;
 let begin=ease(0.015,0.14,t);
 let cut=ease(0.22,0.60,t);
 let release=ease(0.46,1.05,t);
 let dissolve=ease(0.78,1.42,t);
 let motion=mix(1.0,0.3,u.shape.z);
 // Two opposed cohesion domains share one seam before cut; no object contour.
 let side=select(-1.0,1.0,p.y-seam(p.x/halfSize.x)*halfSize.y>=0.0);
 let separation=(0.005+0.19*release)*cut*motion;
 let original=p-vec2f(side*0.055*release*motion,side*separation);
 let q=original/halfSize;
 // Broad uneven support: a field cross-section, never a gun/sword surrogate.
 let lens=1.0-dot(q,q)*(1.0+0.10*sin(q.x*6.0+q.y*3.0));
 let region=ease(-0.04,0.055,lens);
 let crackY=seam(q.x);
 let seamD=q.y-crackY;
 let front=-1.16+2.32*cut;
 let severed=1.0-ease(front-0.10,front+0.07,q.x);
 let opening=(0.035+0.31*release)*severed*cut;
 let gap=ease(opening-0.045,opening+0.025,abs(seamD));
 // Collapse follows the severed boundary and advances into each broad domain.
 let erosion=1.0-ease(0.18,0.95,dissolve+(1.0-abs(q.y))*0.28*release);
 let endFade=1.0-ease(1.18,1.42,t);
 let bodyCoverage=region*gap*begin*erosion*endFade;
 let stress=ease(0.025,0.20,t)*(1.0-ease(0.22,0.44,t));
 let activeFront=exp(-pow((q.x-front)/0.16,2.0))*exp(-pow(seamD/0.22,2.0))*cut*(1.0-ease(0.57,0.73,t));
 let edge=exp(-pow((abs(seamD)-opening)/0.038,2.0))*severed*cut*(1.0-ease(0.75,1.22,t));
 let supplied=(stress*0.48*exp(-pow(seamD/0.25,2.0))+activeFront*2.8+edge*0.9)*region*begin*u.timing.y;
 let nearLight=exp(-abs(seamD-opening*side)/0.23)*severed*cut*region*(1.0-ease(0.70,1.26,t))*u.timing.y;
 let bulk=vec3f(0.26,0.055,0.037)+vec3f(0.22,0.08,0.03)*(0.5+0.5*q.y);
 let lit=bulk+nearLight*vec3f(0.64,0.15,0.035);
 // Bright near-white local source and warm colored cross-section have distinct support.
 let core=vec3f(2.3,1.75,1.08)*supplied;
 let colorBody=lit*bodyCoverage;
 let sourceCoverage=region*min(1.0,supplied*0.6);
 let coverage=1.0-(1.0-bodyCoverage)*(1.0-sourceCoverage);
 o.body=vec4f(colorBody+core,coverage);
 o.emission=vec4f(core,sourceCoverage);
 return o;
}
