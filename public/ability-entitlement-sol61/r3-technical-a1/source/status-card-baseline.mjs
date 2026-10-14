export function packStatusCardBaselineUniform(view,rect,visible){
 const finite=[view.cssWidth,view.cssHeight,view.width,view.height,view.dpr,rect?.x,rect?.y,rect?.width,rect?.height].every(Number.isFinite);
 if(!finite||view.cssWidth<=0||view.cssHeight<=0||view.width<=0||view.height<=0||view.dpr<=0||Math.abs(view.width/view.cssWidth-view.dpr)>1e-6||Math.abs(view.height/view.cssHeight-view.dpr)>1e-6)throw new Error('invalid CSS viewport/DPR for status-card baseline');
 if(rect.width<=0||rect.height<=0)throw new Error('invalid status-card target geometry');
 return new Float32Array([view.cssWidth,view.cssHeight,view.dpr,visible?1:0,rect.x,rect.y,rect.width,rect.height]);
}
