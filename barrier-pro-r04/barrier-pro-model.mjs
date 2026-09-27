/** Canonical scalar graph, Barrier Pro r0.4 / 弧抱膜.
 * A SINGLE smooth, twisted membrane enclosing empty receiver space. No bevel/wall bands.
 * Function strings generate both JS and WGSL; design assumptions, not measured material physics.
 * u within sector; v latitude. Sectors tessellate a continuous surface, never color regions.
 */
export const VERSION='barrier-pro-r0.4';
export const SHAPE=Object.freeze({height:2.22,maxWidth:2.48,frontDepth:.74,backDepth:.74,
 defaultYawDeg:-14,defaultPitchDeg:12,nu:16,nv:64,sectors:8,bands:1,peels:4,
 receiverBounds:[-.29,.29,-.50,.50,-.12,.12]});
export const DURATION_MS=Object.freeze({create:650,absorb:650,fracture:480,bust:480});
const fn=(name,args,returns,body,result)=>({name,args,returns,body,result});
export const FUNCTIONS=[
 fn('sat',['x'],'f32',[],'clamp(x,0.0,1.0)'),
 fn('sq',['x'],'f32',[],'x*x'),
 fn('ramp',['a','b','x'],'f32',[],'sat((x-a)/(b-a))'),
 fn('softBoundary',['a','b','x'],'f32',[['s','ramp(a,b,x)']],'s*s*(3.0-2.0*s)'),
 fn('gauss',['x'],'f32',[],'exp(-x*x)'),
 fn('angular',['theta','center','width'],'f32',[],'gauss(2.0*sin((theta-center)*0.5)/width)'),
 fn('duration',['kind'],'f32',[],'select(650.0,480.0,kind>=2.0)'),
 fn('envelope',['requested','age','authority'],'Envelope',[
  ['on','select(0.0,1.0,requested>=0.0 && requested<=3.0 && age>=0.0 && age<duration(requested))'],
  ['kind','select(-1.0,requested,on>0.5)'],['r','sat(age/duration(requested))'],
  ['visible','select(0.0,1.0,on>0.5 || authority>0.5)'],
  ['load','0.20+0.80*exp(-3.4*r)'],
  ['depthScale','select(select(1.0,0.48+0.52*r,kind==0.0),1.0-0.66*r,kind==3.0)'],
  ['seam','select(select(0.0,0.82-0.72*r,kind==0.0),0.08+0.20*r,kind==3.0)'],
  ['residue','select(select(1.0,1.0-0.82*r,kind==3.0),1.0-0.80*r,kind==2.0)'],
  ['core','select(select(select(select(0.0,0.32+0.57*sin(3.141592653589793*r),kind==0.0),0.22+0.88*exp(-3.4*r),kind==1.0),0.12+0.54*exp(-4.0*r),kind==2.0),0.20+0.22*sin(3.141592653589793*r),kind==3.0)']
 ],{kind:'kind',r:'r',eventOn:'on',visible:'visible',load:'load',depthScale:'depthScale',seam:'seam',residue:'residue',core:'core'}),
 fn('geometry',['u','v','sector','band','requested','age','authority'],'Point',[
  ['e','envelope(requested,age,authority)'],['theta','(sector+u)*0.7853981633974483'],
  ['lat','(v-0.5)*3.141592653589793'],['s','sin(lat)'],['c','cos(lat)'],['thetaTwist','theta+0.20*s'],
  ['x0','1.16*(0.81+0.19*sin(3.141592653589793*v))*cos(thetaTwist)-0.12*s'],
  ['y0','1.88*(v-0.5)-0.085*sin(theta)+0.065*cos(theta)+0.055*sin(2.0*theta)'],['z0','0.74*(0.90+0.10*sin(3.141592653589793*v))*sin(thetaTwist)+0.07*s'],
  ['front','softBoundary(-0.10,0.65,sin(theta))'],
  ['loadPatch','angular(theta,2.47,0.65)*gauss((v-0.55)/0.25)'],
  ['dent','select(0.0,0.42*e.load*front*loadPatch,e.kind==1.0)'],
  ['pinch','select(0.0,0.46*e.load*loadPatch,e.kind==1.0)'],
  ['x1','x0+pinch'],['y1','y0-0.07*dent'],['z1','z0*e.depthScale-dent'],
  ['failure','select(0.0,1.0,e.kind==2.0)'],
  ['breakLine','v-(0.47+0.115*cos(theta)+0.035*sin(5.0*theta))'],
  ['curl','failure*(0.08+0.28*e.r)*gauss(breakLine/0.14)*front'],
  ['side','select(-1.0,1.0,cos(theta)>0.0)'],
  ['release','select(0.0,0.08+0.26*e.r,e.kind==3.0)'],
  ['releaseBend','select(0.0,0.15*e.r*sq(sin(theta)),e.kind==3.0)'],
  ['x','x1*(1.0-failure*(0.02+0.20*e.r))+side*release*c'],
  ['y','y1*(1.0-failure*0.12*e.r)'],
  ['z','z1*(1.0-failure*0.40*e.r)-curl+releaseBend*cos(theta)']
 ],{x:'x',y:'y',z:'z'}),
 fn('material',['u','v','sector','band','requested','age','authority','hPx','coreOn','yaw','pitch'],'Field',[
  ['e','envelope(requested,age,authority)'],['theta','(sector+u)*0.7853981633974483'],
  ['g','geometry(u,v,sector,band,requested,age,authority)'],
  ['up','geometry(u+0.001,v,sector,band,requested,age,authority)'],['um','geometry(u-0.001,v,sector,band,requested,age,authority)'],
  ['vp','geometry(u,min(0.99999,v+0.001),sector,band,requested,age,authority)'],['vm','geometry(u,max(0.00001,v-0.001),sector,band,requested,age,authority)'],
  ['tx','up.x-um.x'],['ty','up.y-um.y'],['tz','up.z-um.z'],['ux','vp.x-vm.x'],['uy','vp.y-vm.y'],['uz','vp.z-vm.z'],
  ['cx','-(ty*uz-tz*uy)'],['cy','-(tz*ux-tx*uz)'],['cz','-(tx*uy-ty*ux)'],
  ['nn','max(0.000000001,sqrt(cx*cx+cy*cy+cz*cz))'],['nx','cx/nn'],['ny','cy/nn'],['nz','cz/nn'],
  ['front','softBoundary(-0.15,0.50,sin(theta))'],
  ['faceLight','clamp(0.78-0.22*nx+0.12*ny+0.08*nz,0.48,1.08)'],
  ['frontLobe','angular(theta,2.24+0.72*(v-0.5),0.30)*gauss((v-0.61)/0.38)'],
  ['rearLobe','angular(theta,5.54+0.74*(v-0.5),0.37)*gauss((v-0.40)/0.37)'],
  ['poleTaper','0.28+0.72*sq(sin(3.141592653589793*v))'],
  ['phaseLocation','1.10+e.seam+0.08'],
  ['formation','select(0.0,angular(theta,phaseLocation,0.26)*gauss((v-(0.56+0.32*e.r))/0.10),e.kind==0.0)'],
  ['loadPatch','angular(theta,2.47,0.64)*gauss((v-0.55)/0.24)'],
  ['loadLight','select(0.0,e.load*loadPatch,e.kind==1.0)'],
  ['releaseLight','select(0.0,angular(theta,1.05-0.34*e.r,0.37)*gauss((v-0.58)/0.32),e.kind==3.0)'],
  ['aa','0.58/hPx'],
  ['createDist','abs(2.0*sin((theta-1.10)*0.5))'],
  ['createMask','softBoundary(e.seam-aa*2.5,e.seam+aa*2.5,createDist)'],
  ['breakLine','v-(0.47+0.115*cos(theta)+0.035*sin(5.0*theta))'],
  ['fork','theta-(2.12+0.18*sin(13.0*v))'],
  ['gap','0.014+0.052*e.r'],
  ['fractureMask','softBoundary(gap-aa*0.5,gap+aa*0.5,abs(breakLine))*(1.0-softBoundary(0.53,0.62,v)*(1.0-softBoundary(gap*1.4-aa,gap*1.4+aa,abs(fork))))'],
  ['bustMask','softBoundary(e.seam-aa,e.seam+aa,abs(cos(theta)))'],
  ['coverage','e.visible*select(select(select(1.0,createMask,e.kind==0.0),fractureMask,e.kind==2.0),bustMask,e.kind==3.0)'],
  ['breakLip','select(0.0,gauss((abs(breakLine)-gap-0.012)/0.032)*angular(theta,2.35,0.70)*(0.35+0.65*exp(-3.0*e.r)),e.kind==2.0)'],
  ['lobe','max(frontLobe,rearLobe)'],
  ['opticalResidue','select(select(1.0,1.0-0.68*e.r,e.kind==3.0),1.0-0.62*e.r,e.kind==2.0)'],
  ['tau','(0.014+1.12*frontLobe+0.94*rearLobe+0.11*loadLight+0.18*formation)*opticalResidue'],
  ['alpha','coverage*(1.0-exp(-tau))'],
  ['baseR','mix(0.020,0.012,front)'],['baseG','mix(0.060,0.09,front)'],['baseB','mix(0.16,0.14,front)'],
  ['gain','faceLight*e.residue*poleTaper'],
  ['er0','0.0006+0.018*frontLobe+0.035*rearLobe+0.025*formation+0.28*loadLight+0.16*breakLip+0.045*releaseLight'],
  ['eg0','0.0018+0.66*frontLobe+0.33*rearLobe+0.20*formation+0.39*loadLight+0.15*breakLip+0.19*releaseLight'],
  ['eb0','0.0035+0.64*frontLobe+0.71*rearLobe+0.28*formation+0.12*loadLight+0.045*breakLip+0.24*releaseLight'],
  ['coreTheta','select(select(select(phaseLocation,2.47,e.kind==1.0),2.36,e.kind==2.0),1.05-0.34*e.r,e.kind==3.0)'],
  ['coreV','select(select(select(0.56+0.32*e.r,0.55,e.kind==1.0),0.47+0.115*cos(2.36)+0.035*sin(5.0*2.36)+gap+0.013,e.kind==2.0),0.59,e.kind==3.0)'],
  ['core','coreOn*e.core*angular(theta,coreTheta,0.035)*gauss((v-coreV)/0.018)'],
  ['er','coverage*(er0*gain+0.86*core)'],['eg','coverage*(eg0*gain+1.02*core)'],['eb','coverage*(eb0*gain+0.75*core)']
 ],{r:'alpha*baseR+er',g:'alpha*baseG+eg',b:'alpha*baseB+eb',a:'alpha',coverage:'coverage',core:'core*coverage',emissionY:'0.2126*er+0.7152*eg+0.0722*eb',normalX:'nx',normalY:'ny',normalZ:'nz',stress:'loadLight',pane:'1.0-lobe'})
];
