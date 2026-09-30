// 決定済みの初期化/提出/SFX契約。形/音色は持たない。
export class SubmittedAudio {
 constructor({verify=false,start,stop}){this.verify=verify;this.start=start;this.stop=stop;this.ready=false;this.submitted=false;this.active=false;this.pending=false;this.failed=false;this.starts=[];}
 gesture(){if(this.verify||this.failed)return false;this.active=true;this.pending=true;return this.ready&&this.submitted;}
 gpuReady(){if(!this.failed)this.ready=true;}
 fail(){this.failed=true;this.ready=false;this.pending=false;this.active=false;this.stop();}
 didSubmit({ms,rate=1,restart=false}){if(this.failed)return false;this.submitted=true;if(this.verify||!this.ready||!this.active)return false;if((this.pending||restart)&&ms>=0&&ms<1300){this.pending=false;this.stop();this.start(ms/1000,rate);this.starts.push({offset:ms/1000,rate});if(this.starts.length>64)this.starts.shift();return true;}return false;}
 needsRestart(){return this.pending&&this.ready&&this.submitted&&!this.failed;}
 snapshot(){return {ready:this.ready,firstSubmission:this.submitted,active:this.active,pending:this.pending,failed:this.failed,starts:this.starts};}
}
