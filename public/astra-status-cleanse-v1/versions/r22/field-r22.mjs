// Astra r22: cupped recovery-light surfaces are registered to chest, hands and feet.
export const shader=/*wgsl*/`
struct Frame { viewport:vec2f, center:vec2f, height:f32, phase:f32, light:f32, reduced:f32 };
@group(0) @binding(0) var<uniform> frame:Frame;
@group(0) @binding(1) var actor:texture_2d<f32>;
@group(0) @binding(2) var linearSampler:sampler;
@vertex fn vs(@builtin(vertex_index) i:u32)->@builtin(position) vec4f {
 let corners=array<vec2f,6>(vec2f(-.84,-.975),vec2f(.84,-.975),vec2f(-.84,.775),vec2f(-.84,.775),vec2f(.84,-.975),vec2f(.84,.775));
 let px=frame.center+corners[i]*frame.height;
 return vec4f(px.x/frame.viewport.x*2.-1.,1.-px.y/frame.viewport.y*2.,0.,1.);
}
fn ease(a:f32,b:f32,x:f32)->f32{return smoothstep(a,b,x);}
fn artAt(q:vec2f)->vec4f {
 let s=q*116.+vec2f(63.5);
 if(any(s<vec2f(0.))||any(s>=vec2f(128.))){return vec4f(0.);}
 return textureSampleLevel(actor,linearSampler,s/vec2f(2560.,1536.),0.);
}
fn face(q:vec2f)->f32{return 1.-ease(.82,1.14,length((q-vec2f(0.,-.205))/vec2f(.19,.19)));}
fn cup(q:vec2f,root:vec2f,closed:vec2f,opened:vec2f,width:f32,p:f32,begin:f32,end:f32)->vec4f {
 let t=clamp((p-begin)/(end-begin),0.,1.);
 let envelope=ease(0.,.13,t)*(1.-ease(.82,1.,t));
 let unfold=pow(max(0.,sin(t*3.14159265)),.8)*(1.-frame.reduced*.25);
 let tip=root+mix(closed,opened,unfold);let axis=tip-root;
 let v=q-root;let u=dot(v,axis)/dot(axis,axis);
 let cross=(axis.x*v.y-axis.y*v.x)/length(axis);
 let along=ease(0.,.07,u)*(1.-ease(.90,1.,u));
 let span=width*pow(max(0.,sin(clamp(u,0.,1.)*3.14159265)),.72)*(.34+.66*unfold)+.001;
 let s=cross/span;let shape=(1.-ease(.74,1.02,abs(s)))*along;
 // Convex outer face and luminous concave fold have different width and tone.
 let facing=.38+.62*sqrt(max(0.,1.-s*s));
 let crease=exp2(-pow((s-.18*sin(u*3.14159265))/.22,2.)*1.6);
 let inside=ease(-.42,.45,s);
 let pigment=mix(vec3f(.10,.58,.69),vec3f(.49,.93,.76),inside);
 let illuminated=pigment*(.72+.28*facing)+vec3f(.34,.24,.29)*crease;
 return vec4f(illuminated,shape*envelope*.88);
}
fn over(base:vec3f,s:vec4f,guard:f32)->vec3f{return mix(base,s.rgb,s.a*(1.-guard));}
fn echo(q:vec2f,origin:vec2f,radius:vec2f,p:f32,begin:f32,end:f32)->f32 {
 let field=exp2(-dot((q-origin)/radius,(q-origin)/radius)*1.6);
 let pulse=ease(begin,begin+.06,p)*(1.-ease(end-.10,end,p));
 return field*pulse;
}
@fragment fn fs(@builtin(position) position:vec4f)->@location(0) vec4f {
 let q=(position.xy-frame.center)/frame.height;let p=frame.phase;
 let bg=mix(vec3f(.015,.028,.045),vec3f(.79,.825,.85),frame.light);let art=artAt(q);
 if(p<=0.||p>=.96){return vec4f(mix(bg,art.rgb,art.a),1.);}
 let chest=cup(q,vec2f(0.,.16),vec2f(.02,-.08),vec2f(-.045,-.20),.065,p,.015,.31);
 let left=cup(q,vec2f(-.19,.19),vec2f(-.025,-.13),vec2f(-.31,-.13),.10,p,.16,.54);
 let right=cup(q,vec2f(.19,.19),vec2f(.015,-.13),vec2f(.31,-.20),.11,p,.22,.60);
 let footL=cup(q,vec2f(-.045,.45),vec2f(-.015,.06),vec2f(-.24,.075),.074,p,.39,.73);
 let footR=cup(q,vec2f(.065,.405),vec2f(.025,.07),vec2f(.25,.095),.080,p,.43,.77);
 var behind=over(over(bg,footL,0.),footR,0.);
 behind=over(behind,left,0.);
 let protect=face(q);
 let chestEcho=echo(q,vec2f(0.,.12),vec2f(.17,.20),p,.075,.37);
 let handEcho=echo(q,vec2f(-.18,.20),vec2f(.20,.22),p,.20,.66)+echo(q,vec2f(.18,.20),vec2f(.20,.22),p,.26,.70);
 let footEcho=echo(q,vec2f(0.,.42),vec2f(.25,.17),p,.43,.83);
 let whole=ease(.56,.65,p)*(1.-ease(.77,.95,p));
 let body=vec3f(.55,.98,.78)*min(.91,whole*.76+chestEcho*.45+handEcho*.26+footEcho*.35)*(1.-protect*.98);
 let lit=art.rgb+(vec3f(1.)-art.rgb)*body;
 var color=mix(behind,lit,art.a);
 color=over(color,chest,protect*.99);
 color=over(color,right,protect*.99);
 // The right response is in front at its base; both tips retain open negative space.
 let offset=2.2/frame.height;
 let around=max(max(artAt(q+vec2f(offset,0.)).a,artAt(q-vec2f(offset,0.)).a),max(artAt(q+vec2f(0.,offset)).a,artAt(q-vec2f(0.,offset)).a));
 color+=vec3f(.15,.42,.31)*max(0.,around-art.a)*whole*.32*(1.-protect);
 return vec4f(color,1.);
}
`;
