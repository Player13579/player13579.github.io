"""CPU triangle/fragment approximation from actual sampler vertices. Never a WebGPU fallback.
No old release code or pictures are read. This diagnostic is not a shader compiler or quality pass.
"""
import json,math
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'evidence'
FONT=ImageFont.load_default(size=12)
BOLD=ImageFont.load_default(size=15)
def smooth(a,b,x):
 u=np.clip((x-a)/(b-a),0,1);return u*u*(3-2*u)
def srgb(c):return np.where(c<=.0031308,c*12.92,1.055*np.maximum(c,0)**(1/2.4)-.055)
def tone(c):
 peak=np.max(c,axis=-1);compressed=.82+.18*(1-np.exp(-np.maximum(peak-.82,0)/.18));ratio=np.where(peak>.82,compressed/np.maximum(peak,1e-9),1)
 return srgb(np.clip(c*ratio[...,None],0,1))
def box(x,y,w,h,r):
 qx=np.abs(x)-w+r;qy=np.abs(y)-h+r;return np.hypot(np.maximum(qx,0),np.maximum(qy,0))+np.minimum(np.maximum(qx,qy),0)-r

def blur_axis(a,step,axis):
 weights=[.227027,.1945946,.1216216,.054054,.016216];out=a*weights[0];n=a.shape[axis]
 for i in range(1,5):
  for sign in [-1,1]:
   pos=np.arange(n)+sign*i*step;j=np.floor(pos).astype(int);f=pos-j;k=j+1;j=np.clip(j,0,n-1);k=np.clip(k,0,n-1)
   shape=[1]*a.ndim;shape[axis]=n
   out+=(np.take(a,j,axis=axis)*(1-f.reshape(shape))+np.take(a,k,axis=axis)*f.reshape(shape))*weights[i]
 return out

def raster(meshes,scale,ox,oy,w,h,ss):
 color=np.zeros((h,w,4),dtype=np.float32);light=np.zeros((h,w,3),dtype=np.float32)
 for mesh in meshes:
  vertices=mesh['vertices']
  for index in range(1,len(vertices)-1):
   vs=[vertices[0],vertices[index],vertices[index+1]];pt=np.array([[((v['point'][0])*scale+ox)*ss,((v['point'][1])*scale+oy)*ss] for v in vs])
   x0=max(0,int(np.floor(pt[:,0].min())));x1=min(w,int(np.ceil(pt[:,0].max())));y0=max(0,int(np.floor(pt[:,1].min())));y1=min(h,int(np.ceil(pt[:,1].max())))
   if x1<=x0 or y1<=y0:continue
   a,b,c=pt;den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1])
   if abs(den)<1e-8:continue
   yy,xx=np.mgrid[y0:y1,x0:x1];xx=xx+.5;yy=yy+.5
   w0=((b[1]-c[1])*(xx-c[0])+(c[0]-b[0])*(yy-c[1]))/den
   w1=((c[1]-a[1])*(xx-c[0])+(a[0]-c[0])*(yy-c[1]))/den;w2=1-w0-w1
   inside=(w0>=0)&(w1>=0)&(w2>=0)
   if not np.any(inside):continue
   uv=np.array([v['uv'] for v in vs]);UV=w0[...,None]*uv[0]+w1[...,None]*uv[1]+w2[...,None]*uv[2]
   mat=vs[0];base=np.array(mat['color'][:3]);alpha=np.full(w0.shape,mat['color'][3]);radiance=np.array(mat['light'][:3])*mat['light'][3];role=int(mat['params'][0])
   col=np.broadcast_to(base,w0.shape+(3,)).copy();energy=np.broadcast_to(radiance,col.shape).copy();v=UV[...,1]
   if role==1:
    # Analytic UV derivative approximation, not an executed WGSL fwidth.
    d0=np.array([b[1]-c[1],c[0]-b[0]])/den;d1=np.array([c[1]-a[1],a[0]-c[0]])/den;d2=-d0-d1
    grad=d0*uv[0,1]+d1*uv[1,1]+d2*uv[2,1];aa=max(abs(grad[0])+abs(grad[1]),.015)
    side=1-smooth(.87-aa,1+aa,np.abs(v));dark=1-smooth(.05,.24,np.abs(v+.24));crest=np.exp(-55*(v-.40)**2);lead=.28+.72*np.exp(-22*(UV[...,0]-.70)**2);face=np.clip(.70+.30*v,.36,1)
    col*=((1-.82*dark)*face)[...,None];key=smooth(.69,.91,np.abs(v))*.88;col=col*(1-key[...,None])+np.array([.003,.009,.023])*key[...,None];energy*=(crest*lead+.040)[...,None];alpha*=side
   elif role==2:energy*=.92
   elif role==3:
    col*=np.clip(.76+.21*UV[...,0]-.12*UV[...,1],.38,1)[...,None];energy*=(.18+.82*np.maximum(0,1-np.abs(UV[...,0]+.38)*.70)**2)[...,None]
   elif role==4:
    col*=(.78+.22*np.clip(1-UV[...,1],0,1))[...,None];energy*=.55
   alpha*=inside
   dest=color[y0:y1,x0:x1];dest[...,:3]=col*alpha[...,None]+dest[...,:3]*(1-alpha[...,None]);dest[...,3]=alpha+dest[...,3]*(1-alpha)
   light[y0:y1,x0:x1]+=energy*alpha[...,None]
 return color,light

