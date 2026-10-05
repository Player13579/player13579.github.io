export const VERSION_ID='excalibur-zero-swing-sol61-r3';
export const GROUP_ID='alchemy-excalibur-sol61';
export function buildParentFirstFrameProof({result,plan,capturedCauseId,currentCauseId,capturedAgeMs,deviceGeneration,currentDeviceGeneration,targetGeneration,currentTargetGeneration,capturedViewport,currentViewport,canvas,queueCompleted}){
 if(!result||result.submitted!==true||!queueCompleted||!canvas?.isConnected)return null;
 if(result.adapterResult?.passes!==2||!plan?.active||plan.emitting!==true)return null;
 if(typeof capturedCauseId!=='string'||!capturedCauseId||capturedCauseId!==currentCauseId||plan.causeId!==capturedCauseId)return null;
 if(!Number.isFinite(capturedAgeMs)||capturedAgeMs<0||capturedAgeMs>=650||plan.ageMs!==capturedAgeMs)return null;
 if(!Number.isSafeInteger(deviceGeneration)||deviceGeneration!==currentDeviceGeneration||!Number.isSafeInteger(targetGeneration)||targetGeneration!==currentTargetGeneration)return null;
 if(!capturedViewport||!currentViewport||capturedViewport.width!==currentViewport.width||capturedViewport.height!==currentViewport.height||capturedViewport.width!==canvas.width||capturedViewport.height!==canvas.height||canvas.width<=0||canvas.height<=0)return null;
 return Object.freeze({recorded:true,submitted:true,completed:true,canvasConnected:true,passes:2,viewportWidth:canvas.width,viewportHeight:canvas.height,causeId:capturedCauseId,ageMs:capturedAgeMs,deviceGeneration,targetGeneration,passOrder:Object.freeze(['world-source-mrt','source-bound-observer-presentation']),finiteEmissionReadback:'not_exposed'});
}
export async function activateSfxFromGesture({item,verify,audioAllowed,currentPlan,currentCauseId,audioContextAvailable,sfx}){
 if(verify)return {state:'silent',reason:'verification mode is hard-muted'};
 if(item?.id!==VERSION_ID)return {state:'stale',reason:'selected gallery version changed'};
 if(!audioAllowed)return {state:'silent',reason:'edition audio control is off'};
 if(!currentCauseId||currentPlan?.causeId!==currentCauseId||!currentPlan?.active||!currentPlan?.emitting||!Number.isFinite(currentPlan.ageMs)||currentPlan.ageMs<0||currentPlan.ageMs>=650)return {state:'unavailable',reason:'no current active Excalibur cause'};
 if(!audioContextAvailable||typeof sfx?.enableFromGesture!=='function')return {state:'unsupported',reason:'AudioContext or authored SFX activation is unavailable'};
 try{const result=await sfx.enableFromGesture();return result===true?{state:'active',reason:'authored Excalibur SFX unlocked for the current cause; no past cue is replayed'}:{state:'unsupported',reason:'authored SFX did not confirm audio activation'};}catch(error){return {state:'unsupported',reason:String(error?.message||error)};}
}
