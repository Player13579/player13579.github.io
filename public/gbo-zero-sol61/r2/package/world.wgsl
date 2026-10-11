// R2: receiver-fed digital membrane, not a solid weapon or metal fragment.
fn membrane(p:vec2f,side:f32,t:f32,retirement:bool,reduced:bool)->vec3f{
 let front=smoothstep(.12,.50,t);
 let withdrawal=select(0.,smoothstep(.25,.72,t),retirement);
 let gap=select(0.,smoothstep(.09,.28,t),retirement);
 // Retirement removes support from muzzle toward receiver. Reduced motion
 // retains this coverage change and central severing, but disables displacement.
 let end=select(.02+.94*front,.96-.64*withdrawal,retirement);
 let offset=select(.22*withdrawal,0.,reduced);
 let x=p.x+select(0.,.08*withdrawal,retirement);
 let u=clamp((x+.10)/max(end+.10,.12),0.,1.);
 let arch=.035*sin(u*3.14159265);
 let center=side*(mix(.145,.065,u)+arch+offset+.035*gap);
 let thickness=mix(.100,.045,u)*(1.-.24*withdrawal);
 let distance=abs(p.y-center)-thickness*.5;
 let len=max(length(f.weapon.zw-f.weapon.xy),8.);let aa=.65/len;
 let ends=max(-.10-x,x-end);
 let coverage=(1.-smoothstep(-aa,aa,max(distance,ends)));
 // Broad colored face plus one internal light ridge gives thickness without
 // tracing every edge into another closed white outline.
 let across=clamp((p.y-center)/max(thickness,.02),-.5,.5);
 let body=vec3f(.035,.48,.86)*(1.65+.60*(.5-side*across));
 let ridge=exp(-pow((across+side*.17)/.14,2.));
 let seam=vec3f(.42,.91,1.15)*ridge*2.0;
 let frontFace=exp(-pow((x-end+.018)/.050,2.));
 let charge=vec3f(.66,1.08,1.20)*frontFace*select(1.4,.35,retirement);
 let release=vec3f(.11,.65,1.10)*withdrawal*(1.-u)*.8;
 return (body+seam+charge+release)*coverage;
}
@fragment fn fragment(@builtin(position) pixel:vec4f)->@location(0) vec4f{
 let t=f.view.z;let retirement=f.view.w>.5;let supply=envelope(t,retirement);
 if(f.flags.x<.5||supply<=0.){return vec4f(0.);}
 let p=weaponLocal(pixel.xy);let m=weaponLocal(f.points.xy);
 let reduced=f.flags.w>.5;let gap=select(0.,smoothstep(.09,.28,t),retirement);
 let withdrawal=select(0.,smoothstep(.25,.72,t),retirement);
 var light=membrane(p,-1.,t,retirement,reduced)+membrane(p,1.,t,retirement,reduced);
 // A finite packet travels along the actual magazine -> receiver connection.
 // It disappears once delivered; retirement does not inject another packet.
 let delivered=smoothstep(0.,.18,t);
 let packetCenter=m*(1.-delivered);
 let packet=exp(-pow(length(p-packetCenter)/.055,2.));
 let flow=exp(-pow(segmentDistance(p,m,vec2f(0.))/.030,2.));
 let intake=(packet*2.4+flow*.45)*(1.-smoothstep(.16,.36,t));
 light+=vec3f(1.20,.40,.075)*intake*select(1.,0.,retirement);
 // Two angled receiver jaws converge without enclosing the entire barrel.
 let opening=.09*(1.-delivered);
 let jawTop=segmentDistance(p,vec2f(-.12,-.20-opening),vec2f(.055,-.105-opening));
 let jawBottom=segmentDistance(p,vec2f(-.12,.20+opening),vec2f(.055,.105+opening));
 let jaws=exp(-pow(min(jawTop,jawBottom)/.028,2.));
 light+=vec3f(1.20,.62,.16)*jaws*2.6*select(1.,1.-gap,retirement);
 // Retirement is a short central break at the registered receiver, followed
 // by separated contracting membranes, not permanent warm latch rails.
 let cut=exp(-pow(p.x/.065,2.)-pow(p.y/.09,2.));
 light+=vec3f(.80,1.05,1.20)*cut*gap*(1.-withdrawal)*2.0;
 return vec4f(light*supply,0.);
}
