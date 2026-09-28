import {clamp,smooth,projectNdc} from './math.mjs';
/** 受け手はhostから渡された実在面のみ。法線はgame (x,y,elevation) と同じ基底。 */
const dot3=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0);
const normalized=a=>{const n=Math.hypot(...a);return n>1e-8?a.map(x=>x/n):null;};
/** 単散乱GGX/Smith + Fresnel重み付き拡散。物性はhost指定であり実測値とは主張しない。 */
export function receiverBRDF(normal,lightDirection,viewDirection,albedo,roughness,f0) {
  const nl=Math.max(0,dot3(normal,lightDirection)),nv=Math.max(0,dot3(normal,viewDirection));
  if(nl<=0||nv<=0)return [0,0,0];
  const h=normalized(lightDirection.map((v,i)=>v+viewDirection[i]));if(!h)return [0,0,0];
  const nh=Math.max(0,dot3(normal,h)),vh=Math.max(0,dot3(viewDirection,h));
  const a=roughness*roughness,a2=a*a,den=nh*nh*(a2-1)+1;
  const D=a2/(Math.PI*den*den);
  const smith=c=>2*c/(c+Math.sqrt(a2+(1-a2)*c*c));
  const G=smith(nl)*smith(nv);
  return albedo.map((rho,i)=>{const F=f0[i]+(1-f0[i])*Math.pow(1-vh,5);return (1-F)*rho/Math.PI+D*G*F/Math.max(4*nl*nv,1e-8);});
}
/** 既存光線区間が有限媒体AABB内を通る長さ。画面やtextureをサンプリングしない。 */
export function mediumTransmission(source,target,medium) {
  if(!medium)return 1;
  const {bounds,opticalDepth,lengthScale}=medium;
  if(!Array.isArray(bounds)||bounds.length!==6||!bounds.every(Number.isFinite)||!Number.isFinite(opticalDepth)||opticalDepth<0||!Number.isFinite(lengthScale)||lengthScale<=0)return 0;
  let enter=0,exit=1;
  const d=target.map((v,i)=>v-source[i]);
  for(let k=0;k<3;k++){
    if(Math.abs(d[k])<1e-9){if(source[k]<bounds[k]||source[k]>bounds[k+3])return 1;continue;}
    const a=(bounds[k]-source[k])/d[k],b=(bounds[k+3]-source[k])/d[k];
    enter=Math.max(enter,Math.min(a,b));exit=Math.min(exit,Math.max(a,b));
    if(enter>=exit)return 1;
  }
  const distanceInside=(exit-enter)*Math.hypot(...d);
  return Math.exp(-opticalDepth*distanceInside/lengthScale);
}
export function drawReceiverResponse(builder,surfaces,source,light,color,radius,medium=null) {
  if(!Array.isArray(surfaces) || light<=0) return 0;
  let count=0;
  for(const surface of surfaces) {
    if(!surface || !Array.isArray(surface.triangles) || !Array.isArray(surface.normal) || surface.normal.length!==3 || !surface.normal.every(Number.isFinite)) continue;
    const len=Math.hypot(...surface.normal);if(len<1e-7) continue;
    const n=surface.normal.map(x=>x/len), albedo=surface.albedo;
    if(!Array.isArray(albedo)||albedo.length!==3||!albedo.every(x=>Number.isFinite(x)&&x>=0&&x<=1)) continue;
    const f0=surface.f0,roughness=surface.roughness,view=surface.viewDirection;
    if(!Array.isArray(f0)||f0.length!==3||!f0.every(x=>Number.isFinite(x)&&x>=0&&x<=1)||!Number.isFinite(roughness)||roughness<.05||roughness>1||!Array.isArray(view)||view.length!==3||!view.every(Number.isFinite))continue;
    const v=normalized(view);if(!v)continue;
    // unknown occlusion != visible。遮蔽情報不明の面に勝手な照明を作らない。
    const visibility=Number.isFinite(surface.sourceVisibility)?clamp(surface.sourceVisibility):0;
    if(visibility<=0) continue;
    for(const tri of surface.triangles) {
      if(!Array.isArray(tri)||tri.length!==3||tri.some(p=>!Array.isArray(p)||p.length!==3||!p.every(Number.isFinite))) continue;
      const responses=tri.map(p=>{
        const d=source.map((s,i)=>s-p[i]),r=Math.hypot(...d),l=normalized(d);if(!l)return {alpha:0,color:[0,0,0]};
        const cos=Math.max(0,dot3(n,l));
        const alpha=light*mediumTransmission(source,p,medium)*visibility*cos*.20*(1-smooth(radius*.5,radius,r))/(1+(r/(radius*.28))**2);
        const brdf=receiverBRDF(n,l,v,albedo,roughness,f0);
        // OBSの局所shoulder。物理的な吸収とは別の表示変換として輝度を有限化。
        return {alpha,color:brdf.map((r,i)=>{const radiance=Math.PI*r*color[i];return radiance/(1+radiance);})};
      });
      if(responses.every(a=>a.alpha<=0)) continue;
      builder.tri(tri,responses.map(r=>r.color),responses.map(r=>r.alpha),{light:true});count++;
    }
  }
  return count;
}
/** レンズ内反射の低次近似。源の画面位置・像中心・遮蔽・強度へ束縛。 */
export function drawLensResponse(builder,frame,source,light,visibility,profile,color,budgetGain) {
  const c=projectNdc(frame.worldToClip,source);
  if(!c || c.z<0 || c.z>1 || Math.abs(c.x)>1 || Math.abs(c.y)>1 || visibility<=0) return 0;
  const trigger=smooth(profile.threshold,1,light)*visibility*budgetGain;
  if(trigger<=0) return 0;
  const edge=(1-smooth(.90,1,Math.abs(c.x)))*(1-smooth(.90,1,Math.abs(c.y)));
  const strength=profile.gain*trigger*edge;
  if(strength<=0) return 0;
  const aspect=frame.viewport.width/frame.viewport.height;
  // ピクセル面積は画面サイズへ従属。世界の反射面・厚さ・慣性を持たない。
  const radius=profile.ghostScale;
  const ghost=[c.x*profile.ghostFactor,c.y*profile.ghostFactor,0];
  builder.disc(ghost,radius,radius*aspect,profile.coating,strength,{light:true,space:1,plane:'xy',style:3});
  builder.disc([c.x,c.y,0],radius*2.4*profile.veilAspect,radius*aspect*2.4,color,strength*.65,{light:true,space:1,plane:'xy'});
  const ghost2=[-c.x*.83,-c.y*.83,0];
  builder.disc(ghost2,radius*.43,radius*aspect*.43,profile.coating,strength*.26,{light:true,space:1,plane:'xy'});
  return 3;
}
