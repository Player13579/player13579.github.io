import {ROOM,LAMPS,STEAM,stateAt} from './scene.mjs';
import {supportRects,rect} from './projection.mjs';
export function drawPlan(ageMs,flags={}){
 const state=stateAt(ageMs,flags),draws=[{kind:0,index:0,cycle:0,bounds:[0,0,ROOM.width,ROOM.height]}];
 if(!state.active||flags.bitmapOnly)return draws;
 if(flags.lighting!==false)for(let i=0;i<LAMPS.length;i++){
  draws.push({kind:1,index:i,cycle:0,bounds:rect(LAMPS[i].source,LAMPS[i].half)});
  if(LAMPS[i].floor&&flags.reflections!==false){const h=LAMPS[i].axis[0]?[76,42]:[42,76];draws.push({kind:2,index:i,cycle:0,bounds:rect(LAMPS[i].floor,h)});}
 }
 if(flags.steam!==false)for(const p of state.plumes){const s=STEAM.sources[p.sourceIndex];draws.push({kind:3,index:p.sourceIndex,cycle:p.cycle,bounds:[s[0]-26,s[1]-84,s[0]+31,s[1]+16]});}
 if(flags.purge!==false)for(const p of state.purges)draws.push({kind:4,index:0,cycle:p.cycle,bounds:supportRects().find(v=>v.id==='purge').bounds});
 return draws;
}
