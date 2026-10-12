// Human-only technical coordinates. No rendering, physics, sound or scheduling.
export const HUMAN_CANVAS = Object.freeze({width:980,height:480,minDisplayScale:3.75});
const positive = n => Number.isFinite(n) && n > 0;
const near = (a,b) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a-b)<.001;
export function observeHumanCanvas({state,canvas,rect,dpr,versionId,currentOwner,expectedOwner,frameUrl}) {
  const r=state?.receipt;
  if(currentOwner!==expectedOwner || !currentOwner || !frameUrl || !state?.ready || state.fatal ||
    r?.version!==versionId || !state.causeId || r.causeId!==state.causeId ||
    !Number.isSafeInteger(state.generation) || state.generation<0 || r.generation!==state.generation ||
    canvas?.isConnected!==true || !Number.isSafeInteger(canvas.width) || !Number.isSafeInteger(canvas.height) ||
    canvas.width<=0 || canvas.height<=0 || !positive(dpr) || !positive(r.dpr) || !near(dpr,r.dpr) ||
    ![rect?.width,rect?.height].every(positive) || ![rect?.left,rect?.top].every(Number.isFinite) ||
    !near(rect.left,0) || !near(rect.top,0) || !near(rect.width,HUMAN_CANVAS.width) || !near(rect.height,HUMAN_CANVAS.height) ||
    !Array.isArray(r.cssExtent) || !near(r.cssExtent[0],rect.width) || !near(r.cssExtent[1],rect.height) ||
    !Array.isArray(r.physicalExtent) || r.physicalExtent[0]!==canvas.width || r.physicalExtent[1]!==canvas.height ||
    canvas.width!==Math.round(rect.width*dpr) || canvas.height!==Math.round(rect.height*dpr) ||
    r.queueCompleted!==true || !Number.isSafeInteger(r.submitted) || r.submitted<=0 ||
    r.completed!==r.submitted || !Number.isSafeInteger(r.passes) || r.passes<1 || !positive(r.actualActorHeight) ||
    !r.spriteRect || ![r.spriteRect.x,r.spriteRect.y].every(Number.isFinite) || ![r.spriteRect.width,r.spriteRect.height].every(positive)) {
    throw new Error('Human canvas geometry is not bound to a current completed source receipt.');
  }
  return Object.freeze({coordinateSpace:'child-canvas-local-css',frameUrl,currentOwner,versionId,
    canvasRect:{left:rect.left,top:rect.top,width:rect.width,height:rect.height},
    backingExtent:[canvas.width,canvas.height],dpr,backingScale:[canvas.width/rect.width,canvas.height/rect.height],
    causeId:r.causeId,generation:r.generation,submitted:r.submitted,completed:r.completed,
    actualActorHeight:r.actualActorHeight,spriteRect:{...r.spriteRect}});
}
export function humanSubjectBounds(input,plan,transportRatio) {
  if(!plan?.active || !positive(plan.actualActorHeight) || !Number.isFinite(transportRatio) || transportRatio<0) throw new Error('Exact active source planner and transport bound required.');
  const a=input.sprite.alphaSupport,s=input.sprite.scale,r=plan.spriteRect,h=plan.actualActorHeight;
  const actor={x:r.x+a.x*s,y:r.y+a.y*s,width:a.width*s,height:a.height*s};
  // Finite +/-6-tap authored PSF, plus one H-scaled pixel for filtering.
  const pad=7*h/64,travel=h*transportRatio;
  return Object.freeze({actor,focus:{x:actor.x+actor.width/2,y:actor.y+actor.height/2},
    bounds:{x:actor.x-travel-pad,y:actor.y-pad,width:actor.width+travel+2*pad,height:actor.height+2*pad},
    evidenceKind:'conservative-source-support-envelope; not measured GPU pixel bounds',pad,travel});
}
export function fitHumanCanvas({stageWidth,stageHeight,canvasLeft=0,canvasTop=0,focus,bounds,dpr=1,scale=Math.max(HUMAN_CANVAS.minDisplayScale,HUMAN_CANVAS.minDisplayScale/dpr)}) {
  if(![stageWidth,stageHeight,scale,dpr].every(positive) || scale<HUMAN_CANVAS.minDisplayScale || scale*dpr<HUMAN_CANVAS.minDisplayScale ||
    ![canvasLeft,canvasTop,focus?.x,focus?.y,bounds?.x,bounds?.y].every(Number.isFinite) || ![bounds?.width,bounds?.height].every(positive)) throw new Error('Positive Human stage and canvas-local fit fields required.');
  const tx=stageWidth/2-scale*(canvasLeft+focus.x),ty=stageHeight/2-scale*(canvasTop+focus.y);
  const projected={x:stageWidth/2+scale*(bounds.x-focus.x),y:stageHeight/2+scale*(bounds.y-focus.y),width:scale*bounds.width,height:scale*bounds.height};
  const sourceClipped=bounds.x<0 || bounds.y<0 || bounds.x+bounds.width>HUMAN_CANVAS.width || bounds.y+bounds.height>HUMAN_CANVAS.height;
  const stageClipped=projected.x<0 || projected.y<0 || projected.x+projected.width>stageWidth || projected.y+projected.height>stageHeight;
  return Object.freeze({status:sourceClipped||stageClipped?'insufficient-frame':'geometry-fit',scale,tx,ty,
    dpr,sourceClipped,stageClipped,projectedBounds:projected,
    requiredStageWidth:2*scale*Math.max(focus.x-bounds.x,bounds.x+bounds.width-focus.x),
    requiredStageHeight:2*scale*Math.max(focus.y-bounds.y,bounds.y+bounds.height-focus.y)});
}
