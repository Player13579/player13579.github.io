export const VERSION_ID='excalibur-zero-swing-sol61-r6';
export const GROUP_ID='alchemy-excalibur-sol61';
export function buildParentFirstFrameProof({result,plan,capturedCauseId,currentCauseId,capturedAgeMs,deviceGeneration,currentDeviceGeneration,targetGeneration,currentTargetGeneration,capturedViewport,currentViewport,canvas,queueCompleted}){
 if(!result||result.submitted!==true||!queueCompleted||!canvas?.isConnected)return null;
 if(result.adapterResult?.passes!==3||!plan?.active||plan.emitting!==true)return null;
 if(typeof capturedCauseId!=='string'||!capturedCauseId||capturedCauseId!==currentCauseId||plan.causeId!==capturedCauseId)return null;
 if(!Number.isFinite(capturedAgeMs)||capturedAgeMs<0||capturedAgeMs>=650||plan.ageMs!==capturedAgeMs)return null;
 if(!Number.isSafeInteger(deviceGeneration)||deviceGeneration!==currentDeviceGeneration||!Number.isSafeInteger(targetGeneration)||targetGeneration!==currentTargetGeneration)return null;
 if(!capturedViewport||!currentViewport||capturedViewport.width!==currentViewport.width||capturedViewport.height!==currentViewport.height||capturedViewport.width!==canvas.width||capturedViewport.height!==canvas.height||canvas.width<=0||canvas.height<=0)return null;
 return Object.freeze({recorded:true,submitted:true,completed:true,canvasConnected:true,passes:3,viewportWidth:canvas.width,viewportHeight:canvas.height,causeId:capturedCauseId,ageMs:capturedAgeMs,deviceGeneration,targetGeneration,passOrder:Object.freeze(['world-source-mrt','optical-source-probe','source-bound-observer-presentation']),finiteEmissionReadback:'not_exposed'});
}
export async function activateSfxFromGesture({item,verify,audioAllowed,audioContextAvailable,sfx,isCurrent=()=>true}){
 if(verify)return {state:'silent',reason:'verification mode is hard-muted'};
 if(item?.id!==VERSION_ID)return {state:'stale',reason:'selected gallery version changed'};
 if(!audioAllowed)return {state:'silent',reason:'edition audio control is off'};
 if(!audioContextAvailable||typeof sfx?.enableFromGesture!=='function')return {state:'unsupported',reason:'AudioContext or authored SFX activation is unavailable'};
 try{const pending=sfx.enableFromGesture({isCurrent:()=>isCurrent()&&item?.id===VERSION_ID&&audioAllowed});const result=await pending;if(!isCurrent()||item?.id!==VERSION_ID)return {state:'stale',reason:'child lease or selected version changed during activation'};return result===true?{state:'active',reason:'authored Excalibur audio context unlocked; playback still requires a new eligible live cue'}:{state:'unsupported',reason:'authored SFX did not confirm audio activation'};}catch(error){return {state:'unsupported',reason:String(error?.message||error)};}
}
