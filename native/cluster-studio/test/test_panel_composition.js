// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const assert=require('assert'),C=require('../panel_composition'),M=require('../shared/studio_model'),{Canvas}=require('../shared/kit_canvas');
assert.deepEqual(C.NATIVE,[1380,660,1520,720]);assert(Object.isFrozen(C.NATIVE));
const w=1920,h=720,p=Buffer.alloc(w*h*4,255);
C.shadeBackground(p,w,h);C.reserve(p,w,h);
function alpha(p){for(let y=0;y<h;y++)for(let x=0;x<w;x++){const inside=x>=1380&&x<1520&&y>=660;assert.equal(p[(y*w+x)*4+3],inside?0:255,'only accepted native gear rectangle is transparent');}}
alpha(p);
for(let x=0;x<w;x++)assert.equal(p[(659*w+x)*4],255,'no fade above P');
for(let j=0;j<48;j++)assert.equal(p[(690*w+1379-j)*4],p[(690*w+1520+j)*4],'side fades match');
let prior=0;for(let x=1520;x<=1568;x++){const c=p[(690*w+x)*4];assert(c>=prior);prior=c;}assert.equal(prior,255);
assert.throws(()=>C.reserve(Buffer.alloc(800*480*4),800,480),/native/);
const d=M.preset(11),data={now:new Date(0),speed:0,rpm:737,gear:'P',oil:102,coolant:105};
for(const background of ['black','gradient','transparent']){d.background=background;const c=new Canvas(w,h);C.draw(c,d,data);alpha(c.d);}
// Exact parity with the accepted diagnostic composition; widgets stay sharp.
const D=require('../shared/studio_draw'),expected=new Canvas(w,h),actual=new Canvas(w,h),b={x:0,y:0,w,h};d.background='gradient';
D.draw(expected,Object.assign({},d,{widgets:[]}),b,data);C.shadeBackground(expected.d,w,h);D.draw(expected,Object.assign({},d,{background:'transparent'}),b,data);C.reserve(expected.d,w,h);C.draw(actual,d,data);assert.deepEqual(actual.d,expected.d);
console.log('ok native gear clearance, every alpha pixel, side-only symmetry, opaque backgrounds and accepted gauge composition parity');
