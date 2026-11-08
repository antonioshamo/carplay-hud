// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const M=require('./model');
// Draw each card into an isolated buffer, so long text and future draw changes
// cannot spill into factory speed/RPM, the center, gear or warning strip.
function draw(cv,config,data){
 if(cv.w!==M.WIDTH||cv.h!==M.HEIGHT)throw Error('Expected native 1920x720');
 cv.clear();const d=M.validate(config);if(!d.enabled)return cv;
 const {Canvas}=require('../../shared/kit_canvas');
 M.SLOTS.forEach(s=>{
  const type=d.slots[s.id];if(type==='none')return;
  const [x,y,right,bottom]=s.rect,w=right-x,h=bottom-y,c=new Canvas(w,h),r=M.reading(type,d,data);
  c.clear('#10151d');
  const fit=(text,y,size,color)=>{const width=c.textWidth(text,size,{font:'bold'});c.text(text,12,y,width>w-24?size*(w-24)/width:size,color,{font:'bold'});};
  fit(r.label.toUpperCase(),24,15,'#a5b3c3');
  fit(r.value+(r.unit?' '+r.unit:''),55,27,'#f4f8fc');
  c.fillRect(12,h-5,w-24,2,d.accent);
  cv.blit(c,x,y);
 });
 return cv;
}
module.exports={draw};
