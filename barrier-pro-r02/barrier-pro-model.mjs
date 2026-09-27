/**
 * Barrier Pro r0.2 / 偏稜被覆殻. Canonical scalar expression graph.
 * This file is DESIGN DATA, not an image or a rasterizer. build-shader.mjs emits
 * identical scalar algebra into JavaScript and WGSL; do not edit generated files.
 * q = [-1,1] across the WHOLE continuous face, v = [0,1] bottom to top.
 * All colors and emitted radiance are linear sRGB; time is unwarped milliseconds.
 */
export const VERSION = 'barrier-pro-r0.2';
export const SHAPE = Object.freeze({height:1.24,maxWidth:1.28,frontDepth:.29,backDepth:.23,
  defaultYawDeg:-14,defaultPitchDeg:6,nu:48,nv:64});
export const DURATION_MS = Object.freeze({create:650,absorb:650,fracture:480,bust:480});
export const SYMBOLS = Object.freeze({CRE:0,ABS:1,FRA:2,BUS:3});
const fn = (name,args,returns,body,result) => ({name,args,returns,body,result});
// Expressions use a deliberately small common scalar language. select(a,b,c)
// returns b if c, otherwise a. Every denominator is safe in both evaluated arms.
export const FUNCTIONS = [
 fn('sat',['x'],'f32',[], 'clamp(x,0.0,1.0)'),
 fn('ramp',['a','b','x'],'f32',[], 'sat((x-a)/(b-a))'),
 fn('softStep',['a','b','x'],'f32',[['t','ramp(a,b,x)']], 't*t*(3.0-2.0*t)'),
 fn('sq',['x'],'f32',[], 'x*x'),
 fn('gauss',['x'],'f32',[], 'exp(-x*x)'),
 fn('tri',['x'],'f32',[], 'max(0.0,1.0-abs(x))'),
 fn('widthAt',['v'],'f32',[],
   '0.25+0.20*ramp(0.0,0.10,v)+0.15*ramp(0.10,0.25,v)+0.04*ramp(0.25,0.58,v)-0.10*ramp(0.72,0.87,v)-0.26*ramp(0.87,1.0,v)'),
 fn('keel',['v'],'f32',[], '0.10-0.13*ramp(0.0,0.43,v)+0.18*ramp(0.43,0.78,v)-0.07*ramp(0.78,1.0,v)'),
 fn('capAt',['v'],'f32',[], 'min(1.0,min(v/0.14,(1.0-v)/0.14))'),
 fn('duration',['kind'],'f32',[], 'select(650.0,480.0,kind>=2.0)'),
 fn('envelope',['requested','age','authority'],'Envelope',[
   ['eventOn','select(0.0,1.0,requested>=0.0 && requested<=3.0 && age>=0.0 && age<duration(requested))'],
   ['kind','select(-1.0,requested,eventOn>0.5)'],
   ['r','sat(age/duration(requested))'],
   ['visible','select(0.0,1.0,eventOn>0.5 || authority>0.5)'],
   ['createFront','0.12+0.84*r'],
   ['drainFront','0.96-0.82*r'],
   ['load','0.24+0.76*exp(-3.2*r)'],
   ['dent','0.033+0.105*exp(-2.6*r)'],
   ['breakWidth','0.016+0.054*r'],
   ['breakScale','1.0-0.14*r-0.32*ramp(0.68,1.0,r)'],
   ['residueGain','1.0-0.53*ramp(0.60,1.0,r)'],
   ['core','select(select(select(0.0,0.45+0.45*sin(3.141592653589793*r),kind==0.0),0.13+0.79*exp(-3.6*r),kind==1.0),0.84*exp(-4.0*r),kind==2.0)']
 ], {kind:'kind',r:'r',eventOn:'eventOn',visible:'visible',createFront:'createFront',drainFront:'drainFront',load:'load',dent:'dent',breakWidth:'breakWidth',breakScale:'breakScale',residueGain:'residueGain',core:'core'}),
 fn('stressAt',['q','v','iq','iv','r'],'f32',[
   ['known','select(0.0,1.0,iv>=0.0)'],
   ['cq','select(0.02,iq,known>0.5)'],['cv','select(0.55,iv,known>0.5)'],
   ['wx','select(0.62,0.44,known>0.5)+0.12*r'],['wy','select(0.24,0.19,known>0.5)+0.09*r']
 ], 'gauss((q-cq)/wx)*gauss((v-cv)/wy)'),
 fn('tearMain',['q','v'],'f32',[
   ['teeth','0.027*tri((q+0.53)/0.13)-0.022*tri((q+0.06)/0.11)+0.036*tri((q-0.42)/0.16)']
 ], 'v-(0.49+0.19*q+teeth)'),
 fn('tearBranch',['q','v'],'f32',[], 'q-(-0.18+0.35*(v-0.49)+0.09*tri((v-0.76)/0.10))'),
 fn('geometry',['q','v','requested','age','authority','iq','iv','front'],'Point',[
   ['e','envelope(requested,age,authority)'],['w','widthAt(v)'],['k','keel(v)'],
   ['slope','select((q-k)/(1.0-k),(k-q)/(1.0+k),q<k)'],
   ['dome','max(0.0,1.0-slope)*max(0.0,capAt(v))'],
   ['x0','(-0.025+0.045*v)+q*w'],['y0','(v-0.5)*1.24'],
   ['fill','1.0-softStep(e.createFront-0.10,e.createFront+0.10,v+0.075*q)'],
   ['stress','stressAt(q,v,iq,iv,e.r)'],
   ['expansion','select(1.0,0.86+0.14*e.r,e.kind==0.0)'],
   ['collapse','select(1.0,e.breakScale,e.kind==2.0)'],
   ['depth','select(0.23,0.29,front>0.5)'],
   ['depthGain','select(select(select(1.0,0.26+0.74*fill,e.kind==0.0),1.0-0.55*e.r,e.kind==2.0),1.0-0.77*e.r,e.kind==3.0)'],
   ['dent','select(0.0,e.dent*stress*capAt(v),e.kind==1.0 && front>0.5)'],
   ['signZ','select(-1.0,1.0,front>0.5)'],
   ['z','signZ*max(0.0,depth*dome*depthGain-dent)'],
   ['shear','select(0.0,0.022*e.load*stress*(1.0-q*q),e.kind==1.0)'],
   ['buckling','select(0.0,0.06*e.r*tearMain(q,v),e.kind==2.0)']
 ],{x:'x0*expansion*collapse+shear',y:'y0*collapse-buckling',z:'z*collapse'}),
 fn('material',['q','v','requested','age','authority','iq','iv','front','hPx','coreOn','yaw','pitch'],'Field',[
   ['e','envelope(requested,age,authority)'],['g','geometry(q,v,requested,age,authority,iq,iv,front)'],
   ['gqx','geometry(q+0.001,v,requested,age,authority,iq,iv,front)'],
   ['gqy','geometry(q-0.001,v,requested,age,authority,iq,iv,front)'],
   ['gvx','geometry(q,min(0.9999,v+0.001),requested,age,authority,iq,iv,front)'],
   ['gvy','geometry(q,max(0.0001,v-0.001),requested,age,authority,iq,iv,front)'],
   // Parameter tangents -> cross product. Includes x(v) and state-dependent shear;
   // do not approximate a skewed surface as z(x) plus z(y) independently.
   ['tx','gqx.x-gqy.x'],['ty','gqx.y-gqy.y'],['tz','gqx.z-gqy.z'],
   ['ux','gvx.x-gvy.x'],['uy','gvx.y-gvy.y'],['uz','gvx.z-gvy.z'],
   ['cx','ty*uz-tz*uy'],['cy','tz*ux-tx*uz'],['cz','tx*uy-ty*ux'],
   ['norm','max(0.000000001,sqrt(cx*cx+cy*cy+cz*cz))'],
   ['nx','cx/norm'],['ny','cy/norm'],['nz','cz/norm'],
   ['viewDot','abs(sin(pitch)*ny+cos(pitch)*(-sin(yaw)*nx+cos(yaw)*nz))'],
   ['facet','clamp(0.61+0.26*nx+0.17*ny+0.15*nz,0.30,0.98)'],
   ['rim','softStep(0.67,0.97,abs(q))'],
   ['cap','max(0.0,capAt(v))'],
   ['path','0.58+0.30*(1.0-viewDot)+0.22*rim+0.10*(1.0-cap)'],
   ['aa','max(0.002,0.60/(hPx*1.24))'],
   ['fillCoord','v+0.075*q'],
   ['fill','1.0-softStep(e.createFront-0.030,e.createFront+0.030,fillCoord)'],
   ['joinBand','gauss((fillCoord-e.createFront)/0.045)'],
   ['stress','stressAt(q,v,iq,iv,e.r)'],
   ['mainCrack','tearMain(q,v)'],['sideCrack','tearBranch(q,v)'],
   ['branchGate','softStep(0.49,0.56,v)'],
   ['crackA','softStep(e.breakWidth-aa,e.breakWidth+aa,abs(mainCrack))'],
   ['crackB','1.0-branchGate*(1.0-softStep(1.65*e.breakWidth-aa,1.65*e.breakWidth+aa,abs(sideCrack)))'],
   ['breakMask','crackA*crackB'],
   ['cut','e.drainFront+0.065*q'],
   ['drainMask','1.0-softStep(cut-aa,cut+aa,v)'],
   ['drainBand','gauss((v-cut+0.022)/0.037)'],
   ['coverage','e.visible*select(select(1.0,breakMask,e.kind==2.0),drainMask,e.kind==3.0)'],
   ['formed','select(1.0,0.47+0.53*fill,e.kind==0.0)'],
   ['lateGain','select(1.0,e.residueGain,e.kind==2.0)'],
   ['tau','path*select(0.19,0.43,front>0.5)*formed*lateGain'],
   ['alpha','coverage*(1.0-exp(-tau))'],
   // Surface terms: broad normal-dependent blue/teal facets. They are not lighting decals.
   ['baseR','0.048+0.084*facet'],['baseG','0.25+0.40*facet'],['baseB','0.43+0.42*facet'],
   ['backGain','select(0.63,1.0,front>0.5)'],
   ['volumeGain','(0.62+0.38*facet)*(0.62+0.38*cap)*(1.0-0.35*rim)*backGain'],
   ['stateLum','select(select(select(1.0,0.64+0.36*fill,e.kind==0.0),1.0+0.35*e.load*stress,e.kind==1.0),1.05*lateGain,e.kind==2.0)'],
   ['emitR','0.030*volumeGain*stateLum'],
   ['emitG','0.260*volumeGain*stateLum'],
   ['emitB','0.320*volumeGain*stateLum'],
   ['loadPatch','select(0.0,e.load*stress,e.kind==1.0)'],
   ['joinPatch','select(0.0,joinBand,e.kind==0.0)'],
   ['drainPatch','select(0.0,drainBand,e.kind==3.0)'],
   ['foldPatch','select(0.0,gauss((abs(mainCrack)-e.breakWidth-0.025)/0.040),e.kind==2.0)'],
   ['k','keel(v)'],
   ['coreQ','select(k,select(0.02,iq,iv>=0.0),e.kind==1.0)'],
   ['coreV','select(select(e.createFront-0.075*coreQ,select(0.55,iv,iv>=0.0),e.kind==1.0),0.49+0.19*coreQ,e.kind==2.0)'],
   // ~1.9px x 4.1px FWHM before local projection at H64, inside the face. No white perimeter, no bloom.
   ['coreSpot','gauss(((q-coreQ)*widthAt(v))/0.018)*gauss((v-coreV)/0.031)'],
   ['core','coreSpot*e.core*coreOn*select(0.18,1.0,front>0.5)'],
   ['extraR','(0.09*loadPatch+0.085*joinPatch+0.018*drainPatch+0.025*foldPatch)*backGain'],
   ['extraG','(0.12*loadPatch+0.13*joinPatch+0.16*drainPatch+0.10*foldPatch)*backGain'],
   ['extraB','(0.025*loadPatch+0.035*joinPatch+0.075*drainPatch+0.035*foldPatch)*backGain'],
   ['E_R','coverage*(emitR+extraR+1.38*core)'],
   ['E_G','coverage*(emitG+extraG+1.25*core)'],
   ['E_B','coverage*(emitB+extraB+1.12*core)']
 ],{r:'alpha*baseR+E_R',g:'alpha*baseG+E_G',b:'alpha*baseB+E_B',a:'alpha',coverage:'coverage',core:'core*coverage',emissionY:'0.2126*E_R+0.7152*E_G+0.0722*E_B',normalX:'nx',normalY:'ny',normalZ:'nz',stress:'stress',formed:'formed'}),
];
