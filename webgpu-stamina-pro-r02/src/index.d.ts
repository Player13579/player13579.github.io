/** GPU types are supplied by the host's WebGPU DOM types (or @webgpu/types). */
export interface GainInput {
 type:'gain-stamina';playerId:string;amount:number;startedAt:number;
 eventId?:string|null;durationMs?:number;duration?:number;radius?:number;source?:string;
 authoritative?:boolean;gainKind?:'discrete'|'natural-regeneration'|'passive-tick';
}
export interface GainEvent extends Omit<GainInput,'eventId'|'durationMs'|'radius'|'gainKind'> {
 readonly key:string;readonly eventId:string|null;readonly durationMs:number;readonly radius:number;
 readonly seed:number;readonly slot:number;readonly gainKind:'discrete';
}
export interface ActorState {playerId:string;timeMs:number;x:number;y:number;z?:number;alive?:boolean;visible?:boolean;present?:boolean;paused?:boolean;timeScale?:number;tint?:[number,number,number];}
export interface Arrival {amount:number;rate:number;leadingPosition:number;start:number;end:number;}
export interface GainSample extends GainEvent {readonly ageMs:number;readonly progress:number;readonly active:boolean;readonly phase:string;readonly opacity:number;readonly charge:number;readonly external:number;readonly flux:number;readonly morph:number;readonly arrivals:Arrival[];actor?:ActorState;rate?:number;}
export function normalizeGain(input:GainInput):GainEvent;
export function sampleGain(event:GainEvent,actorTimeMs:number):GainSample;
export function transfer(p:number):{arrivals:Arrival[];charge:number;external:number;flux:number;morph:number;};
export function envelope(p:number):number;
export function ribbonPoint(sample:GainSample,lane:0|1,s:number):number[];
export function ribbonWidth(sample:GainSample,lane:0|1,s:number):number;
export function reservePoint(lane:0|1,s:number,slot?:number):number[];
export function sampleMetrics(sample:GainSample):{maxRadius:number;minWidth:number;maxWidth:number;conservationResidual:number;};
export const C:Readonly<Record<string,unknown>>;
export class GainStaminaSystem {
 constructor(options?:{maxActive?:number;maxActors?:number;maxRememberedPerActor?:number});
 active:Map<string,GainEvent>;diagnostics:{accepted:number;rejected:number;duplicates:number;expired:number;cancelled:number};history:Record<string,unknown>[];
 ingestAuthoritativeGain(input:GainInput,actor:ActorState):{accepted:true;event:GainEvent}|{accepted:false;reason:string};
 ingest(input:GainInput,actor:ActorState):{accepted:true;event:GainEvent}|{accepted:false;reason:string};
 update(actors:Map<string,ActorState>|((id:string)=>ActorState|undefined)):GainSample[];
 cancelPlayer(playerId:string,reason?:string):void;cancelAll(reason?:string):void;resetEpoch():void;
}
export interface GPUContext {adapter:GPUAdapter;device:GPUDevice;format:GPUTextureFormat;renderFormat:GPUTextureFormat;errors:string[];metadata:Record<string,unknown>;messages:Record<string,unknown>[];}
export function createGPU():Promise<GPUContext>;
export interface RenderOptions {samples?:GainSample[];actors?:ActorState[];showActor?:boolean;crossArm?:boolean;light?:boolean;scale?:number;origin?:[number,number];projection?:Float32Array;}
export class StaminaRenderer {
 constructor(gpu:GPUContext,canvas:HTMLCanvasElement);
 static create(gpu:GPUContext,canvas:HTMLCanvasElement):Promise<StaminaRenderer>;
 stats:{frames:number;triangles:number};resize(width:number,height:number):void;
 prepare(options?:RenderOptions):void;encodeFixture(pass:GPURenderPassEncoder):void;encodeEffect(pass:GPURenderPassEncoder):void;render(options?:RenderOptions):void;destroy():void;
}
export class StaminaAudio {
 enabled:boolean;error:string|null;stats:Record<string,number>;context:AudioContext|null;
 enable():Promise<boolean>;sync(samples:GainSample[]):void;cancel():void;resetEpoch():void;mute():Promise<void>;dispose():Promise<void>;
}
export function synthStereo(ageSeconds:number,durationSeconds?:number,seed?:number):[number,number];
export function soundComponents(ageSeconds:number,durationSeconds?:number,seed?:number):{onset:number;transfer:number;reserve:number;charge:number;window:number;};
export class VoiceBank {
 constructor(options?:{sampleRate?:number;maxVoices?:number});
 stats:Record<string,number>;voices:Map<string,unknown>;
 sync(items:{key:string;ageMs:number;durationMs:number;seed?:number;rate:number}[],audioTime:number):void;
 process(left:Float32Array,right:Float32Array,blockTime:number):void;cancel():void;resetEpoch():void;
}
