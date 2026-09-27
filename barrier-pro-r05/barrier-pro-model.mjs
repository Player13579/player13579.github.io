/** Canonical scalar graph, Barrier Pro r0.5 / 抱空薄膜.
 * r0.5 audit conclusion: geometry and compositing were mostly faithful, but the designed optical emphasis
 * still read as bivalve/cuff petals rather than a protective air volume. r0.5 shifts the primary read to
 * a single transparent enclosing shell with broad front/rear sheets, faint central veil, and source-bound
 * local halo. No copied prior game effects.
 */
export const VERSION='barrier-pro-r0.5';
export const SHAPE=Object.freeze({height:2.30,maxWidth:2.72,frontDepth:.88,backDepth:.88,
 defaultYawDeg:-10,defaultPitchDeg:12,nu:16,nv:64,sectors:8,bands:1,peels:4,
 receiverBounds:[-.29,.29,-.50,.50,-.16,.16]});
export const DURATION_MS=Object.freeze({create:650,absorb:650,fracture:480,bust:480});
const fn=(name,args,returns,body,result)=>({name,args,returns,body,result});
export const FUNCTIONS=[
 fn('sat',['x'],'f32',[],'clamp(x,0.0,1.0)'),
 fn('sq',['x'],'f32',[],'x*x'),
 fn('ramp',['a','b','x'],'f32',[],'sat((x-a)/(b-a))'),
 fn('softBoundary',['a','b','x'],'f32',[['s','ramp(a,b,x)']],'s*s*(3.0-2.0*s)'),
 fn('gauss',['x'],'f32',[],'exp(-x*x)'),
 fn('angular',['theta','center','width'],'f32',[],'gauss(2.0*sin((theta-center)*0.5)/width)'),
 fn('sgn',['x'],'f32',[],'select(-1.0,1.0,x>=0.0)'),
 fn('duration',['kind'],'f32',[],'select(650.0,480.0,kind>=2.0)'),
 fn('envelope',['requested','age','authority'],'Envelope',[
  ['on','select(0.0,1.0,requested>=0.0 && requested<=3.0 && age>=0.0 && age<duration(requested))'],
  ['kind','select(-1.0,requested,on>0.5)'],['r','sat(age/duration(requested))'],
  ['visible','select(0.0,1.0,on>0.5 || authority>0.5)'],
  ['load','0.24+0.76*exp(-3.1*r)'],
  ['depthScale','select(select(1.0,0.58+0.42*r,kind==0.0),1.0-0.46*r,kind==3.0)'],
  ['seam','select(select(0.0,0.88-0.80*r,kind==0.0),0.10+0.24*r,kind==3.0)'],
  ['residue','select(select(1.0,1.0-0.86*r,kind==3.0),1.0-0.78*r,kind==2.0)'],
  ['core','select(select(select(select(0.0,0.20+0.68*sin(3.141592653589793*r),kind==0.0),0.28+0.92*exp(-3.0*r),kind==1.0),0.18+0.48*exp(-3.6*r),kind==2.0),0.18+0.28*sin(3.141592653589793*r),kind==3.0)']
 ],{kind:'kind',r:'r',eventOn:'on',visible:'visible',load:'load',depthScale:'depthScale',seam:'seam',residue:'residue',core:'core'}),
 fn('geometry',['u','v','sector','band','requested','age','authority'],'Point',[
  ['e','envelope(requested,age,authority)'],['theta','(sector+u)*0.7853981633974483'],
  ['lat','(v-0.5)*3.141592653589793'],['s','sin(lat)'],['c','cos(lat)'],['cap','sin(3.141592653589793*v)'],['cap2','cap*cap'],
  ['thetaWarp','theta+0.12*s-0.06*sin(2.0*theta)*s'],['shell','1.0-0.05*gauss((v-0.5)/0.20)'],
  ['x0','1.22*(0.86+0.14*cap2)*shell*cos(thetaWarp)+0.12*sin(2.0*theta)*(0.45+0.55*cap2)'],
  ['y0','1.92*(v-0.5)+0.045*sin(theta)-0.050*sin(2.0*theta)*s'],
  ['z0','0.88*(0.78+0.22*cap2)*(0.92+0.08*cos(2.0*theta))*sin(thetaWarp)+0.10*s-0.05*cos(theta)*s'],
  ['front','softBoundary(-0.18,0.56,sin(theta))'],
  ['loadPatch','angular(theta,2.12,0.55)*gauss((v-0.56)/0.22)'],
  ['dent','select(0.0,0.36*e.load*loadPatch,e.kind==1.0)'],['pinch','select(0.0,0.18*e.load*loadPatch,e.kind==1.0)'],
  ['x1','x0+pinch'],['y1','y0-0.05*dent'],['z1','z0*e.depthScale-0.32*dent'],
  ['failure','select(0.0,1.0,e.kind==2.0)'],['crackLine','v-(0.42+0.14*sin(theta-0.55)+0.05*sin(3.0*theta))'],
  ['crackBand','gauss(crackLine/0.14)'],['fractureAmt','failure*(0.04+0.26*e.r)*crackBand'],
  ['side','select(-1.0,1.0,cos(theta)>0.0)'],['curl','failure*(0.10+0.22*e.r)*crackBand*front'],
  ['release','select(0.0,0.10+0.30*e.r,e.kind==3.0)'],['relax','select(0.0,0.08*e.r*(1.0-cap2),e.kind==3.0)'],
  ['x','x1+fractureAmt*0.25*side+release*0.48*side*(0.35+0.65*c)'],
  ['y','y1+fractureAmt*0.08*sgn(crackLine)-relax'],
  ['z','z1-curl+release*0.18*cos(theta-0.25)']
 ],{x:'x',y:'y',z:'z'}),
 fn('material',['u','v','sector','band','requested','age','authority','hPx','coreOn','yaw','pitch'],'Field',[
  ['e','envelope(requested,age,authority)'],['theta','(sector+u)*0.7853981633974483'],
  ['g','geometry(u,v,sector,band,requested,age,authority)'],
  ['up','geometry(u+0.001,v,sector,band,requested,age,authority)'],['um','geometry(u-0.001,v,sector,band,requested,age,authority)'],
  ['vp','geometry(u,min(0.99999,v+0.001),sector,band,requested,age,authority)'],['vm','geometry(u,max(0.00001,v-0.001),sector,band,requested,age,authority)'],
  ['tx','up.x-um.x'],['ty','up.y-um.y'],['tz','up.z-um.z'],['ux','vp.x-vm.x'],['uy','vp.y-vm.y'],['uz','vp.z-vm.z'],
  ['cx','-(ty*uz-tz*uy)'],['cy','-(tz*ux-tx*uz)'],['cz','-(tx*uy-ty*ux)'],
  ['nn','max(0.000000001,sqrt(cx*cx+cy*cy+cz*cz))'],['nx','cx/nn'],['ny','cy/nn'],['nz','cz/nn'],
  ['faceLight','clamp(0.82-0.14*nx+0.14*ny+0.10*nz,0.56,1.14)'],
  ['cavity','gauss(g.x/0.55)*gauss(g.y/0.95)'],
  ['air','1.0-0.78*cavity'],
  ['frontSheet','angular(theta,1.74+0.22*(v-0.5),0.68)*(0.55+0.45*gauss((v-0.56)/0.46))*(1.0-0.88*cavity)'],
  ['rearSheet','angular(theta,4.85+0.18*(v-0.5),0.76)*(0.52+0.48*gauss((v-0.44)/0.48))*(1.0-0.78*cavity)'],
  ['bridgeSheet','0.58*(angular(theta,0.18,0.56)+angular(theta,3.16,0.56))*gauss((v-0.50)/0.72)*(1.0-0.45*cavity)'],
  ['cap2','sq(sin(3.141592653589793*v))'],['poleTaper','0.26+0.74*cap2'],
  ['seamCenter','0.92+1.00*v'],['formation','select(0.0,angular(theta,seamCenter,0.22)*gauss((v-(0.52+0.28*e.r))/0.11),e.kind==0.0)'],
  ['loadPatch','angular(theta,2.12,0.58)*gauss((v-0.56)/0.24)'],['loadLight','select(0.0,e.load*loadPatch,e.kind==1.0)'],
  ['releaseLight','select(0.0,angular(theta,0.22+0.16*v,0.34)*gauss((v-0.54)/0.34)*(0.45+0.55*e.r),e.kind==3.0)'],
  ['aa','0.58/hPx'],['createDist','abs(2.0*sin((theta-seamCenter)*0.5))'],['createMask','softBoundary(e.seam-aa*2.5,e.seam+aa*2.5,createDist)'],
  ['crackLine','v-(0.42+0.14*sin(theta-0.55)+0.05*sin(3.0*theta))'],['fork','theta-(2.08+0.26*sin(11.0*v))'],['gap','0.016+0.050*e.r'],
  ['fractureMask','softBoundary(gap-aa*0.5,gap+aa*0.5,abs(crackLine))*(1.0-softBoundary(0.48,0.60,v)*(1.0-softBoundary(gap*1.5-aa,gap*1.5+aa,abs(fork))))'],
  ['bustMask','softBoundary(e.seam-aa,e.seam+aa,abs(cos(theta-0.18)))'],
  ['coverage','e.visible*select(select(select(1.0,createMask,e.kind==0.0),fractureMask,e.kind==2.0),bustMask,e.kind==3.0)'],
  ['fractureEdge','select(0.0,gauss((abs(crackLine)-gap-0.012)/0.032)*angular(theta,2.12,0.74)*(0.40+0.60*exp(-2.8*e.r)),e.kind==2.0)'],
  ['opticalResidue','select(select(1.0,1.0-0.72*e.r,e.kind==3.0),1.0-0.58*e.r,e.kind==2.0)'],
  ['tau','air*(0.006+0.56*frontSheet+0.54*rearSheet+0.24*bridgeSheet+0.07*loadLight+0.12*formation)*opticalResidue'],
  ['alpha','coverage*(1.0-exp(-tau))'],
  ['baseR','0.010+0.010*rearSheet'],['baseG','0.055+0.020*frontSheet+0.010*bridgeSheet'],['baseB','0.16+0.030*rearSheet'],
  ['gain','faceLight*e.residue*poleTaper'],
  ['er0','0.0012+0.030*frontSheet+0.040*rearSheet+0.022*bridgeSheet+0.030*formation+0.19*loadLight+0.16*fractureEdge+0.14*releaseLight'],
  ['eg0','0.0050+0.52*frontSheet+0.30*rearSheet+0.12*bridgeSheet+0.26*formation+0.30*loadLight+0.14*fractureEdge+0.19*releaseLight'],
  ['eb0','0.0090+0.40*frontSheet+0.66*rearSheet+0.18*bridgeSheet+0.18*formation+0.09*loadLight+0.05*fractureEdge+0.28*releaseLight'],
  ['coreTheta','select(select(select(0.92+1.00*(0.52+0.28*e.r),2.12,e.kind==1.0),2.08,e.kind==2.0),0.22+0.16*0.54,e.kind==3.0)'],
  ['coreV','select(select(select(0.52+0.28*e.r,0.56,e.kind==1.0),0.42+0.14*sin(2.08-0.55)+0.05*sin(3.0*2.08)+gap+0.014,e.kind==2.0),0.54,e.kind==3.0)'],
  ['halo','coreOn*e.core*angular(theta,coreTheta,0.10)*gauss((v-coreV)/0.05)'],
  ['core','coreOn*e.core*angular(theta,coreTheta,0.032)*gauss((v-coreV)/0.016)'],
  ['er','coverage*air*(er0*gain+0.14*halo+0.72*core)'],['eg','coverage*air*(eg0*gain+0.32*halo+0.98*core)'],['eb','coverage*air*(eb0*gain+0.40*halo+0.78*core)']
 ],{r:'alpha*baseR+er',g:'alpha*baseG+eg',b:'alpha*baseB+eb',a:'alpha',coverage:'coverage',core:'core*coverage',emissionY:'0.2126*er+0.7152*eg+0.0722*eb',normalX:'nx',normalY:'ny',normalZ:'nz',stress:'loadLight',pane:'frontSheet+rearSheet+bridgeSheet'})
];
