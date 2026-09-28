export type Variant = 'handgun'|'smg'|'assault'|'sniper'|'taser';
export type PlayerId = string|number;
export interface SwitchReceipt { readonly id: `magic_${string}`; readonly type:'action-weapon-switch'; readonly playerId:PlayerId; readonly variant:Variant; readonly x:number; readonly y:number; readonly radius:90; readonly at:number; readonly targetX:null; readonly targetY:null; readonly durationMs:0; readonly target?:null|''; readonly object?:null|''; readonly viewer?:null|''; readonly mode?:null|''; readonly effectKind?:null|''; readonly completionKind?:null|''; }
export interface RoomScope { readonly roomKey:string; readonly generation:number; }
export interface VisibilitySnapshot { playerId:PlayerId; roomKey:string; scopeGeneration:number; visible:boolean; actorOnscreen:boolean; vent:boolean; ejected:boolean; }
export interface Viewport { width:number; height:number; scale:number; originX:number; originY:number; dpr?:number; background?:'dark'|'light'; }
export interface Dynamics { source:number; medium:number; shape:number; lens:number; alive:boolean; }
export interface EffectFrame extends Dynamics { readonly id:string; readonly playerId:PlayerId; readonly variant:Variant; readonly variantIndex:number; readonly worldX:number; readonly worldY:number; readonly x:number; readonly y:number; readonly radius:number; readonly scale:number; readonly ageMs:number; readonly sourceLocal:readonly number[]; readonly reducedMotion:boolean; }
export interface SelectionEvent { id:string; playerId:PlayerId; variant:Variant; changed:boolean; at:number; }
export interface BodyStart { id:string; playerId:PlayerId; variant:Variant; baseDurationMs:560; clockPolicy:'integrate_host_motion_multiplier'; fieldLifetimeMs:1200; soundOwner:'switch-E'; suppressBodySwitchSfx:true; startedAt:number; }
export interface BodyCancel { id:string; playerId:PlayerId; reason:string; }
export interface AudioDecision { owner:'switch-E'; suppressGeneralSelect:true; suppressBodySwitchSfx:true; play:boolean; reason:string; }
export interface SoundResult { played:boolean; reason?:string; start?:number; duration?:number; }
export interface AudioPort { playOnce(id:string,variant:Variant,permitted?:boolean):SoundResult; cancel(id:string):void; cancelAll():void; }
export interface ReceiveContext { scope:RoomScope; viewport:Viewport|null; isLocal?:boolean; isPhilia?:boolean; }
export interface ReceiveResult { accepted:boolean; reason?:string; visual?:boolean; changed?:boolean; route?:AudioDecision; sound?:SoundResult; }
export interface ControllerOptions { clock?:()=>number; ledger?:ReceiptLedger; audio?:AudioPort|null; readVisibility:(id:PlayerId)=>VisibilitySnapshot|null|undefined; readSelection?:(id:PlayerId)=>Variant|undefined; onSelection?:(event:SelectionEvent)=>void; onBodySwitch?:(event:BodyStart)=>void; onCancelBody?:(event:BodyCancel)=>void; onPrivacyClear?:(event:{reason:string})=>void; onDiagnostic?:(event:{code:string})=>void; maxActive?:number; }
export const VARIANTS: readonly Variant[];
export const FIELD_LIFETIME_MS:1200;
export const BODY_BASE_MS:560;
export const RADIUS_WORLD:90;
export class ReceiptError extends Error { code:string; constructor(code:string); }
export function parseReceipt(raw:unknown):SwitchReceipt;
export class ReceiptLedger { constructor(limit?:number); claim(id:string):'claimed'|'duplicate'|'ledger_full'; readonly size:number; readonly limit:number; }
export class BodyClock { step(dtMs:number,motionMultiplier:number):number; readonly progress:number; readonly done:boolean; }
export class SwitchEController {
  constructor(options:ControllerOptions); enterRoom(roomKey:string):RoomScope; receive(raw:unknown,context:ReceiveContext):ReceiveResult;
  frame(viewport:Viewport):readonly EffectFrame[]; cancelActor(playerId:PlayerId,reason?:string):void; releaseBody(id:string):void;
  clear(reason?:string):void; setPageVisible(visible:boolean):void; setReducedMotion(enabled:boolean):void; dispose():void;
  readonly activeCount:number; readonly bodyOwnerCount:number; readonly scope:RoomScope|null;
}
export interface AudioSettings { muted?:boolean; volume?:number; verify?:boolean; }
export class SwitchAudio implements AudioPort {
  constructor(options?:{context?:AudioContext|null;destination?:AudioNode|null;settings?:AudioSettings;maxVoices?:number});
  unlock():Promise<boolean>; setSettings(settings:AudioSettings):void; playOnce(id:string,variant:Variant,permitted?:boolean):SoundResult;
  cancel(id:string):void; cancelAll():void; readonly activeVoiceCount:number; readonly settings:Required<AudioSettings>; dispose():Promise<void>;
}
export function planAudio(options:{isLocal:boolean;changed:boolean;isPhilia:boolean;variant:Variant;current?:boolean}):AudioDecision;
export const DESIGN:Readonly<Record<Variant,Readonly<{index:number;name:string;peakMs:number;relaxMs:number;toneHz:number;toneEndHz:number;soundMs:number;overtone:number}>>>;
export function sampleDynamics(variant:Variant,ageMs:number,reducedMotion?:boolean):Dynamics;
export function sourceLocal(variant:Variant):number[];
export function lensGeometry(sourcePx:readonly number[],viewport:{width:number;height:number}):{source:number[];center:number[];ghost1:number[];ghost2:number[];axisOffset:number};
export function projectReceipt(receipt:{x:number;y:number},viewport:Viewport):{x:number;y:number};
export function visibilityAllowed(state:VisibilitySnapshot|null|undefined,playerId:PlayerId,roomKey:string,scopeGeneration:number):boolean;
export function packFrame(frames:readonly EffectFrame[]):Float32Array;
/** WebGPU型の外部依存を強制しないためhost device/passはopaque object。実行時は実GPUDeviceを要求する。 */
export class SwitchGPURenderer {
  static create(options:{device:object;format:'bgra8unorm-srgb'|'rgba8unorm-srgb'|'rgba16float';capacity?:number;shaderCode?:string|null}):Promise<SwitchGPURenderer>;
  readonly format:string; compilationMessages:{type:string;line:number;column:number;message:string}[];
  prepare(frames:readonly EffectFrame[],viewport:{width:number;height:number;dpr?:number}):void;
  encodeWorld(pass:object):void;encodeLens(pass:object):void;forget():void;dispose():void;
}
export class NativeWebGPURequired extends Error {}
export interface CanvasSurface { renderer:SwitchGPURenderer; device:object; adapterInfo:{vendor:string;architecture:string;device:string;description:string}; render(frames:readonly EffectFrame[],viewport:{width:number;height:number;dpr?:number;background?:'dark'|'light'}):boolean;clear():void;dispose():void; }
export function createCanvasSurface(canvas:HTMLCanvasElement,options?:{capacity?:number;onLost?:(reason:{reason:string;message:string})=>void}):Promise<CanvasSurface>;
export interface HostPorts {
  readVisibility:(id:PlayerId)=>VisibilitySnapshot|null|undefined;readSelection:(id:PlayerId)=>Variant|undefined;
  setSelection:(event:SelectionEvent)=>void;startBodySwitch:(event:BodyStart)=>void;cancelBodySwitch:(event:BodyCancel)=>void;
  clearEffectSurface:(event:{reason:string})=>void;onDiagnostic?:(event:{code:string})=>void;
  installSoundOwnership:(plan:{actionType:'action-weapon-switch';owner:'switch-E';suppressGeneralSelect:true;suppressPhiliaBodyThreeStage:true;receiptIsSoleTrigger:true;noDedicatedServerSoundReceipt:true})=>{installed:true;release:()=>void};
}
export interface SwitchBridge { controller:SwitchEController;audio:SwitchAudio;enterRoom(roomKey:string):RoomScope;receive(raw:unknown,context:ReceiveContext):ReceiveResult;frame(viewport:Viewport):readonly EffectFrame[];actorInvalidated(playerId:PlayerId,reason:string):void;bodyCompleted(id:string):void;setPageVisible(visible:boolean):void;dispose():Promise<void>; }
export function bindSwitchE(options:{ports:HostPorts;audio?:SwitchAudio|null;clock?:()=>number;ledger?:ReceiptLedger;maxActive?:number}):SwitchBridge;
