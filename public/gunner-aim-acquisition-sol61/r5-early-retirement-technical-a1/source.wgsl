struct U { viewport: vec4f, endpoints: vec4f, state: vec4f, controls: vec4f }
@group(0) @binding(0) var<uniform> u: U;
struct V { @builtin(position) position: vec4f, @location(0) uv: vec2f }
@vertex fn vs(@builtin(vertex_index) i:u32)->V { let p=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3))[i];var v:V;v.position=vec4f(p,0,1);v.uv=p*vec2f(.5,-.5)+vec2f(.5);return v; }
fn box(p:vec2f,b:vec2f)->f32 { let q=abs(p)-b;return length(max(q,vec2f(0)))+min(max(q.x,q.y),0); }
// R5 is an emissive screen reticle, not transported matter or a world laser.
// Every face reaches the same registered aperture at the 210ms confirmation.
fn registrationResidual(age:f32)->f32 { return 1.-smoothstep(0.,210.,age); }
fn registeredFace(p:vec2f,age:f32)->vec2f {
 let r=registrationResidual(age);
 let parity=select(-1.,1.,p.x*p.y>=0.);
 return abs(p)-vec2f(30.+24.*r)-vec2f(8.*parity*r,-8.*parity*r);
}
fn apertureShape(q:vec2f)->f32 {
 let outer=box(q,vec2f(16.));
 let cut=box(q+vec2f(10.),vec2f(10.));
 return max(outer,-cut);
}
@fragment fn fs(v:V)->@location(0) vec4f {
 let p=v.uv*u.viewport.xy;let local=(p-u.endpoints.zw)/u.state.y;let age=u.state.x;
 let alive=select(0.,1.,age>=0.&&age<900.&&u.controls.x>.5);
 let onset=smoothstep(0.,85.,age);let release=1.-smoothstep(670.,900.,age);
 let q=registeredFace(local,age);let distance=apertureShape(q);
 let coverage=1.-smoothstep(-.65/u.state.y,.65/u.state.y,distance);
 // Broad colored face and narrow emitting lip remain distinct radiance terms.
 let depth=clamp(-distance/8.,0.,1.);
 let faceGradient=clamp((q.x+q.y+32.)/64.,0.,1.);
 let faceColor=mix(vec3f(.012,.22,.76),vec3f(.008,.29,.98),faceGradient);
 let lockPulse=exp(-pow((age-248.)/47.,2.));
 let face=faceColor*(1.+depth*.2)*(1.+lockPulse*.18);
 let lip=exp(-pow((distance+.9)/1.1,2.));
 // The inner L edge has two joined segments. The confirmation front travels
 // from its x arm, through the corner, then down its y arm; it never leaves
 // the registered face or turns into particles/a projectile.
 let innerHorizontal=exp(-pow(q.y/1.15,2.))*(1.-smoothstep(0.,1.,q.x))*smoothstep(-17.,-16.,q.x);
 let innerVertical=exp(-pow(q.x/1.15,2.))*(1.-smoothstep(0.,1.,q.y))*smoothstep(-17.,-16.,q.y);
 let along=select(16.-q.y,q.x+16.,innerHorizontal>=innerVertical);
 let innerSupport=max(innerHorizontal,innerVertical);
 let frontPosition=mix(0.,32.,smoothstep(210.,355.,age));
 let frontWindow=smoothstep(210.,226.,age)*(1.-smoothstep(355.,390.,age));
 let confirmationFront=exp(-pow((along-frontPosition)/3.4,2.))*innerSupport*frontWindow;
 let lockedEdge=smoothstep(210.,250.,age)*innerSupport;
 let boundary=vec3f(3.8,4.5,4.8)*lip*(.8+lockPulse*1.8);
 let confirmedLight=vec3f(3.8,4.5,4.8)*(confirmationFront*2.+lockedEdge*.25);
 let signal=(face+boundary+confirmedLight)*coverage*onset*release*alive;
 return vec4f(signal,coverage*onset*release*alive);
}
