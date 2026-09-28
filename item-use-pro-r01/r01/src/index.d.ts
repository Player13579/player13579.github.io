export type Variant='mineral-water'|'seawater'|'antidote';
export interface Receipt {
 id:string; kind:'action-item-use'; variant:Variant; playerId:string; actorGeneration:string;
 sessionId:string; roomId:string; x:number; y:number; radius:90; durationMs:0;
 consumptionSucceeded:true; selfUse:true; target?:null|''; targetId?:null|'';
 targetPlayerId?:null|''; targetX?:null|''; targetY?:null|'';
 /** 同一単調clock。server epochをそのままperformance.nowと比較しない。 */
 occurredAtMs:number; receivedAtMs:number; delivery:'live'|'late';
}
export interface Context {sessionId:string;roomId:string;viewerId:string;documentVisible:boolean;reducedMotion:boolean}
export interface ActorGate {playerId:string;generation:string;sessionId:string;roomId:string;authorizedForViewer:boolean;privacyAllowed:boolean;visible:boolean;onScreen:boolean;occluded:boolean;maskReady:boolean}
export interface Effect {key:string;receipt:Readonly<Receipt>;startMs:number;endMs:number;ageMs:number;reducedMotion:boolean}
export interface Draw {xPx:number;yPx:number;worldToPixel:number;variant:Variant;ageMs:number;reducedMotion:boolean}
export interface Mask {frameId:number;width:number;height:number;data:Uint8Array}
export class ActionItemUse {
 constructor(options:{confirm:(r:Receipt,c:Context)=>boolean;getContext:()=>Context;resolveActor:(id:string,c:Context)=>ActorGate|null;clock?:()=>number;sound?:UseSound|null});
 receive(r:Receipt):{accepted:boolean;reason?:string;key?:string;remainingMs?:number};frame():Effect[];cancelAll():void;dispose():void;
 readonly activeCount:number;readonly seenCount:number;readonly stats:Record<string,unknown>;
}
export class UseSound {
 constructor(options?:{verify?:boolean;contextFactory?:()=>AudioContext;documentRef?:Document});
 unlockFromGesture(event:Event):Promise<boolean>;setMuted(value:boolean):void;stopAll():void;stopKey(key:string):void;dispose():void;
 attempt(input:{key:string;variant:Variant;fresh:boolean;contextVisible:boolean}):{played:boolean;reason?:string};
 readonly muted:boolean;readonly state:string;readonly voiceCount:number;readonly stats:Record<string,unknown>;
}
export class UseRenderer {
 static create(canvas:HTMLCanvasElement,options?:{shaderLoader?:(name:string)=>Promise<string>;onDeviceLost?:(info:unknown)=>void}):Promise<UseRenderer>;
 render(draws:Draw[],frame:{frameId:number;mask:Mask;devicePixelRatio?:number}):boolean;
 resize(width:number,height:number):void;checkpoint():Promise<Record<string,unknown>>;dispose():void;
}
export function createDvaAdapter(options:{normalizeConfirmedConsumption:(wire:unknown,transport:unknown)=>Receipt|null;getContext:()=>Context;resolveActor:(id:string,c:Context)=>ActorGate|null;clock?:()=>number;sound?:UseSound}):{runtime:ActionItemUse;onCanonicalReceipt:(wire:unknown,transport:unknown)=>unknown;frame:()=>Effect[];onContextInvalidated:()=>void;dispose:()=>void};
export const VARIANTS:readonly Variant[];export const LIFETIME_MS:1200;export const BODY_DURATION:Readonly<Record<Variant,number>>;
