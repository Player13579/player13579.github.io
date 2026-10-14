export const VERSION='gunner-shooting-nonhandgun-sol61-r4';
export const VARIANTS=Object.freeze({
 smg:Object.freeze({index:0,cadenceMs:100,flashMs:58,gasMs:280,ejectMs:16,lifeMs:560,length:22,width:8,kick:2.4,sfxGain:.62}),
 assault:Object.freeze({index:1,cadenceMs:240,flashMs:88,gasMs:380,ejectMs:24,lifeMs:640,length:32,width:11,kick:3.8,sfxGain:.72}),
 sniper:Object.freeze({index:2,cadenceMs:1100,flashMs:114,gasMs:510,ejectMs:80,lifeMs:780,length:46,width:14,kick:5.2,sfxGain:.9})
});
export function createShotSource(event,registration){
 if(event?.type!=='action-shoot'||typeof event.id!=='string'||!event.id)throw Error('authoritative action-shoot id required');
 const variant=event.variant;if(!VARIANTS[variant])throw Error('unsupported firearm variant: '+variant);
 for(const key of ['muzzleScreen','targetScreen'])if(!Array.isArray(registration?.[key])||registration[key].length!==2||!registration[key].every(Number.isFinite))throw Error('finite registered '+key+' required');
 if(!Number.isFinite(registration.startedAt))throw Error('fixed monotonic startedAt required');
 const [mx,my]=registration.muzzleScreen,[tx,ty]=registration.targetScreen,dx=tx-mx,dy=ty-my,length=Math.hypot(dx,dy);
 if(length<.001)throw Error('nonzero source direction required');
 const scale=registration.scale??1;if(!Number.isFinite(scale)||scale<=0)throw Error('positive scale required');
 return Object.freeze({causeID:event.id,variant,startedAt:registration.startedAt,muzzle:Object.freeze([mx,my]),direction:Object.freeze([dx/length,dy/length]),target:Object.freeze([tx,ty]),scale,registrationID:registration.registrationID??'derived-muzzle',...VARIANTS[variant]});
}
export function shotState(source,now){
 const ageMs=now-source.startedAt,age=Math.max(0,ageMs),live=ageMs>=0&&ageMs<source.lifeMs;
 const clamp=x=>Math.min(1,Math.max(0,x)),smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t)};const rear=source.variant==='smg'?20:source.variant==='assault'?30:86,seat=source.variant==='smg'?65:source.variant==='assault'?110:175;const flashExact=live?(1-Math.exp(-age/3))*Math.exp(-age/(source.flashMs*.34))*(1-smooth(source.flashMs*.75,source.flashMs,age))*1.8:0;const breechExact=live?4*(age<rear?smooth(0,rear,age):1-smooth(rear,seat,age)):0;
 return {causeID:source.causeID,variant:source.variant,origin:source.startedAt,ageMs,live,sourcePhase:ageMs<0?'pending':ageMs>=source.lifeMs?'retired':age<source.flashMs?'pressure-flash':age<source.gasMs?'gas-expansion':'brass-retirement',flash:flashExact,gas:live&&age<source.gasMs?Math.sin(Math.PI*age/source.gasMs)**.7:0,ejected:live&&age>=source.ejectMs,breech:breechExact,recoil:live?source.kick*Math.sin(Math.min(1,age/35)*Math.PI/2)*Math.exp(-age/85):0};
}
