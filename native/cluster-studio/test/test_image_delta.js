// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const assert=require('assert'),{delta}=require('../image_delta'),D=require('../shared/studio_draw'),M=require('../shared/studio_model'),Canvas=require('../shared/kit_canvas').Canvas;
function restore(before,u,w){const out=Buffer.from(before);if(!u)return out;if(!u.rects)return Buffer.from(u.pixels);let at=0;assert(u.rects.length<=8);for(const r of u.rects)for(let y=r.y;y<r.y+r.h;y++){u.pixels.copy(out,(y*w+r.x)*4,at,at+r.w*4);at+=r.w*4;}assert.equal(at,u.pixels.length);return out;}
const w=1920,h=720,blank=Buffer.alloc(w*h*4),first=delta(null,blank,w,h);assert.equal(first.pixels.length,5529600);assert.equal(first.rects,null);assert.equal(delta(blank,blank,w,h),null);
const changed=Buffer.from(blank);for(let i=0;i<50;i++){const n=((i*99991)%(w*h))*4;changed[n]=255;changed[n+3]=255;}for(const n of [0,changed.length-1])changed[n]=121;
assert(restore(blank,delta(blank,changed,w,h),w).equals(changed));assert(restore(changed,delta(changed,blank,w,h),w).equals(blank));
assert.throws(()=>delta(null,Buffer.alloc(1),1920,720));
const unaligned=Buffer.alloc(w*h*4+1).subarray(1);unaligned[3]=255;
assert(restore(blank,delta(blank,unaligned,w,h),w).equals(unaligned),'unaligned byte views keep the exact fallback');
for(const preset of [0,11,46,99]){
 const d=M.preset(preset),a=new Canvas(w,h),b=new Canvas(w,h),data={now:new Date(2026,10,5,18,0),speed:0,rpm:735,gear:'P',oil:99,coolant:103,connected:true};
 D.draw(a,d,{x:0,y:0,w,h},data);D.draw(b,d,{x:0,y:0,w,h},Object.assign({},data,{rpm:741}));
 const u=delta(a.d,b.d,w,h);assert(u);assert(u.pixels.length<552960,'idle RPM update under 10 percent of full frame');assert(restore(a.d,u,w).equals(Buffer.from(b.d)),'native image reconstructs exactly');console.log('preset '+preset+': '+u.pixels.length+' bytes vs 5529600 full');
}
console.log('PASS native-resolution deltas: exact reconstruction, zero unchanged traffic, bounded rectangles and sparse live updates');
