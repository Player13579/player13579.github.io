import {ManaRuntime} from '../src/runtime.mjs';
export function fixture({muted=false,verify=false,audioRunning=true}={}){
  let now=1000;const context={roomId:'room',sessionId:'session'};
  const actor={playerId:'p1',...context,worldX:0,worldY:0,alive:true,present:true,vented:false,invisible:false,opacity:1,onScreen:true,renderVisible:true,motion:{moving:false,acc2State:'off',acc2Effective:false}};
  const calls=[],audio={running:audioRunning,playOnce:(key,o)=>{calls.push({kind:'play',key,...o});return true;},stop:key=>calls.push({kind:'stop',key}),stopAll:()=>calls.push({kind:'stopAll'}),setRate:(key,rate,at)=>calls.push({kind:'rate',key,rate,at}),resetSession:()=>calls.push({kind:'resetSession'})};
  const runtime=new ManaRuntime({context,resolveRecipient:id=>id===actor.playerId?actor:null,audio,now:()=>now,onInvalidate:reason=>calls.push({kind:'invalidate',reason})});runtime.setEnvironment({muted,verify});
  const event=(extra={})=>({id:'e1',playerId:'p1',...context,type:'gain-mana',effectKind:'mana',gainClass:'discrete',committed:true,source:'map-object',variant:'normal',manaBefore:4,manaAfter:8,committedAtMs:900,expiresAtMs:12000,...extra});
  const proof=(frame,extra={})=>({kind:'webgpu-visible-frame',frame,gpuSucceeded:true,canvasVisible:true,verify:false,visibleTokens:frame.items.map(i=>i.token),...extra});
  const begin=()=>{const a=runtime.admit(event());const f=runtime.prepare();runtime.commit(proof(f));return a;};
  return {runtime,actor,context,calls,audio,event,proof,begin,time:v=>now=v,now:()=>now};
}
