import{PROFILES,planWeaponSelectionR5}from'./creative-model.mjs';
export function claimSelectionConfirmation({receipt,encodedPlan,frame,playedIds,settings={}}){
 if(!(playedIds instanceof Set)||playedIds.has(receipt?.id)||frame?.held||frame?.verify||frame?.muted||frame?.audioRunning!==true||
  typeof frame.acceptedCueFrame!=='function'||frame.acceptedCueFrame(encodedPlan)!==true||encodedPlan?.causeId!==receipt?.id)return null;
 // Revalidate after actual queue/scopes; a superseded A cannot sound when
 // its old async GPU callback completes after selection B or a reset.
 const current=planWeaponSelectionR5({receipt,frame,settings});if(!current.active||current.uniforms[8]<.5||current.uniforms[9]<.5)return null;
 const seat=current.profile.seat;if(current.ageSeconds<seat||encodedPlan.active!==true||
  encodedPlan.ageSeconds<seat||encodedPlan.ageSeconds>=seat+.12||encodedPlan.uniforms[8]<.5||encodedPlan.uniforms[9]<.5)return null;
 playedIds.add(receipt.id);
 return Object.freeze({receiptId:receipt.id,variant:current.uniforms[6],triggerESeconds:seat,observedESeconds:current.ageSeconds,sourceOrigin:'local-selection'});
}
export function makeSelectionConfirmationPCM({variant=0,sampleRate=48000,seed=0x615055,sourceOn=true}={}){
 if(!Number.isInteger(variant)||variant<0||variant>5||!Number.isInteger(sampleRate)||sampleRate<8000||sampleRate>192000||!Number.isInteger(seed)||seed<0||seed>0xffffffff)throw new RangeError('kind/sample rate/seed');
 const duration=.18,pcm=new Float32Array(Math.ceil(sampleRate*duration));if(!sourceOn)return{pcm,sampleRate,duration,variant,triggerESeconds:PROFILES[variant].seat};
 const scales=[1.10,.68,.83,1.25,.92,.78],scale=scales[variant];const modes=[{hz:820,tau:.020,gain:.042},{hz:2140,tau:.036,gain:.023},{hz:3270,tau:.022,gain:.011}].filter(m=>m.hz*scale<sampleRate*.42);
 let rng=(seed>>>0)||1,low=0;const lp=1-Math.exp(-2*Math.PI*1500/sampleRate);const rand=()=>{rng^=rng<<13;rng^=rng>>>17;rng^=rng<<5;return(rng>>>0)/4294967296-.5;};
 for(let i=1;i<pcm.length-1;i++){
  const t=i/sampleRate,contact=t;low+=lp*(rand()-low);
  const early=Math.exp(-(((t-.012)/.005)**2))*low*.085;
  let resonance=0;if(contact>=0)for(const m of modes)resonance+=Math.sin(2*Math.PI*m.hz*scale*contact)*Math.exp(-contact/m.tau)*m.gain*(1-Math.exp(-contact/.0007));
  // Synthetic short tactile UI-state confirmation, not an invented weapon
  // reload, firing/coil-charge or sword draw. No electronic pitch sweep.
  pcm[i]=(early+resonance)*Math.min(1,t/.002)*Math.min(1,(duration-t)/.010);
 }
 // Trigger this one-shot at the actual E-clock seat crossing, after that
 // frame's proof. Its short acoustic decay is wall time, not a duplicated
 // guessed audio delay that would drift when the E clock accelerates.
 return{pcm,sampleRate,duration,variant,triggerESeconds:PROFILES[variant].seat};
}
