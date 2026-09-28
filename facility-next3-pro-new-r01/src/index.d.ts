/** Native WebGPUの型はホストのDOM/WebGPU型定義から解決する。ランタイム依存は0。 */
export type ObjectId = 'v302-power-recharge-3' | 'v302-atrium-hydration-2' | 'v302-engineering-coolingUnit-3';
export interface SuccessReceipt {
  objectId:ObjectId; type:'recharge'|'mineralWaterBar'|'coolingUnit'; effectKind:string;
  playerId:string; objectCausalId:string; capturedTime:number; worldOrigin:{x:number;y:number};
}
export interface GenericSoundReceipt { owner:string;objectId:string;objectCausalId?:string; [field:string]:unknown; }
export interface ReceiptDecision {handled:boolean;suppressGeneric:boolean;status:string;key?:string;startMs?:number;expiresMs?:number;sound?:string;}
export type Point3 = [number,number,number];
export interface ReceiverSurface {
  /** 実在する既存面のワールド座標三角形。新しいreceiverを仮定しない。 */
  triangles:[Point3,Point3,Point3][];normal:Point3;albedo:Point3;sourceVisibility:number;
  /** 0.05..1のroughness、normal-incidence RGB Fresnel、面からcameraへ向く方向。 */
  roughness:number;f0:Point3;viewDirection:Point3;
}
export interface FrameBinding {
  /** column-major。game world(x,y,elevation,1) → WebGPU clip。 */
  worldToClip:Float32Array|number[];
  viewport:{x:number;y:number;width:number;height:number};
  protectedRects?:[number,number,number,number][];
  sourceVisibility:(receipt:SuccessReceipt,sourceWorld:Point3)=>number;
  receiverSurfaces?:(receipt:SuccessReceipt)=>ReceiverSurface[];
}
export interface RuntimeOptions {
  effectKinds:Record<ObjectId,string>; clock:ReceiptClock;ledger:ReceiptLedger;
  audio?:OneShotAudio|null;renderer?:NativeWebGPUMeshRenderer|null;verify?:boolean;
  reducedMotion?:boolean;maxFutureSkewMs?:number;audit?:(event:Readonly<Record<string,unknown>>)=>void;
  timers?:{setTimeout:(fn:()=>void,ms:number)=>unknown;clearTimeout:(id:unknown)=>void};
}
export const VERSION:string;
export const LIFETIME_MS:2200;
export const FACILITIES:readonly {objectId:ObjectId;type:SuccessReceipt['type'];area:string;origin:{x:number;y:number};serverStaminaDelta:number;serverCooldownMs:number;design:string;index:number}[];
export function facilityById(id:string):typeof FACILITIES[number]|null;
export class ReceiptClock {
  constructor(options:{serverEpochMs:number;monotonicMs:number;now?:()=>number});
  now:()=>number;toMonotonic(capturedTime:number):number;
}
export class ReceiptLedger {
  constructor(options?:{snapshot?:[string,string][];persist?:((rows:[string,string][])=>void)|null;maxEntries?:number});
  claim(key:string,fingerprint:string):'claimed'|'duplicate'|'conflict'|'capacity_rejected'|'persistence_failed';
  snapshot():[string,string][];readonly size:number;
}
export function createSessionLedger(storage:Storage,namespace:string):ReceiptLedger;
export function receiptKey(receipt:SuccessReceipt):string;
export function receiptFingerprint(receipt:SuccessReceipt):string;
export function hash32(value:string):number;
export function createReceiptValidator(kinds:Record<ObjectId,string>):(raw:unknown)=>({ok:true;receipt:SuccessReceipt;definition:typeof FACILITIES[number]}|{ok:false;reason:string});
export class OneShotAudio {
  constructor(options?:{context?:AudioContext|null;destination?:AudioNode|null;verify?:boolean;muted?:boolean;volume?:number;audit?:(event:Record<string,unknown>)=>void});
  readonly activeCount:number;setState(state:{muted?:boolean;volume?:number}):void;
  stop(key:string,reason?:string):void;stopAll(reason?:string):void;dispose():void;
}
export class NativeWebGPUMeshRenderer {
  static create(options:{device:GPUDevice;format:GPUTextureFormat;sampleCount?:number;depthStencil?:GPUDepthStencilState;shaderCode?:string}):Promise<NativeWebGPUMeshRenderer>;
  diagnostics:readonly GPUCompilationMessage[];
  dispose():void;
}
export class FacilityUseRuntime {
  constructor(options:RuntimeOptions);
  readonly activeCount:number;readonly ledgerSize:number;readonly verify:boolean;
  onSuccess(receipt:unknown):ReceiptDecision;
  routeGenericSound(receipt:GenericSoundReceipt):ReceiptDecision;
  setReducedMotion(value:boolean):void;setAudioState(state:{muted?:boolean;volume?:number}):void;
  sweep():void;
  buildFrame(frame:FrameBinding):{mesh:{alpha:number[];light:number[];vertexCount:number};stats:Record<string,number>};
  draw(pass:GPURenderPassEncoder,frame:FrameBinding):Record<string,number>;
  dispose():void;
}
export function liftPlanarWorldToClip(matrix:Float32Array|number[],options?:{elevationToWorldX?:number;elevationToWorldY?:number}):Float32Array;
