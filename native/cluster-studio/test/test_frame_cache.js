// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const assert=require('assert'),{FrameCache}=require('../frame_cache'),{Canvas}=require('../shared/kit_canvas'),D=require('../shared/studio_draw'),Panel=require('../panel_composition'),M=require('../shared/studio_model');
function check(cache,d,data,panel,allowSame){
 const result=cache.render(d,data),actual=result||(allowSame&&cache.frames[1-cache.index]),expected=new Canvas(cache.w,cache.h);expected.clear([0,0,0,0]);
 if(panel)Panel.draw(expected,d,data);else D.draw(expected,d,{x:0,y:0,w:cache.w,h:cache.h},data);
 assert(actual,'changed output has a frame');assert(Buffer.from(actual.d).equals(Buffer.from(expected.d)),'cached output exactly matches full drawing');
 assert.equal(cache.render(d,data),null,'unchanged readings require no rasterization');
}
for(let n=0;n<100;n++){
 const d=M.preset(n),data={now:new Date(2026,10,5,18,0),speed:0,rpm:735,gear:'P',oil:99,coolant:103,connected:true};
 const panel=n%2===0,cache=new FrameCache(panel?1920:1088,panel?720:480,panel);
 check(cache,d,data,panel);
 data.rpm=1369;data.speed=28;check(cache,d,data,panel);
 data.rpm=null;data.speed=null;data.gear=null;data.oil=null;data.coolant=null;data.connected=false;data.now=new Date(2026,10,6,0,1);check(cache,d,data,panel);
 // Deliberate overlap and reordering must obey painter order, including
 // disappearing widgets and edits before/after the cached prefix.
 d.widgets.reverse();d.widgets[0].x=.35;d.widgets[0].y=.25;d.theme=(d.theme+1)%M.THEMES.length;check(cache,d,data,panel);
}
const d=M.acceptedDesign(),cache=new FrameCache(1920,720,true),data={now:new Date(0),speed:0,rpm:700,gear:'P',oil:90,coolant:98};
check(cache,d,data,true);data.rpm=707;check(cache,d,data,true);const prefix=cache.prefixLength;assert(prefix>2,'unchanged face/background commands are cached');data.rpm=723;check(cache,d,data,true);assert(cache.prefixLength>=prefix);
// Transparent/black backgrounds are also byte-identical, including P clearance.
for(const background of ['transparent','black']){d.background=background;check(cache,d,data,true,true);}
console.log('ok 100 templates: cached/full byte parity, live/stale values, overlaps, reorder, clock/date, background and native P clearance');

for(const style of M.STYLES){d.gauge=style[0];const c=new FrameCache(1920,720,true);data.rpm=750;check(c,d,data,true);data.rpm=1400;check(c,d,data,true);d.widgets.find(w=>w.type==='speed').gauge=style[0];check(c,d,data,true,true);}
console.log('ok all 10 dial styles retain exact cached/full renderer parity');
