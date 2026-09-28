/** 三角形と解析coverageだけ。画像・texture・Canvas描画・GPU readbackは使用しない。 */
export class MeshBuilder {
  constructor() { this.alpha=[]; this.light=[]; }
  vertex(target,p,c,a,uv=[0,0],style=0,space=0) {
    target.push(p[0],p[1],p[2]??0,c[0],c[1],c[2],a,uv[0],uv[1],style,space);
  }
  tri(points,color,alpha,{light=false,space=0}={}) {
    const target=light?this.light:this.alpha;
    points.forEach((p,i)=>this.vertex(target,p,Array.isArray(color[0])?color[i]:color,Array.isArray(alpha)?alpha[i]:alpha,[0,0],0,space));
  }
  polygon(points,color,alpha,opt={}) {
    if(points.length<3) return;
    const c=points.reduce((a,p)=>a.map((v,i)=>v+p[i]/points.length),[0,0,0]);
    for(let i=0;i<points.length;i++) this.tri([c,points[i],points[(i+1)%points.length]],color,alpha,opt);
  }
  /** centerlineがworld x/height平面なら幅をxyではなくx/z平面に付ける。 */
  ribbon(points,widths,color,alpha,{light=true,space=0,plane='xz'}={}) {
    if(points.length<2) return;
    const target=light?this.light:this.alpha;
    for(let i=0;i<points.length-1;i++) {
      const a=points[i],b=points[i+1], ax=plane==='xy'?1:2;
      const dx=b[0]-a[0], dy=b[ax]-a[ax], len=Math.hypot(dx,dy)||1;
      const wa=(Array.isArray(widths)?widths[i]:widths)*.5, wb=(Array.isArray(widths)?widths[i+1]:widths)*.5;
      const shift=(p,w,s)=>{const q=[...p];q[0]+=-dy/len*w*s;q[ax]+=dx/len*w*s;return q;};
      const p=[shift(a,wa,-1),shift(a,wa,1),shift(b,wb,-1),shift(b,wb,1)];
      const alA=Array.isArray(alpha)?alpha[i]:alpha,alB=Array.isArray(alpha)?alpha[i+1]:alpha;
      for(const [idx,v,al] of [[0,-1,alA],[1,1,alA],[2,-1,alB],[2,-1,alB],[1,1,alA],[3,1,alB]]) this.vertex(target,p[idx],color,al,[0,v],2,space);
    }
  }
  disc(center,rx,ry,color,alpha,{light=true,space=0,plane='xz',style=1}={}) {
    const target=light?this.light:this.alpha;
    const q=[[-1,-1],[1,-1],[-1,1],[1,1]];
    for(const j of [0,1,2,2,1,3]) {
      const [u,v]=q[j],p=[...center];p[0]+=u*rx;p[plane==='xy'?1:2]+=v*ry;
      this.vertex(target,p,color,alpha,[u,v],style,space);
    }
  }
  get vertexCount() { return (this.alpha.length+this.light.length)/11; }
}
export function localPoint(origin,x,y,z) { return [origin.x+x,origin.y+y,z]; }
