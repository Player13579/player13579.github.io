struct View { size:vec2f, ageMs:f32, scale:f32, reduced:f32, activeFlag:f32, pad:vec2f, }
@group(0) @binding(0) var<uniform> view:View;
@vertex fn vs(@builtin(vertex_index) i:u32)->@builtin(position) vec4f{
 let v=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));return vec4f(v[i],0,1);
}
fn srgb(c:vec3f)->vec3f{
 let x=clamp(c,vec3f(0),vec3f(1));return select(12.92*x,1.055*pow(x,vec3f(1.0/2.4))-vec3f(0.055),x>vec3f(0.0031308));
}
fn cov(d:f32,aa:f32)->f32{return 1.0-smoothstep(-aa,aa,d);}
fn box(p:vec2f,h:vec2f,r:f32)->f32{
 let v=abs(p)-h+vec2f(r);return length(max(v,vec2f(0)))+min(max(v.x,v.y),0.0)-r;
}
fn seg(p:vec2f,a:vec2f,b:vec2f)->f32{
 let e=b-a;return length(p-a-e*clamp(dot(p-a,e)/dot(e,e),0.0,1.0));
}
fn imprint(p:vec2f)->f32{
 let a=p-vec2f(-6,0);
 let currency=max(abs(length(a)-5.35)-1.35, a.x-3.65);
 let shaft=seg(p,vec2f(1.3,3.8),vec2f(10.4,-4.45));
 let head=min(seg(p,vec2f(4.7,-4.45),vec2f(10.4,-4.45)),seg(p,vec2f(10.4,-4.45),vec2f(10.4,1.25)));
 return min(currency,min(shaft,head)-1.22);
}
@fragment fn fs(@builtin(position) screen:vec4f)->@location(0) vec4f{
 let bg=vec3f(.018,.021,.034);
 if(view.activeFlag<.5||view.ageMs>=1800.0){return vec4f(srgb(bg),1);}
 let p=(screen.xy-view.size*.5)/view.scale;
 let aa=.63/view.scale;
 let t=view.ageMs;
 let q=p-vec2f(-2,9);
 let paper=box(q,vec2f(38,18),2.4);
 let back=box(q-vec2f(-.9,2.9),vec2f(39.2,18.7),3.1);
 var col=mix(bg,vec3f(.105,.14,.20),cov(back,aa));
 col=mix(col,vec3f(.24,.31,.38),cov(paper,aa));
 let spine=cov(abs(q.x+30.8)-1.25,aa)*cov(paper,aa);
 col=mix(col,vec3f(.62,.50,.35),spine);
 let rules=min(seg(q,vec2f(-24,-11),vec2f(30,-11)),seg(q,vec2f(-24,11),vec2f(30,11)));
 col=mix(col,vec3f(.37,.44,.48),cov(rules-.48,aa));
 let m=q-vec2f(4,0);
 // Only a transaction-type glyph is impressed. No amount or balance is encoded.
 let made=smoothstep(464.0,483.0,t);
 let bright=cov(imprint(m-vec2f(.6,.9)),aa);
 let dark=cov(imprint(m),aa);
 col=mix(col,vec3f(.85,.58,.33),bright*made);
 col=mix(col,vec3f(.082,.093,.119),dark*made);
 // A die approaches, contacts the ledger, then clears the impression.
 let down=smoothstep(105.0,465.0,t);
 let up=smoothstep(670.0,1005.0,t);
 let lift=1.0-down+up;
 let distanceFactor=mix(1.0,.43,view.reduced);
 let tool=m-vec2f(7.6,-26.0)*lift*distanceFactor;
 let on=smoothstep(50.0,150.0,t)*(1.0-smoothstep(805.0,1038.0,t));
 let shadow=exp(-dot((m-vec2f(2.5,-4.0)*lift)/vec2f(18,9),(m-vec2f(2.5,-4.0)*lift)/vec2f(18,9)))*on*(.21+.21*down*(1.0-up));
 col=mix(col,vec3f(.07,.08,.12),shadow*cov(paper,aa));
 let shoe=box(tool,vec2f(15.0,8.7),2.0);
 col=mix(col,vec3f(.39,.31,.27),cov(shoe,aa)*on);
 let rim=box(tool+vec2f(0,1.9),vec2f(15,7.7),2.1);
 col=mix(col,vec3f(.69,.53,.38),cov(rim,aa)*on);
 let stem=box(tool+vec2f(0,10.0),vec2f(4.1,7.4),1.8);
 col=mix(col,vec3f(.32,.42,.48),cov(stem,aa)*on);
 let grip=box(tool+vec2f(0,16.6),vec2f(8.4,3.65),2.4);
 col=mix(col,vec3f(.20,.29,.35),cov(grip,aa)*on);
 let cover=smoothstep(0.0,94.0,t)*(1.0-smoothstep(1410.0,1750.0,t));
 return vec4f(srgb(mix(bg,col,cover)),1);
}
