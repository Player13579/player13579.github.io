export const VERSION_ID='bottle-shards-cleanroom-sol61-r5';
export const DURATION_MS=1700;
export const SFX_OFFSET_MS=0;
export const SFX_DURATION_MS=1050;
export const UNIFORM_FLOATS=16;
export const SHARD_COUNT=5;
export const GRAVITY=430;
export const VARIANTS=Object.freeze(['mercury','lead','mineral-water','seawater','antidote','molotov','ice','heated-water'].map((id,index)=>Object.freeze({index,id,label:id,durationMs:DURATION_MS})));
const CONTACT_PROFILE=Object.freeze({
 starts:Object.freeze([[-3,0,4],[0,1,7],[3,-2,8],[-1,2,5],[2,-1,3]].map(Object.freeze)),
 velocities:Object.freeze([[-92,-12,105],[-45,30,138],[20,-34,92],[62,22,120],[87,-8,76]].map(Object.freeze)),
 sizes:Object.freeze([[7,8],[8,10],[6,9],[7,7],[5,8]].map(Object.freeze)),
 angles:Object.freeze([-.7,.4,1.8,-1.1,2.3]),spins:Object.freeze([5.2,-4.1,6.3,-5.7,4.4])
});
export const FRACTURE_CUTS=Object.freeze([-8,-4,-2,2,4,8]);
export const FRACTURE_TOPS=Object.freeze([4,7,12,12,7,4]);
export const HORIZONTAL_PUSH=Object.freeze([-92,-45,0,45,92]);
export const FRACTURE_KERF=.25;
export const MODEL=Object.freeze({starts:Object.freeze(Array.from({length:5},()=>Object.freeze([0,0,0]))),referenceVariantIndex:3,velocities:Object.freeze(Array.from({length:5},(_,i)=>{const d=physicalDefinition(i,3);return Object.freeze([HORIZONTAL_PUSH[i]/Math.sqrt(d.mass),0,.5*GRAVITY*d.first]);})),sizes:Object.freeze([[3.75,14.90625],[1.75,19.6875],[3.75,20],[1.75,19.6875],[3.75,14.90625]].map(Object.freeze)),angles:Object.freeze([0,0,0,0,0]),spins:Object.freeze([0,0,0,0,0]),cuts:FRACTURE_CUTS,tops:FRACTURE_TOPS,kerf:FRACTURE_KERF,orientation:'exactworldxpreserving upright(vx,0,vy); normal(0,-1,0)',profileScale:'common variant timing/thickness calibration, not individual cellmass',mass:'percell planararea*thickness at unit glass density',kinematics:'outward impulse plus common1.8/s horizontal drag, gravity430, fixedorientation normal floorbounce. Reference velocities are variant3; shardStateAt returns exactrequestedvariant.'});
const clamp=x=>Math.max(0,Math.min(1,x));
const finite=(x,k)=>{if(!Number.isFinite(x))throw new TypeError(k+' finite required');return x;};
function validateVariant(v){if(!Number.isInteger(v)||v<0||v>=8)throw new RangeError('variantIndex0..7 required');return v;}
export function durationForVariant(v=0){validateVariant(v);return DURATION_MS;}
export function phaseAt(ageMs,v=0){
 finite(ageMs,'ageMs');durationForVariant(v);
 if(ageMs<0)return 'before';if(ageMs>=DURATION_MS)return 'expired';
 if(ageMs<85)return 'fracture';if(ageMs<760)return 'flight-contact';if(ageMs<1000)return 'settle';
 if(ageMs<1350)return 'rest';return 'fade';
}
function physicalDefinition(index,v){
 if(!Number.isInteger(index)||index<0||index>=SHARD_COUNT)throw new RangeError('shardIndex');
 validateVariant(v);const mass=1+.035*(v-3.5);
 const velocity=CONTACT_PROFILE.velocities[index].map(x=>x/Math.sqrt(mass));
 const start=CONTACT_PROFILE.starts[index];
 const first=(velocity[2]+Math.sqrt(velocity[2]**2+2*GRAVITY*start[2]))/GRAVITY;
 const incoming=GRAVITY*first-velocity[2],up=incoming*.26,second=first+2*up/GRAVITY;
 return{mass,velocity,start,first,second,up};
}
function localVertex(i,k){const left=FRACTURE_CUTS[i]+FRACTURE_KERF/2,right=FRACTURE_CUTS[i+1]-FRACTURE_KERF/2,slope=(FRACTURE_TOPS[i+1]-FRACTURE_TOPS[i])/(FRACTURE_CUTS[i+1]-FRACTURE_CUTS[i]),top=x=>FRACTURE_TOPS[i]+(x-FRACTURE_CUTS[i])*slope;return[[left,-8],[right,-8],[right,top(right)],[left,top(left)]][k];}
function rotateVertex([x,y],yaw,tilt){return[x,0,y];}
export function shardStateAt(ageMs,index,v=0,reducedMotion=false){finite(ageMs,'ageMs');const d=physicalDefinition(index,v),t=Math.max(0,Math.min(DURATION_MS/1000,ageMs/1000)),first=d.first,second=d.second,tb=second-first,travel=clamp(1-Math.exp(-1.8*t))/1.8,x=HORIZONTAL_PUSH[index]/Math.sqrt(d.mass)*travel;let z=.5*GRAVITY*t*(first-t),vz=.5*GRAVITY*first-GRAVITY*t,contactPhase='first-flight';if(t>=first){const dt=t-first;if(dt<tb){z=.5*GRAVITY*dt*(tb-dt);vz=.5*GRAVITY*tb-GRAVITY*dt;contactPhase='bounce';}else{z=0;vz=0;contactPhase='slide-rest';}}const polygon=Array.from({length:4},(_,k)=>localVertex(index,k));let twiceArea=0,cx=0,cy=0;for(let k=0;k<4;k++){let a=polygon[k],b=polygon[(k+1)%4],c=a[0]*b[1]-b[0]*a[1];twiceArea+=c;cx+=(a[0]+b[0])*c;cy+=(a[1]+b[1])*c;}cx/=3*twiceArea;cy/=3*twiceArea;const vertices=polygon.map(([a,b])=>[a+x,0,b+8+z]),thickness=d.mass;return{position:[x,0,z],center:[x+cx,0,z+8+cy],velocity:[HORIZONTAL_PUSH[index]/Math.sqrt(d.mass)*Math.exp(-1.8*t),0,vz],yaw:0,tilt:Math.PI/2,angularVelocity:[0,0,0],vertices,contactPhase,firstContactMs:first*1000,secondContactMs:second*1000,mass:Math.abs(twiceArea)*.5*thickness,variantProfileScale:d.mass,restitution:tb/first,floorSupportOffset:8,initialVerticalVelocity:.5*GRAVITY*first};}

