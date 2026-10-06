export const GOLD_CONDUCTOR_F0=Object.freeze([.98,.78,.34]);
// R6 selected orthographic 2.5D material. CPU functions are causal probes, not GPU proof.
export const MATERIAL_LIMITS=Object.freeze({roughness:[.14,.8],incidentIntensity:[0,4],viewDirection:[0,0,1]});
export const fresnelSchlick=(f0,cosine)=>f0.map(x=>x+(1-x)*Math.pow(1-Math.max(0,Math.min(1,cosine)),5));
export const normalize3=v=>{const L=Math.hypot(...v);if(!Number.isFinite(L)||L<=1e-8)throw new TypeError('finite nonzero direction');return v.map(x=>x/L);};
export function evaluateSpecular({normal,light,view=[0,0,1],roughness=.24,f0=[.56,.57,.58],intensity=1}){const N=normalize3(normal),L=normalize3(light),V=normalize3(view),dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0),nl=Math.max(0,dot(N,L)),nv=Math.max(.001,dot(N,V));if(nl<=0)return [0,0,0];const H=normalize3(L.map((x,i)=>x+V[i])),nh=Math.max(0,dot(N,H)),vh=Math.max(0,dot(V,H));const a=roughness*roughness,a2=a*a,den=nh*nh*(a2-1)+1,D=a2/(Math.PI*den*den),g=n=>2*n/(n+Math.sqrt(a2+(1-a2)*n*n)),G=g(nl)*g(nv);return fresnelSchlick(f0,vh).map(x=>x*D*G*intensity/(4*nv));}
export const MATERIAL_WGSL=String.raw`
fn fresnel(f0:vec3f,c:f32)->vec3f{return f0+(vec3f(1.0)-f0)*pow(1.0-clamp(c,0.0,1.0),5.0);}
fn smithG1(n:f32,a2:f32)->f32{return 2.0*n/max(0.00001,n+sqrt(a2+(1.0-a2)*n*n));}
fn conductorReflection(n:vec3f,l:vec3f,v:vec3f,roughness:f32,f0:vec3f,incident:vec3f)->vec3f{
 let nl=max(0.0,dot(n,l));let nv=max(0.001,dot(n,v));if(nl<=0.0){return vec3f(0.0);}
 let h=normalize(l+v);let nh=max(0.0,dot(n,h));let vh=max(0.0,dot(v,h));
 let alpha=roughness*roughness;let a2=alpha*alpha;let den=nh*nh*(a2-1.0)+1.0;
 let distribution=a2/(3.14159265359*den*den);let masking=smithG1(nl,a2)*smithG1(nv,a2);
 return fresnel(f0,vh)*distribution*masking*incident/(4.0*nv);
}
// Authored studio radiance, no hidden game IBL. Roughness broadens environment lobes.
fn studioRadiance(r:vec3f,roughness:f32)->vec3f{
 let softbox=pow(max(0.0,dot(r,normalize(vec3f(-0.35,-0.42,0.84)))),mix(56.0,4.0,roughness));
 let lower=pow(max(0.0,dot(r,normalize(vec3f(0.65,0.25,0.72)))),mix(18.0,3.0,roughness));
 return vec3f(0.10,0.12,0.15)+vec3f(1.35,1.42,1.55)*softbox+vec3f(0.26,0.24,0.20)*lower;
}
`;
