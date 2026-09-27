import {DURATIONS_MS,VERSION} from './barrier-pro-sampler.mjs';

const sequence=['create','absorb','fracture','bust'];
const branchSelect=document.getElementById('branch');
const playButton=document.getElementById('play');
const statusNode=document.getElementById('status');
const params=new URLSearchParams(location.search);
const state={version:VERSION,qualityStatus:'fail',ready:false,verify:params.has('verify'),audioEnabled:false,branch:null,ageMs:0,errors:[],metadata:null,visitedBranches:[]};
window.barrierProR01Preview=state;
let branchIndex=0,branchStartedAt=0,sequenceStarted=false,raf=0,renderCount=0;
function beginBranch(index,now){
  branchIndex=index%sequence.length;
  const branch=sequence[branchIndex];
  branchSelect.value=branch;
  branchSelect.dispatchEvent(new Event('change',{bubbles:true}));
  playButton.click();
  branchStartedAt=now;
  state.branch=branch;
  if(!state.visitedBranches.includes(branch))state.visitedBranches.push(branch);
  state.ageMs=0;
}
function animate(now){
  if(!state.ready){raf=requestAnimationFrame(animate);return;}
  if(!sequenceStarted){sequenceStarted=true;beginBranch(0,now);}
  else if(now-branchStartedAt>=DURATIONS_MS[sequence[branchIndex]])beginBranch(branchIndex+1,now);
  state.ageMs=now-branchStartedAt;
  renderCount++;
  state.renderCount=renderCount;
  raf=requestAnimationFrame(animate);
}
function checkReady(){
  try{
    const result=JSON.parse(statusNode.textContent||'{}');
    if(result.version!==VERSION)return;
    state.metadata=result;
    state.errors=Array.isArray(result.failures)?result.failures:[];
    if(!state.ready&&!state.errors.length){state.ready=true;raf=requestAnimationFrame(animate);}
  }catch(error){state.errors.push(String(error?.message??error));}
}
const observer=new MutationObserver(checkReady);
observer.observe(statusNode,{childList:true,characterData:true,subtree:true});
checkReady();
window.addEventListener('pagehide',()=>{cancelAnimationFrame(raf);observer.disconnect();},{once:true});
