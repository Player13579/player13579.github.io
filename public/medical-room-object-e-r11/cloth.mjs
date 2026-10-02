// GPT-6.1-Sol: two already depicted supported thin folded white fabrics, no new object.
export const CLOTH=Object.freeze({periodMs:12000,tableHz:240,airDensity:1.2,peakSpeed:.65,arealMass:.028,
 patches:Object.freeze([{id:'cart-soft-white-fold',rect:[254,156,312,229],amplitudePx:6,frequencyHz:1.35,damping:.32,phase:.0},{id:'sink-soft-white-fold',rect:[791,136,834,166],amplitudePx:2.8,frequencyHz:1.8,damping:.38,phase:.65}].map(Object.freeze))});
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
export function gust(t){if(!Number.isFinite(t))throw Error('finite gust time');if(t<1.8||t>=7.3)return 0;const rise=smooth(1.8,3,t),fall=1-smooth(6,7.3,t);return rise*fall*(.82+.18*Math.sin((t-3)*2*Math.PI*.55));}
// Damped supported-sheet bending mode. Pressure is a chosen gallery inference, not measured room wind.
export function clothTable(hz=240){const dt=1/hz,rows=[{t:0,q:[0,0],v:[0,0]}];let q=[0,0],v=[0,0];const acceleration=(t,x,dx,i)=>{const p=CLOTH.patches[i],omega=2*Math.PI*p.frequencyHz;const forcing=p.amplitudePx*gust(t)**2*(.75+.25*Math.sin(t*2*Math.PI*.8+p.phase));return omega*omega*(forcing-x)-2*p.damping*omega*dx;};
 for(let step=1;step<=12*hz;step++){const t=(step-1)*dt;for(let i=0;i<2;i++){const a1=acceleration(t,q[i],v[i],i),k1=v[i],a2=acceleration(t+dt/2,q[i]+k1*dt/2,v[i]+a1*dt/2,i),k2=v[i]+a1*dt/2,a3=acceleration(t+dt/2,q[i]+k2*dt/2,v[i]+a2*dt/2,i),k3=v[i]+a2*dt/2,a4=acceleration(t+dt,q[i]+k3*dt,v[i]+a3*dt,i),k4=v[i]+a3*dt;q[i]+=dt*(k1+2*k2+2*k3+k4)/6;v[i]+=dt*(a1+2*a2+2*a3+a4)/6;}rows.push({t:step*dt,q:[...q],v:[...v]});}return rows;
}
const TABLE=clothTable();
export function clothState(ms){if(!Number.isFinite(ms)||ms<0)throw Error('finite nonnegative environment clock');const t=ms%12000/1000,u=t*240,i=Math.min(Math.floor(u),TABLE.length-2),a=TABLE[i],b=TABLE[i+1],f=u-i;const q=a.q.map((x,j)=>x+(b.q[j]-x)*f),v=a.v.map((x,j)=>x+(b.v[j]-x)*f);return{t,q:t<10?q:[0,0],v:t<10?v:[0,0],physicalQ:q,airSpeed:CLOTH.peakSpeed*gust(t),pressure:.5*CLOTH.airDensity*(CLOTH.peakSpeed*gust(t))**2,stage:t<1.8?'still':t<7.3?'air-response':t<10?'settling':'still'};}
export function clothUniforms(ms,enabled){const s=clothState(ms);return new Float32Array([s.q[0],s.q[1],s.airSpeed,enabled?1:0,...CLOTH.patches[0].rect,...CLOTH.patches[1].rect,6,2.8,.28,.18]);}
