"""Numerical description of the USER'S existing 256x192 captures; creates no image."""
import json,hashlib
from pathlib import Path
from PIL import Image
import numpy as np
ROOT=Path(__file__).resolve().parents[1]
records=[]
for branch,t in [('create',300),('absorb',175),('fracture',240),('bust',240)]:
 p=ROOT/'evidence'/f'barrier-H64-{branch}-{t}ms.png';im=np.asarray(Image.open(p).convert('RGB'));f=im/255.;bg=im[0,0].astype(int)
 lin=np.where(f<=.04045,f/12.92,((f+.055)/1.055)**2.4);lum=lin@np.array([.2126,.7152,.0722]);mask=np.max(np.abs(im.astype(int)-bg),axis=2)>2
 ys,xs=np.where(mask);center=mask[76:116,108:148]
 records.append({'branch':branch,'ageMs':t,'file':str(p.relative_to(ROOT)),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),
 'size':[int(im.shape[1]),int(im.shape[0])],'background_srgb8':bg.tolist(),'changed_pixel_threshold':'>2 code values away from corner background in any RGB channel',
 'changed_pixels':int(mask.sum()),'bounds':[int(xs.min()),int(ys.min()),int(xs.max()-xs.min()+1),int(ys.max()-ys.min()+1)],
 'foreground_linearY_median':float(np.median(lum[mask])),'foreground_linearY_p95':float(np.quantile(lum[mask],.95)),
 'foreground_linearY_max':float(np.max(lum[mask])),'center_40px_square_changed_fraction':float(center.mean()),
 'intrinsic_alpha_or_transmission':'not_identifiable_from_one_uniform_background_capture'})
result={'source':'four user-provided real Chrome WebGPU captures of our r0.1, viewed at native 256x192','user_quality_verdict':'all four rejected',
 'analysis_scope':'existing screenshot measurements, not new renders or a universal aesthetic score','records':records}
(ROOT/'barrier-pro-baseline-analysis.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
print(json.dumps(result,ensure_ascii=False,indent=2))
