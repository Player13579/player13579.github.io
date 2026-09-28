import {ManaEffectEngine} from '../src/engine.mjs';
export function setup({muted=false,verify=false,running=true}={}) {
 let now=1000;
 const context={roomId:'room',sessionId:'session'};
 const actor={playerId:'p1',...context,worldX:100,worldY:200,alive:true,present:true,vented:false,invisible:false,opacity:1,onScreen:true,renderVisible:true,motion:{moving:false,acc2State:'off',acc2Effective:false}};
 const calls=[];const audio={running,playOnce:(key,o)=>{calls.push({kind:'play',key,...o});return true;},stop:key=>calls.push({kind:'stop',key}),stopAll:()=>calls.push({kind:'stopAll'}),setRate:(key,rate)=>calls.push({kind:'rate',key,rate})};
 const engine=new ManaEffectEngine({context,resolveActor:id=>id===actor.playerId?actor:null,audio,now:()=>now,environment:{visible:true,muted,verify}});
 const event=(patch={})=>({id:'e1',playerId:'p1',...context,type:'gain-mana',effectKind:'mana',gainClass:'discrete',committed:true,source:'map-object',variant:'normal',manaBefore:4,manaAfter:8,committedAtMs:900,expiresAtMs:6000,...patch});
 const receipt=(tokens,patch={})=>({kind:'webgpu-visible-frame',gpuSucceeded:true,canvasVisible:true,frameId:1,epoch:engine.epoch,visibleTokens:tokens,...patch});
 return {engine,actor,context,audio,calls,event,receipt,setNow:v=>now=v,getNow:()=>now};
}
