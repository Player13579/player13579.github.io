/** Canonical scalar graph, Barrier Pro r0.3 / 折庇覆域.
 * A hollow, faceted enclosure: center panes, broad bevel faces, depth-return walls.
 * No texture / particle / ring / outline / bloom. u,v are patch parameters, not pixels.
 * Generated JS and WGSL share algebra. JavaScript doubles are NOT GPU float parity evidence.
 */
export const VERSION='barrier-pro-r0.3';
export const SHAPE=Object.freeze({height:1.958,maxWidth:2.05,frontDepth:.62,backDepth:.62,
 defaultYawDeg:-18,defaultPitchDeg:12,nu:12,nv:12,sectors:8,bands:5,peels:8,
 receiverBounds:[-.29,.29,-.50,.50,-.12,.12]});
export const DURATION_MS=Object.freeze({create:650,absorb:650,fracture:480,bust:480});
const fn=(name,args,returns,body,result)=>({name,args,returns,body,result});
export const FUNCTIONS=[
 fn('sat',['x'],'f32',[],'clamp(x,0.0,1.0)'),
 fn('sq',['x'],'f32',[],'x*x'),
 fn('ramp',['a','b','x'],'f32',[],'sat((x-a)/(b-a))'),
 fn('softBoundary',['a','b','x'],'f32',[['s','ramp(a,b,x)']],'s*s*(3.0-2.0*s)'),
 fn('gauss',['x'],'f32',[],'exp(-x*x)'),
 fn('duration',['kind'],'f32',[],'select(650.0,480.0,kind>=2.0)'),
 fn('cornerX',['i'],'f32',[], 'select(select(select(select(select(select(select(select(0.0,0.88,i==1.0),1.04,i==2.0),0.67,i==3.0),0.0,i==4.0),-0.67,i==5.0),-1.01,i==6.0),-0.96,i==7.0),0.0,i>=8.0)'),
 fn('cornerY',['i'],'f32',[], 'select(select(select(select(select(select(select(select(-0.86,-0.67,i==1.0),0.37,i==2.0),0.80,i==3.0),0.92,i==4.0),0.72,i==5.0),0.40,i==6.0),-0.63,i==7.0),-0.86,i>=8.0)'),
 fn('envelope',['requested','age','authority'],'Envelope',[
  ['on','select(0.0,1.0,requested>=0.0 && requested<=3.0 && age>=0.0 && age<duration(requested))'],
  ['kind','select(-1.0,requested,on>0.5)'],['r','sat(age/duration(requested))'],
  ['visible','select(0.0,1.0,on>0.5 || authority>0.5)'],
  ['load','0.16+0.84*exp(-3.2*r)'],
  ['angle','select(select(0.0,(38.0-32.0*r)*0.0174532925199433,kind==0.0),(20.0+38.0*r)*0.0174532925199433,kind==3.0)'],
  ['residue','select(select(1.0,1.0-0.65*r,kind==3.0),1.0-0.70*r,kind==2.0)'],
  ['core','select(select(select(0.0,0.50+0.28*sin(3.141592653589793*r),kind==0.0),0.16+0.68*exp(-3.2*r),kind==1.0),0.60*exp(-5.0*r),kind==2.0)']
 ],{kind:'kind',r:'r',eventOn:'on',visible:'visible',load:'load',angle:'angle',residue:'residue',core:'core'}),
 // Front folds rotate as two connected halves. Return walls connect the moving outer edge to the rear.
 fn('frontPoint',['ex','ey','radial','sector','requested','age','authority'],'Point',[
  ['e','envelope(requested,age,authority)'],['side','select(-1.0,1.0,sector<4.0)'],
  ['x0','ex*radial'],['y0','ey*mix(0.72,1.0,ramp(0.60,1.0,radial))'],
  ['centerY','ey*radial*1.20'],['y','select(y0,centerY,radial<0.60)'],
  ['z0','0.62-0.06*sat(radial/0.60)-0.37*ramp(0.60,1.0,radial)'],
  ['stress','gauss((x0-0.05)/0.65)*gauss((y-0.08)/0.45)'],
  ['dent','select(0.0,0.31*e.load*stress,e.kind==1.0)'],
  ['pinch','select(0.0,0.20*e.load*gauss(y/0.38)*ramp(0.35,0.8,abs(x0)),e.kind==1.0)'],
  ['x','x0-side*pinch'],['z','z0-dent'],
  ['theta','side*e.angle'],['hinge','side*1.0'],['dx','x-hinge'],['dz','z-0.19'],
  ['rx','hinge+cos(theta)*dx+sin(theta)*dz'],['rz','0.19-sin(theta)*dx+cos(theta)*dz']
 ],{x:'rx',y:'y',z:'rz'}),
 fn('rearPoint',['ex','ey','radial'],'Point',[
  ['x','ex*radial'],['y','ey*radial*1.10'],
  ['z','-0.62+0.07*sat(radial/0.70)+0.27*ramp(0.70,1.0,radial)']
 ],{x:'x',y:'y',z:'z'}),
 fn('geometry',['u','v','sector','band','requested','age','authority'],'Point',[
  ['e','envelope(requested,age,authority)'],
  ['ex','mix(cornerX(sector),cornerX(sector+1.0),u)'],['ey','mix(cornerY(sector),cornerY(sector+1.0),u)'],
  ['radial','select(select(select(select(0.70*v,0.70+0.30*v,band==1.0),1.0,band==2.0),0.60+0.40*v,band==3.0),0.60*v,band==4.0)'],
  ['f','frontPoint(ex,ey,radial,sector,requested,age,authority)'],['b','rearPoint(ex,ey,radial)'],
  ['frontWeight','select(select(0.0,v,band==2.0),1.0,band>=3.0)'],
  ['x0','mix(b.x,f.x,frontWeight)'],['y0','mix(b.y,f.y,frontWeight)'],['z0','mix(b.z,f.z,frontWeight)'],
  ['broken','select(0.0,1.0,e.kind==2.0)'],
  ['fold','0.10*e.r*sin(4.0*y0+2.0*x0)*broken'],
  ['releaseSide','select(-1.0,1.0,sector<4.0)'],
  ['releaseShift','select(0.0,releaseSide*(0.12+0.38*e.r),e.kind==3.0)'],
  ['x','x0*(1.0-broken*(0.06+0.16*e.r))+releaseShift'],
  ['y','y0*(1.0-broken*(0.04+0.10*e.r))*select(1.0,1.0-0.12*e.r,e.kind==3.0)'],
  ['z','z0*(1.0-broken*(0.10+0.35*e.r))+fold']
 ],{x:'x',y:'y',z:'z'}),
 fn('material',['u','v','sector','band','requested','age','authority','hPx','coreOn','yaw','pitch'],'Field',[
  ['e','envelope(requested,age,authority)'],['g','geometry(u,v,sector,band,requested,age,authority)'],
  ['up','geometry(min(0.9999,u+0.001),v,sector,band,requested,age,authority)'],['um','geometry(max(0.0001,u-0.001),v,sector,band,requested,age,authority)'],
  ['vp','geometry(u,min(0.9999,v+0.001),sector,band,requested,age,authority)'],['vm','geometry(u,max(0.0001,v-0.001),sector,band,requested,age,authority)'],
  ['tx','up.x-um.x'],['ty','up.y-um.y'],['tz','up.z-um.z'],['ux','vp.x-vm.x'],['uy','vp.y-vm.y'],['uz','vp.z-vm.z'],
  ['cx','ty*uz-tz*uy'],['cy','tz*ux-tx*uz'],['cz','tx*uy-ty*ux'],['nn','max(0.000000001,sqrt(cx*cx+cy*cy+cz*cz))'],
  ['outward','select(1.0,-1.0,band>=3.0)'],['nx','outward*cx/nn'],['ny','outward*cy/nn'],['nz','outward*cz/nn'],
  ['face','clamp(0.50+0.31*abs(nx)+0.22*ny+0.18*nz,0.16,0.98)'],
  ['front','select(0.0,1.0,band>=3.0)'],['pane','select(0.0,1.0,band==0.0 || band==4.0)'],
  ['aa','0.70/hPx'],
  ['crack','g.y-(0.12+0.36*g.x+0.07*sin(9.0*g.x)+0.11*g.z)'],
  ['fork','g.x-(-0.26+0.20*g.y+0.035*sin(18.0*g.y))'],
  ['gap','0.022+0.092*e.r'],
  ['fractureMask','softBoundary(gap-aa,gap+aa,abs(crack))*(1.0-softBoundary(0.18,0.40,g.y)*(1.0-softBoundary(gap*0.55-aa,gap*0.55+aa,abs(fork))))'],
  ['coverage','e.visible*select(1.0,fractureMask,e.kind==2.0)'],
  ['stress','gauss((g.x-0.05)/0.70)*gauss((g.y-0.08)/0.46)'],
  ['tauBase','select(select(select(select(0.019,0.38,band==1.0),0.48,band==2.0),0.49,band==3.0),0.026,band==4.0)'],
  ['tauLoad','select(0.0,front*(0.044*pane+0.08*(1.0-pane))*e.load*stress,e.kind==1.0)'],
  ['tauBust','select(0.0,0.28*front*pane,e.kind==3.0)'],
  ['bustRear','select(1.0,select(0.90-0.70*e.r,1.0,front>0.5),e.kind==3.0)'],
  ['tau','(tauBase+tauLoad+tauBust)*(0.82+0.24*face)*e.residue*bustRear'],
  ['alpha','coverage*(1.0-exp(-tau))'],
  // Two transport regimes on ONE hollow shell, not two coplanar colors added.
  ['baseR','mix(0.07,0.022,front)'],['baseG','mix(0.11,0.20+0.06*face,front)'],['baseB','mix(0.30,0.34,front)'],
  ['broad','(0.64+0.36*face)*(1.0-pane)'],
  ['ER0','mix(0.026,0.012,front)*broad+pane*mix(0.0003+0.001*v*v,0.0012+0.0025*v*v,front)'],
  ['EG0','mix(0.050,0.130,front)*broad+pane*mix(0.0008+0.003*v*v,0.0128+0.022*v*v,front)'],
  ['EB0','mix(0.150,0.190,front)*broad+pane*mix(0.0020+0.008*v*v,0.0228+0.034*v*v,front)'],
  ['loadBand','select(0.0,front*(1.0-pane)*e.load*gauss((g.y-0.10)/0.23),e.kind==1.0)'],
  ['bustPane','select(0.0,front*pane,e.kind==3.0)'],
  ['paneLoad','select(0.0,front*pane*e.load*stress,e.kind==1.0)'],
  ['createFacing','select(1.0,0.86+0.14*e.r,e.kind==0.0)'],
  ['gain','e.residue*bustRear*createFacing'],
  ['core','coreOn*e.core*front*(1.0-pane)*gauss((g.x-0.78)/0.024)*gauss((g.y-0.37)/0.038)'],
  ['er','coverage*((ER0+0.012*bustPane+0.018*loadBand+0.004*paneLoad)*gain+1.05*core)'],
  ['eg','coverage*((EG0+0.066*bustPane+0.14*loadBand+0.040*paneLoad)*gain+1.0*core)'],
  ['eb','coverage*((EB0+0.085*bustPane+0.10*loadBand+0.052*paneLoad)*gain+0.94*core)']
 ],{r:'alpha*baseR+er',g:'alpha*baseG+eg',b:'alpha*baseB+eb',a:'alpha',coverage:'coverage',core:'core*coverage',emissionY:'0.2126*er+0.7152*eg+0.0722*eb',normalX:'nx',normalY:'ny',normalZ:'nz',stress:'stress',pane:'pane'})
];