// Explicit finite prism geometry; trajectory, spin, and contact timing above stay unchanged.
const dot3=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
const plus3=(a,b)=>a.map((x,i)=>x+b[i]);
const mul3=(a,s)=>a.map(x=>x*s);
const cross3=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const unit3=a=>mul3(a,1/Math.hypot(...a));
export function prismStateAt(ageMs,index,v=0,reducedMotion=false){
 const shard=shardStateAt(ageMs,index,v,reducedMotion),thickness=1+.035*(v-3.5);
 const normal=[0,-1,0];
 const supportLift=Math.abs(normal[2])*thickness/2;
 const mid=shard.vertices.map(p=>[p[0],p[1],p[2]+supportLift]);
 const vertices=[...mid.map(p=>plus3(p,mul3(normal,thickness/2))),...mid.map(p=>plus3(p,mul3(normal,-thickness/2)))];
 const planes=[{normal,point:vertices[0]},{normal:mul3(normal,-1),point:vertices[4]}];
 for(let k=0;k<4;k++){const edge=mid[(k+1)%4].map((x,j)=>x-mid[k][j]);planes.push({normal:unit3(cross3(edge,normal)),point:vertices[k]});}
 return{shard,thickness,supportLift,normal,vertices,planes};
}
export function prismRayHit(prism,origin,direction){
 if(!origin.every(Number.isFinite)||!direction.every(Number.isFinite)||Math.hypot(...direction)<1e-12)throw Error('finite nonzero ray');
 const ray=unit3(direction);let enter=0,exit=2000,enterNormal=[0,0,0],exitNormal=[0,0,0];
 for(const plane of prism.planes){const signed=dot3(plane.normal,origin.map((x,j)=>x-plane.point[j])),denom=dot3(plane.normal,ray);
  if(Math.abs(denom)<1e-7){if(signed>0)return null;continue;}
  const t=-signed/denom;
  if(denom<0&&t>enter){enter=t;enterNormal=plane.normal;}if(denom>0&&t<exit){exit=t;exitNormal=plane.normal;}
  if(enter>exit)return null;
 }
 if(exit<0)return null;return{enter,exit,enterNormal,exitNormal,pathLength:Math.max(0,exit-enter)};
}
export function refractDirection(incident,normal,eta){
 const c=dot3(normal,incident),k=1-eta*eta*(1-c*c);return k<0?null:incident.map((x,j)=>eta*x-(eta*c+Math.sqrt(k))*normal[j]);
}
export function prismOpticalPath(prism,origin,direction){
 const ray=unit3(direction),hit=prismRayHit(prism,origin,ray);if(!hit)return null;
 const entryPoint=plus3(origin,mul3(ray,hit.enter)),inside=refractDirection(ray,hit.enterNormal,1/1.52);if(!inside)return null;
 const exitHit=prismRayHit(prism,plus3(entryPoint,mul3(inside,.001)),inside);if(!exitHit)return null;
 const length=exitHit.exit+.001,exitDirection=refractDirection(inside,mul3(exitHit.exitNormal,-1),1.52);
 return{hit,entryPoint,insideDirection:inside,exitNormal:exitHit.exitNormal,length,exitDirection,totalInternalReflection:exitDirection===null,transmittance:[.035,.015,.023].map(s=>Math.exp(-s*length))};
}

