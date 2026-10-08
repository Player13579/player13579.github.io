export const VERSION='excalibur-actual-blade-energy-sol61-r8';
export const EDITION=Object.freeze({originalHistoryUsed:5,additionalUsed:3,additionalLimit:5});
export const SOURCE_HALF_WIDTHS=Object.freeze({'white-hood':[12,10,10],'blue-dress':[15,12,12],'male-bot':[11,12,11]});
export const SOURCE_SUPPORT=Object.freeze({
 'white-hood':{size:[1684,934],crops:[[29,144,532,729],[561,145,561,646],[1122,145,543,648]],patch:[1122,455,20,8]},
 'blue-dress':{size:[1695,928],crops:[[22,126,543,698],[565,129,554,696],[1234,128,399,702]],patch:[498,471,67,20]},
 'male-bot':{size:[1774,887],crops:[[121,98,357,688],[628,151,554,631],[1182,106,467,681]],patch:[1182,381,33,27]}
});
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const affine=m=>Array.isArray(m)&&m.length===6&&m.every(finite)&&Math.abs(m[0]*m[3]-m[1]*m[2])>1e-12;
const apply=(m,p)=>({x:m[0]*p.x+m[2]*p.y+m[4],y:m[1]*p.x+m[3]*p.y+m[5]});
const mul=(a,b)=>[a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];
const inverse=m=>{const d=m[0]*m[3]-m[1]*m[2];return[m[3]/d,-m[1]/d,-m[2]/d,m[0]/d,(m[2]*m[5]-m[3]*m[4])/d,(m[1]*m[4]-m[0]*m[5])/d];};
const point=p=>p&&finite(p.x)&&finite(p.y);

