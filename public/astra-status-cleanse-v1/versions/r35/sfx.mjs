// Astra r35: bright incoming breath, distributed harmonic response and finite settle.
export function synthesize(sampleRate=48000,durationMs=1740){
 if(!Number.isInteger(sampleRate)||sampleRate<8000||sampleRate>192000||!Number.isFinite(durationMs)||durationMs<900||durationMs>6000)throw Error('Invalid SFX dimensions');
 const length=Math.ceil(sampleRate*durationMs/1000),channels=[new Float32Array(length),new Float32Array(length)];let peak=0;
 for(let i=0;i<length;i++){
  const t=i/sampleRate,p=t/(durationMs/1000);let value=0;
  // A continuously changing harmonic sweep has no noise bed or repeated pulse train.
  const ingress=Math.sin(Math.PI*Math.min(1,p/.34))**2*(p<.34?1:0);
  const phase=2*Math.PI*(540*t+230*t*t/(durationMs/1000));
  value+=.065*ingress*(Math.sin(phase)+.28*Math.sin(phase*2.01));
  for(const [on,freq,amp] of [[.06,784,.045],[.27,1046.5,.038],[.45,1174.7,.040],[.69,1568,.075]]){
   const q=p-on;if(q<0||q>.23)continue;const seconds=q*durationMs/1000;
   const envelope=(1-Math.exp(-seconds*42))*Math.exp(-q*19)*Math.min(1,(.23-q)/.05);
   value+=amp*envelope*(Math.sin(2*Math.PI*freq*seconds)+.17*Math.sin(2*Math.PI*freq*2.43*seconds));
  }
  const edge=Math.min(1,p/.012,(1-p)/.035);value*=Math.max(0,edge);
  channels[0][i]=value;channels[1][i]=value*.985;peak=Math.max(peak,Math.abs(value));
 }
 return {channels,length,sampleRate,peak};
}
export class CleanseSound{
 constructor({context,sessionId,verify=false}){this.context=context;this.sessionId=sessionId;this.verify=verify;this.seen=new Set();this.nodes=new Set();this.starts=0;}
 start(r){
  if(this.verify||!r?.submitted||!r.visible||r.effectKind!=='statusRecovery'||r.sessionId!==this.sessionId||!r.causeId||!r.ownerId||!Number.isInteger(r.frameToken)||r.frameToken<1||!Number.isFinite(r.elapsedMs)||!Number.isFinite(r.durationMs)||r.durationMs<900||r.durationMs>6000||r.elapsedMs<0||r.elapsedMs>=r.durationMs||(this.context.state!=='running'&&typeof this.context.startRendering!=='function'))return false;
  const key=r.causeId+':'+r.ownerId;if(this.seen.has(key))return false;this.seen.add(key);
  const wave=synthesize(this.context.sampleRate,r.durationMs),buffer=this.context.createBuffer(2,wave.length,wave.sampleRate);wave.channels.forEach((a,i)=>buffer.copyToChannel(a,i));
  const node=this.context.createBufferSource();node.buffer=buffer;node.connect(this.context.destination);node.onended=()=>{node.disconnect();this.nodes.delete(node);};this.nodes.add(node);node.start(this.context.currentTime,r.elapsedMs/1000);this.starts++;return true;
 }
 stop(){for(const node of this.nodes){try{node.stop();}catch{}node.disconnect();}this.nodes.clear();}
 enterSession(id){this.stop();this.sessionId=id;this.seen.clear();}
}
