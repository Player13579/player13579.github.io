import {parseReviewAge} from './preview-playback.mjs';
export const PHASE_FIXTURES=Object.freeze([
 {ageMs:null,label:'Continuous · normal rate'}, {ageMs:0,label:'0 · original source'},
 {ageMs:70,label:'70 · upper release'}, {ageMs:130,label:'130 · source front'},
 {ageMs:200,label:'200 · paired packets'}, {ageMs:250,label:'250 · source fade'},
 {ageMs:320,label:'320 · arrival lower front'}, {ageMs:420,label:'420 · arrival upper front'},
 {ageMs:500,label:'500 · final row closure'}, {ageMs:550,label:'550 · restored body'},
 {ageMs:639,label:'639 · final owning frame'}].map(Object.freeze));
export function readReviewSettings(search){
 const params=new URLSearchParams(search),ageMs=parseReviewAge(search),result={ageMs};
 for(const key of ['source','nearby','obs']){const values=params.getAll(key);if(values.length>1||values.length===1&&!['on','off'].includes(values[0]))throw RangeError(`single ${key}=on/off required`);result[key]=values[0]!=='off';}
 const endpoints=params.getAll('endpoint');if(endpoints.length>1||endpoints.length===1&&!['pair','arrival','departure'].includes(endpoints[0]))throw RangeError('single recognized endpoint required');
 result.endpoint=endpoints[0]||'pair';return Object.freeze(result);
}
export function reviewQuery(search,changes){
 const before=readReviewSettings(search),next={...before,...changes};
 if(next.ageMs!==null&&(!Number.isFinite(next.ageMs)||next.ageMs<0||next.ageMs>=640))throw RangeError('held age must be finite in [0,640)');
 const params=new URLSearchParams(search);
 if(next.ageMs===null)params.delete('reviewAgeEms');else params.set('reviewAgeEms',String(next.ageMs));
 for(const key of ['source','nearby','obs']){if(typeof next[key]!=='boolean')throw TypeError('boolean source controls required');params.set(key,next[key]?'on':'off');}
 params.set('endpoint',next.endpoint);readReviewSettings(params.toString());return '?'+params.toString();
}
