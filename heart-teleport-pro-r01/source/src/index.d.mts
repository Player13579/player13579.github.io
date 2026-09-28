export type OpaqueId = string | number;
export interface HeartReceipt {
 readonly id: OpaqueId; readonly type: 'action-heart-teleport'; readonly radius: 64;
 readonly x: number; readonly y: number; readonly playerId: OpaqueId; readonly viewerId: OpaqueId;
 readonly variant: string; readonly targetId: OpaqueId; readonly targetX: number; readonly targetY: number;
}
export interface AuthorityEnvelope {
 readonly delivery: 'private'; readonly ownerId: OpaqueId; readonly roomId: OpaqueId; readonly sessionId: OpaqueId;
 readonly receipt: HeartReceipt; readonly [transportProofField: string]: unknown;
}
export interface AuthorityContext {
 viewerId: OpaqueId; selfId: OpaqueId; ownerId: OpaqueId; roomId: OpaqueId; sessionId: OpaqueId;
 casterId: OpaqueId; casterX: number; casterY: number;
}
export interface PresentationAnchor {readonly id: OpaqueId;readonly playerId: OpaqueId;readonly casterX: number;readonly casterY: number;}
export interface Visibility {
 visible: boolean;onScreen: boolean;occluded: boolean;documentVisible: boolean;
 clipRect?: {x:number;y:number;width:number;height:number};
}
export declare class ReceiptLedger {constructor(capacity?:number);claim(id:OpaqueId):'claimed'|'duplicate'|'ledger_full';has(id:OpaqueId):boolean;readonly size:number;}
export declare class WallClock {constructor(wall?:()=>number,mono?:()=>number);now():number;}
export interface MountOptions {
 canvas:HTMLCanvasElement;
 subscribePrivateReceipts(handler:(envelope:AuthorityEnvelope)=>void):()=>void;
 /** 必須。署名または同等のサーバ権威をpayload/scopeへ束縛して検証する。true既定値はない。 */
 verifyEnvelope(envelope:Readonly<AuthorityEnvelope>):boolean|Promise<boolean>;
 isCanonicalId(id:OpaqueId):boolean;
 /** causeId指定時は、そのreceipt成功時点のcaster座標を返す。現在BODY座標で置き換えない。 */
 getContext(causeId?:OpaqueId):AuthorityContext;
 getVisibility(anchor:PresentationAnchor):Visibility;
 /** 入力はcasterのみ。対象座標は受け取らない。出力はcanvasローカルCSS px。 */
 projectCaster(anchor:{playerId:OpaqueId;x:number;y:number}):{x:number;y:number;inViewport:boolean}|null;
 ledger:ReceiptLedger;verify?:boolean;clock?:{now():number};onError?:(code:string)=>void;
}
export declare function mountHeartTeleport(options:MountOptions):Promise<Readonly<{
 unlockAudio(event:MouseEvent|PointerEvent|KeyboardEvent):Promise<boolean>;
 stats():Record<string,unknown>;
 dispose():Promise<void>;
}>>;
export declare const TYPE:'action-heart-teleport';
export declare const RADIUS:64;
export declare const LIFETIME_MS:1800;
