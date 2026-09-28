"""WGSLの解析式をNumPyで独立照合。GPU実行・実画素の代用品ではない。
PNGは検査資料にのみ保存し、WebGPU描画のtextureには絶対に使わない。
"""
from pathlib import Path
import json, math, time, wave
import numpy as np
from PIL import Image, ImageDraw
ROOT=Path(__file__).resolve().parents[1]
def smooth(a,b,x):
 q=np.clip((x-a)/(b-a),0,1);return q*q*(3-2*q)
def cover(d,w,aa): return 1-smooth(w-aa,w+aa,d)
def gauss(x,y,wx,wy): return np.exp(-((x/wx)**2+(y/wy)**2))
def seg(x,y,a,b):
 vx=b[0]-a[0];vy=b[1]-a[1];t=np.clip(((x-a[0])*vx+(y-a[1])*vy)/max(vx*vx+vy*vy,1e-6),0,1)
 return np.hypot(x-a[0]-vx*t,y-a[1]-vy*t)
def aces(c):return np.clip(c*(2.51*c+.03)/(c*(2.43*c+.59)+.14),0,1)
def srgb(c):return np.where(c<=.0031308,c*12.92,1.055*np.maximum(c,0)**(1/2.4)-.055)
def sources(s):
 o=s['shape']
 if s['kind']==0:return [(-(.08+.2*o),-.38),(.08+.2*o,.36)]
 return [(-(.28+.25*(-.1/.66)**2-.15*o),-.1),(.28+.25*(.19/.58)**2-.15*o,.19)]
def power(s,i):
 if s['kind']==0:return s['gate']*([.55,.4][i]+[3.9,2.8][i]*s['peak'])
 return s['gate']*([.15,.10][i]+[2.9,1.9][i]*s['peak'])
def field(x,y,s,aa):
 shape=x.shape;gate=s['gate'];o=s['shape'];peak=s['peak'];emit=np.zeros((*shape,3));obs=np.zeros_like(emit)
 if s['kind']==0:
  d=np.full(shape,100.);teeth=d.copy()
  for side in [-1,1]:
   off=.2*o;pts=[(side*(.08+off),-.38),(side*(.41+off),-.38),(side*(.58+off),-.20),(side*(.58+off),.21),(side*(.43+off),.36),(side*(.08+off),.36)]
   for a,b in zip(pts,pts[1:]):d=np.minimum(d,seg(x,y,a,b))
   for n in range(3):
    yy=-.12+n*.14;teeth=np.minimum(teeth,seg(x,y,(side*(.54+off),yy),(side*(.61+off),yy)))
  shell=cover(d,.043,aa)*gate;rib=cover(teeth,.006,aa)*gate;bevel=np.exp(-((d-.027)/.013)**2)
  seam=cover(seg(x,y,(-.08,-.38),(.08,-.38)),.019,aa)*s['stress']*gate
  colored=cover(d,.019,aa)*gate;cov=np.clip(shell*.91+seam*.9,0,.96)
  body=(np.array([.22,.053,.008])*(1-bevel[...,None])+np.array([.82,.31,.041])*bevel[...,None])*s['body']
  emit=np.array([1,.54,.11])*colored[...,None]*.65+np.array([1,.90,.50])*rib[...,None]*.4+np.array([1,.85,.38])*seam[...,None]*(1.3+peak*3)
  for i,(sx,sy) in enumerate(sources(s)):
   dx=x-sx;dy=y-sy;p=power(s,i);emit+=np.array([1,.98,.86])*gauss(dx,dy,.033,.019)[...,None]*p*3
   obs+=np.array([1,.79,.37])*p*(gauss(dx,dy,.125,.025)*.34+gauss(dx,dy,.061,.073)*.12)[...,None]
  obs+=np.array([1,.49,.12])*np.exp(-(d/.092)**2)[...,None]*gate*.045
 else:
  shell=np.zeros(shape);filament=shell.copy();inner=shell.copy()
  for i,side in enumerate([-1,1]):
   h=[.66,.58][i];yn=y/h;terminal=1-smooth(.87,1,abs(yn));xx=.28+.25*yn*yn-.15*o
   sd=(x*side-xx)/np.sqrt(1+(.5*y/(h*h))**2);w=.016+.052*np.maximum(0,1-yn*yn)
   shell=np.maximum(shell,cover(abs(sd),w,aa)*terminal)
   filament=np.maximum(filament,cover(abs(sd+w*.64),.0085,aa)*terminal)
   inner=np.maximum(inner,np.exp(-((sd-w*.22)/.029)**2)*terminal)
  cov=shell*gate*.87;body=(np.array([.012,.009,.055])*(1-inner[...,None])+np.array([.19,.055,.49])*inner[...,None])*s['body']
  emit=(np.array([.33,.10,.98])*filament[...,None]*(.34+.86*o)+np.array([.08,.045,.32])*inner[...,None]*.24)*gate
  for i,(sx,sy) in enumerate(sources(s)):
   dx=x-sx;dy=y-sy;p=power(s,i);emit+=np.array([.96,.88,1])*gauss(dx,dy,.016,.049)[...,None]*p*2.7
   obs+=np.array([.51,.23,1])*p*(gauss(dx,dy,.047,.153)*.16+gauss(dx,dy,.093,.052)*.052)[...,None]
 return cov,body,emit,obs

