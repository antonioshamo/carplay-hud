// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
// Preserve native pixels. Split each dirty band into left/right halves so
// simultaneous speed/RPM changes do not resend the unchanged center. At most
// 16 rectangles fit the renderer's protocol and shared byte budget.
function delta(previous,next,w,h){
 if(!Number.isInteger(w)||!Number.isInteger(h)||w<1||h<1||w>1920||h>720||next.length!==w*h*4)throw Error('Invalid native frame');
 if(!previous||previous.length!==next.length)return {rects:null,pixels:Buffer.from(next)};
 const aligned=previous.byteOffset%4===0&&next.byteOffset%4===0;
 const a=aligned?new Uint32Array(previous.buffer,previous.byteOffset,w*h):null,b=aligned?new Uint32Array(next.buffer,next.byteOffset,w*h):null;
 const oldBytes=Buffer.from(previous.buffer,previous.byteOffset,previous.byteLength),newBytes=Buffer.from(next.buffer,next.byteOffset,next.byteLength);
 const rects=[],band=Math.ceil(h/8),half=Math.ceil(w/2);
 for(let y=0;y<h;y+=band)for(let col=0;col<w;col+=half){let left=w,right=-1,top=h,bottom=-1;
  const endX=Math.min(w,col+half),endY=Math.min(h,y+band);
  for(let yy=y;yy<endY;yy++){
   const start=(yy*w+col)*4,end=(yy*w+endX)*4;
   // Native byte comparison skips unchanged scanlines without a JS loop.
   if(oldBytes.compare(newBytes,start,end,start,end)===0)continue;
   for(let x=col;x<endX;x++){
   const i=(yy*w+x)*4;
   if(aligned?a[i/4]!==b[i/4]:next[i]!==previous[i]||next[i+1]!==previous[i+1]||next[i+2]!==previous[i+2]||next[i+3]!==previous[i+3]){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,yy);bottom=Math.max(bottom,yy);}
   }
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
