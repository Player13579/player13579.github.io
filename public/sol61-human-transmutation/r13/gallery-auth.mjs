// Version-, token-, origin-, source-, and epoch-bound gallery startup/retirement authorization.
const TOKEN=/^[0-9a-f]{32}$/;
export function isParentStartup({isEmbedded,token,requestedVersion,versionId,epoch}){
  return isEmbedded===true&&TOKEN.test(token||'')&&requestedVersion===versionId&&Number.isSafeInteger(epoch)&&epoch>0;
}
export function acceptsRetire({parentStartup,eventOrigin,ownOrigin,eventSource,parentWindow,data,token,versionId,epoch}){
  return parentStartup===true&&eventOrigin===ownOrigin&&eventSource===parentWindow&&
    data?.schema==='dva-gallery-startup/v1'&&data.action==='retire'&&data.token===token&&
    data.versionId===versionId&&data.attemptEpoch===epoch;
}
