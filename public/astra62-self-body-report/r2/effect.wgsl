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
// Source radiance and optical spread are combined in linear light before display encoding.
fn litMaterial(base:vec3f,radiance:vec3f)->vec3f{
 let headroom=max(vec3f(.001),vec3f(1.)-base);
 return base+headroom*(vec3f(1.)-exp(-radiance/headroom));
}
fn spread(distance:f32,closeWidth:f32,wideWidth:f32)->f32{
 let d=max(0.,distance);
 return .24*exp(-.5*d*d/(closeWidth*closeWidth))+.116*exp(-.5*d*d/(wideWidth*wideWidth));
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
 let glass=cov(panel,aa);
 let mark=cov(figure,aa)*charge;
 let faceLight=vec3f(1.17,.58,.17);
 let gold=vec3f(1.42,.46,.075);
 let shell=cov(body,aa);
 // The etched mark emits into the display cover; the inner lip reflects its nearest stroke.
 col=mix(col,vec3f(.44,.28,.14),mark);
 var emission=faceLight*mark*(.75+.38*exp(-.3*abs(figure+1.4)));
 let displayEdge=shell*(1.-glass)*exp(-abs(panel-1.05)/1.55);
 var reflection=faceLight*charge*displayEdge*.49*exp(-max(figure,0.)/10.);
 var scatter=faceLight*charge*spread(figure,2.15,7.8)*(.77+.23*glass);
 let lead=min(seg(q,vec2f(-11,10),vec2f(11,10)),seg(q,vec2f(11,10),vec2f(16,6)))-0.74;
 let feed=smoothstep(170.0,350.0,t)*(1.0-smoothstep(410.0,595.0,t));
 col=mix(col,vec3f(.40,.13,.052),cov(lead,aa)*feed);
 emission+=gold*cov(lead,aa)*feed*.85;
 reflection+=gold*feed*.15*exp(-max(lead,0.)/2.25)*shell;
 scatter+=gold*feed*spread(lead,1.3,4.6)*.58;
 let at=q-tip;
 let pilot=smoothstep(320.0,370.0,t)*(1.0-smoothstep(498.0,716.0,t));
 let tipDist=length(at);
 let cap=cov(tipDist-2.55,aa);
 col=mix(col,vec3f(.44,.30,.25),cap);
 emission+=pilot*cap*(gold*.95+vec3f(1.20,.88,.46)*exp(-tipDist*tipDist/3.1));
 let metal=cov(mast-1.5,aa)*(1.-cap);
 reflection+=gold*pilot*(.8*metal*exp(-tipDist/10.5)+.47*shell*exp(-tipDist/12.5));
 scatter+=gold*pilot*spread(tipDist-1.,4.2,13.7)*1.25;
 // One propagating signal front is emitted by the antenna. No destination is projected.
 let rise=clamp((t-370.0)/390.0,0.0,1.0);
 let radius=3.1+mix(27.0,10.0,view.reduced)*rise;
 let l=length(at);
 let sector=smoothstep(0.48,0.72,dot(at/max(l,0.01),vec2f(0.72,-0.694)));
 let pulse=smoothstep(365.0,395.0,t)*(1.0-smoothstep(595.0,780.0,t));
 let wave=cov(abs(l-radius)-1.6,aa)*sector*pulse;
 // One finite wave. Light softens around this arc itself, including its two ends.
 let axis=normalize(vec2f(.72,-.694));
 let tangent=vec2f(-axis.y,axis.x);
 let radialDirection=at/max(l,.001);
 let endDirection=.64*axis+.768375*tangent*select(-1.,1.,dot(at,tangent)>=0.);
 let nearest=select(endDirection,radialDirection,dot(radialDirection,axis)>.64);
 let arcDist=length(at-radius*nearest);
 emission+=wave*vec3f(1.58,.70,.215);
 scatter+=gold*pulse*spread(arcDist,2.1,6.9)*.76;
 let illuminated=litMaterial(col,emission+reflection+scatter);
 return vec4f(srgb(mix(bg,illuminated,cover)),1);
}
