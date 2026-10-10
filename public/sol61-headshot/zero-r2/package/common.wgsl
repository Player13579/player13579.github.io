struct Frame { viewport:vec4f, anchor:vec4f, flags:vec4f, extra:vec4f }
@group(0) @binding(0) var<uniform> f:Frame;
@vertex fn vertex(@builtin(vertex_index) i:u32)->@builtin(position) vec4f {
 let p=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));return vec4f(p[i],0.,1.);
}
fn glyphY(t:f32)->f32 {return .22+select(.055*smoothstep(.08,.65,t),0.,f.extra.x>.5);}
fn glyphFlux(t:f32)->f32 {return 4.2*smoothstep(.035,.11,t)*(1.-smoothstep(.72,1.05,t));}
fn skullDistance(p:vec2f)->f32 {
 let crown=(length((p-vec2f(0.,.038))/vec2f(.17,.145))-1.)*.145;
 let jaw=max(abs(p.x)-.112,abs(p.y+.124)-.062)-.006;
 let body=min(crown,jaw);
 let eyes=min((length((p-vec2f(.064,.023))/vec2f(.044,.039))-1.)*.039,(length((p-vec2f(-.064,.023))/vec2f(.044,.039))-1.)*.039);
 let nose=max(abs(p.x)-(.022-.35*(p.y+.048)),abs(p.y+.048)-.025);
 let teeth=max(min(abs(p.x-.034),abs(p.x+.034))-.005,abs(p.y+.15)-.04);
 return max(max(body,-eyes),max(-nose,-teeth));
}

fn transferFlux(t:f32)->f32 {return 6.5*smoothstep(.012,.035,t)*(1.-smoothstep(.075,.145,t));}
fn transferTip(t:f32)->f32 {return (glyphY(t)-.184)*smoothstep(.012,.065,t);}
fn glyphRadiance(q:vec2f,d:f32,t:f32)->vec3f {
 let edge=exp(-pow(d/.012,2.));
 let crown=exp(-pow((q.y-.105)/.065,2.)-pow(q.x/.15,2.));
 let energy=smoothstep(.035,.11,t);
 let face=1.-.22*smoothstep(-.15,.13,q.y);
 // Spatial source energy; this field has no metallic/skin reflectance claim.
 return glyphFlux(t)*(vec3f(1.,.36,.075)*.72*face+vec3f(1.,.78,.45)*.55*edge+vec3f(1.,.91,.71)*.25*crown*energy);
}
