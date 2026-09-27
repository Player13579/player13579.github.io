export interface ActorState { playerId:string; nowMs:number; rate?:number; alive?:boolean; present?:boolean; visible?:boolean; position?:[number,number,number]; }
export interface GainEvent { type:'gain-stamina'; authoritative:true; kind:'discrete'; playerId:string; gain:number; startedAt:number; duration?:number; durationMs?:number; radius?:number; eventId?:string; sourceToken?:string; naturalTick?:false; }
export type NormalizedGain = Omit<GainEvent,'eventId'|'sourceToken'|'duration'|'radius'> & {key:string;duration:number;radius:number;eventId:string|null;sourceToken:string|null};
export interface AnalyticVolume { kind:0|1; center:number[]; radii:number[]; rotation:number; opacity:number; emission:number; charge:number; receipt:number; owner:string; eventKey:string; logicalLayer:string; }
export interface Sample { p:number; charge:number; outside:number; flux:number; receipt:number; visibility:number; compression:number; hold:boolean; emission:number; phaseName:string; volumes:AnalyticVolume[]; eventKey:string; playerId:string; }
export const CONTRACT: Readonly<Record<string,unknown>>;
export function normalizeGain(input:unknown):{error?:string;value?:NormalizedGain};
export function normalizedPhase(event:NormalizedGain,actorNowMs:number):number;
export function sampleCharge(p:number):Omit<Sample,'volumes'|'eventKey'|'playerId'>;
export function sampleEffect(event:NormalizedGain,actor:ActorState,options?:{phase?:number;lane?:number}):Sample;
export function audioEnvelope(p:number):{onset:number;flow:number;reserve:number;phase:number;charge:number};
export class StaminaEvents {
 constructor(options?:{onStart?:(e:NormalizedGain,a:ActorState,p:number)=>void;onUpdate?:(e:NormalizedGain,a:ActorState,p:number)=>void;onStop?:(e:NormalizedGain,reason:string)=>void;limit?:number});
 actors:Map<string,ActorState>;events:Map<string,unknown>;seen:Set<string>;stats:Record<string,number>;
 setActor(actor:ActorState):ActorState;ingest(input:unknown):{accepted:boolean;reason?:string;key?:string;event?:NormalizedGain};update():void;
 active():{event:NormalizedGain;actor:ActorState;phase:number;lane:number}[];
 stop(key:string,reason?:string):boolean;cancelPlayer(playerId:string,reason?:string):void;resetSession():void;
}
export class StaminaAudio {constructor(onStats?:(stats:unknown)=>void);enabled:boolean;enable():Promise<unknown>;start(event:NormalizedGain,actor:ActorState,phase:number):boolean;update(event:NormalizedGain,actor:ActorState,phase:number):void;stop(event:NormalizedGain):void;stopAll():void;disable():Promise<void>;dispose():Promise<void>;}
export interface Backend {device:GPUDevice;format:GPUTextureFormat;diagnostic:Record<string,unknown>;failed:boolean;}
export function createBackend(options?:{onDiagnostic?:(record:unknown)=>void}):Promise<Backend>;
export class CoreloadRenderer {constructor(backend:Backend,canvas:HTMLCanvasElement);draw(frame?:{volumes?:AnalyticVolume[];parts?:unknown[];width?:number;height?:number;scale?:number;foot?:number;lightBackground?:boolean;cameraX?:number;bloom?:boolean;receivingLight?:boolean;floor?:boolean;raySteps?:number}):void;snapshotBlob():Promise<Blob>;dispose():void;}
export function bodyParts(actor:ActorState,options?:{showCharacter?:boolean;foregroundArm?:boolean}):unknown[];
// GPUDevice/GPUTextureFormat require the host TypeScript WebGPU declarations.
