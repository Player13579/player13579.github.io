// GPT-6.1-Sol Mana r8 artist source. Authorized r7 improvement, not zero-copy.
export const DESIGN=Object.freeze({id:'sol61-mana-zero-r8',author:'GPT-6.1-Sol',parent:'sol61-mana-zero-r7',quality:'not_run',adoption:'unadopted',duration:1.7,bounds:[-34,-13,28,30],depthHalf:11,samplesPerHalf:24,bodyH:64,crop:[62,15,136,225],sparkleAngle:31,pointRadius:2.2,sourcePoints:[[22,10,3],[2,14,4],[-22,17,3]],sourcePeaks:[.22,.64,1.16],sourceWidths:[.115,.14,.18],ghosts:[{k:-.18,r:2.8,focus:1.2,gain:.018},{k:.36,r:5.4,focus:2.4,gain:.009}]});
export const ease=(a,b,x)=>{const q=Math.max(0,Math.min(1,(x-a)/(b-a)));return q*q*(3-2*q);};
export function state(t){const live=Number.isFinite(t)&&t>=0&&t<1.7;return {live,life:live?ease(0,.09,t)*(1-ease(1.37,1.7,t)):0,front:22-58*ease(.12,.92,t),settled:ease(.46,.98,t)};}
export function field([x,y,z],t,{source=true}={}){
 const q=state(t);if(!q.live||!source||![x,y,z].every(Number.isFinite)||x<=-34||x>=28||y<=-13||y>=30||Math.abs(z)>=11)return {density:0,radiance:[0,0,0]};
 const s=Math.max(0,Math.min(1,(24-x)/58)),cy=7+12*s-3*s*s,h=8+11*Math.sin(Math.PI*s),focusZ=2.5+2*Math.sin(Math.PI*s);
 const yn=(y-cy)/h,zn=(z-focusZ)/8,rho=(yn**4+zn**4)**.25;
 const longitudinal=ease(-34,-29,x)*(1-ease(23,28,x));
 const open=1-ease(3,9,y-cy)*ease(7,18,x);
 const registered=ease(q.front-6,q.front+6,x),density=(1-ease(.64,1,rho))*longitudinal*open*registered*q.life;
 const working=Math.exp(-(((x-q.front)/6)**2));
 const interior=Math.exp(-(((y-(cy+2*Math.sin(Math.PI*s)))/7)**4))*Math.exp(-(((z-focusZ)/5)**4));
 const received=ease(-28,-17,x)*(1-ease(7,17,x))*q.settled;
 const hue=[.18+.09*(1-s),.28+.53*(1-s),1.10+.14*(1-s)];
 const radiance=hue.map((v,i)=>density*(v*(.46+.32*received)+[.76,1.02,1.12][i]*interior*(.40+.52*working+.40*received)));
 return {density,radiance};
}
export function integrated(x,y,t,front=true,options={}){let rgb=[0,0,0],optical=0;const dz=11/24;for(let j=0;j<24;j++){const z=(j+.5)*dz*(front?1:-1),f=field([x,y,z],t,options);rgb=rgb.map((v,i)=>v+f.radiance[i]*dz*.16);optical+=f.density*dz*.027;}return {rgb,alpha:1-Math.exp(-optical)};}
export function point(i,t){const st=state(t),p=DESIGN.sourcePoints[i],q=(t-DESIGN.sourcePeaks[i])/DESIGN.sourceWidths[i];return {position:p,gain:st.live&&Math.abs(q)<1?(1-q*q)**2*st.life:0};}
export function ghostCenters(source,imageCenter){return DESIGN.ghosts.map(g=>({...g,x:imageCenter[0]+g.k*(imageCenter[0]-source[0]),y:imageCenter[1]+g.k*(imageCenter[1]-source[1])}));}
// This block replaces r7 field(), not the generic frame/body/receipt runtime.
export const WORLD_FIELD_WGSL=String.raw`
fn field(p:vec3f)->vec4f {
 let life=lifetime();if(life==0.||p.x<=-34.||p.x>=28.||p.y<=-13.||p.y>=30.||abs(p.z)>=11.){return vec4f(0.);}
 let s=clamp((24.-p.x)/58.,0.,1.);let cy=7.+12.*s-3.*s*s;let halfWidth=8.+11.*sin(3.141592654*s);let focusZ=2.5+2.*sin(3.141592654*s);
 let yn=(p.y-cy)/halfWidth;let zn=(p.z-focusZ)/8.;let yn2=yn*yn;let zn2=zn*zn;let rho=pow(yn2*yn2+zn2*zn2,.25);
 let longitudinal=ease(-34.,-29.,p.x)*(1.-ease(23.,28.,p.x));let opening=1.-ease(3.,9.,p.y-cy)*ease(7.,18.,p.x);
 let front=22.-58.*ease(.12,.92,u.controls.x);let density=(1.-ease(.64,1.,rho))*longitudinal*opening*ease(front-6.,front+6.,p.x)*life;
 let dx=(p.x-front)/6.;let fy=(p.y-(cy+2.*sin(3.141592654*s)))/7.;let fz=(p.z-focusZ)/5.;let fy2=fy*fy;let fz2=fz*fz;let working=exp(-dx*dx);let interior=exp(-fy2*fy2)*exp(-fz2*fz2);
 let received=ease(-28.,-17.,p.x)*(1.-ease(7.,17.,p.x))*ease(.46,.98,u.controls.x);
 let hue=vec3f(.18+.09*(1.-s),.28+.53*(1.-s),1.10+.14*(1.-s));
 let radiance=density*(hue*(.46+.32*received)+vec3f(.76,1.02,1.12)*interior*(.40+.52*working+.40*received));return vec4f(radiance,density);
}
`;
export const GHOST_OBS_WGSL=String.raw`
// OBS3 uses new optical vec4(imageCenterX,imageCenterY,ghostEnabled,observerDpr).
// pixel and src are submitted physical pixels; bodyScale converts H64-designpx.
fn ghostResponse(pixel:vec2f,src:vec2f,sourceEnvelope:f32)->vec3f {
 if(u.optical.z<.5||sourceEnvelope<=0.){return vec3f(0.);}
 let C=u.optical.xy;let bodyScale=u.viewport.z/64.;let surviving=textureSampleLevel(emission,samp,src/u.viewport.xy,0.).rgb;
 let strength=max(0.,min(surviving.x,min(surviving.y,surviving.z))-.70);let offAxis=ease(3.,30.,length(C-src)/bodyScale);
 let ks=array<f32,2>(-.18,.36);let rs=array<f32,2>(2.8,5.4);let fs=array<f32,2>(1.2,2.4);let gains=array<f32,2>(.018,.009);var answer=vec3f(0.);
 for(var j=0u;j<2u;j++){let at=C+ks[j]*(C-src);let d=length((pixel-at)/bodyScale);let aperture=1.-ease(rs[j]-fs[j],rs[j]+fs[j],d);let transmission=aperture*(.48+.25*exp(-d*d/(rs[j]*rs[j])));answer+=vec3f(.66,.86,.95)*transmission*gains[j]*strength*sourceEnvelope*offAxis;}
 return answer;
}
`;
