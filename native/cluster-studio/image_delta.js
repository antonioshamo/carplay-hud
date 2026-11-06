// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
// Preserve native pixels. At most eight horizontal dirty bands keep small
// changes inside the renderer's 16-rectangle protocol and shared byte budget.
function delta(previous,next,w,h){
 if(!Number.isInteger(w)||!Number.isInteger(h)||w<1||h<1||w>1920||h>720||next.length!==w*h*4)throw Error('Invalid native frame');
 if(!previous||previous.length!==next.length)return {rects:null,pixels:Buffer.from(next)};
 const aligned=previous.byteOffset%4===0&&next.byteOffset%4===0;
 const a=aligned?new Uint32Array(previous.buffer,previous.byteOffset,w*h):null,b=aligned?new Uint32Array(next.buffer,next.byteOffset,w*h):null;
 const rects=[],band=Math.ceil(h/8);
 for(let y=0;y<h;y+=band){let left=w,right=-1,top=h,bottom=-1;
  for(let yy=y;yy<Math.min(h,y+band);yy++)for(let x=0;x<w;x++){
   const i=(yy*w+x)*4;
   if(aligned?a[i/4]!==b[i/4]:next[i]!==previous[i]||next[i+1]!==previous[i+1]||next[i+2]!==previous[i+2]||next[i+3]!==previous[i+3]){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,yy);bottom=Math.max(bottom,yy);}
  }
  if(right>=left)rects.push({x:left,y:top,w:right-left+1,h:bottom-top+1});
 }
 if(!rects.length)return null;
 const size=rects.reduce((n,r)=>n+r.w*r.h*4,0),pixels=Buffer.allocUnsafe(size);let at=0;
 for(const r of rects)for(let y=r.y;y<r.y+r.h;y++){
  pixels.set(next.subarray((y*w+r.x)*4,(y*w+r.x+r.w)*4),at);at+=r.w*4;
 }
 return {rects,pixels};
}
module.exports={delta};
