// r3の先行設計。r1/r2の不合格形状は使わず、Bの実行E分岐に従う。
export const DESIGN=Object.freeze({
 id:'sol61-stamina-r3',author:'GPT-6.1-Sol',quality:'quality-failed',adoption:'unadopted',durationMs:1600,cycleMs:2450,sparkleAngleDeg:15,sparkleAngleReference:"画面+Yの長軸を15°回転、+X基準では105°、短軸は直交。全点/全時刻で固定、個別random回転なし。",
 source:{commit:'37eb4bdfe59f0dc075f9b4333b7d6af76b784a88',baseBlob:'8a908495ae1f9b7175e00384ab88c50e5c78bd43',extensionBlob:'0eda016558e426ff4142d850d26200b40fafd834'},
 ownedOutput:'outputs/request-20260930/sol61-stamina-e/r3/',
 authority:'正の権威ある離散gain-staminaを一度受けた受益者だけ。自然回復tick・SP消費・頭上マーカー・全快量・速度変化を創作しない。',
 revision:'H64で琥珀面が風リボンへ誤読されるため、充填前線の白い圧縮峰を独立量に分け、面の透過密度を下げる。前線は0.06–0.76s移動し、末端への圧縮を保ち受納後に消える。手足枝は有色の板ではなく太い有限発光域。',
 mainDecision:'身体の外側に開いた厚い返り波を一本作り、広い断面の圧縮前線が身体へ戻る。前腕/足の接触へ枝分かれし、源から末端へ排出されて受納される。閉じた輪/膜/胴帯を作らない。',
 scope:{output:['先行設計','独立WebGPU VFX/SFX','実GPU H64暗明/診断/全寿命/ループ証拠','版と品質記録'],forbidden:['r1/r2編集','shared game/gallery編集','commit/push','新規画像','他担当のブラウザ'],delegation:'主形の意味・形態・実投影の未解決判断が密接なためこの限定創作/受入を同じSol担当で進める。バッチ全体の独立トラックはrootが別担当へ委譲している。'},
 phases:[
  {id:'receive',ms:[0,260],main:'腹部に接した源から、体外の返り波が奥側へ立ち上がる。波頭の最大域14–20px、細い線へしない。',sound:'柔らかい吸入と低い共振'},
  {id:'return',ms:[180,920],main:'身体近傍の一つの厚い折返し波が、腰周囲から手/足へ戻る。世界内の充填前線が移動し、装飾的なmotion blurではない。',sound:'短く連続した有気倍音、0.56/0.80sの接触終止'},
  {id:'accept',ms:[740,1320],main:'源側から前線へ排出し、体外の幅を部位へ内向きに収束。接触後も太い末端面と身体の光応答を残す。',sound:'体内へ収まる丸い共振と息の減衰'},
  {id:'release',ms:[1320,1600],main:'補給面は残された四肢接触域へ排出し、厚い前縁が内向きに消滅。上昇粒子だけの段階を作らない。',sound:'1.6s前の有限終止'}],
 morphology:{macro:'身体の一側面→腰の奥→反対側の下肢へ折り返す、一つの開いたS字の圧縮波。頭・顔の前を横切らず、閉じた外殻を持たない。負空間を顔前/身体左右に保持。',meso:'H64最大幅約80px/高さ約50px、可視断面は主波14–22px、手足の末端5–9px。中心線を最短点へ投影して連続した広い面を作り、球/楕円の配列にしない。面の奥縁・手前の白い圧縮峰・有色の透過厚みを別分布にする。',micro:'光学応答と境界AAだけ。微細ノイズ・片/玉・服飾模様なし。',occlusion:'世界内の波は中間の腰横断を奥に配置して既存身体alphaに遮蔽される。左右の厚い前縁は体外で可視。身体前面の接触域は別の局所加算光。原画RGBをEの材質/密度へ渡さない。'},
 coordinates:{world:'右手系、m、+X右 +Y上 +Z奥。身体1.65mをH64へorthographic投影、foot原点。',screen:'px=footX+worldX*H/1.65、py=footY-worldY*H/1.65。shader内のp.xはH単位、p.yは頭0足1。',Gravity:'normal、身体は既存支持状態、宣言場の補給波は身体近傍の有限作用域へ拘束する。落下物を作らない。',WindCapsule:{medium_state:'air',Field:{direction:[0,0,0],speed:0,gust:'none',shear:'none',turbulence:'none'},response:'静穏。波を外風と同一視せず、体外の主作用は有限の補給場の状態。'}},
 clock:'elapsedMs=integral(actorRate*wall_dt)。game/world/UI時計を変更しない。同じcause IDでSFXを一度開始し、再発動は独立原因として扱う。非表示/死亡は表示・音を停止する契約。previewはfixture一件を2450ms毎に再発行する。',
 sparkleSourceConstraint:'足/手の星はdestinationに届いたfield密度×finite gainでゲート。源星はs=.08のfed/received/lifeでゲートし、予定時刻だけで光らせない。',
 implementationReconciliation:'PH3のactor alpha内の受光はOBS1のglow/光条から独立し、OBS OFFでも世界内の受光は残す。',
 layers:[{id:'PH1',role:'受益者',function:'原画の身体/支持/部位を保持し、Eと独立fsBodyで描く',timing:'全区間',optics:'原画RGBを保持、alphaだけE遮蔽へ渡す'},
 {id:'PH2',role:'厚い補給の返り波',function:'一つの開いた湾曲した充填域。広い面の圧縮前線が身体へ戻り、接触域へ排出される',timing:'0–1600ms、部位ごとに開始/応答/排出を分ける',optics:'密度=場の充填量、alpha=奥/表面厚み、emission=白い圧縮峰+供給された有色の本体。独立量'},
 {id:'PH3',role:'身体の局所受光',function:'PH2の接触域の放射だけが前腕/足の既存表面へ応答する',timing:'PH2接触に即応、源が0なら0',optics:'原画色の置換なし、actor alpha内の源由来加算光'},
 {id:'OBS1',role:'source-boundな光条/glow',function:'圧縮前線と手足の到達点へ、全点15°固定の長軸/直交短軸を写す',timing:'0.12–0.40s源、0.43–0.86s足、0.68–1.18s手。phaseに同期',optics:'H64長軸5px短軸3px。源の外2–4pxで光条が埋まらない。glowは源より弱い局所応答のみ'}],
 B:{branch:'ECodeImplementation; executable source, not Image/Video prompt',extensions:{VFX:'explicit',LDM:'explicit VFX',PostEffects:'attribute_resolved source-bound streak/local glow',CharacterPolicy:'既存Sophia属性保持',BeautifulPoseCapsule:'既存静止姿勢/支持保持',MagicArchitecture:'不適用:exact token/selected preset未指定',VideoGenerationPolicy:'不適用:動画生成依頼ではない',GradientAnchorPolicy:'不適用:単一琥珀の放射とneutral白芯、色相グラデーションなし'},PhysicalModel:'PH1 rigid_or_articulated、PH2 declared_fantasy、PH3 derived_world_response。質量/電荷/現実流体・医学の実証を作らず、正のSP成立を有限場の入力と受納へ表す。',OctaDomain:{Thermo:'not_applicable:熱/実温度を描かない',Fluid:'not_applicable:外風や実流体へ置換しない',Optics:'applicable:放射・受光・遮蔽・透過',Materials:'applicable PH1/PH3:既存身体/衣服表面の受光、PH2には実物性を割り当てない',Electromagnetics:'not_applicable:電荷/電流/放電なし',Rheology:'not_applicable:布の変形・粘弾性ソルバーではない',WaveOptics:'not_applicable world:光条はOBSとして分離',SurfaceScience:'not_applicable:濡れ/化学/付着なし'},LDM:'波の源・充填前線・末端接触の局所最大を分ける。白い圧縮峰は全体フェードでなく前線とともに移動。受納後は源側から排出し、源のないhaloを残さない。',IntensityBudget:'顔と既存身体境界を保護。物理層の白芯を保持、OBSは源より弱い有限域。背景別補正/白飛び回避は行わない。',SamplingContract:'DPR1、H64、暗/明同shader、H48/H96は別ゲート。主面14–22px、重要終端5–9px、解析的AA。実時間の連続再生と段階断面を別に記録。',CausalAssessment:{status:'hypothesis_only',intervention:'星OFF・OBS OFF・主波OFFを同時刻/同原画で比較',predicted_response:'星OFFでも身体へ戻る主作用が残り、OBS OFFは厚い主形を変えず、主波OFFは補給の因果を失う',uncertainty:'SPの値・全快・外部薬品・速度変化は未提供。全寿命とイベント契約で有限受益を読む。'}},
 acceptance:['全shaderコンパイル/実device提出','暗明H64全寿命と3ループ','薄線・玉・胴帯・服飾・単なる色替えへの棄却','接触光条固定角/源依存','SFX finite/clipなし/聴感同期は独立','本編/実gallery iframeはroot検証'],
 remainingDecisions:['S字の返り波が広い補給面として読むか、風/リボン/装甲へ誤読されるか実投影で判断','連続観察で源→手足→内向き受納が明確か','聴感と本編の受入は未実施ならnot_run']
});
export function admit(e,seen){if(!e||e.type!=='gain-stamina'||e.authoritative!==true||e.kind!=='discrete'||!e.playerId||!e.eventId||!Number.isFinite(e.startedAt)||!(e.gain>0)||seen.has(e.eventId))return false;seen.add(e.eventId);return true;}
export function phase(ms){return ms<0||ms>=DESIGN.durationMs?null:{t:ms/DESIGN.durationMs,active:true};}
export function makePCM(rate=48000){
 const n=Math.ceil(rate*1.6),out=new Float32Array(n);let smooth=0,seed=93613;
 const bump=(t,c,w)=>Math.exp(-Math.pow((t-c)/w,2));
 for(let i=0;i<n;i++){const t=i/rate;seed=(Math.imul(seed,1664525)+1013904223)>>>0;smooth=.86*smooth+.14*(seed/4294967296*2-1);
  const inlet=bump(t,.14,.105)*(.041*smooth+.036*Math.sin(2*Math.PI*(148*t+65*t*t)));
  const fold=bump(t,.45,.24)*(.042*Math.sin(2*Math.PI*(270*t+105*t*t))+.018*Math.sin(2*Math.PI*520*t)+.020*smooth);
  const feet=bump(t,.56,.08)*(.031*Math.sin(2*Math.PI*480*t)+.019*Math.sin(2*Math.PI*720*t));
  const hands=bump(t,.83,.10)*(.035*Math.sin(2*Math.PI*640*t)+.010*Math.sin(2*Math.PI*960*t));
  const settle=bump(t,1.16,.22)*(.044*Math.sin(2*Math.PI*(310*t-55*t*t))+.023*smooth);
  const edge=Math.max(0,Math.min(1,t/.010,(1.6-t)/.055));out[i]=(inlet+fold+feet+hands+settle)*edge;
 }return out;
}
