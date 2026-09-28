(function(root){
 'use strict';
 function create({renderer,baseModule=root.DvaHealAstraE,
   sparkleModule=root.DvaHealSparkle}={}){
  if(!renderer?.device||typeof baseModule?.create!=='function'||
     typeof sparkleModule?.create!=='function')
   throw new TypeError('Heal sparkle adapter needs the shared renderer and both frozen passes');
  const base=baseModule.create({renderer,frameOwner:renderer});
  let sparkle;
  try{sparkle=sparkleModule.create({renderer,frameOwner:renderer});}
  catch(error){base.destroy?.();throw error;}
  const live=new Set();let dead=false;
  const ready=Promise.all([base.ready,sparkle.ready]);
  function release(id){base.release?.(id);sparkle.release?.(id);live.delete(String(id));}
  function record(args){
   if(dead)throw Error('Heal sparkle adapter disposed');
   const outcome=base.record(args);
   if(outcome?.drawn===true)sparkle.record(args);
   return outcome;
  }
  function reconcile(ids){
   const next=new Set((ids||[]).map(String));
   for(const id of live)if(!next.has(id))release(id);
   live.clear();for(const id of next)live.add(id);
   base.reconcile?.(ids);sparkle.reconcile?.(ids);
  }
  return Object.freeze({device:renderer.device,ready,record,reconcile,release,
   destroy(){if(dead)return;dead=true;base.destroy?.();sparkle.destroy?.();live.clear();}});
 }
 const api=Object.freeze({create});root.DvaHealSparkleGameAdapter=api;
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);
