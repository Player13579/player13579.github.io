/**
 * dark/light/heroへ同じSystem.frameの状態を渡す、単一の提出経路。
 * この層は発行・時刻・音声に触れない。色背景の比較でイベントを増やさない。
 */
export async function submitViews({frames,dark,light,hero,smallDark=null,smallLight=null,host,mask,selectedVariant,layerMask=15,capture=false}) {
  if(!Array.isArray(frames)||!dark||!light||!hero||!host)throw new TypeError('preview views');
  const records=frames.map(frame=>({frame,projection:host.projection(frame),mask}));
  const focus=frames.filter(f=>f.event.variant===selectedVariant).at(-1);
  const darkCapture=dark.render(records,{layerMask,capture});
  const lightCapture=light.render(records,{layerMask,capture});
  const smallRecords=(smallDark&&smallLight)?frames.map(frame=>({frame,projection:host.projection(frame,{nativeSize:32}),mask})):[];
  const smallCaptures=(smallDark&&smallLight)?[smallDark.render(smallRecords,{layerMask,capture}),smallLight.render(smallRecords,{layerMask,capture})]:[];
  hero.render(focus?[{frame:focus,projection:host.projection(focus,{hero:true}),mask}]:[],{layerMask});
  await dark.submitted();
  if(dark.isLost||light.isLost||hero.isLost||smallDark?.isLost||smallLight?.isLost)throw new Error('GPU device lost / uncaptured validation error');
  const captures=capture?await Promise.all([darkCapture,lightCapture,...smallCaptures]):null;
  return {recordCount:records.length,focus,captures:captures?{dark:captures[0],light:captures[1],...(captures.length>2?{dark32:captures[2],light32:captures[3]}:{})}:null};
}