export function dielectricFresnel(cosine,eta){
 finite(cosine,"cosine");finite(eta,"eta");if(eta<=0)throw new RangeError("positive eta");
 const ci=Math.max(0,Math.min(1,Math.abs(cosine))),sin2t=eta*eta*(1-ci*ci);
 if(sin2t>=1)return 1;
 const ct=Math.sqrt(1-sin2t),rs=(eta*ci-ct)/(eta*ci+ct),rp=(ci-eta*ct)/(ci+eta*ct);
 return Math.max(0,Math.min(1,(rs*rs+rp*rp)*.5));
}

export function contactPlan(v=0){
 validateVariant(v);const events=[];
 for(let i=0;i<SHARD_COUNT;i++){const d=physicalDefinition(i,v),frequency=3300*d.mass*(7/CONTACT_PROFILE.sizes[i][0])**2;
  events.push({shardIndex:i,order:1,timeMs:d.first*1000,frequency,amplitude:.047});
  events.push({shardIndex:i,order:2,timeMs:d.second*1000,frequency:frequency*1.07,amplitude:.023});}
 return events.sort((a,b)=>a.timeMs-b.timeMs);
}
export function frameState(input={},actorAspect=134/222){
 const{width,height,dpr=1,impactCenterCss=[610,342],actorCenterCss=[490,310],actorHeightCss=64,
 ageMs=0,variantIndex=0,sourceOn=true,mainOn=true,observerOn=true,showActor=true,reducedMotion=false}=input;
 durationForVariant(variantIndex);
 for(const[k,v]of Object.entries({width,height,dpr,actorHeightCss,actorAspect,ageMs}))finite(v,k);
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<=0||height<=0||dpr<=0||actorHeightCss<=0||actorAspect<=0)throw new RangeError('positive backing dimensions and scales');
 for(const[k,p]of Object.entries({impactCenterCss,actorCenterCss})){if(!Array.isArray(p)||p.length!==2)throw new TypeError(k+' pair');p.forEach(x=>finite(x,k));}
 for(const[k,v]of Object.entries({sourceOn,mainOn,observerOn,showActor,reducedMotion}))if(typeof v!=='boolean')throw new TypeError(k+' boolean');
 const active=sourceOn&&mainOn&&ageMs>=0&&ageMs<DURATION_MS;
 const uniforms=new Float32Array([width,height,dpr,ageMs/1000,...impactCenterCss,...actorCenterCss,actorHeightCss,actorAspect,
 +active,+(active&&observerOn),+showActor,+reducedMotion,variantIndex,DURATION_MS/1000]);
 if(!uniforms.every(Number.isFinite))throw new RangeError('float32 uniform overflow');
 return{active,phase:phaseAt(ageMs,variantIndex),variantIndex,durationMs:DURATION_MS,uniforms};
}

