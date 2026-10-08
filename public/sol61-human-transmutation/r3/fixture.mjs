export const ORIGINAL_SHA256='4f1901dfd275bfec01b6f4fd7da66f190e0b2396320de2fb36cc20a5e36490a3';
export const ORIGINAL_URL=new URL('./assets/philia-front-nine-v752.png',import.meta.url).href;
export function makeFixture({height=64,width=960,viewportHeight=600,causeId='human-r3-fixture-1',generation=0,eventAt=0}={}) {
  if (![48,64,128].includes(height) || !Number.isFinite(width) || width<=0 || !Number.isFinite(viewportHeight) || viewportHeight<=0) throw new RangeError('Explicit H48/H64/H128 positive fixture required');
  return {
    event:{type:'alchemy-human-transmutation',id:causeId,playerId:'caster-distinct',targetId:'revived-philia',at:eventAt,x:320,y:220,durationMs:1200},
    target:{id:'revived-philia',alive:true,ejected:false,inVent:false,invisible:false,bodyScreen:{x:width*.5,y:viewportHeight*.5+height*.5}},
    sprite:{sourceSha256:ORIGINAL_SHA256,textureWidth:768,textureHeight:768,crop:{x:0,y:0,width:256,height:256},origin:{x:128,y:240},scale:height/225,alphaSupport:{x:57,y:16,width:141,height:225}},
    scope:{id:'human-r3-private-preview',generation},
  };
}
