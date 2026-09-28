// Astra r21: a connected contact surface, regional reception, persistent settled light.
// New analytic design; no curve sheets or plateau response from r17-r20.
export const shader=/*wgsl*/`
struct Frame { viewport:vec2f, center:vec2f, height:f32, phase:f32, light:f32, reduced:f32 };
@group(0) @binding(0) var<uniform> frame:Frame;
@group(0) @binding(1) var actor:texture_2d<f32>;
@group(0) @binding(2) var linearSampler:sampler;
@vertex fn vs(@builtin(vertex_index) i:u32)->@builtin(position) vec4f {
 let corners=array<vec2f,6>(vec2f(-.84,-.975),vec2f(.84,-.975),vec2f(-.84,.775),vec2f(-.84,.775),vec2f(.84,-.975),vec2f(.84,.775));
 let pixel=frame.center+corners[i]*frame.height;
 return vec4f(pixel.x/frame.viewport.x*2.-1.,1.-pixel.y/frame.viewport.y*2.,0.,1.);
}
fn ease(a:f32,b:f32,x:f32)->f32{return smoothstep(a,b,x);}
fn originalAt(q:vec2f)->vec4f {
 let s=q*116.+vec2f(63.5);
 if(any(s<vec2f(0.))||any(s>=vec2f(128.))){return vec4f(0.);}
 return textureSampleLevel(actor,linearSampler,s/vec2f(2560.,1536.),0.);
}
fn face(q:vec2f)->f32{return 1.-ease(.82,1.14,length((q-vec2f(0.,-.205))/vec2f(.19,.19)));}
fn contactSurface(q:vec2f,p:f32)->vec4f {
 let contactPoint=vec2f(-.08,.12);let source=vec2f(-.58,.035);
 let direction=normalize(contactPoint-source);let normal=vec2f(-direction.y,direction.x);
 let length=distance(source,contactPoint)*(1.-frame.reduced*.20);
 let local=q-(contactPoint-direction*length);let u=dot(local,direction)/length;let transverse=dot(local,normal);
 let extent=ease(0.,.10,u)*(1.-ease(.96,1.08,u));
 let width=mix(.145,.070,clamp(u,0.,1.));
 let rim=1.-ease(.72,1.05,abs(transverse)/width);
 let mass=extent*rim;
 let activation=ease(.015,.07,p)*(1.-ease(.29,.40,p));
 let packet=exp2(-pow((u-(p-.03)*4.5)/.29,2.)*1.5);
 let depth=ease(-width,width,transverse);
 let tint=mix(vec3f(.12,.58,.72),vec3f(.40,.93,.74),depth);
 let edge=exp2(-pow((transverse/width-.48)/.23,2.))*ease(.52,.94,u);
 let radiance=tint+vec3f(.24,.20,.18)*packet+vec3f(.26,.18,.21)*edge;
 return vec4f(radiance,mass*activation*(.40+packet*.46));
}
// Every body point has a reception time, so settled light retains the causal history.
fn receptionTime(q:vec2f)->f32 {
 let leg=ease(.20,.30,q.y);
 let arm=ease(.095,.195,abs(q.x))*(1.-leg);
 let torsoTime=.155+.115*ease(-.18,.16,q.x)+.025*ease(-.04,.23,q.y);
 let armTime=.315+.105*ease(.09,.31,abs(q.x));
 let legTime=.435+.180*ease(.20,.51,q.y);
 let trunk=mix(torsoTime,armTime,arm);
 let body=mix(trunk,legTime,leg);
 let head=1.-ease(-.075,.005,q.y);
 return mix(body,.565+.055*ease(.05,.40,-q.y),head);
}
fn reception(q:vec2f,p:f32)->vec2f {
 let at=receptionTime(q);
 let received=ease(at-.013,at+.022,p);
 let stay=1.-ease(.755,.94,p+(0.45-at)*.12);
 let front=exp2(-pow((p-at)/.038,2.)*1.8);
 return vec2f(received*stay,front*stay);
}
@fragment fn fs(@builtin(position) position:vec4f)->@location(0) vec4f {
 let q=(position.xy-frame.center)/frame.height;let p=frame.phase;
 let background=mix(vec3f(.015,.028,.045),vec3f(.79,.825,.85),frame.light);
 let art=originalAt(q);let pristine=mix(background,art.rgb,art.a);
 if(p<=0.||p>=.96){return vec4f(pristine,1.);}
 let supply=contactSurface(q,p);let received=reception(q,p);let protect=face(q);
 let peak=ease(.620,.645,p)*(1.-ease(.705,.740,p));
 let settled=vec3f(.44,.95,.70)*received.x*.65;
 let movingFront=vec3f(.96,1.,.89)*received.y*.63;
 let unified=vec3f(.77,1.,.89)*peak*.22;
 let energy=min(vec3f(.96),settled+movingFront+unified)*(1.-protect*.978);
 let lit=art.rgb+(vec3f(1.)-art.rgb)*energy;
 var color=mix(mix(background,supply.rgb,supply.a),lit,art.a);
 let offset=2.2/frame.height;
 let around=max(max(originalAt(q+vec2f(offset,0.)).a,originalAt(q-vec2f(offset,0.)).a),max(originalAt(q+vec2f(0.,offset)).a,originalAt(q-vec2f(0.,offset)).a));
 let spill=max(0.,around-art.a)*received.y*(1.-protect);
 color+=vec3f(.35,.65,.55)*spill*.65;
 return vec4f(color,1.);
}
`;