const SHADER_BODY="\noverride TARGET_ENCODE:u32=1u;\nstruct U{view:vec4f,origins:vec4f,config:vec4f,state:vec4f};\n@group(0) @binding(0) var<uniform> u:U;\n@group(0) @binding(1) var actorTex:texture_2d<f32>;\n@group(0) @binding(2) var actorSampler:sampler;\nstruct VOut{@builtin(position) p:vec4f};\n@vertex fn vs(@builtin(vertex_index) i:u32)->VOut{\n var p=array<vec2f,3>(vec2f(-1.,-1.),vec2f(3.,-1.),vec2f(-1.,3.));\n var o:VOut;o.p=vec4f(p[i],0.,1.);return o;\n}\nfn decode(c:vec3f)->vec3f{return select(c/12.92,pow((c+vec3f(.055))/1.055,vec3f(2.4)),c>vec3f(.04045));}\nfn encode(c:vec3f)->vec3f{let x=max(c,vec3f(0.));return select(x*12.92,1.055*pow(x,vec3f(1./2.4))-vec3f(.055),x>vec3f(.0031308));}\nfn over(a:vec4f,b:vec4f)->vec4f{return a+b*(1.-a.a);}\nfn cross2(a:vec2f,b:vec2f)->f32{return a.x*b.y-a.y*b.x;}\nfn localVertex(i:u32,k:u32)->vec2f{\n let left=CUTS[i]+.125;let right=CUTS[i+1u]-.125;let slope=(TOPS[i+1u]-TOPS[i])/(CUTS[i+1u]-CUTS[i]);\n let points=array<vec2f,4>(vec2f(left,-8.),vec2f(right,-8.),vec2f(right,TOPS[i]+(right-CUTS[i])*slope),vec2f(left,TOPS[i]+(left-CUTS[i])*slope));return points[k];\n}\nstruct Piece{position:vec3f,yaw:f32,tilt:f32};\nfn pieceAt(t:f32,i:u32,variant:f32)->Piece{\n let profile=1.+.035*(variant-3.5);let oldVZ=CONTACT_VELOCITIES[i].z/sqrt(profile);\n let tc=(oldVZ+sqrt(oldVZ*oldVZ+2.*430.*CONTACT_STARTS[i].z))/430.;\n let incoming=430.*tc-oldVZ;let tb=2.*(incoming*.26)/430.;\n let travel=clamp(1.-exp(-1.8*t),0.,1.)/1.8;let x=PUSH_X[i]/sqrt(profile)*travel;\n var z=.5*430.*t*(tc-t);if(t>=tc){let dt=t-tc;if(dt<tb){z=.5*430.*dt*(tb-dt);}else{z=0.;}}\n var result:Piece;result.position=vec3f(x,0.,z);result.yaw=0.;result.tilt=1.5707963267948966;return result;\n}\nfn rotated(v:vec2f,yaw:f32,tilt:f32)->vec3f{return vec3f(v.x,0.,v.y);}\nfn project(v:vec3f)->vec2f{return vec2f(v.x,.36*v.y-v.z);}\n// A convex glass prism has two broad faces and four finite side faces.\nstruct Prism{points:array<vec3f,6>,normals:array<vec3f,6>,lo:vec2f,hi:vec2f};\nstruct Clip{hit:bool,nearT:f32,farT:f32,nearNormal:vec3f,farNormal:vec3f};\nfn makePrism(i:u32,part:Piece,thickness:f32)->Prism{\n var mid:array<vec3f,4>;var minZ=10000.;\n for(var j=0u;j<4u;j=j+1u){mid[j]=rotated(localVertex(i,j),part.yaw,part.tilt);minZ=min(minZ,mid[j].z);}\n let normal=vec3f(0.,-1.,0.);\n let center=part.position+vec3f(0.,0.,-minZ+abs(normal.z)*thickness*.5);\n var prism:Prism;prism.lo=vec2f(10000.);prism.hi=vec2f(-10000.);\n for(var j=0u;j<4u;j=j+1u){mid[j]=mid[j]+center;}\n prism.points[0]=mid[0]+normal*thickness*.5;prism.normals[0]=normal;\n prism.points[1]=mid[0]-normal*thickness*.5;prism.normals[1]=-normal;\n for(var j=0u;j<4u;j=j+1u){\n  prism.points[j+2u]=mid[j];prism.normals[j+2u]=normalize(cross(mid[(j+1u)%4u]-mid[j],normal));\n  let a=project(mid[j]+normal*thickness*.5);let b=project(mid[j]-normal*thickness*.5);\n  prism.lo=min(prism.lo,min(a,b));prism.hi=max(prism.hi,max(a,b));\n }return prism;\n}\nfn clipPrism(prism:Prism,origin:vec3f,direction:vec3f,minimumT:f32)->Clip{\n var out:Clip;out.hit=true;out.nearT=minimumT;out.farT=2000.;out.nearNormal=vec3f(0.);out.farNormal=vec3f(0.);\n for(var j=0u;j<6u;j=j+1u){\n  let signed=dot(prism.normals[j],origin-prism.points[j]);let denom=dot(prism.normals[j],direction);\n  if(abs(denom)<.0000001){if(signed>0.){out.hit=false;return out;}}\n  else{let distance=-signed/denom;\n   if(denom<0.&&distance>out.nearT){out.nearT=distance;out.nearNormal=prism.normals[j];}\n   if(denom>0.&&distance<out.farT){out.farT=distance;out.farNormal=prism.normals[j];}\n   if(out.nearT>out.farT){out.hit=false;return out;}\n  }\n }out.hit=out.farT>=minimumT;return out;\n}\nfn environment(direction:vec3f)->vec3f{\n // Declared broad studio illumination; no fabricated scene/background image.\n return mix(vec3f(.07,.09,.095),vec3f(.43,.56,.60),clamp(direction.z*.5+.5,0.,1.));\n}\nfn fresnelGlass(cosine:f32,eta:f32)->f32{\n // Exact unpolarized lossless interface; eta is incident/transmitted index.\n let ci=clamp(abs(cosine),0.,1.);\n let sin2t=eta*eta*(1.-ci*ci);\n if(sin2t>=1.){return 1.;}\n let ct=sqrt(1.-sin2t);\n let rs=(eta*ci-ct)/(eta*ci+ct);\n let rp=(ci-eta*ct)/(ci+eta*ct);\n return clamp((rs*rs+rp*rp)*.5,0.,1.);\n}\nfn finiteGlass(prism:Prism,hit:Clip,origin:vec3f,D:vec3f)->vec4f{\n let N=hit.nearNormal;let V=-D;let nv=max(dot(N,V),.001);\n let L=normalize(vec3f(-.45,-.4,1.));let H=normalize(V+L);\n let nl=max(dot(N,L),0.);let nh=max(dot(N,H),0.);let vh=max(dot(V,H),0.);\n let rough=.17;let a2=pow(rough,4.);let denom=nh*nh*(a2-1.)+1.;\n let distribution=a2/(3.14159265*denom*denom);let k=pow(rough+1.,2.)/8.;\n let geometry=(nv/(nv*(1.-k)+k))*(nl/(nl*(1.-k)+k));\n let spec=distribution*geometry*fresnelGlass(vh,1./1.52)/max(4.*nv*max(nl,.001),.001);\n let entry=origin+D*hit.nearT;let inside=refract(D,N,1./1.52);\n let leave=clipPrism(prism,entry+inside*.001,inside,0.);\n let path=max(leave.farT+.001,0.);\n let beer=exp(-vec3f(.035,.015,.023)*path);\n let outgoing=refract(inside,-leave.farNormal,1.52);\n let trapped=dot(outgoing,outgoing)<.0000001;\n let entryF=fresnelGlass(nv,1./1.52);let exitF=select(fresnelGlass(dot(inside,leave.farNormal),1.52),1.,trapped);\n let transmission=beer*(1.-entryF)*(1.-exitF);\n let reflected=environment(reflect(D,N))*entryF+vec3f(1.,.97,.87)*spec*nl*.32;\n // First transmitted exit only: higher internal bounces are omitted, never invented as glow.\n let radiance=reflected+environment(outgoing)*transmission*.20;\n let opacity=clamp(1.-dot(transmission,vec3f(.333333)),0.,1.);\n return vec4f(radiance,opacity);\n}\n@fragment fn fs(o:VOut)->@location(0) vec4f{\n let css=o.p.xy/u.view.z;\n let scale=u.config.x/64.;\n let p=(css-u.origins.xy)/scale;\n let t=clamp(u.view.w,0.,u.state.w);\n let sourceEnabled=u.config.z;\n let fade=(1.-smoothstep(u.state.w-.35,u.state.w,t))*sourceEnabled;\n let variant=u.state.z;\n let flash=exp(-t/.026)*(1.-smoothstep(.070,.105,t))*sourceEnabled;\n let aa=max(.65,.8/(u.view.z*scale));\n var pieces:array<Piece,5>;var order=array<u32,5>(0u,1u,2u,3u,4u);\n var prisms:array<Prism,5>;var hits:array<Clip,5>;var depth:array<f32,5>;\n let D=-normalize(vec3f(0.,1.,.36));let origin=vec3f(p.x,0.,-p.y);\n for(var i=0u;i<5u;i=i+1u){\n  pieces[i]=pieceAt(t,i,variant);\n  prisms[i]=makePrism(i,pieces[i],1.+.035*(variant-3.5));\n  hits[i].hit=false;depth[i]=-1.;\n  // One finite primary intersection per candidate; retain exactly this hit for shading.\n  if(all(p>=prisms[i].lo)&&all(p<=prisms[i].hi)){\n   hits[i]=clipPrism(prisms[i],origin,D,-128.);\n   if(hits[i].hit){depth[i]=hits[i].nearT;}\n  }\n }\n // Descending entry distance is far-to-near. Adjacent strict swaps retain index order at ties.\n // This orders finite visible entry surfaces, not interpenetrating multi-medium transport.\n for(var sortRound=0u;sortRound<4u;sortRound=sortRound+1u){for(var b=0u;b<4u-sortRound;b=b+1u){\n  if(depth[order[b]]<depth[order[b+1u]]){let swap=order[b];order[b]=order[b+1u];order[b+1u]=swap;}\n }}\n var world=vec4f(0.);\n // Local ground contact shadows, not a new painted floor.\n for(var i=0u;i<5u;i=i+1u){\n  let center=project(vec3f(pieces[i].position.x+.5*(CUTS[i]+CUTS[i+1u]),0.,0.));\n  let q=(p-center)/vec2f(SIZES[i].x*.8,SIZES[i].y*.25);\n  let shadow=exp(-dot(q,q))*exp(-max(pieces[i].position.z,0.)/12.)*.18*fade;\n  world=over(vec4f(vec3f(.025)*shadow,shadow),world);\n }\n // Finite fracture-edge emission required for this E; no flame or independent sparks.\n let contactX=p.x/6.;let contactY=p.y/1.4;\n let contact=exp(-contactX*contactX-contactY*contactY)*flash;\n world=over(vec4f(vec3f(1.,.95,.76)*contact*.82,contact*.82),world);\n for(var n=0u;n<5u;n=n+1u){\n  let i=order[n];let part=pieces[i];\n\n  if(!hits[i].hit){continue;}\n  let prism=prisms[i];let hit=hits[i];\n  let material=finiteGlass(prism,hit,origin,D);let point=origin+D*hit.nearT;\n  var edgeDistance=10000.;\n  for(var j=0u;j<6u;j=j+1u){if(abs(dot(prism.normals[j],hit.nearNormal))<.999){\n   edgeDistance=min(edgeDistance,abs(dot(prism.normals[j],point-prism.points[j])));\n  }}\n  let edge=exp(-edgeDistance*edgeDistance/1.8);\n  let radiance=material.rgb+vec3f(.63,.84,.79)*edge*.20+vec3f(1.,.94,.73)*flash*edge*2.4;\n  let color=vec3f(1.)-exp(-radiance);\n  let opacity=clamp(material.a+edge*.30+flash*edge*.35,0.,.96)*fade;\n  world=over(vec4f(color*opacity,opacity),world);\n }\n // OBS1 source-bound local sensor spread, only during the fracture light.\n let bloomX=p.x/10.;let bloomY=p.y/4.5;\n let bloom=exp(-bloomX*bloomX-bloomY*bloomY)*flash*u.config.w*.27;\n world=over(vec4f(vec3f(1.,.94,.76)*bloom,bloom),world);\n // Actor is a separate baseline scale reference, never a target or optical source.\n let actorP=css-u.origins.zw;\n let uv=actorP/vec2f(u.config.x*u.config.y,u.config.x)+vec2f(.5);\n let tex=textureSample(actorTex,actorSampler,clamp(uv,vec2f(0.),vec2f(1.)));\n let support=select(0.,1.,all(uv>=vec2f(0.))&&all(uv<=vec2f(1.)));\n let actorA=tex.a*support*u.state.x;\n let actor=vec4f(decode(tex.rgb)*actorA,actorA);\n let result=over(actor,world);\n if(result.a<=.000001){return vec4f(0.);}\n if(TARGET_ENCODE==1u){return vec4f(encode(result.rgb/result.a)*result.a,result.a);}\n return result;\n}\n";

