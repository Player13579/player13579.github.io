/** Geometric H64 mannequin fixture, not asset-world artwork or gameplay collision. */
export function actorOccluders(actors,mode='mixed',light=false){if(mode==='none')return[];const depth=mode==='front'?90:mode==='back'?-90:0;
 const color=light?[.24,.30,.36]:[.17,.24,.29],pieces=[];
 for(const a of actors){const rect=(x,y,w,h,c=color)=>pieces.push({x:a.x+x,y:a.y+y,w,h,depth,color:c});
  rect(-6,-32,12,12);pieces.push({polygon:[[-8,-17],[8,-17],[13,-9],[9,14],[-9,14],[-13,-9]].map(([x,y])=>({x:a.x+x,y:a.y+y})),depth,color});
  rect(-9,16,7,16);rect(2,16,7,16);rect(-17,-9,4,23);rect(13,-9,4,23);
 }
 return pieces;
}