def render(samples,bright=0,scale=1,width=384,height=320,fixture=True,observation=True,local_light=True):
 yy,xx=np.mgrid[:height,:width];X=(xx+.5-width*.5)/scale;Y=(yy+.5-height*.5)/scale;aa=1/scale
 color=np.zeros((height,width,3))+np.array([.013,.019,.029])*(1-bright)+np.array([.72,.74,.78])*bright
 grid=np.minimum(abs((X/32+.5)%1-.5),abs((Y/32+.5)%1-.5));guide=1-smooth(.003,.018,grid)
 color*=1+guide[...,None]*.32*(1.16-1 if bright<.5 else .97-1)
 obs=np.zeros_like(color);light=np.zeros_like(color);gloss=np.zeros_like(color)
 for s in samples:
  if not s['active']:continue
  R=s['radius'];x=(X-s['x'])/R;y=(Y-s['y'])/R;window=1-smooth(.90,.985,np.hypot(x,y))
  cov,body,emit,ob=field(x,y,s,aa/R);a=cov*window
  color=color*(1-a[...,None])+body*a[...,None]+emit*window[...,None];obs+=ob*window[...,None]
 if fixture:
  qx=abs(X)-8;qy=abs(Y)-27;d=np.hypot(np.maximum(qx,0),np.maximum(qy,0))+np.minimum(np.maximum(qx,qy),0)-5
  actor=1-smooth(-aa,aa,d);nx=X/14;ny=Y/130;nz=np.full_like(X,.75);norm=np.sqrt(nx*nx+ny*ny+nz*nz);nx/=norm;ny/=norm;nz/=norm
  for s in samples:
   if not s['active']:continue
   R=s['radius'];col=np.array([1,.78,.34] if s['kind']==0 else [.57,.23,1])
   for i,(sx,sy) in enumerate(sources(s)):
    dx=s['x']+sx*R-X;dy=s['y']+sy*R-Y;dz=R*.20;d2=dx*dx+dy*dy+dz*dz;lambert=np.maximum(0,(nx*dx+ny*dy+nz*dz)/np.sqrt(d2))
    light+=col*(power(s,i)*lambert*(R*.12)**2/d2)[...,None]
    rootd=np.sqrt(d2);lx=dx/rootd;ly=dy/rootd;lz=dz/rootd;hn=np.sqrt(lx*lx+ly*ly+(lz+1)**2);hx=lx/hn;hy=ly/hn;hz=(lz+1)/hn
    nv=np.maximum(nz,.001);nl=lambert;nh=np.maximum(nx*hx+ny*hy+nz*hz,0);vh=np.maximum(hz,0)
    rough=np.clip(.78+.08*ny,.65,.9);a2=rough**4;k=(rough+1)**2/8;f=.04+.96*(1-vh)**5;D=a2/(np.pi*(nh*nh*(a2-1)+1)**2);G=(nv/(nv*(1-k)+k))*(nl/(nl*(1-k)+k))
    brdf=D*f*G/np.maximum(4*nv*nl,.0001);gloss+=col*(power(s,i)*(R*.12)**2/d2*nl*brdf)[...,None]
  material=np.array([.10,.12,.15])*(1+.22*nx-.09*ny)[...,None];receive=material*(.8+light*.96*2.5*local_light)+gloss*local_light
  color=color*(1-actor[...,None])+receive*actor[...,None];obs*=(1-.82*(1-smooth(0,2*aa,d)))[...,None]
 if observation:color+=obs
 result=srgb(aces(color));assert np.isfinite(result).all()
 return np.uint8(np.rint(np.clip(result,0,1)*255))

