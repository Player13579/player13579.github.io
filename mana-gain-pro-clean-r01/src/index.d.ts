export interface Scope { roomId: string; sessionId: string; }
export interface Acc2State { state: 'off' | 'waiting' | 'reserved' | 'active'; movementEffective: boolean; }
export interface ReceiveRegion { x: number; y: number; radiusX: number; radiusY: number; }
export interface ConfirmedManaGain extends Scope {
  id: string; playerId: string; ownerPlayerId: string;
  type: 'gain-mana'; effectKind: 'mana'; confirmed: true; discrete: true; naturalRegen: false;
  source: 'map-object' | 'Mystery'; mysteryKind?: 'mana-surge'; variant?: string;
  manaBefore: number; manaAfter: number; expiresAt: number;
}
export interface Receiver extends Scope {
  alive: boolean; present: boolean; inVent: boolean; invisible: boolean; visibleToViewer: boolean;
  opacity: number; onScreen: boolean; world: {x:number;y:number}; manaReceiveRegion?: ReceiveRegion;
}
export interface Owner extends Scope { acc2: Acc2State; }
export interface ViewState { visible:boolean; muted:boolean; verify:boolean; reducedMotion:boolean; }
export interface Projection { x:number; y:number; scale:number; visible:boolean; }
export interface RenderEffect {id:string;token:string;x:number;y:number;scale:number;seconds:number;reducedMotion:boolean;gain?:number;recipient?:ReceiveRegion;needsEvidence?:boolean;}
export interface FrameProof {id:string;token:string;samples:number;seconds:number;}
export interface FrameResult {status:string;proofs:FrameProof[];pixels?:Uint8Array|null;width?:number;height?:number;error?:string;}
export class EffectClock { constructor(now?:number,rate?:1|2);at(now:number):number;setRate(rate:1|2,now:number):void;applyOwner(acc2:Acc2State,now:number):void;done(now:number):boolean;rate:1|2; }
export class SharedMediaClock {constructor(getAudioContext?:()=>AudioContext|null,perf?:()=>number);now():number;}
export class OneShotAudio {
  constructor(options?:{contextFactory?:()=>AudioContext;verify?:boolean});
  context:AudioContext|null;muted:boolean;voices:Map<string,unknown>;audit:unknown[];
  unlock():Promise<boolean>;setMuted(muted:boolean):void;setRate(key:string,rate:1|2):void;
  playOnce(key:string,options:{id:string;seconds:number;rate:1|2;visible:boolean;verify?:boolean;generation?:number}):boolean;
  stop(key:string,reason?:string):void;stopAll(reason?:string):void;resetScope():void;dispose():void;
}
export class ManaGainRuntime {
  constructor(options:Scope & {resolvePlayer:(id:string)=>Receiver|null;resolveOwner:(id:string)=>Owner|null;
    getView:()=>ViewState;project:(world:Receiver['world'],player:Receiver)=>Projection|null;now:()=>number;
    audio?:OneShotAudio;onAudit?:(entry:unknown)=>void;maxActive?:number;});
  active:Map<string,unknown>;generation:number;
  accept(event:ConfirmedManaGain):{accepted:boolean;reason?:string;token?:string};
  snapshot():RenderEffect[];frameAllowed(effect:RenderEffect):boolean;acknowledgeFrame(result:FrameResult):void;
  setOwnerAcc2(ownerId:string,state:Acc2State,at?:number):void;
  invalidate():void;cancel(id:string,reason:string):void;resetScope(roomId:string,sessionId:string):void;dispose():void;
}
export class ManaRenderer {
  static create(canvas:HTMLCanvasElement,options?:Record<string,unknown>):Promise<ManaRenderer>;
  render(effects:RenderEffect[],options?:{background?:'dark'|'light';evidence?:boolean;capture?:boolean;allowHidden?:boolean;isCurrent?:(effect:RenderEffect)=>boolean;}):Promise<FrameResult>;
  prepare(effects:RenderEffect[],options?:Record<string,unknown>):void;
  record(pass:unknown,effects:RenderEffect[],options?:{query?:boolean}):void;
  destroy():void;
}
export const CONTRACT: Readonly<{duration:number;sampleRate:number;maxActive:number;maxLedger:number;[key:string]:unknown}>;
export function ownerRate(state:Acc2State):1|2;
export function canvasVisible(canvas:HTMLCanvasElement):boolean;
export function sourceBoundLights(world:{x:number;y:number},seconds:number):Array<{role:string;x:number;y:number;radiusX:number;radiusY:number;colorLinear:number[];intensity:number}>;
