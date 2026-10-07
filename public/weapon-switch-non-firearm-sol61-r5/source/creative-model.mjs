export const VERSION='weapon-switch-non-firearm-sol61-r5';
export const EDITION=Object.freeze({originalUsed:5,additionalUsed:1,additionalLimit:5});
export const LIFETIME_SECONDS=.78;
export const PROFILES=Object.freeze([
 {id:'orichalcum-sword',inventoryKind:'item',sourceId:'orichalcum-sword',weaponKind:'sword',name:'jade slim blade',rgb:[.10,2.30,.20],motion:'guard-to-tip registration',seat:.30},
 {id:'heavy:rpg',inventoryKind:'heavy',sourceId:'rpg',weaponKind:'heavy',name:'scarlet launcher tube',rgb:[2.40,.20,.035],motion:'opposed tube docking',seat:.32},
 {id:'heavy:missile',inventoryKind:'heavy',sourceId:'missile',weaponKind:'heavy',name:'cyan finned missile',rgb:[.07,1.80,2.20],motion:'nose-tail registration',seat:.34},
 {id:'invention:railgun',inventoryKind:'invention',sourceId:'railgun',weaponKind:'invention',name:'indigo parallel rails',rgb:[.38,.25,2.70],motion:'parallel rail seating',seat:.36},
 {id:'invention:particle-cannon',inventoryKind:'invention',sourceId:'particle-cannon',weaponKind:'invention',name:'magenta emitter chamber',rgb:[2.50,.10,1.60],motion:'chamber halves alignment',seat:.35},
 {id:'invention:excalibur',inventoryKind:'invention',sourceId:'excalibur',weaponKind:'invention',name:'gold broad blade',rgb:[2.50,1.85,.15],motion:'bilateral blade registration',seat:.33}
].map(p=>Object.freeze({...p,rgb:Object.freeze(p.rgb)})));
const clamp=n=>Math.max(0,Math.min(1,n));
export const smooth=(a,b,t)=>{const x=clamp((t-a)/(b-a));return x*x*(3-2*x);};
const finite=n=>typeof n==='number'&&Number.isFinite(n);
export function variantForSelection(s){return PROFILES.findIndex(p=>s?.id===p.id&&s.inventoryKind===p.inventoryKind&&s.sourceId===p.sourceId&&s.weaponKind===p.weaponKind);}
const profile=v=>{if(!Number.isInteger(v)||v<0||v>=6)throw new RangeError('exact non-firearm selected identity');return PROFILES[v];};
export function projectSchema(x,y,v,t,{reducedMotion=false}={}){
 const p=profile(v);if(![x,y,t].every(finite))throw new TypeError('finite projection');
 const a=smooth(.07,p.seat,t),travel=reducedMotion?.22:1;let qx=x,qy=y,mask=1;
 if(v===0)mask=smooth(.46-1.05*a-.015,.46-1.05*a+.015,y);
 if(v===1)qx-=Math.sign(x)*.22*(1-a)*travel;
 if(v===2)qy-=Math.sign(y)*.24*(1-a)*travel;
 if(v===3)qy-=Math.sign(y)*.18*(1-a)*travel;
 if(v===4){const angle=Math.sign(y)*.24*(1-a)*travel,c=Math.cos(angle),s=Math.sin(angle);qx=c*x+s*y;qy=-s*x+c*y;}
 if(v===5)qx-=Math.sign(x)*.17*(1-a)*travel;
 // Registration seams are cue assembly, not a charging/firing game state.
 if(v===1||v===5)mask*=smooth(.003,.018,Math.abs(x))+(1-smooth(.003,.018,Math.abs(x)))*a;
 if(v===2||v===3||v===4)mask*=smooth(.003,.018,Math.abs(y))+(1-smooth(.003,.018,Math.abs(y)))*a;
 return{x:qx,y:qy,mask};
}
const box=(x,y,cx,cy,rx,ry)=>{const a=Math.abs(x-cx)-rx,b=Math.abs(y-cy)-ry;return Math.hypot(Math.max(a,0),Math.max(b,0))+Math.min(Math.max(a,b),0);};
const segment=(x,y,a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],t=clamp(((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy));return Math.hypot(x-a[0]-dx*t,y-a[1]-dy*t);};
const triangle=(x,y,a,b,c)=>{const cross=(p,q)=>(q[0]-p[0])*(y-p[1])-(q[1]-p[1])*(x-p[0]);const z=[cross(a,b),cross(b,c),cross(c,a)];const d=Math.min(segment(x,y,a,b),segment(x,y,b,c),segment(x,y,c,a));return(z.every(n=>n>=0)||z.every(n=>n<=0))?-d:d;};
export function schemaDistance(x,y,v){
 profile(v);if(![x,y].every(finite))throw new TypeError('finite shape coordinates');
 const circle=(cx,cy,r)=>Math.hypot(x-cx,y-cy)-r;
 if(v===0)return Math.min(triangle(x,y,[-.045,.14],[.045,.14],[0,-.48]),box(x,y,0,.14,.17,.025),box(x,y,0,.28,.027,.13),circle(0,.42,.04));
 if(v===1)return Math.min(box(x,y,-.02,0,.37,.09),box(x,y,-.43,0,.07,.15),box(x,y,.36,0,.065,.13),box(x,y,-.10,.155,.035,.08),box(x,y,-.32,.12,.08,.04));
 if(v===2)return Math.min(segment(x,y,[0,-.27],[0,.31])-.055,triangle(x,y,[0,-.50],[-.065,-.26],[.065,-.26]),triangle(x,y,[0,.19],[-.18,.38],[0,.31]),triangle(x,y,[0,.19],[.18,.38],[0,.31]),triangle(x,y,[0,-.05],[-.12,.06],[0,.02]),triangle(x,y,[0,-.05],[.12,.06],[0,.02]));
 if(v===3)return Math.min(box(x,y,-.26,.02,.10,.12),box(x,y,.10,-.13,.34,.025),box(x,y,.10,.13,.34,.025),box(x,y,-.27,.21,.045,.09),box(x,y,-.17,0,.025,.13),box(x,y,.27,0,.020,.13));
 if(v===4)return Math.min(box(x,y,-.23,0,.18,.11),Math.abs(Math.hypot(x-.18,y)-.17)-.04,box(x,y,-.04,0,.07,.06),box(x,y,-.29,.18,.05,.08));
 return Math.min(triangle(x,y,[-.11,.05],[.11,.05],[0,-.52]),box(x,y,0,.10,.22,.025),triangle(x,y,[-.25,.10],[-.09,.07],[-.18,.17]),triangle(x,y,[.25,.10],[.09,.07],[.18,.17]),box(x,y,0,.30,.035,.17),circle(0,.48,.05));
}

