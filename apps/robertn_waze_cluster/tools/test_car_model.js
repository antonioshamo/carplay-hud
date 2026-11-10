// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),zlib=require('zlib'),crypto=require('crypto');
const Car=require('../src/car_model.js'),kit=require('../src/kit_record.js');
const root=path.resolve(__dirname,'../../../native/cluster-studio/assets/x4m');
const wait=()=>new Promise(resolve=>setTimeout(resolve,5));
async function settled(c){for(let i=0;i<1000&&c.loading;i++)await wait();assert(!c.loading,'frame loading must finish');}
async function main(){
 const manifest=JSON.parse(fs.readFileSync(root+'/views.json'));assert.equal(manifest.views.length,Car.COUNT);const hashes=new Set();
 assert.deepEqual(manifest.contentBounds,require('../src/cockpit_car.js').bounds,'poster and orbit share framing');
 for(const v of manifest.views){const bytes=fs.readFileSync(root+'/'+v.file);assert.equal(bytes.length,v.bytes);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),v.sha256);const rgba=zlib.inflateSync(bytes);assert.equal(rgba.length,Car.W*Car.H*4);hashes.add(v.sha256);
  const b=manifest.contentBounds;for(let i=3;i<rgba.length;i+=4)if(rgba[i]>=8){const n=(i-3)/4,x=n%Car.W,y=Math.floor(n/Car.W);assert(x>=b.x&&x<b.x+b.w&&y>=b.y&&y<b.y+b.h,'every car silhouette fits shared bounds');}
 }assert.equal(hashes.size,Car.COUNT,'every orbit angle is distinct');
 for(const page of ['overview','vehicle']){const area=Car.rect(page,{}),b=manifest.contentBounds,box=Car.placement(area,Car.pose(),b),scale=box.w/Car.W;assert(box.x+b.x*scale>=area.x&&box.y+b.y*scale>=area.y);assert(box.x+(b.x+b.w)*scale<=area.x+area.w&&box.y+(b.y+b.h)*scale<=area.y+area.h,'roof and wheels fit without zooming first');}
 for(const page of ['overview','vehicle']){const area=Car.rect(page,{}),b=manifest.contentBounds,p=Car.pose(),full=Car.placement(area,p,b),crop=Car.views.crop,small=Car.placement(area,p,b,crop),scale=full.w/Car.W;assert(Math.abs(small.x-(full.x+crop.x*scale))<1e-8&&Math.abs(small.y-(full.y+crop.y*scale))<1e-8,'prepared and full views keep identical placement');assert(Math.abs(small.w-crop.w*scale)<1e-8);assert(Math.abs(small.h-crop.h*scale)<1e-8);}
 for(const v of Car.views.views){const packed=fs.readFileSync(root+'/'+v.file);assert.equal(crypto.createHash('sha256').update(packed).digest('hex'),v.sha256);const data=zlib.inflateSync(packed),size=Car.views.width*Car.views.height*4;assert.equal(data.length,size);for(let i=0;i<size;i+=4)for(let k=0;k<3;k++)assert(data[i+k]<=data[i+3],'prepared color is bounded by opacity');}
 let reads=0,changes=0;const c=new Car.CarModel(()=>changes++,{root,read:(p,fn)=>{reads++;fs.readFile(p,fn);}});assert.equal(reads,0,'startup does not load the orbit');
 const poster=c.get(45);assert(kit.imageById.has(poster.imageId));await settled(c);
 const ids=new Set();
 for(let i=0;i<96;i++){c.get(i*3.75);await settled(c);ids.add(c.get(i*3.75).imageId);assert(c.cache.size<=12,'decoded rotation cache stays bounded');assert.equal(c.currentIndex,Car.index(i*3.75));}
 assert.equal(ids.size,2,'all 96 angles reuse two display buffers');
 const before=reads;c.get(120);c.get(121);c.get(180);c.get(270);await settled(c);c.get(270);assert(reads-before<=6,'rapid drags load the latest view and only nearby views');assert.equal(c.currentIndex,Car.index(270));
 assert(changes>0);const retained=c.slots.slice();c.close();for(const im of retained)assert(!kit.imageById.has(im.imageId));
 const reopened=new Car.CarModel(()=>{},{root});assert(kit.imageById.has(reopened.get(45).imageId),'reopening restores a released poster');reopened.close();
 let callback;const late=new Car.CarModel(()=>{throw Error('closed loader must not notify');},{read:(p,fn)=>{callback=fn;}});late.get(0);late.close();callback(null,fs.readFileSync(root+'/motion/000.rgba.z'));assert.equal(late.cache.size,0);
 const bad=new Car.CarModel(()=>{},{read:(p,fn)=>process.nextTick(()=>fn(null,Buffer.from('broken')))});const fallback=bad.get(0);await settled(bad);assert(bad.error);assert.equal(bad.current,fallback,'failed loads retain the visible car');bad.close();
 const p=Car.pose();Car.drag(p,Object.assign({},p),200,0);assert.equal(p.angle,145);Car.adjust(p,'mode');Car.drag(p,Object.assign({},p),999,999);assert.equal(p.x,85);assert.equal(p.y,35);for(let i=0;i<20;i++)Car.adjust(p,'in');assert.equal(p.zoom,1.25);Car.adjust(p,'reset');assert.deepEqual(p,Car.pose());assert.equal(Car.index(-360),0);
 // Model a slow disk while the finger moves faster than one decoded view.
 let pending,shown=[];const slow=new Car.CarModel(()=>{slow.get(slow.wanted*3.75);shown.push(slow.currentIndex);},{read:(p,fn)=>{pending={p,fn};},inflate:(data,fn)=>fn(null,zlib.inflateSync(data))});
 slow.get(45);let job=pending;pending=null;job.fn(null,fs.readFileSync(root+'/'+Car.views.views[12].file));
 for(let n=16;n<=48;n+=4){slow.request(n*3.75);job=pending;assert(job);pending=null;job.fn(null,fs.readFileSync(root+'/'+job.p.split('/x4m/')[1]));}
 assert(new Set(shown).size>=5,'continuous dragging displays progress before the finger stops');
 assert(slow.current&&kit.imageById.has(slow.current.imageId),'slow loading always retains a complete car');
 const stopped=slow.currentIndex;slow.request((stopped-4)*3.75);job=pending;pending=null;job.fn(null,fs.readFileSync(root+'/'+job.p.split('/x4m/')[1]));assert.equal(slow.currentIndex,stopped,'late forward decode cannot jump away after a direction reversal');slow.close();
 const wrong=new Car.CarModel(()=>{},{read:(p,fn)=>process.nextTick(()=>fn(null,fs.readFileSync(root+'/000.rgba.z')))});const stable=wrong.get(0);await settled(wrong);assert(wrong.error);assert.equal(wrong.current,stable,'mismatched helper cannot mix another model into rotation');wrong.close();
 console.log('ok exact source views, prepared colors, two reusable buffers, 96-angle rotation, bounded prefetch, continuous slow-disk drag, mismatch/corruption fallback and direct drag/zoom/reset');
}
main().catch(e=>{console.error(e.stack);process.exitCode=1;});
