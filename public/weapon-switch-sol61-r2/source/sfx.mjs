// GPT-6.1-Sol original authored receipt cue. Host owns unlock/dedupe/verify.
export function playWeaponSwitchCue(context, destination, {verify=false, muted=false, age=0}={}) {
  if(verify || muted || age>.06 || context.state!=='running') return null;
  const start=context.currentTime+.004, nodes=[];
  function tone(offset,duration,f0,f1,level,type) {
    const osc=context.createOscillator(), gain=context.createGain();
    osc.type=type;osc.frequency.setValueAtTime(f0,start+offset);
    osc.frequency.exponentialRampToValueAtTime(f1,start+offset+duration);
    gain.gain.setValueAtTime(0,start+offset);
    gain.gain.linearRampToValueAtTime(level,start+offset+.005);
    gain.gain.exponentialRampToValueAtTime(.0001,start+offset+duration);
    osc.connect(gain);gain.connect(destination);osc.start(start+offset);osc.stop(start+offset+duration+.01);
    osc.onended=()=>{osc.disconnect();gain.disconnect();};nodes.push({osc,gain});
  }
  // Interface unlatch: short downward body; assembly: two interlocked, nonperiodic resonances.
  tone(0,.095,420,190,.034,'triangle');
  tone(.12,.19,660,990,.027,'sine');
  tone(.145,.16,890,1320,.015,'triangle');
  // Confirmed seating coincides with geometry lock, not a gunshot or generic beep.
  tone(.35,.12,1850,1180,.026,'sine');
  tone(.353,.085,235,170,.023,'triangle');
  return {endTime:start+.48,cancel(){const now=context.currentTime;for(const {osc,gain} of nodes){
    gain.gain.cancelScheduledValues(now);gain.gain.setTargetAtTime(.0001,now,.008);
    try{osc.stop(now+.04);}catch{} }}};
}