// Private callbacks must consult actual producer/owner registries. Caller-
// supplied successful/current fields and receipt IDs alone are not proof.
export function planWeaponSelectionR5({receipt,frame,settings={}}){
 const u=new Float32Array(16);u[0]=u[1]=u[5]=1;u[4]=LIFETIME_SECONDS;
 const inactive=reason=>Object.freeze({version:VERSION,active:false,reason,uniforms:u,passes:3,proof:'CPU encoding plan only'});
 const variant=variantForSelection(receipt?.selected),v=frame?.viewport;
 if(variant<0||receipt?.type!=='non-firearm-weapon-selection'||receipt.origin!=='local-selection'||
  !['id','actorId','roomId'].every(k=>typeof receipt[k]==='string'&&receipt[k].length>0)||
  !receipt.previous?.id||receipt.previous.id===receipt.selected.id||!Number.isSafeInteger(receipt.roomGeneration)||receipt.roomGeneration<0||
  receipt.roomId!==frame?.roomId||receipt.roomGeneration!==frame.roomGeneration||receipt.actorId!==frame.ownerId||
  frame.ownerAlive!==true||frame.ownerVisible!==true||frame.connectedVisible!==true||
  typeof frame.currentReceipt!=='function'||frame.currentReceipt(receipt)!==true)return inactive('current-confirmed-local-selection');
 if(!v||![v.pixelWidth,v.pixelHeight,v.dpr].every(finite)||v.pixelWidth<=0||v.pixelHeight<=0||v.dpr<=0||
  !Array.isArray(v.logicalToPixel)||v.logicalToPixel.length!==6||!v.logicalToPixel.every(finite)||
  v.logicalToPixel[0]<=0||v.logicalToPixel[3]<=0||Math.abs(v.logicalToPixel[0]-v.logicalToPixel[3])>1e-9||
  v.logicalToPixel[1]!==0||v.logicalToPixel[2]!==0||!Number.isSafeInteger(v.generation)||v.generation<0||v.generation!==frame.expectedGeneration||v.generation!==frame.targetGeneration||
  frame.deviceGeneration!==frame.expectedDeviceGeneration||!Number.isSafeInteger(frame.deviceGeneration)||frame.deviceGeneration<0)return inactive('viewport-target-device');
 // `eClockStartedAt` is the producer's actual actor E-clock sample, not
 // DOM event timeStamp, a render-time restart or a invented wall deadline.
 if(!finite(receipt.eClockStartedAt)||!finite(frame.actorEVisualTime)||receipt.eClockRoomId!==receipt.roomId||receipt.eClockRoomGeneration!==receipt.roomGeneration)return inactive('actual-E-clock');
 const age=(frame.actorEVisualTime-receipt.eClockStartedAt)/1000;
 if(age<0||age>=LIFETIME_SECONDS)return inactive('finite-window');
 const p=typeof frame.presentationForReceipt==='function'?frame.presentationForReceipt(receipt):null;
 if(!p||p.ownerId!==receipt.actorId||p.roomId!==receipt.roomId||p.roomGeneration!==receipt.roomGeneration||p.targetGeneration!==v.generation||
  ![p.xLogical,p.yLogical,p.heightLogical].every(finite)||p.heightLogical<=0||![1,-1].includes(p.facing))return inactive('registered-owner-presentation');
 const h=p.heightLogical*v.logicalToPixel[3],x=p.xLogical+.60*p.heightLogical*p.facing,y=p.yLogical-.55*p.heightLogical;
 const centerX=v.logicalToPixel[0]*x+v.logicalToPixel[4],centerY=v.logicalToPixel[3]*y+v.logicalToPixel[5];
 u.set([v.pixelWidth,v.pixelHeight,centerX,centerY,age,h,variant,Number(settings.reducedMotion===true),
  Number(settings.mainOn!==false),Number(settings.sourceOn!==false),Number(settings.observerOn!==false),1,0,0,0,0]);
 if(![...u].every(Number.isFinite)){u.fill(0);u[0]=u[1]=u[5]=1;u[4]=LIFETIME_SECONDS;return inactive('float32-range');}
 return Object.freeze({version:VERSION,active:true,reason:'active',uniforms:u,passes:3,causeId:receipt.id,selectedId:receipt.selected.id,
  profile:PROFILES[variant],ageSeconds:age,sourceOrigin:'local-selection',proof:'CPU encoding plan; no GPU completion'});
}
export function cueBounds(plan){
 if(!plan?.active)return[0,0,0,0];const u=plan.uniforms;
 // Includes maximum assembly travel and local two-scale PSF support.
 const ex=.78*u[5]+Math.max(2,u[5]*.065),ey=.78*u[5]+Math.max(2,u[5]*.065);
 const clamp=(x,max)=>Math.max(0,Math.min(max,x));
 return[clamp(u[2]-ex,u[0]),clamp(u[3]-ey,u[1]),clamp(u[2]+ex,u[0]),clamp(u[3]+ey,u[1])];
}
