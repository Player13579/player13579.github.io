export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export interface Point { x:number; y:number; }
export type Branch = 'charge'|'normal'|'resonance'|'cancellation'|'suppression';
export interface BaseEvent { id:string; atMs:number; origin:Point; cause:Json; owner:Json; phase:Json; pair:Json; authorityDeadlineMs?:number|null; sound?:boolean; revision?:number; [key:string]:unknown; }
export interface NormalEvent extends BaseEvent { targets?:Array<{id:string;position:Point}>; }
export interface PairEvent extends BaseEvent { a:Point; b:Point; }
export interface LockEvent extends BaseEvent { authorityDeadlineMs:number; targetId?:string; }
export interface Resolution { commandId:string; eventId:string; atMs:number; cause?:Json; owner?:Json; phase?:Json; pair?:Json; [key:string]:unknown; }
export interface LockExtension extends Resolution { authorityDeadlineMs:number; revision:number; }
export type Receipt = {accepted:true;event?:StoredEvent;id?:string} | {accepted:false;reason:string;id?:string};
export interface StoredEvent {id:string;kind:Branch;atMs:number;readonly binding:Readonly<BaseEvent>;attachment:Point;updates:readonly LockExtension[];resolution:Readonly<Resolution>|null;}
export interface Sample {event:StoredEvent;kind:Branch;ageMs:number;stateAgeMs:number;seconds:number;phase:string;terminal:boolean;terminalQ:number;authorityActive:boolean;deadline:number|null;removalAt:number|null;information:Record<string,unknown>;origin:Point;}
export interface Occluder { x?:number;y?:number;w?:number;h?:number;polygon?:Point[];depth?:number;color?:number[]; }
export const CONTRACT:Readonly<{chargeMs:1200;lockMs:7000;normalRange:260;cooldownMs:18000;pairWindowMs:1200;pairDistance:520;killRadius:110;damageRadius:260;pairVisualMs:1600;H64:64;audioRange:Readonly<Record<Branch,number>>}>;
export const VERSION:'r0.2';
export const TIMELINES:Readonly<Record<Branch,unknown>>;
export class ActorClock {constructor(ms?:number);ms:number;rate:number;setRate(rate:number):void;advance(realDeltaMs:number):number;reset(ms?:number):void;}
export class EventStore {constructor(options?:{maxEvents?:number;maxCommands?:number});events:Map<string,StoredEvent>;add(kind:Branch,event:BaseEvent):Receipt;resolve(command:Resolution):Receipt;extendLock(command:LockExtension):Receipt;moveAttachment(id:string,p:Point):boolean;reset():void;}
export function sampleEvent(event:StoredEvent,actorMs:number):Sample|null;
export function sampleStore(store:EventStore,actorMs:number):Sample[];
export class EMPEffects {
 /** device is a browser GPUDevice; object avoids a mandatory @webgpu/types package at runtime. */
 static create(options:{canvas:HTMLCanvasElement;device?:object;quality?:'high'|'low';onError?:(error:string)=>void;maxEvents?:number;maxCommands?:number}):Promise<EMPEffects>;
 events:EventStore;actorMs:number;rate:number;
 emit(kind:Branch,event:BaseEvent):Receipt;
 charge(event:BaseEvent):Receipt;normal(event:NormalEvent):Receipt;resonance(event:PairEvent):Receipt;cancellation(event:PairEvent):Receipt;
 suppression(event:LockEvent):Receipt;storageLock(event:LockEvent):Receipt;
 resolve(command:Resolution):Receipt;extendLock(command:LockExtension):Receipt;moveAttachment(id:string,p:Point):boolean;
 update(frame:{actorMs:number;rate?:number}):void;render():void;
 setView(view:{center?:Point;pixelsPerGamePixel?:number}):void;setQuality(quality:'high'|'low'):void;setBackground(rgba:[number,number,number,number]):void;setOccluders(shapes:Occluder[]):void;
 setListener(p:Point):void;setVolume(volume:number):void;enableAudio():Promise<AudioContextState>;
 snapshot():Record<string,unknown>;reset(actorMs?:number):void;dispose():Promise<void>;
}