// The callbacks are private adapter seams. Public receipt-shaped booleans do
// not stand in for an actual staged body or completed emitted-world proof.
export function planExcaliburR8({source,descriptor,action,release,frame}){
 const u=new Float32Array(56);const inactive=reason=>{u.fill(0);u[0]=u[1]=u[3]=1;return Object.freeze({version:VERSION,active:false,reason,uniforms:u,passes:3,creativeEdition:EDITION});};
 if(source?.type!=='alchemy-excalibur'||!source.id||!source.playerId||!source.roomId||
    source.roomId!==frame?.roomId||source.localGeneration!==frame.localGeneration||
    frame.sourceCurrent!==true||frame.ownerAlive!==true||frame.ownerVisible!==true||frame.connectedVisible!==true)return inactive('source-owner-room');
 const v=frame.viewport;
 if(!v||![v.width,v.height,v.pixelWidth,v.pixelHeight,v.dpr].every(finite)||v.width<=0||v.height<=0||v.pixelWidth<=0||v.pixelHeight<=0||v.dpr<=0||
    !affine(v.logicalToPixel)||!affine(v.worldToLogical)||v.generation!==frame.expectedGeneration||
    frame.targetGeneration!==v.generation||!Number.isSafeInteger(frame.deviceGeneration)||
    frame.deviceGeneration!==frame.expectedDeviceGeneration)return inactive('viewport-generation');
 if(!finite(frame.eEffectNow)||!finite(source.startedAt)||!finite(source.duration)||source.duration<1200)return inactive('E-clock');
 const age=(frame.eEffectNow-source.startedAt)/1000,duration=source.duration/1000;
 if(age<0||age>=duration)return inactive('outside-source-lifetime');
 const body=Boolean(action?.kind==='slash'&&action.motionId==='alchemy-excalibur'&&action.sourceEffectId===source.id&&
  finite(action.progress)&&action.progress>=0&&action.progress<1&&descriptor?.sourceEffectId===String(source.id)&&
  descriptor.ownerId===String(source.playerId)&&descriptor.roomId===source.roomId&&descriptor.generation===v.generation&&
  typeof frame.poseWillSubmit==='function'&&frame.poseWillSubmit(descriptor)===true);
 const releaseValid=Boolean(release&&release.sourceEffectId===source.id&&release.ownerId===source.playerId&&release.roomId===source.roomId&&
  release.localGeneration===source.localGeneration&&point(release.rootWorld)&&point(release.tipWorld)&&point(release.pathEndWorld)&&
  finite(release.eAgeSeconds)&&release.eAgeSeconds>=0&&release.eAgeSeconds<=age&&release.eAgeSeconds<duration&&
  ((typeof frame.acceptedRelease==='function'&&frame.acceptedRelease(release)===true)||
   (body&&typeof frame.releaseEncodedWithPose==='function'&&frame.releaseEncodedWithPose(release,descriptor)===true)));
 if(!body&&!releaseValid)return inactive('no-registered-material-or-emitted-world');
 const project=p=>apply(v.logicalToPixel,apply(v.worldToLogical,p));
 let inv=[1,0,0,1,0,0],root={x:0,y:0},tip={x:1,y:0},sourceRoot=[0,0],sourceTip=[1,0],atlasSize=[1,1],halfWidth=1;
 if(body){
  const cmd=descriptor.spriteCommand,s=cmd?.sprite,crop=s?.crop,scale=cmd?.excaliburPoseScale,origin=cmd?.excaliburPoseOrigin;
  const widths=SOURCE_HALF_WIDTHS[cmd?.identity],support=SOURCE_SUPPORT[cmd?.identity];
  if(!affine(s?.transform)||!Array.isArray(crop)||crop.length!==4||!crop.every(finite)||
     !finite(scale)||scale<=0||!point(origin)||!widths||!Number.isInteger(descriptor.poseIndex)||descriptor.poseIndex<0||descriptor.poseIndex>2||
     !Array.isArray(s.sourceSize)||s.sourceSize.length!==2||!s.sourceSize.every(n=>finite(n)&&n>0)||
     !support||!crop.every((n,i)=>n===support.crops[descriptor.poseIndex][i])||!s.sourceSize.every((n,i)=>n===support.size[i]))return inactive('unregistered-pose');
  u.set(crop,48);if(descriptor.poseIndex===1)u.set(support.patch,52);
  const sourceToPixel=mul(v.logicalToPixel,mul(s.transform,[scale,0,0,scale,-(crop[0]+origin.x)*scale,-(crop[1]+origin.y)*scale]));
  if(!affine(sourceToPixel))return inactive('source-affine');inv=inverse(sourceToPixel);
  root=descriptor.root?.pixel;tip=descriptor.tip?.pixel;sourceRoot=descriptor.root?.source;sourceTip=descriptor.tip?.source;atlasSize=s.sourceSize;halfWidth=widths[descriptor.poseIndex];
  if(!Array.isArray(sourceRoot)||!Array.isArray(sourceTip)||sourceRoot.length!==2||sourceTip.length!==2||![...sourceRoot,...sourceTip].every(finite))return inactive('source-landmark');
  if(!point(root)||!point(tip)||Math.hypot(tip.x-root.x,tip.y-root.y)<.01)return inactive('blade-support');
 }
 let releasedRoot={x:0,y:0},releasedTip={x:1,y:0},releaseEnd={x:1,y:0},releaseOrigin={x:0,y:0};
 if(releaseValid){releasedRoot=project(release.rootWorld);releasedTip=project(release.tipWorld);releaseEnd=project(release.pathEndWorld);
  releaseOrigin={x:(releasedRoot.x+releasedTip.x)/2,y:(releasedRoot.y+releasedTip.y)/2};
  if(Math.hypot(releaseEnd.x-releaseOrigin.x,releaseEnd.y-releaseOrigin.y)<.01||Math.hypot(releasedTip.x-releasedRoot.x,releasedTip.y-releasedRoot.y)<.01)return inactive('release-path-or-support');}
 u.set([v.pixelWidth,v.pixelHeight,age,duration],0);u.set([root.x,root.y,tip.x,tip.y],4);
 u.set([body?action.progress:1,Number(body),Number(frame.sourceOn!==false),Number(frame.observerOn!==false)],8);
 u.set(inv.slice(0,4),12);u.set([inv[4],inv[5],...atlasSize],16);u.set([...sourceRoot,...sourceTip],20);
 u.set([halfWidth,v.dpr,releaseValid?release.eAgeSeconds:age,Number(releaseValid)],24);
 u.set([releaseOrigin.x,releaseOrigin.y,releaseEnd.x,releaseEnd.y],28);u.set([releasedRoot.x,releasedRoot.y,releasedTip.x,releasedTip.y],32);
 u.set([releaseValid?release.eAgeSeconds:age,duration,1,1],36);
 u.set([v.pixelWidth/2,v.pixelHeight/2,2.2*v.dpr,.055],40);
 u.set([Number(frame.mainOn!==false),Number(frame.held===true),Number(frame.reducedMotion===true),1],44);
 if(![...u].every(Number.isFinite))return inactive('float32-range');
 return Object.freeze({version:VERSION,active:true,reason:'active',causeId:String(source.id),uniforms:u,bodyLive:body,releaseWorld:releaseValid,
  passes:3,sourceDescriptor:body?descriptor:null,releasePacket:releaseValid?release:null,proofStatus:'encoding plan, not GPU receipt',creativeEdition:EDITION});
}

export function observerSupportBounds({sourceBounds,viewport,observerOn=true}){
 if(!Array.isArray(sourceBounds)||sourceBounds.length!==4||!sourceBounds.every(finite)||!viewport||![viewport.pixelWidth,viewport.pixelHeight,viewport.dpr].every(finite))throw new TypeError('registered source bounds and viewport');
 const [x0,y0,x1,y1]=sourceBounds,cx=viewport.pixelWidth/2,cy=viewport.pixelHeight/2,margin=8*viewport.dpr;
 const xs=[x0,x1],ys=[y0,y1];if(observerOn){xs.push(cx-.38*(x0-cx),cx-.38*(x1-cx));ys.push(cy-.38*(y0-cy),cy-.38*(y1-cy));}
 const clamp=(x,max)=>Math.max(0,Math.min(max,x));
 return Object.freeze([clamp(Math.min(...xs)-margin,viewport.pixelWidth),clamp(Math.min(...ys)-margin,viewport.pixelHeight),clamp(Math.max(...xs)+margin,viewport.pixelWidth),clamp(Math.max(...ys)+margin,viewport.pixelHeight)]);
}
