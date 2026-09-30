// 食堂の実画素へ登録した環境E。ゲームの電源/温度/操作状態を捏造しない展示episode。
export const ROOM = Object.freeze({width:1305,height:1206,worldWidth:930,worldHeight:860,episodeMs:12000,bitmap:'inputs/public-cafeteria-attempt04.png',bitmapHash:'c1c1ea6ecb84b643b721760cece01914560093b1e67d5f222e720082af776a65'});
export const LAMPS = Object.freeze([
 {source:[263,38],half:[12,2],floor:[263,143],axis:[0,1]},
 {source:[430,38],half:[12,2],floor:null,axis:[0,1]},
 {source:[619,38],half:[12,2],floor:[619,151],axis:[0,1]},
 {source:[1251,475],half:[2,12],floor:[1177,490],axis:[-1,0]},
 {source:[51,283],half:[2,12],floor:[124,294],axis:[1,0]},
 {source:[394,1139],half:[12,2],floor:[400,1060],axis:[0,-1]},
 {source:[1019,1139],half:[12,2],floor:[1019,1060],axis:[0,-1]}
]);
export const STEAM = Object.freeze({sources:[[329,321],[406,321]],birthsMs:[500,2300,4100,5900,7700,9280],lifeMs:2400,risePx:68,driftPx:9});
export const PURGE = Object.freeze({source:[920,323],receiver:[920,343],startsMs:[2800,7200],flowMs:1400,tailMs:260,crossDeg:-12});
export const smooth=(a,b,x)=>{const u=Math.max(0,Math.min(1,(x-a)/(b-a)));return u*u*(3-2*u);};
export function stateAt(ageMs,{active=true,reducedMotion=false}={}) {
 const valid=active&&Number.isFinite(ageMs)&&ageMs>=0&&ageMs<ROOM.episodeMs;
 if(!valid)return {ageMs,active:false,lamp:0,plumes:[],purges:[],reducedMotion};
 const lamp=smooth(0,160,ageMs)*(1-smooth(11500,12000,ageMs));
 const plumes=[];
 for(let sourceIndex=0;sourceIndex<2;sourceIndex++)for(let j=0;j<STEAM.birthsMs.length;j++){
  const localMs=ageMs-STEAM.birthsMs[j]-sourceIndex*220;
  if(localMs>=0&&localMs<STEAM.lifeMs){const p=localMs/STEAM.lifeMs;plumes.push({sourceIndex,cycle:j,p,strength:smooth(0,.12,p)*(1-smooth(.70,1,p)),rise:STEAM.risePx*p,drift:reducedMotion?0:STEAM.driftPx*Math.sin(p*2.4+sourceIndex*.7)*p});}
 }
 const purges=[];
 for(let j=0;j<PURGE.startsMs.length;j++){
  const localMs=ageMs-PURGE.startsMs[j];
  if(localMs>=0&&localMs<PURGE.flowMs+PURGE.tailMs){purges.push({cycle:j,localMs,flow:smooth(0,60,localMs)*(1-smooth(1320,1400,localMs)),reach:Math.min(1,localMs/60),tail:localMs>=1400?1-(localMs-1400)/260:0});}
 }
 return {ageMs,active:true,lamp,plumes,purges,reducedMotion};
}
export function fitRoom(width,height) {
 if(!(Number.isFinite(width)&&width>0&&Number.isFinite(height)&&height>0))throw new Error('invalid viewport');
 const scale=Math.min(width/ROOM.width,height/ROOM.height);
 return {scale,offset:[(width-ROOM.width*scale)/2,(height-ROOM.height*scale)/2],extent:[ROOM.width*scale,ROOM.height*scale]};
}
export function validRoomEvent(input) {
 // 後続ゲーム接続は正規source/cause/outcomeを要求する。展示eventと実操作を区別する。
 return !!(input&&input.type==='room-environment-episode'&&input.roomId==='cafeteria-room-attempt-04'&&typeof input.causeId==='string'&&input.causeId.length&&Number.isFinite(input.startMs)&&input.active===true);
}
export function uniformsAt(width,height,ageMs,flags={}) {
 const v=new Float32Array(24),fit=fitRoom(width,height);
 v.set([width,height,ageMs,flags.reducedMotion?1:0]);
 v.set([fit.offset[0],fit.offset[1],fit.scale,flags.active===false?0:1],4);
 v.set([flags.lighting===false?0:1,flags.steam===false?0:1,flags.purge===false?0:1,flags.reflections===false?0:1],8);
 v.set([flags.obs===false?0:1,flags.cross===false?0:1,flags.bitmapOnly?1:0,Number.isFinite(flags.dpr)&&flags.dpr>0?flags.dpr:1],12);
 v.set([0,0,0,0],16); // draw kind, object index, cycle index, reserved
 v.set([0,0,ROOM.width,ROOM.height],20); // original-pixel support rectangle
 return v;
}
