import {DESIGN as INITIAL,admit,phase,makePCM as basePCM} from './base-contract.mjs';
// r1の原本は固定。r2は同じ受益契約の投影・主形を改稿する派生。
export {admit,phase};
export function makePCM(rate=48000){
 const pcm=basePCM(rate);for(let i=0;i<pcm.length;i++){const t=i/rate;const body=Math.exp(-Math.pow((t-.61)/.27,2));const settle=Math.exp(-Math.pow((t-1.05)/.15,2));const edge=Math.max(0,Math.min(1,t/.012,(1.45-t)/.07));
  pcm[i]=pcm[i]*.88+edge*(body*.027*Math.sin(2*Math.PI*(215*t+83*t*t))+settle*.017*Math.sin(2*Math.PI*390*t));
 }return pcm;
}
export const DESIGN=Object.freeze({...INITIAL,id:'sol61-stamina-r2',quality:'quality-failed',ownedOutput:'outputs/request-20260930/sol61-stamina-e/r2/',
  morphology:{macro:'腹部の一つの受納体積から、前腕/太腿へ四つの厚い先細り作用域がつながって分岐し、身体内側に受納される。外付け玉や固定の衣装面を残さない。',meso:'連続した湾曲の中心線へ9断面を置き、max密度で一つの連続体積として再構築する。球の独立コピーは見せず、断面半径を始点から末端へ減少させる。H64厚み5–9px。供給は前線位置まで満たし、到達後は源側から受納先へ排出して内側へ吸収する。',micro:'表面の法線差と2–5pxの固定角光条のみ。小粒子/ノイズ/装飾線なし。',occlusion:'後ろ側の供給半分をactor alphaで遮蔽し、身体前面の受納体積を独立透過レイヤーで重ねる。原画RGBをE色やE形の生成に使わない。'},
  phases:[{id:'receive',ms:[0,250],shape:'腹部の厚い楕円体が内へ圧縮し、白芯を生む',sound:'柔らかい空気吸入'}, {id:'transport',ms:[150,760],shape:'密度と立体断面を持つ塊が腹部から太腿と前腕へ分岐して輸送される',sound:'局所受納へ結び付く二度の明るい共振'}, {id:'settle',ms:[680,1180],shape:'身体に到達した塊は表面の接触域へ広がった後、中心を内側へ吸収する',sound:'乾いた着地と息の終止'}, {id:'release',ms:[1180,1450],shape:'接触域に残る厚い受納面が身体へ収束して消える。上昇粒子へ置換しない',sound:'1450ms前に有限終止'}],
  layers:[{id:'PH1',role:'受益者',function:'既存原画をEと別の描画層として保持',optics:'RGBは受益者の原画色だけ。alphaのみE遮蔽へ渡す',timing:'全区間'}, {id:'PH2',role:'厚い輸送・受納体積',function:'腹部の源と四部位への連続した分岐軌道を持つ補給塊',optics:'法線に応じた有色の側面、厚い中心の白芯、半透過前面。密度/alpha/emissionを分ける',timing:'150–760ms輸送、680–1450ms受納の収束'}, {id:'PH3',role:'接触部の近傍光',function:'到達した塊の源強度からだけ身体alpha内へ加わる光',optics:'加算光。原画RGBや衣装色を置換しない',timing:'源/部位到達と同期'}, {id:'OBS1',role:'源に束縛された光条',function:'到達前縁と接触境界の外側に固定15°光条',optics:'H64で長軸5px短軸3px、源より弱い局所応答。光条の中心を前縁へ束縛',timing:'腹部100–350ms、腿430–850ms、腕650–1090ms'}],
  B:{...INITIAL.B,ScaleRegime:'H64の身体内部と近傍に連続分岐域。胴源13×15px、部位への断面5–9px、寿命1450 actor ms。0.5px未満の細部は主証拠にしない。',SamplingContract:'DPR1 H64、暗明同時刻の同shader。AAは断面半径と投影Hから解析的に計算し、分岐後に不定なfwidthを使わない。全寿命断面と3回実時間ループを別に観測。'},
  soundRevision:'r2は受納体積の連続化に合わせ、共通原因の吸入/二段到達/終止を保ち、215Hz→身体の充填へ対応する非線形倍音と390Hzの有限受納共振を追加した専用PCM。素材/版/波形を混同しない。聴感はnot_run。',
  revision:{parent:'sol61-stamina-r1',cause:'H64で衣装発光/小さい付属物へ退化し星が埋まった',changed:'改稿3:太腿/前腕の大きな外側回り道を廃し、腹部から身体の部位内へ直接連続する厚い分岐を採る。不透明な外殻を持たず、密度を本体の厚みと移動前線の局所発光へ配分する。足へ到達する流れは下向きで止まり、上昇粒子にしない。原画RGBの独立、前縁と接触星の独立支持域',protected:'正のgain-staminaのみ、主形の全寿命、発光、角度固定、同一版SFX時計、無音verify、未採用'}
});
