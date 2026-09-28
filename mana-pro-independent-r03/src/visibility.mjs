export function intersectsViewport(r,w,h){return Number.isFinite(r?.width)&&r.width>0&&r.height>0&&r.right>0&&r.bottom>0&&r.left<w&&r.top<h;}
export function intersection(a,b){const r={left:Math.max(a.left,b.left),top:Math.max(a.top,b.top),right:Math.min(a.right,b.right),bottom:Math.min(a.bottom,b.bottom)};return r.right>r.left&&r.bottom>r.top?r:null;}
/** viewport/祖先scroll clipの可視矩形。別ウィンドウや任意の回転/遮蔽はホスト判定が必要。 */
export function canvasVisibleRect(canvas,{ignoreOwnVisibility=false}={}){
  if(typeof document==='undefined'||document.visibilityState!=='visible'||!canvas?.isConnected)return null;
  const full=canvas.getBoundingClientRect();if(!intersectsViewport(full,innerWidth,innerHeight))return null;
  let r=intersection(full,{left:0,top:0,right:innerWidth,bottom:innerHeight});
  for(let e=canvas;e;e=e.parentElement){
    const s=getComputedStyle(e);
    if(s.display==='none'||Number(s.opacity)===0||((s.visibility==='hidden'||s.visibility==='collapse')&&!(e===canvas&&ignoreOwnVisibility)))return null;
    if(e!==canvas){
      const clipX=['hidden','clip','auto','scroll'].includes(s.overflowX),clipY=['hidden','clip','auto','scroll'].includes(s.overflowY);
      if(clipX||clipY){const b=e.getBoundingClientRect();r=intersection(r,{left:clipX?b.left:-Infinity,right:clipX?b.right:Infinity,top:clipY?b.top:-Infinity,bottom:clipY?b.bottom:Infinity});if(!r)return null;}
    }
  }
  // shaderのwitnessはDOM可視部分の本体だけを数える。見えない半面で音を許可しない。
  return [(r.left-full.left)/full.width*canvas.width,(r.top-full.top)/full.height*canvas.height,(r.right-full.left)/full.width*canvas.width,(r.bottom-full.top)/full.height*canvas.height];
}
export function canvasVisible(canvas,options={}){return canvasVisibleRect(canvas,options)!==null;}
