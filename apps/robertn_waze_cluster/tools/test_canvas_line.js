// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const assert=require('assert'),{Canvas}=require('../src/kit_canvas');
// Brute-force distance field reference, deliberately checks every canvas pixel.
function reference(c,xa,ya,xb,yb,width,color){
 const vx=xb-xa,vy=yb-ya,len2=vx*vx+vy*vy||1;
 for(let y=0;y<c.h;y++)for(let x=0;x<c.w;x++){
  const qx=x+.5-xa,qy=y+.5-ya,t=Math.max(0,Math.min(1,(qx*vx+qy*vy)/len2));
  const ex=qx-vx*t,ey=qy-vy*t,cov=Math.max(0,Math.min(1,width/2-Math.sqrt(ex*ex+ey*ey)+.5));
  if(cov>0)c._blend(x,y,color,cov);
 }
}
let seed=31337;function rand(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
for(let i=0;i<600;i++){
 const a=new Canvas(93,71),b=new Canvas(93,71);a.clear([17,31,85,137]);b.d.set(a.d);
 for(let j=0;j<3;j++){
  const args=[rand()*170-40,rand()*140-35,rand()*170-40,rand()*140-35,rand()*22+.01,[30,155,210,Math.floor(rand()*256)]];
  if(i%7===0)args[2]=args[0];if(i%11===0)args[3]=args[1];
  a.line.apply(a,args);reference.apply(null,[b].concat(args));
 }
 assert(Buffer.from(a.d).equals(Buffer.from(b.d)),'pixel parity for clipped/fractional/round-cap/overlapping line '+i);
}
console.log('ok optimized line rasterization: 1800 strokes match full-canvas distance reference byte for byte');
