/**
 * Digital E / visual field state only, never the server's inventory or hit logic.
 * Discrete ownership/cause/phase/pair data is NOT decoded or rewritten here.
 * Continuous fractions describe transitions between designed field structures.
 */
import {clamp,smooth} from './contract.js';
export function informationState(s){
 const t=s.seconds,release=s.terminalQ;
 const base={model:'declared_game_information_field',authorityActive:s.authorityActive,
  topologyIsNotHitbox:true,projectionOnly:true};
 switch(s.kind){
 case 'charge': return {...base,operation:'capture_and_latch',ready:t>=1.2&&!s.terminal,
  capture:smooth(0,.22,t),compression:smooth(.10,1,t),latch:smooth(.70,1.05,t),
  rows:Array.from({length:4},(_,i)=>({capture:smooth(.1+i*.11,.45+i*.11,t),retract:smooth(i*.11,.55+i*.11,release)})),
  heldMeaning:'address lanes committed but not released; readiness is not authority resolution'};
 case 'normal': return {...base,operation:'directed_finite_transfer',
  head:clamp(t/.18),tail:Math.max(clamp((t-.115)/.18),clamp(t/.18)*smooth(0,1,release)),sourceReadout:smooth(0,.035,t)*(1-smooth(.14,.32,t)),
  receiverCommit:smooth(.145,.20,t)*(1-smooth(.34,.51,t)),
  heldMeaning:'finite packet occupancy leaves source; target commit never applies gameplay lock'};
 case 'resonance': return {...base,operation:'coherent_topology_rewrite',
  acquire:smooth(.10,.25,t),coreOpen:smooth(.14,.47,t),coreRetire:clamp(smooth(1.12,1.58,t)+release),
  routes:Array.from({length:6},(_,i)=>({unfold:smooth(.16+(i%3)*.028,.53+(i%3)*.028,t),retire:clamp(smooth(.91+i*.065,1.30+i*.043,t)+release)})),
  heldMeaning:'same-phase result creates one shared six-route junction, not two EMP copies'};
 case 'cancellation': return {...base,operation:'complementary_pair_erasure',
  acquire:smooth(.045,.16,t),nullFrontY:51-92*smooth(.83,1.50,t),
  rows:Array.from({length:7},(_,i)=>({interleave:smooth(.16,.60,t-i*.018),consumed:clamp(smooth(.70+i*.075,.94+i*.075,t)+release)})),
  heldMeaning:'opposed channels terminate at the null boundary; no outgoing damage pulse is inferred'};
 case 'suppression': return {...base,operation:'write_gate_interlock',
  latch:smooth(0,.24,t),writeGateClosed:s.authorityActive,
  rows:Array.from({length:4},(_,i)=>({unlatch:smooth(i*.14,i*.14+.50,release)})),
  heldMeaning:'target-attached write-inhibit structure is held until the supplied deadline/resolve; extension has no new attack'};
 default: throw new TypeError('No information-field model for branch');
 }
}
