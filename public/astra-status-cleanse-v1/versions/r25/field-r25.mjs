// Astra r25: three separated, open planes of recovery light rise through the receiver.
export const shader=/*wgsl*/`
struct Frame { viewport:vec2f, center:vec2f, height:f32, phase:f32, light:f32, reduced:f32 };
@group(0) @binding(0) var<uniform> frame:Frame;
@group(0) @binding(1) var actor:texture_2d<f32>;
@group(0) @binding(2) var linearSampler:sampler;
@vertex fn vs(@builtin(vertex_index) i:u32)->@builtin(position) vec4f {
 let vertices=array<vec2f,6>(vec2f(-.84,-.975),vec2f(.84,-.975),vec2f(-.84,.775),vec2f(-.84,.775),vec2f(.84,-.975),vec2f(.84,.775));
 let px=frame.center+vertices[i]*frame.height;
 return vec4f(px.x/frame.viewport.x*2.-1.,1.-px.y/frame.viewport.y*2.,0.,1.);
}
fn ease(a:f32,b:f32,x:f32)->f32{return smoothstep(a,b,x);}
fn artAt(q:vec2f)->vec4f {
 let s=q*116.+vec2f(63.5);
 if(any(s<vec2f(0.))||any(s>=vec2f(128.))){return vec4f(0.);}
 return textureSampleLevel(actor,linearSampler,s/vec2f(2560.,1536.),0.);
}
fn face(q:vec2f)->f32{return 1.-ease(.82,1.14,length((q-vec2f(0.,-.205))/vec2f(.19,.19)));}
fn lightPlane(q:vec2f,root:vec2f,rise:f32,spread:f32,width:f32,p:f32,delay:f32)->vec4f {
 let t=p-delay;let u=(root.y-q.y)/rise;
 let head=1.38*ease(.015,.43,t);
 let longitudinal=ease(-.03,.05,u)*(1.-ease(.96,1.06,u));
 let packet=ease(head-.83,head-.57,u)*(1.-ease(head-.04,head+.15,u));
 let life=ease(.005,.060,t)*(1.-ease(.54,.70,t));
 let sway=sin(u*4.5-t*3.)*.035*(1.-frame.reduced*.6);
 let x=root.x+spread*ease(0.,1.,u)+sway;
 let extent=width*(.55+.55*sin(clamp(u,0.,1.)*3.14159));
 let side=(q.x-x)/extent;
 let core=exp2(-side*side*1.8);let fold=exp2(-pow((side-.20)/.30,2.)*2.);
 let facing=.50+.50*cos(u*2.6+.4);
 let tint=mix(vec3f(.11,.57,.76),vec3f(.33,.91,.72),ease(-.5,.5,side));
 let energy=tint+vec3f(.47,.28,.25)*fold*facing;
 return vec4f(energy,core*longitudinal*packet*life*.86);
}
@fragment fn fs(@builtin(position) position:vec4f)->@location(0) vec4f {
 let q=(position.xy-frame.center)/frame.height;let p=frame.phase;
 let bg=mix(vec3f(.015,.028,.045),vec3f(.79,.825,.85),frame.light);let art=artAt(q);
 if(p<=0.||p>=.96){return vec4f(mix(bg,art.rgb,art.a),1.);}
 let left=lightPlane(q,vec2f(-.065,.46),.99,-.27,.060,p,0.);
 let right=lightPlane(q,vec2f(.075,.46),.84,.30,.076,p,.065);
 let front=lightPlane(q,vec2f(0.,.49),.405,.14,.064,p,.10);
 let protect=face(q);
 let received=ease((.46-q.y)/.99-.14,(.46-q.y)/.99+.15,1.38*ease(.035,.47,p));
 let source=ease(.04,.18,p);let held=1.-ease(.77,.95,p);
 let whole=ease(.57,.67,p);
 let receiver=max(received*source*.64,whole*.88)*held;
 let body=vec3f(.52,.99,.77)*receiver*(1.-protect*.98);
 let lit=art.rgb+(vec3f(1.)-art.rgb)*body;
 var behind=mix(bg,left.rgb,left.a);behind=mix(behind,right.rgb,right.a);
 var color=mix(behind,lit,art.a);
 color=mix(color,front.rgb,front.a*(1.-protect*.995));
 let offset=2.0/frame.height;
 let nearby=max(max(artAt(q+vec2f(offset,0.)).a,artAt(q-vec2f(offset,0.)).a),max(artAt(q+vec2f(0.,offset)).a,artAt(q-vec2f(0.,offset)).a));
 color+=vec3f(.16,.46,.33)*max(0.,nearby-art.a)*whole*held*.36*(1.-protect);
 return vec4f(color,1.);
}
`;