def draw(case,width=380,height=286):
 scale=case['scale'];ss=2;w=width*ss;h=height*ss;ox=width*.52;oy=height/2+32*scale
 xx,yy=np.meshgrid((np.arange(w)+.5)/ss,(np.arange(h)+.5)/ss);x=(xx-ox)/scale;y=(yy-oy)/scale
 bg=np.array([.70,.73,.78]) if case['light'] else np.array([.006,.012,.025]);frame=np.broadcast_to(bg,(h,w,3)).copy()
 def composite(layer):
  nonlocal frame
  meshes=[m for s in case['samples'] for m in s['meshes'] if m['layer']==layer]
  base,emission=raster(meshes,scale,ox,oy,w,h,ss);bloom=blur_axis(blur_axis(emission,.60*scale*ss,1),.60*scale*ss,0)
  frame=base[...,:3]+frame*(1-base[...,3,None])+emission+.42*bloom
 composite('back')
 head=np.hypot(x,y+56)-8;torso=box(x,y+34,10,14,1.8);arms=box(np.abs(x)-13.2,y+32,2.8,12,1.8);legs=box(np.abs(x)-5.1,y+10,3.6,10,1)
 d=np.minimum(np.minimum(head,torso),np.minimum(arms,legs));aa=.55/(ss*scale);alpha=1-smooth(-aa,aa,d);inner=smooth(.25,1.2,-d)
 c=np.array([.010,.018,.030])*(1-inner[...,None])+np.array([.17,.19,.23])*inner[...,None]
 facet=(np.abs(x)<7.5)&(y>-45)&(y<-32);c[facet]*=1.13;frame=c*alpha[...,None]+frame*(1-alpha[...,None])
 composite('front')
 if case['occlusion']:
  d=box(x-6,y+31,8,15,1);alpha=1-smooth(-.45,.45,d);inside=smooth(.1,1.2,-d);c=np.array([.012,.020,.030])*(1-inside[...,None])+np.array([.075,.095,.115])*inside[...,None];frame=c*alpha[...,None]+frame*(1-alpha[...,None])
 image=Image.fromarray(np.uint8(np.clip(tone(frame)*255,0,255))).resize((width,height),Image.Resampling.LANCZOS)
 return image

def label(im,title):
 out=Image.new('RGB',(im.width,im.height+43),'#142136');out.paste(im,(0,43));d=ImageDraw.Draw(out);d.text((10,5),title,font=BOLD,fill='#c7ddfa');d.text((10,24),'CPU DIAGNOSTIC / NOT WGSL OR GPU / NO QUALITY PASS',font=FONT,fill='#edc38e');return out

def main():
 OUT.mkdir(exist_ok=True);data=json.loads((ROOT/'qa/samples.json').read_text());names={}
 for c in data['cases']:
  im=label(draw(c),f"{c['actorMs']} actor-ms | H{c['scale']*64} | {c['scenario']}");im.save(OUT/(c['name']+'.png'));names[c['name']]=im
 grid=Image.new('RGB',(380*3,329*2),'#101d30')
 for row,light in enumerate(['dark','light']):
  for col,s in enumerate([1,2,3]):grid.paste(names[f'size-{s}-{light}'],(col*380,row*329))
 grid.save(OUT/'H64-matrix-CPU.png')
 for light in ['dark','light']:
  grid=Image.new('RGB',(380*4,329*3),'#101d30');times=[30,140,300,450,650,850,1009,1200,1380,1460,1500,1720]
  for i,t in enumerate(times):grid.paste(names[f'phase-{t}-{light}'],((i%4)*380,(i//4)*329))
  grid.save(OUT/f'full-life-{light}-CPU.png')
 print(f"{len(data['cases'])} current-sampler CPU diagnostic stills and three sheets; no GPU or listening acceptance.")
if __name__=='__main__':main()
