import {HeadshotContactSystem,RateClock} from '../../src/index.mjs';
import {FixtureHost} from '../../preview/fixture.mjs';
export function rig({verify=null,sound:customSound=null,reducedMotion=false}={}){
  let now=1000;const clock=new RateClock({sourceNow:()=>now}),host=new FixtureHost(clock),played=[],stopped=[];
  const sound=customSound??{play:p=>played.push(p),stop:(id,reason)=>stopped.push({id,reason}),setRate(){},resetSession(){}};
  const system=new HeadshotContactSystem({clock,verifyCanonical:verify??host.verifyCanonical,getPermission:host.getPermission,sound,roomId:host.roomId,epoch:host.epoch,reducedMotion});
  return {clock,host,system,played,stopped,set(t){now=t;},advance(dt){now+=dt;},packet(variant,overrides){return host.issue(variant,overrides);}};
}
export function audioContext(){
  const created=[];
  const param=value=>({value,events:[],setValueAtTime(v,t){this.value=v;this.events.push([v,t]);}});
  const node=type=>{const o={type,disconnected:false,connect(){},disconnect(){this.disconnected=true;}};created.push(o);return o;};
  return {sampleRate:48000,state:'running',currentTime:10,destination:{},created,
    createGain(){return Object.assign(node('gain'),{gain:param(1)});},
    createStereoPanner(){return Object.assign(node('pan'),{pan:param(0)});},
    createBuffer(c,n,s){return {length:n,sampleRate:s,copyToChannel(x){this.samples=x;}};},
    createBufferSource(){return Object.assign(node('source'),{playbackRate:param(1),starts:[],stops:0,start(...a){this.starts.push(a);},stop(){this.stops++;}});},
    async resume(){this.state='running';},async close(){this.state='closed';}};
}
