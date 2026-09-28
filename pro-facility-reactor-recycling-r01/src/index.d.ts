export type EffectKey='A'|'B';
export interface Point {x:number;y:number}
/** 認証済みtransportが正規化したデータ。自己申告のauth=true等を信頼しない。 */
export interface FacilityReceipt {
 status:'success'; objectId:string;type:string;effectKind:string;playerId:string;
 objectCausalId:string;capturedTime:number;worldOrigin:Point;
}
export interface Clock {
 /** 同一originの単調ms。 */ monotonicMs():number;
 /** capturedTimeと同じms/epochの同期済みサーバー時計。 */ serverNowMs():number;
 /** 同期の誤差上限。測定不能ならInfinityにし、表示をfail-closedにする。 */ uncertaintyMs():number;
}
export interface ActorAnchor {playerId:string;world:Point;heightWorld:number;sampledAtMonotonicMs:number}
export interface EffectFrame {causeKey:string;targetKey:EffectKey;origin:Point;receiver:Point|null;heightWorld:number|null;ageMs:number;playerId:string}
export interface CauseLedger {claim(key:string,fingerprint:string,meta?:Record<string,unknown>):Promise<'claimed'|'duplicate'|'conflict'>}
export interface ReceiveResult {status:string;suppressGeneric:true;causeKey?:string;ageMs?:number}
export class FacilityController {
 constructor(options:{serverEpoch:string;authenticateAndNormalize:(raw:unknown)=>Promise<FacilityReceipt|null>|FacilityReceipt|null;
 ledger:CauseLedger;clock:Clock;isPlayerKnown:(id:string)=>boolean;getActorAnchor:(id:string,nowMs:number)=>ActorAnchor|null;
 audio?:FacilityAudio;dispatchGeneric?:(x:{receipt:FacilityReceipt;causeKey:string;ageMs:number})=>void;
 onDiagnostic?:(event:Record<string,unknown>)=>void;allowMemoryLedger?:boolean});
 receive(raw:unknown):Promise<ReceiveResult>;sampleFrame():EffectFrame[];dispose():void;stats:Record<string,number>;
}
export class IndexedDBCauseLedger implements CauseLedger {
 static open(name?:string):Promise<IndexedDBCauseLedger>;
 claim(key:string,fingerprint:string,meta?:Record<string,unknown>):Promise<'claimed'|'duplicate'|'conflict'>;close():void;
}
export class MemoryCauseLedger implements CauseLedger {
 claim(key:string,fingerprint:string,meta?:Record<string,unknown>):Promise<'claimed'|'duplicate'|'conflict'>;
}
export class FacilityAudio {
 constructor(options:{context?:AudioContext|null;outputBus?:AudioNode|null;getMixState?:()=>{muted:boolean;volume:number};verify?:boolean});
 playOnce(event:{causeKey:string;targetKey:EffectKey;ageMs:number}):string;stopAll():void;dispose():void;stats:Record<string,number>;
}
export interface View {centerWorld:Point;pixelsPerWorldUnit:number;width:number;height:number;referenceHeightWorld:number}
/** GPU型はWebGPU標準。型利用側は@webgpu/types等の公式IDL由来宣言を環境に追加できる。実行依存ではない。 */
export class NativeFacilityRenderer {
 static create(canvas:HTMLCanvasElement,options?:{device?:unknown;adapter?:unknown;onDiagnostic?:(event:Record<string,unknown>)=>void;fetchSource?:(url:URL)=>Promise<string>}):Promise<NativeFacilityRenderer>;
 render(frames:EffectFrame[],view:View,options?:{glow?:boolean;reducedMotion?:boolean;background?:[number,number,number];beforeEffects?:(pass:unknown,view:View)=>void}):boolean;
 encodeToPass(pass:unknown,frames:EffectFrame[],view:View,options?:{glow?:boolean;reducedMotion?:boolean}):void;
 destroy():void;compilation:Record<string,unknown[]>;adapterInfo:unknown;lastFrameStats:Record<string,number>;
}
export function installFacilityPresentation(host:{replaceFacilityPresentation(callback:(raw:unknown)=>void):()=>void},controller:FacilityController):()=>void;
export const VISUAL_LIFETIME_MS:2200;
export const TARGETS:Readonly<Record<string,Readonly<{objectId:string;type:string;effectKind:string;origin:Readonly<Point>;key:EffectKey;declaredBenefit:Readonly<{delta:number;durationMs:number}>;cooldownMs:number}>>>;
export function reactorState(ageMs:number,reducedMotion?:boolean):Record<string,unknown>;
export function recyclingState(ageMs:number,reducedMotion?:boolean):Record<string,unknown>;
