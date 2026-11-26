import {VERSION} from './gates.mjs';
export const SCHEMA='dva-gallery-startup/v1';
export function boundSearch(search) {
 const q=new URLSearchParams(search), fields=['galleryStartupToken','galleryVersionId','galleryAttemptEpoch'];
 if(fields.some(f=>q.getAll(f).length!==1)) throw Error('R3 startup binding must be explicit');
 const [token,versionId,raw]=fields.map(f=>q.get(f)), attemptEpoch=Number(raw);
 if(versionId!==VERSION||!/^[0-9a-f]{32}$/.test(token)||!/^\d+$/.test(raw)||!Number.isSafeInteger(attemptEpoch)||attemptEpoch<1) throw Error('Invalid R3 binding');
 return Object.freeze({token,versionId,attemptEpoch});
}
export function envelope({binding,session,origin,source,send}) {
 let seq=0;
 return Object.freeze({
  emit(data){send({...data,schema:SCHEMA,...binding,adapterSessionId:session,sequence:++seq},origin);},
  accepts(e){const d=e.data;return e.origin===origin&&e.source===source&&d?.schema===SCHEMA&&d.action==='retire'&&d.token===binding.token&&d.versionId===binding.versionId&&d.attemptEpoch===binding.attemptEpoch;},
 });
}
