import math,json
h=(8.3,8.5);r=2.1
def helper(q,cut):
 core=(max(-6.2,min(6.2,q[0])),max(-6.4,min(6.4,q[1])));d=(q[0]-core[0],q[1]-core[1]);m=min(1,r/max(math.hypot(*d),.0001));near=(core[0]+d[0]*m,core[1]+d[1]*m)
 if near[0]<=cut:return math.dist(q,near)
 u=max(0,min(r,abs(cut)-6.2));cy=6.4+math.sqrt(max(0,r*r-u*u));return math.dist(q,(cut,max(-cy,min(cy,q[1]))))
def sd(q):
 v=(abs(q[0])-6.2,abs(q[1])-6.4);return math.hypot(max(v[0],0),max(v[1],0))+min(max(v),0)-r
def polygon(cut):
 pts=[]
 for sx,sy,start in [(1,1,0),(-1,1,math.pi/2),(-1,-1,math.pi),(1,-1,3*math.pi/2)]:
  for j in range(1025):
   a=start+j*math.pi/2048;pts.append((sx*6.2+r*math.cos(a),sy*6.4+r*math.sin(a)))
 out=[]
 for a,b in zip(pts,pts[1:]+pts[:1]):
  ia=a[0]<=cut;ib=b[0]<=cut
  if ia:out.append(a)
  if ia!=ib:
   u=(cut-a[0])/(b[0]-a[0]);out.append((cut,a[1]+u*(b[1]-a[1])))
 return out
def seg(q,a,b):
 e=(b[0]-a[0],b[1]-a[1]);den=e[0]**2+e[1]**2
 t=max(0,min(1,((q[0]-a[0])*e[0]+(q[1]-a[1])*e[1])/den)) if den else 0
 return math.dist(q,(a[0]+t*e[0],a[1]+t*e[1]))
worst=0;checks=0
for cut in [-8.29,-8.2,-7,-6.2,-5,0,5,6.2,7,8.2,20]:
 poly=polygon(cut)
 for x in range(-18,19,3):
  for y in range(-18,19,3):
   q=(x+.23,y+.17);actual=helper(q,cut)
   expected=0 if sd(q)<=0 and q[0]<=cut else min(seg(q,a,b) for a,b in zip(poly,poly[1:]+poly[:1]))
   worst=max(worst,abs(actual-expected));assert abs(actual-expected)<.000025,(q,cut,actual,expected);checks+=1
print(json.dumps({'checks':checks,'exposedRoundedSourceDistanceMaxError':worst,'independentReference':'clipped rounded polygon, 1024 segments per corner; numerical only, no GPU pixels','supportExtent':5.0,'shaderExpiryMs':1310,'actualDisplay':'not_run'}))
