export const DESIGN=Object.freeze({
 id:'sol61-barrier-zero-r2',author:'GPT-6.1-Sol',adoption:'unadopted',
 ownedOutput:'r2配下のみ。r1原本/ゲーム/gallery/公開は変更しない。',
 requirements:'デジタル防護の透明な面体積と前後空間。輪郭/細格子だけにしない。白ピークを保持しsource-bound glow。finite create/hit/breakとauthoritative耐久状態。旧GPT/Astraの創作入力なし。',
 source:{repository:'player13579/B',branch:'Codex-honoo',commit:'37eb4bdfe59f0dc075f9b4333b7d6af76b784a88',base_blob:'8a908495ae1f9b7175e00384ab88c50e5c78bd43',extension_blob:'0eda016558e426ff4142d850d26200b40fafd834',checked:'r2着手時authenticated ls-remoteで同commitを再確認。両正本はr1作業で全読済み、同版なので再読を省く。'},
 causalMeaning:{facts:'共通防御Barrierはalive/非ejected/耐久>0でactive。capacity2、kill cost1/body costdamage、再付与cooldown20s。Protect変換とは別。',mustRead:'受け手の身体外に厚みを持つ透明な防護壁が成立し、攻撃を壁の有限界面で受ける。耐久0で壁の結合が開放される。',unknown:'攻撃位置/攻撃体/耐久割合/解除理由は実入力にないと作らない。previewの接触はfixtureとして明記。',confusable:'平面cage、ガラス容器、装甲装備、回復',discrimination:'広い曲面の法線変化と内外境界、背面の身体遮蔽、前面の透過。脚/顔/身体を覆い潰さず、衣装と壁の間に距離を残す。'},
 morphology:{macro:'身体H64に対しsteady投影W71.6/H92.2の透明なsuperellipsoid防護体。指数3の広い面が丸い角を経て連続し、四つの大きな曲面区画が一体になる。中央は空洞、外側は有限厚の壁。',meso:'外側面と各半径を0.07m縮めた内側境界。これは法線方向一定厚ではない。各面は連続した法線場を持つ。背面外→背面内→身体→前面内→前面外。前後端は斜め投影で異なり、身体の遮蔽が奥面だけを切る。',micro:'細格子/刻印/飾り粒子を使わない。幅のある青い面、側面、丸い角の内外境界が主手掛かり。',notCopied:'r1の輪郭/継ぎ目/平面shaderを造形入力にせず、前後投影一致・面従属という抽象原因を棄却条件にした。r2 attempt1の滑らかな泡/面OFF差不足を具体的棄却証拠として保存。'},
 geometry:{radiusM:[.9,1.17,.67],centerM:[0,.9,0],wallRadiusInsetM:.07,surfaceExponent:3,mesh:'theta24×phi18、四つの大きな曲面区画。sphere directionをsign(d)*abs(d)^(2/3)へ移し、sum(abs(p/r)^3)=1のsuperellipsoidを作る。theta/phiは標本化用で線格子として描かない。',camera:'orthographic。yaw26deg/pitch15deg。既存身体はcamera facing billboard。身体crop/縦横比を不変に保つ。',projection:'基準身体1.65m→64px。same foot origin。screen x右/y下。cameraの+Z側が観測者。支持値h(a)=(sum(abs(ai*ri)^1.5))^(2/3)。幅=2h([cosYaw,0,sinYaw])*64/1.65、高=2h([sinPitch*sinYaw,cosPitch,sinPitch*cosYaw])*64/1.65。遮蔽後の面積は別のGPU観測で判定。'},
 clocks:{owner:'wall ms。stateはserver所有。previewは独立fixture loopでgame timerでない。',createMs:650,hitMs:650,breakMs:480,active:'authoritative activeが続く限り定常曲面を保持。演出側で期限や耐久を減らさない。',dedup:'causeId一回。snapshotは定常面だけで発動ピーク/SFXなし。死亡/ejected/非表示は所有描画/音を解除。'},
 phases:{create:'0–180ms:身体外の四面が短い半径方向の離れから正規の壁へ結合。180–360ms:曲面の接合sourceがピーク。360–650ms:定常供給へ整定。',active:'同じ面体積を一定供給で保つ。呼吸点滅なし。',hit:'実hitUVがある時だけ界面sourceが80msで立ち上がり、広い面応答が曲面へ伝わる。650msで定常壁へ戻る。未知位置は方向不明の短い受光だけ。',break:'0–100ms接合sourceが応答。100–360ms四つの大面が接合を開き身体外へ離れる。360–480ms面/源/OBSを0にし身体のみ残す。破片なし。'},
 optics:{carrier:'有限壁厚の透明な宣言場。実防御材の実証ではなくゲーム防御の表現。',face:'青い面のcoverage/透過alpha、法線/view依存、内外境界の差を保持。中央の高透過域と周辺の厚い側面を分ける。',emission:'曲面の接合域と実命中源。青い放射本体と局所白芯。色/alpha/源量は別変数。壁厚をglowで捏造しない。',OBS1:'実mesh emission attachmentだけをseparable GPU blurし、局所に合成。世界内source OFFで0。背景/身体の座標を歪めない。',alpha:'linear radiance + premultiplied coverage。alphaは一度だけ。body原画はsRGB→linear。scene/emissionはrgba16float、最終surfaceへGPUのみ合成。',budget:'白い局所sourceが主面の曲率/厚みを支え、blue本体→局所glowへ減衰。全画面lift/背景別補正なし。'},
 SFX:{create:'650ms、低域の共鳴体と収束する高域の接合音。広い壁が定着する180–360msに同期。',hit:'520ms、短い打音→非整数モードの面共鳴。',break:'480ms、接合モードの下降と短い放射の散逸。無限humなし。',ownership:'causeId一回。__gallerySfx bridge。verifyはAudioContextを作らず全音声0。聴感は別ゲート。'},
 coordinates:{world:'右手系m、+X右/+Y上/+Z奥、足原点。camera rotationを同じmesh/normalへ使用。',Gravity:{condition:'normal',vector:[0,-9.81,0],body:'既存静止原画の足支持を保持。',effect:'target-relative宣言場なので重力による落下を創作しない。'},WindCapsule:{medium_state:'air',Field:{direction:[0,0,0],speed:0,gust:'none',shear:'none',turbulence:'none'},response:'静穏。不要な衣服/髪の揺れを追加しない。'}},
 extensions:{VFX:'explicit',ECodeImplementation:'explicit',LDM:'explicit VFX',PostEffects:'attribute_resolved source-bound GPU bloomだけ。魔法/keyword/粒子を一式追加しない。',MagicArchitecture:'not_applicable:明示指定なし',KeywordExpansion:'not_applicable:v1–v6等の指定なし',GradientAnchorPolicy:'not_applicable:青い面/放射と中立白芯、色相gradientなし'},
 acceptance:{H64:'暗明、DPR1、同じshader、初中後/解除後。source/OBS/face各OFF。前後の分離はfront-only/back-onlyでも確認。',performance:'実GPUcompile/submitと連続2loops以上、診断pauseをFPSに混ぜない。',iframe:'初回と次loop、hookとverify0、診断UI非露出。',quality:'世界面の厚み/空洞/透過を観測。聴感/本編event/公開iframe/ユーザー採用は別判定。'},
 remainingIndependentDecisions:'attempt1は泡読みにより視覚未合格。改訂面のH64厚み/前後/デジタル防護意味と実音の聴感。再GPUはroot許可まで待機。'
});

