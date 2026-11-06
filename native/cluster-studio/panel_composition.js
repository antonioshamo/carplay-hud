// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
// Accepted on the owner's 1920x720 cluster after isolated parked tests.
// Never make this clearance user-adjustable or shrink it with a design.
const NATIVE=Object.freeze([1380,660,1520,720]),FEATHER=48;
const D=require('./shared/studio_draw.js');
function check(p,w,h){if(w!==1920||h!==720||p.length!==w*h*4)throw Error('Expected native 1920x720 RGBA panel');}
function shadeBackground(p,w,h){
 check(p,w,h);
 const [x0,y0,x1,y1]=NATIVE;
 // Horizontal RGB shading only: no top fade, no surrounding transparency.
 for(let y=y0;y<y1;y++)for(let x=x0-FEATHER;x<x1+FEATHER;x++){
  const distance=x+.5<x0?x0-(x+.5):x+.5>x1?x+.5-x1:0;
  const t=Math.max(0,Math.min(1,distance/FEATHER)),gain=t*t*(3-2*t),i=(y*w+x)*4;
  for(let k=0;k<3;k++)p[i+k]=Math.round(p[i+k]*gain);
 }
}
function reserve(p,w,h){
 check(p,w,h);const [x0,y0,x1,y1]=NATIVE;
 for(let y=y0;y<y1;y++)p.fill(0,(y*w+x0)*4,(y*w+x1)*4);
}
function draw(cv,design,data){
 check(cv.d,cv.w,cv.h);
 const b={x:0,y:0,w:1920,h:720};
 // Transparent is a center-overlay option; a panel must cover factory artwork.
 D.draw(cv,Object.assign({},design,{background:design.background==='transparent'?'black':design.background,widgets:[]}),b,data);
 shadeBackground(cv.d,1920,720);
 D.draw(cv,Object.assign({},design,{background:'transparent'}),b,data);
 reserve(cv.d,1920,720);
}
module.exports={NATIVE,FEATHER,shadeBackground,reserve,draw};
