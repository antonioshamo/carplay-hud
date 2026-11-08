// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path');
const C=require('./composition'),{Canvas}=require('../../shared/kit_canvas'),M=require('../../shared/studio_model');
const {WIDTH:w,HEIGHT:h}=C;
const rgba=(p,x,y)=>Array.from(p.slice((y*w+x)*4,(y*w+x+1)*4));
const inside=(x,y,r)=>x>=r[0]&&y>=r[1]&&x<r[2]&&y<r[3];
const p=Buffer.alloc(w*h*4);for(let i=0;i<p.length;i+=4){p[i]=80;p[i+1]=160;p[i+2]=240;p[i+3]=255;}
C.apply(p,w,h);
let clear=0,feather=0;
for(let y=0;y<h;y++)for(let x=0;x<w;x++){
 const i=(y*w+x)*4;
 if(C.REGIONS.some(r=>inside(x,y,r.rect))){assert(p[i]===0&&p[i+1]===0&&p[i+2]===0&&p[i+3]===0);clear++;}
 else if(p[i+3]>0&&p[i+3]<255){assert.deepEqual(Array.from(p.slice(i,i+3)),[80,160,240]);feather++;}
}
assert(clear>600000&&feather>10000);
assert.deepEqual(rgba(p,100,200),[80,160,240,255]);
assert.deepEqual(rgba(p,1800,200),[80,160,240,255]);
for(let j=0;j<48;j++)assert.equal(rgba(p,639-j,200)[3],rgba(p,1280+j,200)[3],'center sides blend evenly');
let last=255;for(let x=592;x<640;x++){const a=rgba(p,x,200)[3];assert(a<=last);last=a;}
for(let y=660;y<720;y++)for(let x=1380;x<1520;x++)assert.equal(p[(y*w+x)*4+3],0,'accepted P exclusion stays clear');
const translucent=Buffer.alloc(w*h*4,128);C.apply(translucent,w,h);assert.equal(rgba(translucent,100,200)[3],128);assert(rgba(translucent,620,200)[3]<128);
assert.throws(()=>C.apply(Buffer.alloc(64),4,4),/native/);
// A widget in the middle must not cover the native display; clear after the
// entire layout, not just the backdrop. Source layout must remain unchanged.
const d=M.idrivePreset(0),saved=JSON.stringify(d),v={now:new Date(0),speed:0,rpm:736,gear:'P',fuel:32,oil:102,coolant:104};
const cv=new Canvas(w,h);C.draw(cv,d,v);assert.equal(JSON.stringify(d),saved);
for(let y=0;y<h;y+=7)for(let x=640;x<1280;x+=7)assert.equal(cv.d[(y*w+x)*4+3],0);
// The cutout is used only for explicit assistance mode, never carried back
// into normal. Simulate rapid switches using the SAME reusable pixel buffer.
const Panel=require('../../panel_composition'),normalExpected=new Canvas(w,h),assistance=C.sampleDesign();
Panel.draw(normalExpected,d,v);
for(const mode of ['normal','assistance','normal','unknown','assistance',null,'normal']){
 C.drawMode(cv,d,assistance,v,mode);
 if(mode==='normal')assert(Buffer.from(cv.d).equals(Buffer.from(normalExpected.d)),'normal design restored exactly');
 else if(mode==='assistance')for(let y=0;y<h;y+=7)for(let x=640;x<1280;x+=7)assert.equal(cv.d[(y*w+x)*4+3],0);
 else assert(cv.d.every(n=>n===0),'unknown state yields the whole native display');
 assert.equal(JSON.stringify(d),saved,'switching never edits the saved layout');
}
// Replay cache must not leave partially transparent old values or lose a fade
// when the unchanged drawing prefix grows. Each result equals a full redraw.
for(const style of M.STYLES){
 const design=C.sampleDesign(style[0]),cache=new C.CandidateCache();
 for(const rpm of [736,1875,3200,null,0]){
  const values=Object.assign({},v,{rpm}),actual=cache.render(design,values),expected=new Canvas(w,h);C.draw(expected,design,values);
  assert(actual);assert(Buffer.from(actual.d).equals(Buffer.from(expected.d)),style[0]+' cache parity');
  assert.equal(cache.render(design,values),null,'unchanged frames stay quiet');
 }
 design.widgets.reverse();design.theme=3;const actual=cache.render(design,v),expected=new Canvas(w,h);C.draw(expected,design,v);
 assert(Buffer.from(actual.d).equals(Buffer.from(expected.d)),style[0]+' edits preserve composition');
}
// This is an offline study, not a hidden way to enable road-going output.
const component=JSON.parse(fs.readFileSync(path.join(__dirname,'../../component.json'),'utf8'));
assert(!component.files.some(f=>/assistance-window/.test(f.path)));
assert(!/assistance-window/.test(fs.readFileSync(path.join(__dirname,'../../engine.js'),'utf8')));
console.log('ok every reserved alpha pixel, straight-alpha fades, native gear clearance, center widgets, all dial caches and no runtime installation');
