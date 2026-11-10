// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),zlib=require('zlib'),crypto=require('crypto');
const Car=require('../src/car_model.js'),kit=require('../src/kit_record.js');
const root=path.resolve(__dirname,'../../../native/cluster-studio/assets/x4m');
const wait=()=>new Promise(resolve=>setTimeout(resolve,5));
async function settled(c){for(let i=0;i<1000&&c.loading;i++)await wait();assert(!c.loading,'frame loading must finish');}
async function main(){
 const manifest=JSON.parse(fs.readFileSync(root+'/views.json'));assert.equal(manifest.views.length,Car.COUNT);const hashes=new Set();
 for(const v of manifest.views){const bytes=fs.readFileSync(root+'/'+v.file);assert.equal(bytes.length,v.bytes);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),v.sha256);assert.equal(zlib.inflateSync(bytes).length,Car.W*Car.H*4);hashes.add(v.sha256);}assert.equal(hashes.size,Car.COUNT,'every orbit angle is distinct');
 let reads=0,changes=0;const c=new Car.CarModel(()=>changes++,{root,read:(p,fn)=>{reads++;fs.readFile(p,fn);}});assert.equal(reads,0,'startup does not load the orbit');
 const poster=c.get(45);assert.equal(reads,0,'default view is already bundled');assert(kit.imageById.has(poster.imageId));
 for(let i=0;i<24;i++){c.get(i*15);await settled(c);assert(c.cache.size<=6,'decoded image cache stays bounded');assert.equal(c.current,c.cache.get(Car.index(i*15)));}
 const before=reads;c.get(120);c.get(121);c.get(180);c.get(270);await settled(c);assert(reads-before<=2,'rapid drags coalesce to the latest view');assert.equal(c.current,c.cache.get(Car.index(270)));
 assert(changes>0);const retained=Array.from(c.cache.values());c.close();for(const im of retained)assert(!kit.imageById.has(im.imageId));
 const reopened=new Car.CarModel(()=>{},{root});assert(kit.imageById.has(reopened.get(45).imageId),'reopening restores a released poster');reopened.close();
 let callback;const late=new Car.CarModel(()=>{throw Error('closed loader must not notify');},{read:(p,fn)=>{callback=fn;}});late.get(0);late.close();callback(null,fs.readFileSync(root+'/000.rgba.z'));assert.equal(late.cache.size,0);
 const bad=new Car.CarModel(()=>{},{read:(p,fn)=>process.nextTick(()=>fn(null,Buffer.from('broken')))});const fallback=bad.get(0);await settled(bad);assert(bad.error);assert.equal(bad.current,fallback,'failed loads retain the visible car');bad.close();
 const p=Car.pose();Car.drag(p,Object.assign({},p),200,0);assert.equal(p.angle,145);Car.adjust(p,'mode');Car.drag(p,Object.assign({},p),999,999);assert.equal(p.x,85);assert.equal(p.y,35);for(let i=0;i<20;i++)Car.adjust(p,'in');assert.equal(p.zoom,1.25);Car.adjust(p,'reset');assert.deepEqual(p,Car.pose());assert.equal(Car.index(-360),0);
 console.log('ok 96 exact model assets, lazy loading, latest-angle coalescing, bounded cache, reload/close, corrupt-frame fallback and direct drag/zoom/reset');
}
main().catch(e=>{console.error(e.stack);process.exitCode=1;});
