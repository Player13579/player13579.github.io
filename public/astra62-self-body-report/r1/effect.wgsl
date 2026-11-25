struct View {
 size:vec2f,ageMs:f32,scale:f32,reduced:f32,activeFlag:f32,pad:vec2f,
}
@group(0) @binding(0) var<uniform> view:View;
@vertex fn vs(@builtin(vertex_index) i:u32)->@builtin(position) vec4f{
 let v=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));return vec4f(v[i],0,1);
}
fn srgb(c:vec3f)->vec3f{
 let x=clamp(c,vec3f(0),vec3f(1));return select(12.92*x,1.055*pow(x,vec3f(1.0/2.4))-vec3f(0.055),x>vec3f(0.0031308));
}
fn cov(d:f32,w:f32)->f32{return 1.0-smoothstep(-w,w,d);}
fn box(p:vec2f,h:vec2f,r:f32)->f32{
 let k=abs(p)-h+vec2f(r);return length(max(k,vec2f(0)))+min(max(k.x,k.y),0.0)-r;
}
fn seg(p:vec2f,a:vec2f,b:vec2f)->f32{
 let v=b-a; return length(p-a-v*clamp(dot(p-a,v)/dot(v,v),0.0,1.0));
}
@fragment fn fs(@builtin(position) px:vec4f)->@location(0) vec4f{
 let bg=vec3f(0.021,0.019,0.032);
 if(view.activeFlag<0.5||view.ageMs>=1120.0){return vec4f(srgb(bg),1);}
 let p=(px.xy-view.size*0.5)/view.scale;
 let aa=0.67/view.scale;
 let t=view.ageMs;
 let cover=smoothstep(0.0,78.0,t)*(1.0-smoothstep(865.0,1090.0,t));
 // A fixed local reporting pictogram, independent of the scene and every player projection.
 let q=p-vec2f(-5,7);
 let root=vec2f(12,-12);
 let tip=vec2f(15,-27);
 let mast=seg(q,root,tip);
 var col=mix(bg,vec3f(0.46,0.40,0.40),cov(mast-1.5,aa));
 let body=box(q,vec2f(21,14),4.0);
 let trim=box(q-vec2f(0,-0.5),vec2f(19.1,12.2),3.1);
 col=mix(col,vec3f(0.52,0.13,0.095),cov(body,aa));
 col=mix(col,vec3f(0.23,0.070,0.068),cov(trim,aa));
 let panel=box(q-vec2f(0,-1),vec2f(16.5,8.6),1.7);
 let charge=smoothstep(78.0,238.0,t);
 col=mix(col,mix(vec3f(0.052,0.043,0.052),vec3f(0.16,0.085,0.066),charge),cov(panel,aa));
 // The small horizontal figure is an anonymous generic symbol on the sender's display.
 let head=length(q-vec2f(-9,-1.6))-2.6;
 let torso=seg(q,vec2f(-3.2,-1.1),vec2f(2.5,-1.1))-2.6;
 let leg=seg(q,vec2f(2.1,-0.8),vec2f(10.9,1.4))-1.65;
 let figure=min(head,min(torso,leg));
 col=mix(col,vec3f(0.90,0.69,0.43),cov(figure,aa)*charge);
 let lead=min(seg(q,vec2f(-11,10),vec2f(11,10)),seg(q,vec2f(11,10),vec2f(16,6)))-0.74;
 let feed=smoothstep(170.0,350.0,t)*(1.0-smoothstep(410.0,595.0,t));
 col=mix(col,vec3f(0.76,0.29,0.14),cov(lead,aa)*feed);
 let at=q-tip;
 let pilot=smoothstep(320.0,370.0,t)*(1.0-smoothstep(498.0,716.0,t));
 col=mix(col,mix(vec3f(0.44,0.30,0.25),vec3f(1.0,0.61,0.25),pilot),cov(length(at)-2.55,aa));
 // One propagating signal front is emitted by the antenna. No destination is projected.
 let rise=clamp((t-370.0)/390.0,0.0,1.0);
 let radius=3.1+mix(27.0,10.0,view.reduced)*rise;
 let l=length(at);
 let sector=smoothstep(0.48,0.72,dot(at/max(l,0.01),vec2f(0.72,-0.694)));
 let pulse=smoothstep(365.0,395.0,t)*(1.0-smoothstep(595.0,780.0,t));
 let wave=cov(abs(l-radius)-1.6,aa)*sector*pulse;
 col=mix(col,vec3f(1.0,0.54,0.24),wave);
 return vec4f(srgb(mix(bg,col,cover)),1);
}
