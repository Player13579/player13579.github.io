export function normalizeGallerySelection(options={}) {
  return Object.freeze({...options,edition:'r10'});
}

export function resolveGalleryMode(search='') {
  const query=new URLSearchParams(search);
  const verify=query.has('verify');
  return Object.freeze({mode:verify?'verify':'normal',shouldBoot:true,verify,audioHardMuted:verify,audioConnected:false});
}

export function acceptsGalleryRetire(event,{parentWindow,expectedOrigin,token,versionId,attemptEpoch}={}) {
  const data=event?.data;
  return Number.isSafeInteger(attemptEpoch)&&Boolean(token)&&Boolean(versionId)&&
    event?.source===parentWindow&&event?.origin===expectedOrigin&&
    data?.schema==='dva-gallery-startup/v1'&&data?.action==='retire'&&
    data?.token===token&&data?.versionId===versionId&&data?.attemptEpoch===attemptEpoch;
}
