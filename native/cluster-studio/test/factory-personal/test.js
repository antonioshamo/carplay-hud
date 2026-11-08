'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),M=require('./model'),{draw}=require('./composition'),{Canvas}=require('../../shared/kit_canvas');
const d=M.defaults(),saved=JSON.stringify(d),cv=new Canvas(M.WIDTH,M.HEIGHT);
const data={fuel:32,range:402.336,oil:102,coolant:105,battery:75,pressureFL:2.4};
draw(cv,d,data);let ink=0;
for(let y=0;y<M.HEIGHT;y++)for(let x=0;x<M.WIDTH;x++){
 const a=cv.d[(y*M.WIDTH+x)*4+3];
 const inside=M.SLOTS.some(s=>x>=s.rect[0]&&x<s.rect[2]&&y>=s.rect[1]&&y<s.rect[3]);
 if(!inside)assert.equal(a,0,'no overlay outside the four side slots');else ink+=a>0;
}
assert(ink>60000);assert.equal(JSON.stringify(d),saved);
assert.equal(M.reading('range',d,data).value,'250');assert.equal(M.reading('fuel',d,data).value,'8.5');
assert.equal(M.reading('oil',d,data).value,'216');assert.equal(M.reading('pressureFL',d,data).value,'34.8');
// Keep conversion behavior aligned with the installed widget library.
const library=require('../../shared/studio_model');
for(const units of ['mph','km/h'])for(const temperatureUnit of ['F','C'])for(const type of Object.keys(library.METRICS)){
 if(!M.METRICS.some(m=>m[0]===type))continue;
 const options=Object.assign({},d,{units,temperatureUnit}),values={[type]:['engineState','driveMode','fuelWarning'].includes(type)?'NORMAL':123};
 const a=M.reading(type,options,values),b=library.reading(type,options,values);
 assert.equal(a.value,b.value,type+' value parity');assert.equal(a.unit,b.unit,type+' unit parity');
}
for(const bad of [undefined,null,NaN,Infinity,'12'])assert.equal(M.reading('fuel',d,{fuel:bad}).value,'—');
const reordered=M.swap(d,'left','rightBottom');assert.equal(reordered.slots.left,'fuel');assert.equal(d.slots.left,'range');
assert.throws(()=>M.setWidget(d,'center','fuel'));assert.throws(()=>M.setWidget(d,'left','made-up'));
assert.throws(()=>M.validate(Object.assign({},d,{accent:'url(javascript:x)'})));
assert.throws(()=>M.validate(Object.assign({},d,{slots:Object.assign({},d.slots,{center:'oil'})})));
const original=M.restore();draw(cv,original,data);assert(cv.d.every(n=>n===0),'factory restore clears every custom pixel');
const empty=M.defaults();M.SLOTS.forEach(s=>empty.slots[s.id]='none');draw(cv,empty,data);assert(cv.d.every(n=>n===0));
// Every selectable reading fits an isolated slot; no previous card survives
// switching it off, including missing and very long text readings.
for(const metric of M.METRICS){
 draw(cv,M.setWidget(d,'rightTop',metric[0]),Object.assign({},data,{[metric[0]]:123.4}));
 draw(cv,original,data);assert(cv.d.every(n=>n===0));
}
const root=path.join(__dirname,'../..');
assert(!fs.readFileSync(path.join(root,'engine.js'),'utf8').includes('factory-personal'));
assert(!JSON.parse(fs.readFileSync(path.join(root,'component.json'),'utf8')).files.some(f=>/factory-personal/.test(f.path)));
console.log('Factory personalization: all-pixel exclusion, units, missing data, side-only edits, restore and package isolation passed');
