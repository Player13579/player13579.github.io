/** DVA接触Eのホスト契約。GPU詳細型は採用ホストのWebGPU型定義へ合わせる。 */
export type Weapon = 'handgun'|'smg'|'assault'|'sniper'|'taser';
export type Variant = `${'aim'|'hip'}:${Weapon}`;
export interface CanonicalEvent { readonly type:'action-gunner-headshot';readonly id:string;readonly playerId:string;readonly targetId:string;readonly x:number;readonly y:number;readonly radius:150;readonly variant:Variant;readonly atMs:number; }
export interface Session {roomId:string;epoch:number;}
export interface Receipt extends Session {event:CanonicalEvent;}
export interface VisibilityPermission {targetVisible:boolean;contactVisible:boolean;targetPresent:boolean;targetGeneration:string;pan?:number;}
export interface Profile {variant:Variant;weapon:Weapon;weaponIndex:number;aim:boolean;durationMs:number;length:number;width:number;spread:number;skew:number;decay:number;frequency:number;soundMs:number;damping:number;}
export interface Envelope {u:number;body:number;emission:number;release:number;width:number;length:number;}
export interface EffectFrame {readonly event:CanonicalEvent;readonly profile:Profile;readonly ageMs:number;readonly rate:number;readonly reducedMotion:boolean;readonly envelope:Envelope;readonly targetGeneration:string;}
export interface SoundRequest {event:CanonicalEvent;profile:Profile;ageMs:number;rate:number;pan?:number;}
export interface SoundPort {play(request:SoundRequest):unknown;stop(id:string,reason?:string):unknown;setRate?(rate:number):unknown;resetSession?():unknown;}
export class RateClock {constructor(options:{sourceNow:()=>number;rate?:number;historyMs?:number});readonly rate:number;now():number;setRate(rate:number):void;elapsedSince(at:number,end?:number):number|null;}
export class HeadshotContactSystem {constructor(options:{clock:RateClock;verifyCanonical:(packet:object,session:Session)=>Receipt|null|Promise<Receipt|null>;getPermission:(event:CanonicalEvent,context:Session&{phase:'admission'|'frame'})=>VisibilityPermission|null;sound?:SoundPort|null;roomId:string;epoch:number;reducedMotion?:boolean;});readonly activeCount:number;readonly seenCount:number;readonly session:Session;readonly diagnostics:Array<{status:string}>;readonly reducedMotion:boolean;setReducedMotion(value:boolean):void;setSession(roomId:string,epoch:number):void;accept(packet:object):Promise<{accepted:boolean;id?:string;reason?:string}>;frame():EffectFrame[];cancelAll(reason?:string):void;dispose():void;}
export function normalizeCanonicalEvent(input:unknown):CanonicalEvent;
export function profileFor(variant:Variant):Profile;
export function sampleProfile(profile:Profile,ageMs:number,reducedMotion?:boolean):Envelope;
export const EVENT_TYPE:'action-gunner-headshot';
export const WEAPONS:readonly Weapon[];
export const VARIANTS:readonly Variant[];
export const LIMITS:Readonly<Record<string,number>>;
export const OBSERVATION_BUDGET:Readonly<Record<string,number>>;
export function synthesizeContact(variant:Variant,sampleRate?:number):Float32Array;
export function encodeWav(pcm:Float32Array,sampleRate?:number):ArrayBuffer;
export function pcmMetrics(pcm:Float32Array,sampleRate:number):Record<string,number>;
export class ContactAudio implements SoundPort {constructor(context:AudioContext,options?:{destination?:AudioNode;volume?:number});readonly activeCount:number;play(request:SoundRequest):{played:boolean;id?:string;reason?:string};setRate(rate:number):void;setVolume(volume:number):void;stop(id:string):void;resetSession():void;dispose():void;}
export interface ReceiverSurface {normal:[number,number,number];view:[number,number,number];light:[number,number,number];roughness:number;f0:number;albedo:number;occlusion:number;coverage:number;}
export function receiverResponse(surface:ReceiverSurface|null):number;
export function makeReceiverMask(options:{authorizePixel:(u:number,v:number)=>boolean;sampleReceiver:(u:number,v:number)=>ReceiverSurface|null;protectPixel?:(u:number,v:number)=>boolean;size?:128;}):Uint8Array;
export interface Projection {center:[number,number];axisX:[number,number];axisY:[number,number];}
export interface RenderRecord {frame:EffectFrame;projection:Projection;mask:Uint8Array;}
export interface PixelCapture {pixels:Uint8Array;width:number;height:number;}
/** 依存を強制しないためGPUDevice/GPUTextureViewはunknown。ホスト側で実WebGPU型へ狭める。 */
export class HeadshotRenderer {static create(options:{canvas:HTMLCanvasElement;device?:unknown;shaderSources?:{contact:string;composite:string};format?:'rgba8unorm'|'bgra8unorm'}):Promise<HeadshotRenderer>;readonly device:unknown;readonly isLost:boolean;diagnostics:Record<string,unknown>;resize(width:number,height:number):void;setScenePixels(data:Uint8Array|Uint8ClampedArray):void;useHostSceneView(view:unknown):void;render(records:RenderRecord[],options?:{layerMask?:number;capture?:boolean}):Promise<PixelCapture>|null;submitted():Promise<void>;dispose():void;}
export function packInstance(frame:EffectFrame,projection:Projection,layerMask?:number):Float32Array;

export function validateProjection(projection:Projection):{inverse:number[];halfExtent:number};
