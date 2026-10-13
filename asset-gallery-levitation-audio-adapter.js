/* Version-bound Levitation audio bridge. Visual/runtime state remains owned by each iframe. */
(function(root){
  'use strict';
  const PINS = new Map([
    ['levitation-support-volume-sol61-add1-20261013', Object.freeze({
      versionId:'levitation-support-volume-sol61-add1-20261013',
      route:'/public/levitation-support-field-addone-sol61/index.html',
      packageManifestSha256:'05b69595c10d6d1406debe5b7d64df9d53c02a35f7a295bd6b510c7bfac95355',
      packageSealSha256:'c3e8deac9eb9a577b8802793f8de788eb9d142f9e1cdf7fbd2e294b45df9a511',
      sourceManifestSha256:'8e1e8f6037e7a2195f2d6789c3a448a92dff1aca39de3c001ec43a2b1abec02c'
    })],
    ['levitation-support-volume-sol61-r2-20261013', Object.freeze({
      versionId:'levitation-support-volume-sol61-r2-20261013',
      route:'/public/levitation-support-volume-sol61/r2-20261013/index.html',
      packageManifestSha256:'1eb0710a7deb6f506c9399903f37b7424c0095c9b08458c11042772f403490f0',
      packageSealSha256:'395d61e2b929d86828ec33c871968704c167b5b74a4fe4a264d5b3103d69ab77',
      sourceManifestSha256:'9c0676b34faa0ef9b9bc9e2bbc3212aa7f5f5d45310370c68574b5f213e18e43'
    })],
    ['levitation-support-volume-sol61-r3-20261013', Object.freeze({
      versionId:'levitation-support-volume-sol61-r3-20261013',
      route:'/public/levitation-support-volume-sol61/r3-20261013/index.html',
      packageManifestSha256:'51db319efe3d9e7152865996be66d38fe03e6c269ec24c356267f19276428632',
      packageSealSha256:'2b61a4350c69a5d570ffaab05902606ce4458ebc7189c96f22fbaba9cf5eecad',
      sourceManifestSha256:'aaeab6816b14ae7a29e2aa3d915e87d156bfbae2380a28b170effebc1336e943'
    })]
  ]);
  const originalFactory=root.createGallerySfxBridge;
  if(typeof originalFactory!=='function')throw new Error('gallery SFX bridge must load before Levitation adapter');
  function createGallerySfxBridge(options={}){
    const base=originalFactory(options);let active=null;
    function pinFor(item){const pin=PINS.get(item?.id);if(!pin)return null;
      return item.packageManifestSha256===pin.packageManifestSha256&&item.packageSealSha256===pin.packageSealSha256&&item.sourceManifestSha256===pin.sourceManifestSha256?pin:null;}
    function readRoute(iframe,item,pin){
      try{
        if(!pin)return null;
        const win=iframe?.contentWindow,url=new URL(win?.location?.href);
        if(url.origin!==root.location.origin||url.pathname!==pin.route||url.searchParams.get('galleryVersionId')!==pin.versionId
          ||url.searchParams.get('galleryPackageManifestSha256')!==pin.packageManifestSha256
          ||url.searchParams.get('galleryPackageSealSha256')!==pin.packageSealSha256
          ||url.searchParams.get('gallerySourceManifestSha256')!==pin.sourceManifestSha256
          ||! /^[0-9a-f]{32}$/.test(url.searchParams.get('galleryStartupToken')||'')
          ||! /^[1-9][0-9]*$/.test(url.searchParams.get('galleryAttemptEpoch')||''))return null;
        const api=win.__levitation;let snapshot=null;
        try{snapshot=api?.snapshot?.()??null;}catch(_){}
        return{win,url,api,snapshot,token:url.searchParams.get('galleryStartupToken'),epoch:url.searchParams.get('galleryAttemptEpoch'),verify:options.verify===true||url.searchParams.has('verify')};
      }catch(_){return null;}
    }
    function attachFrame(iframe,item){
      const pin=PINS.get(item?.id);
      if(!pin){active=null;return base.attachFrame(iframe,item);}
      if(!pinFor(item)){active={iframe,item,state:'unavailable',reason:'Levitation package identity is not pinned'};return{state:active.state,reason:active.reason};}
      const child=readRoute(iframe,item,pin);
      if(!child){active={iframe,item,state:'unavailable',reason:'Levitation route identity did not match'};return{state:active.state,reason:active.reason};}
      if(child.api&&child.snapshot?.versionId!==pin.versionId){active={iframe,item,state:'unavailable',reason:'Levitation runtime version did not match'};return{state:active.state,reason:active.reason};}
      const state=child.verify?'silent':child.snapshot?.ready===true?'ready':'pending';
      active={iframe,item,versionId:pin.versionId,token:child.token,epoch:child.epoch,state,reason:child.verify?'verification mode is hard-muted':state==='pending'?'waiting for source-owned runtime startup':''};
      base.attachFrame(iframe,item);return{state:active.state,reason:active.reason};
    }
    function activateFromGesture(iframe,item){
      const pin=PINS.get(item?.id);
      if(!pin){active=null;return base.activateFromGesture(iframe,item);}
      const child=pinFor(item)&&readRoute(iframe,item,pin);
      if(!active||active.iframe!==iframe||active.versionId!==pin.versionId||!child||active.token!==child.token||active.epoch!==child.epoch){
        active={iframe,item,versionId:pin.versionId,state:'unavailable',reason:'Levitation selection changed or route identity is stale'};return{state:active.state,reason:active.reason};}
      if(child.verify){active={...active,state:'silent',reason:'verification mode is hard-muted'};return{state:'silent',reason:active.reason};}
      if(!child.api||typeof child.api.enableAudio!=='function'||child.snapshot?.versionId!==pin.versionId||child.snapshot?.ready!==true){
        active={...active,state:'pending',reason:'Levitation source has not completed startup'};return{state:active.state,reason:active.reason};}
      let result;try{result=child.api.enableAudio();}catch(_){active={...active,state:'unsupported',reason:'Levitation audio activation failed'};return{state:active.state,reason:active.reason};}
      const normalize=value=>{if(value?.ok===true){active={...active,state:'active',reason:'using Levitation authored SFX'};return{state:'active',reason:active.reason,snapshot:value.snapshot};}
        active={...active,state:'unsupported',reason:value?.reason||'Levitation did not confirm audio activation'};return{state:active.state,reason:active.reason,snapshot:value?.snapshot};};
      if(result&&typeof result.then==='function'){active={...active,state:'pending',reason:'waiting for Levitation audio status'};return Promise.resolve(result).then(normalize,()=>normalize({ok:false}));}
      return normalize(result);
    }
    function detachFrame(iframe){if(iframe&&active?.iframe&&active.iframe!==iframe)return false;const wasActive=active?.iframe===iframe;if(wasActive)active=null;const detached=base.detachFrame(iframe);return detached===false?false:true;}
    return Object.freeze({attachFrame,activateFromGesture,detachFrame,get status(){return active?{id:active.versionId,state:active.state,reason:active.reason}:base.status;}});
  }
  root.createGallerySfxBridge=createGallerySfxBridge;
  if(typeof module!=='undefined'&&module.exports)module.exports={createGallerySfxBridge};
})(typeof window!=='undefined'?window:globalThis);