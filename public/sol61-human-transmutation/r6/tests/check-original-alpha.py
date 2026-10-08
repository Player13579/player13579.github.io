import json
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1]
points=json.loads((root/'SITE-PLACEMENT.json').read_text(encoding='utf-8'))['sites']
a=Image.open(root/'assets/philia-front-nine-v752.png').convert('RGBA').getchannel('A')
rows=[]
for s in points:
 alpha=a.getpixel((s['x'],s['y']))/255
 rows.append({'x':s['x'],'y':s['y'],'alpha':alpha,'supported':alpha>.85})
if len(rows)!=25 or len({(x['x'],x['y']) for x in rows})!=25 or not all(x['supported'] for x in rows):
 raise SystemExit(json.dumps({'count':len(rows),'distinct':len({(x['x'],x['y']) for x in rows}),'unsupported':[x for x in rows if not x['supported']]}))
print(json.dumps({'count':len(rows),'distinct':len({(x['x'],x['y']) for x in rows}),'threshold':.85,'minimumAlpha':min(x['alpha'] for x in rows),'supported':True}))