const f32=x=>Number.isInteger(x)?x.toFixed(1):String(x);
const vectors=(name,rows)=>'const '+name+'=array<vec'+rows[0].length+'f,'+rows.length+'>('+rows.map(a=>'vec'+a.length+'f('+a.map(f32).join(',')+')').join(',')+');\n';
const scalarArray=(name,items)=>'const '+name+'=array<f32,'+items.length+'>('+items.map(f32).join(',')+');\n';
export const WGSL=vectors('CONTACT_STARTS',CONTACT_PROFILE.starts)+vectors('CONTACT_VELOCITIES',CONTACT_PROFILE.velocities)+vectors('SIZES',MODEL.sizes)+scalarArray('CUTS',FRACTURE_CUTS)+scalarArray('TOPS',FRACTURE_TOPS)+scalarArray('PUSH_X',HORIZONTAL_PUSH)+SHADER_BODY;

export function createRenderer({device,format,actorTexture,actorAspect=134/222}){
 if(!device||!actorTexture)throw new TypeError('host device/actorTexture');
 if(!['rgba8unorm','bgra8unorm','rgba8unorm-srgb','bgra8unorm-srgb','rgba16float'].includes(format))throw new TypeError('target format');
 finite(actorAspect,'actorAspect');if(actorAspect<=0)throw new RangeError('actorAspect');
 const shader=device.createShaderModule({label:VERSION_ID,code:WGSL});
 const buffer=device.createBuffer({label:VERSION_ID+' uniform64',size:64,usage:0x40|0x08});
 const diagnostics={status:'PENDING',messages:[],error:null};
 const diagnosticsReady=shader.getCompilationInfo().then(info=>{
 diagnostics.messages=Array.from(info.messages,m=>({message:m.message,type:m.type,lineNum:m.lineNum,linePos:m.linePos,offset:m.offset,length:m.length}));
 diagnostics.status=diagnostics.messages.some(m=>m.type==='error')?'FAILED':'COMPILATION_INFO_RECEIVED';return diagnostics;
 }).catch(error=>{diagnostics.status='FAILED';diagnostics.error=String(error);return diagnostics;});
 let pipeline,bind;
 try{
 pipeline=device.createRenderPipeline({label:VERSION_ID,layout:'auto',vertex:{module:shader,entryPoint:'vs'},
 fragment:{module:shader,entryPoint:'fs',constants:{TARGET_ENCODE:format.endsWith('-srgb')||format==='rgba16float'?0:1},targets:[{format,blend:{
 color:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'},alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha',operation:'add'}}}]},primitive:{topology:'triangle-list'}});
 bind=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[
 {binding:0,resource:{buffer}},{binding:1,resource:actorTexture.createView()},
 {binding:2,resource:device.createSampler({magFilter:'linear',minFilter:'linear'})}]});
 }catch(error){buffer.destroy();throw error;}
 let disposing=false,disposePromise=null,frames=0;
 const dispose=()=>{
 if(disposePromise)return disposePromise;disposing=true;
 disposePromise=(async()=>{try{await device.queue.onSubmittedWorkDone();}catch(error){if(!device.lost)throw error;await device.lost;}
 buffer.destroy();return{disposed:true,ownedBuffersDestroyed:1,hostTextureDestroyed:false};})();return disposePromise;
 };
 return{diagnostics,diagnosticsReady,render(input){
 if(disposing)throw new Error('renderer disposed');
 if(!input?.encoder||!input?.view)throw new TypeError('host encoder/view');
 const s=frameState(input,actorAspect);device.queue.writeBuffer(buffer,0,s.uniforms);
 const pass=input.encoder.beginRenderPass({label:VERSION_ID,colorAttachments:[{view:input.view,loadOp:'load',storeOp:'store'}]});
 pass.setPipeline(pipeline);pass.setBindGroup(0,bind);pass.draw(3);pass.end();frames++;
 return{versionId:VERSION_ID,passes:1,active:s.active,phase:s.phase,variantIndex:s.variantIndex,durationMs:s.durationMs,framesRecorded:frames,submitted:false,gpuCompletion:'HOST_OWNED_NOT_OBSERVED'};
 },dispose,destroy:dispose};
}
export function synthesizeSfx(sampleRate=48000,v=0){
 validateVariant(v);if(!Number.isInteger(sampleRate)||sampleRate<8000||sampleRate>192000)throw new RangeError('sampleRate');
 const n=Math.round(sampleRate*SFX_DURATION_MS/1000),pcm=new Float32Array(n),contacts=contactPlan(v);
 let seed=(0x16bc9a37+v*0x129f)>>>0,low=0;
 const thickness=1+.035*(v-3.5);
 for(let i=0;i<n;i++){
 const t=i/sampleRate;seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;
 const noise=(seed>>>0)/2147483648-1;low+=.085*(noise-low);const high=noise-low;
 let value=.29*high*Math.exp(-t/.012)+.14*Math.sin(2*Math.PI*2850*thickness*t)*Math.exp(-t/.028)+
 .09*Math.sin(2*Math.PI*4630*thickness*t)*Math.exp(-t/.016);
 for(const c of contacts){const dt=t-c.timeMs/1000;
 if(dt>=0)value+=c.amplitude*(Math.sin(2*Math.PI*c.frequency*dt)*Math.exp(-dt/.032)+
 .34*Math.sin(2*Math.PI*c.frequency*1.71*dt)*Math.exp(-dt/.014)+.42*high*Math.exp(-dt/.003));}
 pcm[i]=value*clamp((n-1-i)/(sampleRate*.065));
 }return pcm;
}
