export type Variant=`${'hip'|'aim'}:${'handgun'|'smg'|'assault'|'sniper'|'taser'}`;
export interface CanonicalEvent {readonly type:'action-gunner-headshot';readonly id:string;readonly playerId:string;readonly targetId:string;readonly x:number;readonly y:number;readonly radius:150;readonly variant:Variant;readonly atMs:number;}
export interface Session {roomId:string;epoch:number;}
export interface Permission {targetVisible:boolean;contactVisible:boolean;targetPresent:boolean;targetGeneration:string;pan?:number;}
export interface Envelope {u:number;body:number;source:number;spread:number;fold:number;pressure:number;phase:string;}
export interface ContactProfile {readonly name:string;readonly durationMs:560;readonly soundMs:210;}
export interface Frame {readonly event:CanonicalEvent;readonly profile:ContactProfile;readonly ageMs:number;readonly rate:number;readonly reducedMotion:boolean;readonly envelope:Envelope;readonly targetGeneration:string;}
export interface AudioPort {play(args:{event:CanonicalEvent;profile?:ContactProfile;ageMs:number;rate:number;pan:number}):unknown;stop(id:string,reason?:string):void;setRate?(rate:number):void;resetSession?():void;}
export class RateClock {constructor(options:{sourceNow:()=>number;rate?:number;historyMs?:number});now():number;readonly rate:number;setRate(rate:number):void;elapsedSince(at:number,end?:number):number|null;}
export class HeadshotContactSystem {constructor(options:{clock:RateClock;verifyCanonical:(packet:object,session:Session)=>Promise<{event:CanonicalEvent;roomId:string;epoch:number}|null>;getPermission:(event:CanonicalEvent,context:Session&{phase:string})=>Permission|null;sound?:AudioPort|null;roomId:string;epoch:number;reducedMotion?:boolean});readonly activeCount:number;readonly seenCount:number;readonly session:Session;readonly reducedMotion:boolean;readonly diagnostics:Array<{status:string}>;accept(packet:object):Promise<{accepted:boolean;reason?:string;id?:string}>;frame():Frame[];setSession(roomId:string,epoch:number):void;setReducedMotion(value:boolean):void;cancelAll(reason?:string):void;dispose():void;}
export function normalizeCanonicalEvent(input:unknown):CanonicalEvent;
export const CONTACT:ContactProfile;
export const EVENT_TYPE:'action-gunner-headshot';
export const VARIANTS:readonly Variant[];
export const WEAPONS:readonly string[];
export const LIMITS:Readonly<Record<string,number>>;
export const LAYERS:Readonly<{body:1;source:2;receiver:4;bloom:8;all:15}>;
export function sampleContact(ageMs:number,reducedMotion?:boolean):Envelope;
export interface Projection {center:[number,number];axisX:[number,number];axisY:[number,number];}
export function projectContact(event:CanonicalEvent,worldToScreen:(x:number,y:number)=>[number,number]):Projection;
export function validateProjection(p:Projection):{det:number;inverse:number[];nativeRadius:number};
export function packInstance(frame:Frame,p:Projection,flags?:number):Float32Array;
export const FORM:Readonly<{baseRadius:number;aspectY:number;lobes:readonly (readonly number[])[]}>;
export function packForm():Float32Array;
export function boundaryAt(x:number,y:number,s:Envelope):{distance:number;radius:number;normalized:number;rim:number;growth:number};
export function formCoverage(size:32|64|128,s:Envelope):Uint8Array;
export interface Surface {present:boolean;visible:boolean;lightPathClear:boolean;normal:[number,number,number];toSource:[number,number,number];diffuseReflectance:number;}
export function surfaceResponse(s:Surface|null):number;
export function makeVisibilityMask(sample:(p:[number,number])=>{visible:boolean;protected?:boolean;surface?:Surface|null}):Uint8Array;
// GPUDevice等はWebGPU型宣言を持つホストで具体化。実行時は標準WebGPUオブジェクトのみ。
export interface GPUResources {device:any;adapterInfo:unknown;format:string;formPipeline:any;compositePipeline:any;compilation:unknown[];}
export function createGPUResources(options?:{device?:any;shaderRoot?:URL}):Promise<GPUResources>;
export interface Pixels {pixels:Uint8Array;width:number;height:number;}
export class ContactRenderer {constructor(canvas:HTMLCanvasElement|OffscreenCanvas,resources:GPUResources);readonly isLost:boolean;readonly size:[number,number];resize(width:number,height:number):void;setScenePixels(bytes:Uint8Array|Uint8ClampedArray):void;useHostSceneView(view:any):void;render(records:Array<{frame:Frame;projection:Projection;mask:Uint8Array}>,options?:{layerMask?:number;capture?:boolean}):Promise<Pixels>|null;submitted():Promise<void>;dispose():void;}
export const SOUND:Readonly<{durationMs:number;seed:number;voiceGain:number;masterGain:number}>;
export function synthesizeContact(sampleRate?:number):Float32Array;
export function pcmMetrics(a:Float32Array):{frames:number;finite:boolean;peak:number;rms:number;mean:number;clipSamples:number;maxAdjacentDelta:number;first:number;last:number};
export function encodeWav(a:Float32Array,sampleRate?:number):Uint8Array;
export class ContactAudio implements AudioPort {constructor(options?:{context?:AudioContext|null});unlock():Promise<string>;readonly unlocked:boolean;readonly activeVoices:number;play(args:{event:CanonicalEvent;ageMs?:number;rate?:number;pan?:number}):boolean;setRate(rate:number):void;stop(id:string):void;resetSession():void;dispose():Promise<void>;}