export function fixtureState(ms){
 if(ms<0)return{stage:4,t:0,live:false,event:null};
 if(ms<650)return{stage:0,t:ms/1000,live:true,event:'create'};
 if(ms<1800)return{stage:1,t:(ms-650)/1000,live:true,event:null};
 if(ms<2450)return{stage:3,t:(ms-1800)/1000,live:true,event:'hit'};
 if(ms<3400)return{stage:1,t:(ms-2450)/1000,live:true,event:null};
 if(ms<3880)return{stage:2,t:(ms-3400)/1000,live:true,event:'break'};
 return{stage:4,t:0,live:false,event:null};
}

export function makeShellMesh(){
 const nu=24,nv=18,out=[];
 function vertex(u,v,inner,sector){out.push(u/nu*Math.PI*2,v/nv*Math.PI,inner,sector);}
 for(const inner of [0,1])for(let v=0;v<nv;v++)for(let u=0;u<nu;u++){
  const sector=Math.floor(u/(nu/4));vertex(u,v,inner,sector);vertex(u+1,v,inner,sector);vertex(u+1,v+1,inner,sector);vertex(u,v,inner,sector);vertex(u+1,v+1,inner,sector);vertex(u,v+1,inner,sector);
 }
 return{vertices:new Float32Array(out),surfaceVertexCount:nu*nv*6,totalVertexCount:out.length/4};
}
