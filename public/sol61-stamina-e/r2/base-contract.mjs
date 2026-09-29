// B先行E設計コード。画像生成用schemaやpromptではなく実行可能E分岐。
// このファイルを先に確定し、shaderとSFXは同じ定数と位相から構成する。
export const DESIGN = Object.freeze({
  id:'sol61-stamina-r1', author:'GPT-6.1-Sol', adoption:'unadopted', quality:'quality-failed',
  ownedOutput:'outputs/request-20260930/sol61-stamina-e/r1/',
  source:{commit:'37eb4bdfe59f0dc075f9b4333b7d6af76b784a88',baseBlob:'8a908495ae1f9b7175e00384ab88c50e5c78bd43',extensionBlob:'0eda016558e426ff4142d850d26200b40fafd834'},
  event:'gain-stamina', durationMs:1450, cycleMs:2300, sparkleAngleDeg:15,
  requirements:['正の権威ある離散SP増分の受益者に一度表示','自然回復tickへ新規発行しない','身体付近の受納→伝達→機能回復を読む','キラキラ必須・同一E内角度固定','新規画像なし・WebGPUのみ・版固有SFX'],
  remainingDecisions:['暗明H64で主作用が衣装や装甲と誤読されないか実画素で判定','音の質と同期は聴感の独立ゲート','ギャラリーiframeは担当外の統合後に実検証'],
  acceptance:['WGSL実コンパイルとGPU提出','H64暗明の全寿命・星OFF・OBS OFF','初回→次ループの正時計・同じ像','重複・独立原因・期限・死亡・倍率変更','SFX波形・発音境界・音割れ・聴感'],
  meaning:{fact:'gain-staminaは受益者の正のSP増分が成立した通知。回復量を未提供なら描かない。',mustCommunicate:'腹部で受けた補給が身体に圧を作り、下半身と前腕へ順次受納される。',notDepicted:'HP傷、治療、移動加速、全快、ゲージ値、外部容器、頭上マーカー',confusable:'装甲・衣装色替え・速度バフ',discrimination:'境界は固定衣装でなく、身体に沿って立ち上がり→内側へ厚く膨らみ→受納と同時に静まる。外へ飛び去る軌跡や残置板を持たない。'},
  coordinates:{world:'右手系m、+X右 +Y上 +Z奥。受益者foot原点、orthographicで投影。H64は基準身体1.65mを64pxへ投影。',projection:'画面x=anchorX+worldX*64/1.65、画面y=footY-worldY*64/1.65。fixture cropがH64となる。',gravity:'normal (0,-9.81,0)m/s²。体は足で支持、Eの宣言場は重力で落下せず有限の身体作用域へ拘束。',WindCapsule:{medium_state:'air',Field:{direction:[0,0,0],speed:0,gust:'none',shear:'none',turbulence:'none'},response:'静穏。風・浮上・衣服変形・余分な粒子は作らない。'},pose:'既存Sophia正面静止原画の身体と支持を保持。Eが姿勢やゲーム速度を変更しない。'},
  clock:'elapsedMs=integral(actorRate*wall_dt)。受益者が死亡/非表示なら表示停止。単発演出は1450 actor msで終了。SFXもBufferSource.playbackRateをactorRateへ合わせ、途中倍率変更は積分時計を共有する。',
  phases:[{id:'receive',ms:[0,250],shape:'腹部の厚い接触体積が内へ締まり白芯を生む',sound:'柔らかい空気吸入と木質の低い倍音'}, {id:'replenish',ms:[150,810],shape:'腹部の広い作用面から太腿、続いて前腕へ厚い充填前線が進む',sound:'連続した明るい倍音が二度の部位受納へ結び付く'}, {id:'settle',ms:[690,1180],shape:'各部位が充填状態を持ち、外側の厚みが内側へ受納される',sound:'短い乾いた着地感と柔らかい息の終止'}, {id:'release',ms:[1180,1450],shape:'身体上の作用面が縮小して消える。上昇粒子への置換なし',sound:'受納面とともに倍音が減衰し、1450ms前に終わる'}],
  morphology:{macro:'腹部の一つの発生体積と、左右の太腿・前腕の身体内外に跨る四つの受納体積。外部円・ゲージ・板・風状線を作らない。',meso:'改稿1:腹部13–20×18px、太腿各12×17px、前腕各9×13pxの投影支持域。身体内へ中心を収束させる。合成後の可視面積は別に審査する。前線は体積内を移動して密度を圧縮し、局所最大の芯と有色の厚みを分ける。',micro:'輪郭の滑らかな境界と光条だけ。細かい模様・小片群なし。',occlusion:'体積の背面はactor alphaで遮蔽、手前体積は半透過で原画表面を保持。顔上部への被覆なし。'},
  layers:[
    {id:'PH1',role:'受益者の身体',function:'既存原画の境界と部位を受け手として保持',optics:'原画色を保持し、PH2の近傍放射が部位の表面へ応答。身体は発光源と誤登録しない。',timing:'全区間存在'},
    {id:'PH2',role:'補給圧の宣言場',function:'腹部の受納体積と四肢への充填前線、終盤の静かな受納面',optics:'密度は前線/充填量、alphaは厚み、emissionは供給と受納の局所最大で別々に計算。暖琥珀の透過本体と白い芯。',timing:'腹部0–720ms、四肢180–1450ms。後半は充填域を縮めて内へ消す'},
    {id:'PH3',role:'身体表面の近傍光応答',function:'体積への接触点から有限域の表面へ琥珀光が広がる',optics:'PH2の局所発光量と距離減衰に比例。原画alpha内だけ、PH2を止めたら即0。',timing:'PH2入力に即応'},
    {id:'OBS1',role:'光条・source-bound glow',function:'受納接触点だけから光条と短い拡散応答。主形は作らない',optics:'15°固定の長軸と直交短軸。H64で長軸3.2px/短軸2px。改稿1:源の外側3.3pxで光条が全身光へ埋まらない。',timing:'腹部110–360ms、腿350–820ms、前腕680–1100ms。位相ピーク後に低下'}
  ],
  B:{branch:'ECodeImplementation',extensions:{VFX:'explicit',LDM:'explicit VFX',PostEffects:'attribute_resolved source-bound glow and diffraction streak',BeautifulPoseCapsule:'existing body',CharacterPolicy:'existing Sophia; no new attributes',MagicArchitecture:'disabled: exact token/preset not requested',VideoGenerationPolicy:'disabled: no video-generation request',GradientAnchorPolicy:'disabled: single amber emission spectrum + neutral white core, no hue gradient'},
    PHRegistry:['PH1受益者','PH2有限の補給場','PH3表面受光'],OBSRegistry:['OBS1受納点の光条と局所光拡散'],
    physicalLinks:['PH2.Optics→PH3.Optics:局所放射で表面が受光','PH2.declared_fantasy→PH1:正のSP成立を表示する有限域。演出がSP計算を駆動しない'],observationLinks:['OBS1→PH2.Optics:既存源の画面位置・強度・受納位相へ束縛'],
    OctaDomain:{Thermo:'not_applicable:熱回復・実温度を意味しない',Fluid:'not_applicable:圧は演出機構であり空気輸送の実証ではない',Optics:'applicable:PH2放射、PH3受光、PH1遮蔽/透過',Materials:'applicable PH1/PH3:既存衣服・身体の表面が受光。Eは表面色そのものを交換しない',Electromagnetics:'not_applicable:電荷や放電を描かない',Rheology:'not_applicable:布の変形・実粘弾性を描かない',WaveOptics:'not_applicable world PH:光条はOBSへ分離',SurfaceScience:'not_applicable:濡れ/付着/化学を作らない'},
    PhysicalModel:'PH2 declared_fantasy、入力gain-stamina、受益者局所域が境界。質量/運動量/電荷収支は非該当、放射は供給包絡→PH3受光とOBS。実医学・物理の実証ではない。PH1は既存のrigid_or_articulated支持状態。PH3 derived_world_response。',
    ScaleRegime:'改稿1のH64投影支持域は腹部13–20×18px、太腿各12×17px、前腕各9×13px。1.45s単発、前線移動は0.66s、0.5px未満の形態を必須手掛かりにしない。',
    CausalAssessment:{status:'hypothesis_only',intervention:'星OFF/OBS OFF/各層OFFで同時刻・同身体を固定',prediction:'星を消しても腹部→四肢への厚い受納が残る。近傍光OFFは形を変えない。PH2 OFFは補給と光応答が消える。',uncertainty:'抽象SPの意味は単一静止画では一意に決まらない。全寿命と実イベント情報を用いて受益関係を判定。'},
    LDM:'腹部入力に0–180msの明るさ上昇、380msから供給低下。四肢は到達遅延で局所最大、690–1180ms受納中の本体は安定し、1180msから源ごとに減衰。全層の同一sin点滅なし。',
    IntensityBudget:'顔・身体境界を保護。PH2の白芯は局所ピークとして維持、OBSは源より弱い1–3px域だけ。背景別補正・白飛び回避をしない。',
    SamplingContract:'WebGPUの直接提示。暗/明背景は同じ物理・shaderで検査用にだけ変更。DPR1、H48/H64/H96、原寸境界をfwidthでAA。RAF連続観察と0/80/180/350/600/810/1000/1180/1350/1450/1600ms断面。',
    PEV_AES:'受納前線と身体の接触が読める350–810msを代表状態に選ぶ。密な体積と顔/腹部周囲の抜け、厚みの内への圧縮、時間の階層で美的完成を判断。規則項目数を品質点へ変換しない。'
  }
});
export function admit(event, seen){
  if(!event || event.type!=='gain-stamina' || event.authoritative!==true || event.kind!=='discrete' || !event.playerId || !event.eventId || !Number.isFinite(event.startedAt) || !(event.gain>0) || seen.has(event.eventId)) return false;
  seen.add(event.eventId); return true;
}
export function phase(elapsedMs){ const t=elapsedMs/DESIGN.durationMs;return t<0||t>=1?null:{t,active:true}; }
export function makePCM(rate=48000){
  const n=Math.ceil(rate*DESIGN.durationMs/1000), out=new Float32Array(n); let noise=0, seed=73419;
  const bell=(t,c,w)=>Math.exp(-Math.pow((t-c)/w,2));
  for(let i=0;i<n;i++){
    const t=i/rate; seed=(Math.imul(seed,1664525)+1013904223)>>>0; const white=seed/4294967296*2-1; noise=.88*noise+.12*white;
    const intake=bell(t,.12,.11)*(.046*noise+.036*Math.sin(2*Math.PI*(140*t+100*t*t)));
    const supply=bell(t,.35,.24)*(.050*Math.sin(2*Math.PI*(310*t+145*t*t))+.021*Math.sin(2*Math.PI*620*t));
    const thighs=bell(t,.50,.095)*(.055*Math.sin(2*Math.PI*510*t)+.013*noise);
    const arms=bell(t,.83,.11)*(.045*Math.sin(2*Math.PI*680*t)+.016*Math.sin(2*Math.PI*1020*t));
    const settle=bell(t,1.03,.17)*(.042*Math.sin(2*Math.PI*260*t)+.022*noise);
    const edge=Math.min(1,t/.008,(1.45-t)/.06);out[i]=(intake+supply+thighs+arms+settle)*Math.max(0,edge);
  } return out;
}
