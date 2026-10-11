@fragment fn fragment(@builtin(position) pixel:vec4f)->@location(0) vec4f{
 let t=f.view.z;let retirement=f.view.w>.5;let supply=envelope(t,retirement);
 if(f.flags.x<.5||supply<=0.){return vec4f(0.);}
 let len=max(length(f.weapon.zw-f.weapon.xy),8.);let aa=.65/len;
 let p=weaponLocal(pixel.xy);let m=weaponLocal(f.points.xy);
 let latch=smoothstep(0.,.18,t);let front=smoothstep(.12,.50,t);
 let gap=select(0.,smoothstep(.09,.28,t),retirement);
 let withdrawal=select(0.,smoothstep(.25,.72,t),retirement);
 let reduced=f.flags.w>.5;
 // A tapered, hollow split sheath follows the resolved weapon axis, not a ring.
 let travel=select(withdrawal*.13,0.,reduced);
 let side=select(-1.,1.,p.y>=0.);
 let q=p-vec2f(-withdrawal*.12,side*travel);
 let width=mix(.17,.075,clamp(q.x/.96,0.,1.));
 let top=abs(q.y)-width;
 let ends=max(-.20-q.x,q.x-.96);
 let outer=max(top,ends);
 let inner=max(abs(q.y)-(width-.052),max(-.10-q.x,q.x-.85));
 let sheath=max(outer,-inner);
 let skin=1.-smoothstep(-aa,aa,sheath);
 let reach=select(1.-smoothstep(-.03+front*1.05,.07+front*1.05,q.x),1.,retirement);
 // Destruction breaks field continuity first; no unreported physical fragments.
 let sever=select(1.,smoothstep(.008+gap*.047,.020+gap*.047,abs(p.y)),retirement);
 let seam=exp(-pow(sheath/.018,2.));
 let ridge=exp(-pow((abs(q.y)-(width-.022))/.021,2.));
 var light=vec3f(.07,.62,1.05)*skin*reach*sever*(1.9+.9*ridge);
 light+=vec3f(.63,.93,1.08)*seam*reach*sever*1.5;
 // Magazine-to-receiver path is tied to actual supplied magazine and receiver.
 let flowDistance=segmentDistance(p,m,vec2f(0.));
 let intake=exp(-pow(flowDistance/.030,2.))*(1.-smoothstep(.16,.36,t));
 let latchDistance=box(p,vec2f(.105,.14+(.10*(1.-latch))));
 let latchEdge=exp(-pow(latchDistance/.020,2.));
 light+=vec3f(1.12,.39,.09)*intake*select(1.,1.-gap,retirement)*3.4;
 light+=vec3f(1.25,.78,.32)*latchEdge*select(1.,1.-withdrawal,retirement)*2.5;
 // Withdrawal exposes two broad cyan faces and a warm severed receiver seam.
 let releaseFace=exp(-pow((q.x+.035)/.095,2.))*skin*sever;
 light+=vec3f(.62,1.10,1.20)*releaseFace*withdrawal*2.;
 let cut=exp(-pow(p.y/.018,2.)-pow(p.x/.12,2.))*gap*(1.-withdrawal);
 light+=vec3f(1.18,.45,.13)*cut*3.;
 return vec4f(light*supply,0.);
}
