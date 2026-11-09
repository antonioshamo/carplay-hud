// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const assert=require('assert'),{Canvas}=require('../src/kit_canvas');
let seed=827161;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
for(let n=0;n<180;n++){
 const a=new Canvas(200,120),b=new Canvas(200,120);a.clear([13,26,39,117]);b.d.set(a.d);const before=Buffer.from(a.d);
 b.clip(random()*240-20,random()*140-20,random()*180,random()*110);const box=b.clipBox.slice();
 const kind=n%3,args=kind===0?[random()*300-50,random()*180-30,random()*300-50,random()*180-30,random()*20+.01,[90,170,230,177]]:kind===1?[[[10,10],[180,20],[160,100],[30,115]],[70,90,240,167]]:['123 mph',random()*150-20,random()*100,20+random()*55,[240,230,210,173],{font:n%2?'cluster':'bold'}];
 const method=['line','convex','text'][kind];a[method].apply(a,args);b[method].apply(b,args);
 for(let y=0;y<120;y++)for(let x=0;x<200;x++){const inside=x>=box[0]&&x<box[2]&&y>=box[1]&&y<box[3],i=(y*200+x)*4;for(let c=0;c<4;c++)assert.equal(b.d[i+c],(inside?a.d:before)[i+c],'clip parity '+method+' case '+n);}
}
const c=new Canvas(200,120);let blends=0;c._blend=()=>blends++;c.clip(190,110,10,10);c.line(0,0,50,50,3,'#fff');c.convex([[0,0],[50,0],[0,50]],'#fff');c.text('123',0,20,15,'#fff');assert.equal(blends,0,'fully clipped work is skipped before rasterization');
console.log('PASS randomized clip parity for strokes, faces and both fonts; clipped raster work is skipped');
