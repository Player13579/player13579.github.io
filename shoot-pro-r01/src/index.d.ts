/** 実装はES modules。deviceはブラウザーの実GPUDeviceを渡す。GPU型定義への外部依存を避けobjectとする。 */
export type Variant = 'handgun'|'smg'|'assault'|'sniper'|'taser';
export interface ShootEvent {
  type:'action-shoot'; id:string; playerId:string; x:number; y:number;
  targetX:number; targetY:number; variant:Variant; radius:number; occurredAt:number;
}
export interface ShotContext {
  roomId:string; epoch:number;
  muzzle:{x:number;y:number;depth:number;sourceId:string;at:number};
  /** この実装はmuzzle.depthと同じ値のみ受理 */
  endDepth:number; pathLimitT?:number;
}
export interface NormalizedShot {
  readonly event:Readonly<ShootEvent>; readonly context:Readonly<ShotContext>;
  readonly id:string; readonly playerId:string; readonly variant:Variant; readonly occurredAt:number;
  readonly start:Readonly<{x:number;y:number}>; readonly end:Readonly<{x:number;y:number}>;
  readonly dir:Readonly<{x:number;y:number}>;
  readonly startDepth:number; readonly endDepth:number; readonly fullLength:number;
  readonly length:number; readonly roomId:string; readonly epoch:number; readonly life:number;
}
export interface ShotFrame extends NormalizedShot { age:number }
export interface Camera {x:number;y:number;pixelsPerUnit:number;/** rad */rotation:number}
export interface Scene {
  color:Uint8Array; depth:Float32Array; receiverMask:Uint8Array; protectedMask:Uint8Array;
  occluders?:Array<{x0:number;y0:number;x1:number;y1:number;blocksLight?:boolean}>;
}
export interface RenderOptions {reducedMotion?:boolean;bloom?:boolean}
export interface EnqueueResult {status:'accepted'|'rejected'|'duplicate'|'expired'|'capacity';sourceId?:string;reason?:string}
export type AudioOwner = 'legacy'|'shoot-e';
export type SourceClaim = (sourceId:string,owner:'shoot-e')=>boolean;
export function normalizeShot(event:ShootEvent,context:ShotContext):NormalizedShot;
export class SourceLedger {
  constructor(limit?:number); readonly size:number;
  claim(id:string,fingerprint?:string):{ok:boolean;reason?:string};has(id:string):boolean;
}
export class GameClock {
  constructor(options?:{gameTime?:number;wallTime?:number;rate?:number});
  time:number; wall:number;rate:number;
  advance(wallTime:number):number;setRate(rate:number,wallTime:number):number;
}
export class ShotEngine {
  constructor(options?:{roomId?:string;epoch?:number;now?:number;maxShots?:number;maxPending?:number;maxLedger?:number;onStart?:(shot:NormalizedShot,age:number)=>void;onRoomChange?:(room:{roomId:string|null;epoch:number})=>void});
  enqueue(event:ShootEvent,context:ShotContext):EnqueueResult;
  tick(now:number):ShotFrame[];snapshot():ShotFrame[];
  setRoom(room:{roomId:string;epoch:number;now?:number}):void;dispose():void;
  readonly stats:Record<string,number>;readonly ledger:SourceLedger;
}
export function requestWebGPU():Promise<{adapter:object;device:object;info:object}>;
export class ShotRenderer {
  static create(canvas:HTMLCanvasElement,options?:{device?:object;adapterInfo?:object|null;worldUnitsPerMeter?:number}):Promise<ShotRenderer>;
  width:number;height:number;device:object;fatal:string|null;
  readonly stats:{frames:number;visibleShots:number;culledShots:number;submitCpuMs:number};
  resize(width:number,height:number):void;uploadScene(scene:Scene):void;
  render(shots:ShotFrame[],camera:Camera,options?:RenderOptions):ShotRenderer['stats'];
  readPixels():Promise<{width:number;height:number;rgba:Uint8Array}>;dispose():void;
}
export class ShotAudio {
  constructor(options?:{context?:AudioContext|OfflineAudioContext|null;owner?:AudioOwner;claimSource?:SourceClaim|null;standalone?:boolean;maxVoices?:number;masterGain?:number});
  unlock():Promise<string>;setOwner(owner:AudioOwner):void;
  setListener(listener:{x:number;y:number;range:number;panRange:number}):void;
  play(shot:NormalizedShot,age?:number):{status:'suppressed'|'played';reason?:string;sourceId?:string};
  setRate(rate:number):void;stopAll():void;dispose():Promise<void>;
  readonly stats:Record<string,number>;
}
export class ShootERuntime {
  static create(options:{canvas:HTMLCanvasElement;device?:object;adapterInfo?:object;worldUnitsPerMeter:number;roomId:string;epoch:number;now?:number;audioOwner?:AudioOwner;claimAudioSource?:SourceClaim|null}):Promise<ShootERuntime>;
  constructor(options:{renderer:ShotRenderer;audio:ShotAudio;roomId?:string;epoch?:number;now?:number});
  readonly renderer:ShotRenderer;readonly audio:ShotAudio;readonly engine:ShotEngine;
  ingest(event:ShootEvent,context:ShotContext):EnqueueResult;
  frame(args:{gameTime:number;rate?:number;camera:Camera;scene?:Scene;options?:RenderOptions}):ShotRenderer['stats'];
  setRoom(room:{roomId:string;epoch:number;now?:number}):void;unlockAudio():Promise<string>;dispose():Promise<void>;
}
export const VARIANTS:ReadonlyArray<Variant>;
export const PROFILES:Readonly<Record<Variant,{index:number;title:string;name:string;life:number;transit:number;width:number;muzzleLength:number;body:ReadonlyArray<number>;light:ReadonlyArray<number>;peak:number;audioDuration:number;audioGain:number;demoInterval:number}>>;
export const LIMITS:Readonly<Record<string,number>>;
export function synthesize(variant:Variant,options?:{sampleRate?:number;seed?:number}):Float32Array;
export function analyzePCM(pcm:Float32Array,sampleRate:number):Record<string,number>;
export function encodeWav(pcm:Float32Array,sampleRate:number):Uint8Array;
