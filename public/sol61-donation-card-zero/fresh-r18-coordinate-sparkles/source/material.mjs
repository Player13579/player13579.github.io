// R7 gold: retained complex-IOR conductor; broad structured neutral studio illumination.
// Constants are an explicit RGB optical-model choice, not a spectral-measurement claim.
export const GOLD_ETA=Object.freeze([0.143,0.375,1.442]);
export const GOLD_K=Object.freeze([3.983,2.385,1.603]);
export const DEFAULT_ROUGHNESS=.24;
export const STUDIO_ILLUMINATION=Object.freeze({floor:.18,key:.80,ribbon:.55,wideArea:.36,stripArea:.075,forwardLow:-.20,forwardHigh:.30,keyX:.18,keyY:.20,keyYWide:.72,keyRoughness:.68,keyYScale:.30,stripX:.20,stripY:.30,stripRoughness:.40,panelDirection:Object.freeze([-.50,.12,-.8588]),panelSigma:.30,panelRoughness:1.15,panelRadiance:1.65});
const finite=(v,name)=>{if(!Number.isFinite(v))throw new TypeError(`${name}: finite required`);return v;};
export function unitVector(v,name='direction'){
 if(!Array.isArray(v)||v.length!==3)throw new TypeError(`${name}: three-vector required`);v.forEach(x=>finite(x,name));const length=Math.hypot(...v);if(length<1e-8)throw new RangeError(`${name}: nonzero required`);return Object.freeze(v.map(x=>x/length));
}
export function materialDescriptor(value={}){
 const view=unitVector(value.viewDirection??[0,0,1],'material view'),light=unitVector(value.lightDirection??[-.40,-.48,1],'material light');
 if(Math.abs(view[1])>.98)throw new RangeError('material view too close to camera-up singularity');
 const roughness=finite(value.roughness??DEFAULT_ROUGHNESS,'roughness');if(roughness<.14||roughness>.80)throw new RangeError('roughness [.14,.80]');
 const lightIntensity=finite(value.lightIntensity??1.30,'light intensity');if(lightIntensity<0||lightIntensity>4)throw new RangeError('light intensity [0,4]');
 return Object.freeze({view,light,viewYaw:Math.atan2(view[0],view[2]),viewPitch:Math.asin(view[1]),roughness,lightIntensity,eta:GOLD_ETA,k:GOLD_K,model:'RGB complex-IOR conductor + isotropic GGX/Smith; orthographic same-view ray and BRDF'});
}
export function fresnelConductor(cosine){
 const c=Math.max(0,Math.min(1,finite(cosine,'incidence cosine'))),c2=c*c,s2=1-c2;
 return GOLD_ETA.map((eta,i)=>{const e2=eta*eta,k2=GOLD_K[i]**2,t0=e2-k2-s2,ab=Math.sqrt(t0*t0+4*e2*k2),a=Math.sqrt(Math.max(0,.5*(ab+t0))),t1=ab+c2,t2=2*c*a,rs=(t1-t2)/(t1+t2),t3=c2*ab+s2*s2,t4=t2*s2,rp=rs*(t3-t4)/(t3+t4);return .5*(rs+rp);});
}
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
export function conductorReflection(normal,view,light,roughness=.24,intensity=1.3){
 const n=unitVector(normal,'normal'),v=unitVector(view,'view'),l=unitVector(light,'light'),nl=dot(n,l),nv=dot(n,v);
 finite(roughness,'roughness');finite(intensity,'intensity');if(roughness<.14||roughness>.8||intensity<0||intensity>4)throw new RangeError('material bounds');
 if(nl<=0||nv<=0)return [0,0,0];
 const h=unitVector(v.map((x,i)=>x+l[i]),'half-vector'),nh=Math.max(0,dot(n,h)),vh=Math.max(0,dot(v,h)),alpha2=roughness**4,den=nh*nh*(alpha2-1)+1,D=alpha2/(Math.PI*den*den),g1=c=>2*c/(c+Math.sqrt(alpha2+(1-alpha2)*c*c)),G=g1(nl)*g1(nv);
 return fresnelConductor(vh).map(F=>F*D*G/(4*Math.max(nv,1e-6))*intensity);
}
export function cameraBasis(view){
 const v=unitVector(view),r=unitVector([v[2],0,-v[0]],'camera right'),up=[v[1]*r[2]-v[2]*r[1],v[2]*r[0]-v[0]*r[2],v[0]*r[1]-v[1]*r[0]];return {view:v,right:r,up};
}
export function surfaceRoughness(base,localNormalZ){const q=Math.max(0,Math.min(1,(Math.abs(localNormalZ)-.82)/.17));return Math.max(.14,Math.min(.8,base*(.65+.35*q*q*(3-2*q))));}
// Neutral softboxes are selected distant illumination, not emissive coin paint.
// Reflection direction is shared by the actual camera/ray hit and BRDF.
export function studioEnvironment(normal,view,roughness,intensity=1.3){
 const n=unitVector(normal),v=unitVector(view),nv=Math.max(0,dot(n,v));
 if(nv===0||intensity===0)return [0,0,0];
 const r=v.map((x,i)=>-x+2*nv*n[i]);
 const smooth=(a,b,x)=>{const q=Math.max(0,Math.min(1,(x-a)/(b-a)));return q*q*(3-2*q);};
 const c=STUDIO_ILLUMINATION;
 const forward=smooth(c.forwardLow,c.forwardHigh,r[2]);
 const wide=c.wideArea+c.keyRoughness*roughness,strip=c.stripArea+c.stripRoughness*roughness;
 const key=Math.exp(-(((r[0]-c.keyX)/wide)**2)-(((r[1]-c.keyY)/(c.keyYWide+c.keyYScale*roughness))**2))*forward;
 const ribbon=Math.exp(-(((r[0]+c.stripX+r[1]*c.stripY)/strip)**2))*forward;
 const d=unitVector(c.panelDirection,'studio panel direction');
 const sigma2=c.panelSigma*c.panelSigma+c.panelRoughness*roughness*roughness;
 const rimPanel=Math.exp((dot(r,d)-1)/sigma2)*(c.panelSigma*c.panelSigma/sigma2);
 const incident=c.floor+c.key*key*c.wideArea/wide+c.ribbon*ribbon*c.stripArea/strip+c.panelRadiance*rimPanel;
 return fresnelConductor(nv).map(F=>F*incident*intensity);
}
export function goldDisplayRadiance(rgb){
 if(!Array.isArray(rgb)||rgb.length!==3||rgb.some(x=>!Number.isFinite(x)||x<0))throw new TypeError('nonnegative finite linear RGB');
 const peak=Math.max(...rgb),knee=.82;
 // Display-referred hue preservation, applied after source/PSF redistribution.
 // No HDR lighting clamp: radiance and optical energy stay unchanged upstream.
 const mapped=peak<=knee?peak:knee+(1-knee)*(peak-knee)/(peak-knee+1-knee);
 return peak===0?[0,0,0]:rgb.map(x=>x*mapped/peak);
}
export function dielectricSurface(albedo,normal,view,light,roughness=.55,intensity=1.3){
 const n=unitVector(normal),v=unitVector(view),l=unitVector(light),nl=Math.max(0,dot(n,l)),nv=dot(n,v);if(nv<=0||intensity===0)return [0,0,0];
 if(nl<=0)return albedo.map(a=>a*.5*intensity);
 const h=unitVector(v.map((x,i)=>x+l[i])),vh=Math.max(0,dot(v,h)),F=.04+.96*(1-vh)**5,alpha2=roughness**4,nh=Math.max(0,dot(n,h)),den=nh*nh*(alpha2-1)+1,D=alpha2/(Math.PI*den*den),g1=c=>2*c/(c+Math.sqrt(alpha2+(1-alpha2)*c*c)),factor=nl>0?D*g1(nl)*g1(nv)/(4*Math.max(nv,1e-6)):0;
 return albedo.map(a=>a*(.50+(1-F)*nl/Math.PI)*intensity+F*factor*intensity);
}
export const MATERIAL_WGSL=/* wgsl */ `
fn materialView()->vec3f {
 let yaw=u.state.z;let pitch=u.state.w;
 return vec3f(sin(yaw)*cos(pitch),sin(pitch),cos(yaw)*cos(pitch));
}
fn goldFresnel(cosine:f32)->vec3f {
 let eta=vec3f(${GOLD_ETA.join(',')});let absorption=vec3f(${GOLD_K.join(',')});
 let c=clamp(cosine,0.0,1.0);let c2=c*c;let s2=1.0-c2;
 let eta2=eta*eta;let k2=absorption*absorption;let t0=eta2-k2-vec3f(s2);
 let ab=sqrt(t0*t0+4.0*eta2*k2);let a=sqrt(max(vec3f(0.0),0.5*(ab+t0)));
 let t1=ab+vec3f(c2);let t2=2.0*c*a;let rs=(t1-t2)/(t1+t2);
 let t3=c2*ab+vec3f(s2*s2);let t4=t2*s2;let rp=rs*(t3-t4)/(t3+t4);
 return 0.5*(rs+rp);
}
fn smithG1(c:f32,alpha2:f32)->f32 {
 return 2.0*c/(c+sqrt(alpha2+(1.0-alpha2)*c*c));
}
fn goldReflection(n:vec3f,v:vec3f,l:vec3f,roughness:f32,intensity:f32)->vec3f {
 let nl=dot(n,l);let nv=dot(n,v);
 if(nl<=0.0 || nv<=0.0 || intensity<=0.0){return vec3f(0.0);}
 let h=normalize(l+v);let nh=max(0.0,dot(n,h));let vh=max(0.0,dot(v,h));
 let alpha2=pow(roughness,4.0);let divisor=nh*nh*(alpha2-1.0)+1.0;
 let distribution=alpha2/(3.14159265*divisor*divisor);
 let masking=smithG1(nl,alpha2)*smithG1(nv,alpha2);
 // BRDF * cos(light); no Lambertian metal paint and no HDR radiance clamp.
 return goldFresnel(vh)*distribution*masking/(4.0*max(nv,0.000001))*intensity;
}
fn goldSurfaceRoughness(base:f32,localNormalZ:f32)->f32 {
 // Polished bevel → softly minted cap, in the rotating object's own frame.
 return clamp(base*mix(0.65,1.0,smoothstep(0.82,0.99,abs(localNormalZ))),0.14,0.80);
}
fn goldStudioEnvironment(n:vec3f,v:vec3f,roughness:f32,intensity:f32)->vec3f {
 let nv=max(0.0,dot(n,v));
 if(nv<=0.0 || intensity<=0.0){return vec3f(0.0);}
 let reflectedDirection=reflect(-v,n);
 let forward=smoothstep(${STUDIO_ILLUMINATION.forwardLow},${STUDIO_ILLUMINATION.forwardHigh},reflectedDirection.z);
 let wide=${STUDIO_ILLUMINATION.wideArea}+${STUDIO_ILLUMINATION.keyRoughness}*roughness;let strip=${STUDIO_ILLUMINATION.stripArea}+${STUDIO_ILLUMINATION.stripRoughness}*roughness;
 let key=exp(-pow((reflectedDirection.x-${STUDIO_ILLUMINATION.keyX})/wide,2.0)-pow((reflectedDirection.y-${STUDIO_ILLUMINATION.keyY})/(${STUDIO_ILLUMINATION.keyYWide}+${STUDIO_ILLUMINATION.keyYScale}*roughness),2.0))*forward;
 let ribbon=exp(-pow((reflectedDirection.x+${STUDIO_ILLUMINATION.stripX}+reflectedDirection.y*${STUDIO_ILLUMINATION.stripY})/strip,2.0))*forward;
 let panelDirection=normalize(vec3f(${STUDIO_ILLUMINATION.panelDirection.join(',')}));
 let sigma2=${STUDIO_ILLUMINATION.panelSigma}*${STUDIO_ILLUMINATION.panelSigma}+${STUDIO_ILLUMINATION.panelRoughness}*roughness*roughness;
 let rimPanel=exp((dot(reflectedDirection,panelDirection)-1.0)/sigma2)*(${STUDIO_ILLUMINATION.panelSigma}*${STUDIO_ILLUMINATION.panelSigma}/sigma2);
 let incident=${STUDIO_ILLUMINATION.floor}+${STUDIO_ILLUMINATION.key}*key*${STUDIO_ILLUMINATION.wideArea}/wide+${STUDIO_ILLUMINATION.ribbon}*ribbon*${STUDIO_ILLUMINATION.stripArea}/strip+${STUDIO_ILLUMINATION.panelRadiance}*rimPanel;
 return goldFresnel(nv)*incident*intensity;
}
fn dielectricSurface(albedo:vec3f,n:vec3f,v:vec3f,l:vec3f,roughness:f32,intensity:f32)->vec3f {
 let nl=max(0.0,dot(n,l));let nv=dot(n,v);
 if(nv<=0.0 || intensity<=0.0){return vec3f(0.0);}
 var fresnel=0.04;
 var specular=0.0;
 if(nl>0.0){
  let h=normalize(v+l);let vh=max(0.0,dot(v,h));
  fresnel=0.04+0.96*pow(1.0-vh,5.0);
  let nh=max(0.0,dot(n,h));let alpha2=pow(roughness,4.0);
  let divisor=nh*nh*(alpha2-1.0)+1.0;
  specular=alpha2/(3.14159265*divisor*divisor)*smithG1(nl,alpha2)*smithG1(nv,alpha2)/(4.0*max(nv,0.000001));
 }
 // Neutral dome irradiance pi*0.50 + key; colored diffuse, neutral specular.
 return albedo*(0.50+(1.0-fresnel)*nl/3.14159265)*intensity+vec3f(fresnel*specular*intensity);
}
`;