def main():
 data=json.loads((ROOT/'evidence/sampler-frames.json').read_text())['frames'];by={(s['eventId'],s['ageActorMs']):s for s in data}
 import argparse
 p=argparse.ArgumentParser();p.add_argument('--effect',choices=['rational','ninjutsu']);p.add_argument('--case',type=int);args=p.parse_args()
 names=['action-rational-free','action-ninjutsu-focus'];results=[];baseline={};key_times=[0,60,156,290,610,820,1040,1200]
 t0=time.perf_counter();folder=ROOT/'evidence/cpu-reference';folder.mkdir(exist_ok=True)
 for name,R in zip(names,[145,115]):
  if args.effect and args.effect not in name:continue
  case_index=0
  for mode,scale in [('actorH64',1),('envelopeH64',64/(2*R))]:
   for bright in [0,1]:
    current_case=case_index;case_index+=1
    if args.case is not None and args.case!=current_case:continue
    bg='light' if bright else 'dark';base=render([],bright,scale);baseline[name,mode,bright]=base
    sheet=Image.new('RGB',(384*4,348*2+32),(18,22,29));draw=ImageDraw.Draw(sheet);draw.text((12,10),f'CPU REFERENCE / NOT GPU  |  {name}  |  {mode} {bg}',fill=(220,230,245))
    for n,age in enumerate(key_times):
     s=by[name,age];pixels=render([s],bright,scale);x=(n%4)*384;y=(n//4)*348+32;sheet.paste(Image.fromarray(pixels),(x,y));draw.text((x+12,y+324),f'{age:4d} actor-ms',fill=(220,230,245))
     if age in [156,610]:Image.fromarray(pixels).save(folder/f'{name}-{mode}-{bg}-{age}.png')
    sheet.save(folder/f'{name}-{mode}-{bg}-lifetime.png')
    # 全寿命20 actor-ms刻み。定量値はCPU参照式の結果だけ。
    numeric_size=304 if mode=='actorH64' else 96
    numeric_base=render([],bright,scale,width=numeric_size,height=numeric_size)
    for age in range(0,1201,100):
     s=by[name,age];pixels=render([s],bright,scale,width=numeric_size,height=numeric_size);diff=np.max(abs(pixels.astype(float)-numeric_base),axis=2)
     yy,xx=np.mgrid[:pixels.shape[0],:pixels.shape[1]];radius=np.hypot(xx+.5-pixels.shape[1]/2,yy+.5-pixels.shape[0]/2)/scale
     outside=(radius>R+2/scale);outside_max=float(diff[outside].max(initial=0))
     if age in [0,1200]:assert np.array_equal(numeric_base,pixels)
     assert outside_max==0
     results.append({'eventId':name,'mode':mode,'background':bg,'actorMs':age,'changed_pixels_gt8':int((diff>8).sum()),'near_white_pixels':int((np.min(pixels,axis=2)>248).sum()),'outside_radius_max_difference':outside_max,'finite':True})
  peak=by[name,156 if R==145 else 610];base=render([],0,1);full=render([peak]);noobs=render([peak],observation=False);nolight=render([peak],local_light=False)
  triple=render([peak,peak,peak]);Image.fromarray(triple).save(folder/f'{name}-three-causes-peak.png')
  assert np.any(full!=noobs);assert np.any(full!=nolight);assert np.any(triple!=full)
  Image.fromarray(noobs).save(folder/f'{name}-world-without-OBS.png')
  results.append({'eventId':name,'ablation':{'world_visible_without_OBS':bool(np.any(noobs!=base)),'local_light_changes_receiver_pixels':bool(np.any(full!=nolight)),'three_unique_causes_changes_composite':bool(np.any(triple!=full))}})
 (ROOT/f'evidence/cpu-pixel-tests-{args.effect or "all"}-{args.case if args.case is not None else "all"}.json').write_text(json.dumps({'status':'pass','basis':'CPU NumPy参照式。WGSL/GPUコンパイル・実GPU画素・主観品質の証明ではない。','frames':len([r for r in results if 'actorMs' in r]),'step_actor_ms':100,'conditions':'各指定ケースについて13時点(0..1200、100刻み)を数値照合。キー時点8枚も別途作像。加えて各EのOBS/局所光アブレーションと3原因重複。','elapsed_seconds':round(time.perf_counter()-t0,3),'records':results},ensure_ascii=False,indent=2))
 print('CPU reference frames:',len(results),'seconds:',round(time.perf_counter()-t0,2))
if __name__=='__main__':main()
