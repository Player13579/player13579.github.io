/** Geometric H64 mannequin used only by the verification page. No image/mesh assets. */
export function createMannequin(){
  const data=[];
  const tri=(a,b,c,col)=>{
    const u=b.map((v,i)=>v-a[i]),v=c.map((x,i)=>x-a[i]);
    let n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
    const l=Math.hypot(...n)||1;n=n.map(v=>v/l);
    for(const p of[a,b,c])data.push(...p,...n,...col);
  };
  function box(x,y,z,w,h,d,c,topScale=1){
    const pts=[];
    for(let iy=0;iy<2;iy++)for(let iz=0;iz<2;iz++)for(let ix=0;ix<2;ix++){
      const s=iy?topScale:1;pts.push([x+(ix-.5)*w*s,y+iy*h,z+(iz-.5)*d*s]);}
    const faces=[[0,1,3,2],[4,6,7,5],[0,4,5,1],[2,3,7,6],[0,2,6,4],[1,5,7,3]];
    for(const[a,b,c0,d0]of faces){tri(pts[a],pts[b],pts[c0],c);tri(pts[a],pts[c0],pts[d0],c);}
  }
  const suit=[.24,.34,.41],dark=[.105,.17,.22],skin=[.74,.62,.48],trim=[.44,.53,.56];
  const yscale=1/.965925826;
  box(-4.2,0,1.7,6,4,10,dark);box(4.2,0,1.7,6,4,10,dark);
  box(-4,4,0,5.4,20,6.5,suit,.91);box(4,4,0,5.4,20,6.5,suit,.91);
  box(0,23,0,14,9,9,dark,1.05);box(0,31,0,15.5,17,10.8,suit,1.17);
  box(-11,32,0,5,15,6,suit,.94);box(11,32,0,5,15,6,suit,.94);
  box(-11,27,1,4.6,6,5.5,skin,.9);box(11,27,1,4.6,6,5.5,skin,.9);
  box(0,48,0,6,4,6,skin);box(0,52,0,10,12,9,skin,.88);
  box(0,61.5,-.3,10.5,2.5,9.4,dark,.85);
  box(0,38,5.65,7,.9,.32,trim);
  // Actual projected foot-to-head height is 64 px at scale=1 (depth can slightly change extremum).
  for(let i=0;i<data.length;i+=9)data[i+1]*=yscale;
  let low=Infinity,high=-Infinity;
  for(let i=0;i<data.length;i+=9){const up=data[i+1]*.965925826-data[i+2]*.258819045;low=Math.min(low,up);high=Math.max(high,up);}
  const fit=64/(high-low);
  for(let i=0;i<data.length;i+=9)for(let j=0;j<3;j++)data[i+j]*=fit;
  return new Float32Array(data);
}
