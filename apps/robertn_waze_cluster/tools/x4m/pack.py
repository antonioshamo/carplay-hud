"""Pack SceneKit renders of the owner-supplied GLB; no image substitution."""
import sys,json,zlib,base64,hashlib
from pathlib import Path
from PIL import Image
frames=Path(sys.argv[1]);root=Path(__file__).resolve().parents[4]
assets=root/'native/cluster-studio/assets/x4m';assets.mkdir(parents=True,exist_ok=True)
entries=[]
for i in range(96):
 im=Image.open(frames/f'{i:03}.png').convert('RGBA')
 assert im.size==(900,450)
 data=zlib.compress(im.tobytes(),9);name=f'{i:03}.rgba.z';(assets/name).write_bytes(data)
 entries.append({'file':name,'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data)})
 if i==12:poster=base64.b64encode(data).decode()
(root/'apps/robertn_waze_cluster/src/cockpit_car.js').write_text("// Owner-supplied X4 M GLB, default 45 degree view. See assets/menu/NOTICE.md.\n'use strict';\nconst kit=require('./kit_record.js');let car;\nmodule.exports=()=>{if(!car||!kit.imageById.has(car.imageId))car=kit.makeImage(900,450,require('zlib').inflateSync(Buffer.from('"+poster+"','base64')));return car;};\n")
(assets/'views.json').write_text(json.dumps({'width':900,'height':450,'count':96,'default':12,'stepDegrees':3.75,'views':entries},indent=2)+'\n')
p=root/'native/cluster-studio/component.json';j=json.loads(p.read_text());j['files']=[v for v in j['files'] if not v['path'].startswith('assets/x4m/')]+[{'path':'assets/x4m/'+v,'mode':'0644'} for v in ['views.json']+[e['file'] for e in entries]];p.write_text(json.dumps(j,indent=2)+'\n')
print('Packed',len(entries),'views,',sum(e['bytes'] for e in entries),'bytes')
