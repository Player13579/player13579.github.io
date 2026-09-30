export const SOURCE={"repository":"player13579/B","branch":"Codex-honoo","commit":"37eb4bdfe59f0dc075f9b4333b7d6af76b784a88","baseBlob":"8a908495ae1f9b7175e00384ab88c50e5c78bd43","extensionBlob":"0eda016558e426ff4142d850d26200b40fafd834"};
export const DESIGN={
  "id": "cooldown-clock-zero-r3",
  "name": "待機時間短縮・光時計から身体への連続受領r3",
  "author": "GPT-6.1-Sol",
  "adoption": "unadopted",
  "source": {
    "repository": "player13579/B",
    "branch": "Codex-honoo",
    "commit": "37eb4bdfe59f0dc075f9b4333b7d6af76b784a88",
    "baseBlob": "8a908495ae1f9b7175e00384ab88c50e5c78bd43",
    "extensionBlob": "0eda016558e426ff4142d850d26200b40fafd834"
  },
  "intent": "時計の待機終了位置が現在位置へ向かって部分的に前倒しされ、その時計から受益者へ放射が渡る。物体や層間隔を押し潰すのでなく、次の行動まで待つ時間が減る恩恵を表す。時計単独アイコンや頭上マーカーで完結しない。",
  "gameplay": "確定した正の残待機短縮のみ、同じcause/実受益者へ一回。時計は正規化した非数値表示で、実CT・実短縮率・全reset・ready状態を創作しない。現在針と前倒し後の終了針は離れており、待機の全終了を主張しない。",
  "phenomenon": "宣言されたデジタル光時計と放射結合。受益者の右手近傍で時計の光学場が生じ、同じ源の終了針/待機弧が早い時刻へ再登録される。再登録時の強い放射が実手へ渡り、局所反射が胸から反対手へ引き継がれる。時計と身体の結果が同一causeの有限現象である。",
  "coordinates": {
    "world": "受益者相対m、+X右/+Y上/+Z手前。身体1.65mをH64へ投影。時計面はcamera-facingの意図したデジタル面で、虚構の固体厚みを主張しない。奥側放射は原画alphaに遮蔽される。",
    "gravity": {
      "condition": "normal",
      "vector": [
        0,
        -9.81,
        0
      ],
      "response": "既存足支持を保持。光時計が身体を加速/押す力は創作しない。"
    },
    "wind": {
      "medium_state": "air",
      "direction": [
        0,
        0,
        0
      ],
      "speed": 0,
      "gust": "none",
      "shear": "none",
      "turbulence": "none",
      "response": "静穏。衣服/髪の追加運動なし。"
    }
  },
  "geometry": {
    "body": {
      "asset": "public/assets/generated/sophia-front-five-v753.png",
      "crop": [
        62,
        15,
        136,
        225
      ],
      "atlas": [
        768,
        512
      ],
      "unchanged": true
    },
    "clock": {
      "centreH64": [
        36,
        17.0289
      ],
      "radius": 16.5,
      "ringWidth": 1.8,
      "innerFaceRadius": 14.3,
      "cardinalCount": 4,
      "cardinalLength": 3.1,
      "cardinalWidth": 1.1,
      "currentHandLength": 9,
      "currentHandWidth": 1.4,
      "endHandLength": 13.2,
      "endHandWidth": 2,
      "hubRadius": 2,
      "currentAngleFrom12": 0,
      "currentAngleRangeFrom12": [0, 1.55],
      "endAngleRangeFrom12": [2.4, 2.65],
      "remainingGapRangeRadians": [2.4, 1.1],
      "directionConvention": "screen +x right, +y down; direction(theta)=[sin(theta),-cos(theta)], positive theta is clockwise",
      "meaning": "全期間で外径一定。短い現在針と長い待機終了針はともに時計回りへ動き、両者間の待機弧が2.4radから1.1radへ短くなる。数字/tick count/実時刻の文字なし。4つの大きい方位印と2針で時計をH64で読ませる。"
    },
    "recipient": {
      "rightHand": [
        8.5,
        8.5
      ],
      "chest": [
        0,
        -4.5
      ],
      "leftHand": [
        -11.5,
        6.5
      ]
    },
    "connection": "clockhub[36,17.0289]→右手[8.5,8.5]→胸[0,-4.5]→左手[-11.5,6.5]へ一本の幅ある放射packetが連続して進む。芯と透過外縁、受光した3領域の共有結果を分離。短い接触flashだけで終えない。",
    "footprint": "時計x19.5–52.5/y0.5289–33.5289px。実右手と左rimの間に約5pxの可視空間を確保、顔非交差。",
    "macro": "時計の固定輪郭/2針/前倒し弧→連続する源と身体接点",
    "meso": "リングと針と半透明face、放射束の太い芯/透過外縁、実受光域と外側点源を分離",
    "micro": "文字/細かい目盛/歯車/針群/ノイズ/密粒子は省く。H64の大きい時計要素と因果を優先"
  },
  "phases": {
    "clockBasis": "committed eventからのwall seconds。actor倍率では加速しない。実ゲームdeadlineの数値に相当する時計表示ではなく、一回の恩恵表示。",
    "durationMs": 2400,
    "fixtureCycleMs": 3500,
    "birth": "0–220ms手近傍から光時計/現在針/元の終了針が現れる。",
    "advance": "300–720msでa=smoothstep(.30,.72,t)。現在針角は1.55a、終了針角は2.4+.25a。両針は時計回りに動き、待機弧の角度gap=end-currentは2.4→1.1radへ短くなる。",
    "transfer": "700–1440ms一本の幅ある主放射がclockhub→実右手→胸→左手を連続して進む。smoothstep経路の右手約1059ms/胸1191ms/左手1440msで受光。",
    "result": "1440–1900ms受光した左右手と胸に同じcauseの共有反射/放射が保持され、1800–2400ms同時に有限消散。時計が単独で後半を代表しない。実CT/ready/全resetは示さない。",
    "end": "1800–2400ms同じcauseのclock/結合/身体/OBSが共に終了。後半を粒子や孤立時計だけで代用しない。"
  },
  "optics": {
    "material": "デジタル時計の半透明光学面、輪郭・2針・待機弧を別被覆にする。発光と表面alphaを分離し線/平面である理由を明示。周囲の放射結合には芯と透過外縁があり、身体alpha内の反射を別に評価する。",
    "colour": "琥珀色の時刻登録と白金色の前倒し源、受光した身体に暖い白金の局所反射。色数を増やすためのgradientは使わない。時計の時刻領域→作用源という属性差だけをPHに束縛する。",
    "LDM": "時計部分前倒しの白芯→clock→実手→胸→左手の主packet→同じ受領面の後半保持。受光kernelは手6x8/胸7x7/反対手6x8px、後半係数.80/.75/.80。胸のface側への広がりを狭め、元の輪郭/原画を保持。局所emission/bloomで身体が受けた光を可視化する。背景/元白峰は不変。",
    "sparkle": {
      "mandatory": true,
      "count": 3,
      "referenceAngleDegrees": 17.25,
      "angleRule": "r1と同じ17.25度を全位置/時刻で固定。新clockhub→右手の軸を同じ角度に配置し、sourceの接線で回転しない。",
      "source": "終了針先の源点、peak740ms",
      "recipient": "実右手の受光後に生じる手外側の受益者光学源[18,2]peak1250ms、左手外[-17,7]peak1550ms。source/recipient各crossは全17.25度。受益者源はreceiver有効時だけ生じ、主光を下げずに時間/空間を分離。"
    },
    "PostEffects": "源束縛bloomは11tap/radius5screenpixelのseparableGPUfilter。crossPSFは17.25度の同一axis、u±20/v±16H64pxに有限apodizationを宣言し、中心/主光条は保持。PH+原画bodyとfilter拡張+PSF全supportを包含するprojectedscissor/OBS earlyreturnだけで仕事量を限定。"
  },
  "sfx": {
    "durationMs": 2050,
    "source": "同じcauseの光時計/受益者",
    "composition": "時計成立の短い硬質共鳴、終了時刻再登録中の非周期な連続倍音、前倒し成立の明瞭な響き、受け手へ定着する短い上部共鳴。秒を数える周期tick/バネ/圧縮音を作らない。",
    "timing": "220ms時計成立、300–720ms前倒し連続倍音、740ms成立、1250/1550ms受光アクセント、2050msまで0。",
    "verify": "verifyではAudioContextを作らずgain0。通常はgalleryの明示gesture/muteに従い、cause毎に一声だけ。"
  },
  "extensions": {
    "VFX": "明示",
    "ECodeImplementation": "明示",
    "LDM": "VFXによる起動",
    "PostEffects": "源束縛bloom/3pointcrossPSF",
    "KeywordExpansion": "非起動:登録v/f/o等の明示キーワードなし。clockという題材だけでv1を偽起動しない。",
    "GradientAnchorPolicy": "属性具体化による琥珀時刻→白金作用源のPH内推論。装飾色域/虹色を既定追加しない。"
  },
  "acceptance": "実H64全寿命で時計/2針/部分前倒し/身体への結合を読み、source/OBS/clock/sparkle/receiverOFFと前後分離を判定。有限VFX/SFX/verify0/positivecause/3完全loopを技術確認。時計単体アイコン、頭上マーカー、全reset誤読、圧縮、装甲/顔横切り、後半粒子だけの残存は棄却。聴感/本編/公開/採用は別gate。 r2追加棄却: 孤立clock表示/一瞬flash/身体結果欠落/右手sparkle埋没。",
  "remaining": "r2時計意味/連続作用を保持した許可済み改稿。右cross/後半受領/clean cadenceの実H64判定は未了。",
  "renderContract": "render-contract.json/projection.mjsに定義。shader/rendererへの機械的portはbounds支持集合を削らない。"
};
export const clip=x=>Math.max(0,Math.min(1,x));export function ease(a,b,t){const v=clip((t-a)/(b-a));return v*v*(3-2*v);}
export function stateAt(ms){const t=ms/1000,p=ease(.30,.72,t),life=ease(0,.22,t)*(1-ease(1.80,2.40,t));const currentAngle=1.55*p,endAngle=2.4+.25*p;return{t,advance:p,currentAngle,endAngle,remainingGap:endAngle-currentAngle,clockRadius:16.5,life,transfer:ease(.70,.88,t)*(1-ease(1.55,1.98,t)),live:ms>=0&&ms<2400,clockBasis:'wall'};}
export function acceptBenefit(r,seen=new Set()){if(!r||r.kind!=='remaining-wait-shortened'||r.outcome!=='committed'||!r.causeId||!r.beneficiaryId||r.snapshot||r.futureCreditOnly||r.failed)return false;const n=Number(r.removedMs),valid=r.removedMs!=null?Number.isFinite(n)&&n>0:r.authoritativePositive===true;if(!valid)return false;const id=`${r.causeId}:${r.beneficiaryId}`;if(seen.has(id))return false;seen.add(id);return true;}
