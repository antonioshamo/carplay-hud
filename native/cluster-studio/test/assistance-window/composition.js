// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
// Offline candidate only. Not imported by engine.js or included in the tool.
// These conservative rectangles are inferred from a photo, not car calibration.
const Panel=require('../../panel_composition');
const {FrameCache}=require('../../frame_cache');
const M=require('../../shared/studio_model');
const WIDTH=1920,HEIGHT=720,FEATHER=48;
const REGIONS=Object.freeze([
 Object.freeze({name:'BMW center display',rect:Object.freeze([640,0,1280,720])}),
 Object.freeze({name:'BMW assistance icons',rect:Object.freeze([240,440,640,600])}),
 Object.freeze({name:'BMW status and warning strip',rect:Object.freeze([0,640,1920,720])})
]);
const smooth=t=>t*t*(3-2*t);
let mask;
function opacityMask(){
 if(mask)return mask;
 mask=new Uint8Array(WIDTH*HEIGHT);
 for(let y=0;y<HEIGHT;y++)for(let x=0;x<WIDTH;x++){
  // Distance to the union: the reserved area is fully transparent, and the
  // fade lies outside it. Overlapping fades never darken the clear opening.
  let distance=Infinity;
  for(const region of REGIONS){
   const r=region.rect,dx=Math.max(r[0]-(x+.5),0,x+.5-r[2]),dy=Math.max(r[1]-(y+.5),0,y+.5-r[3]);
   distance=Math.min(distance,Math.sqrt(dx*dx+dy*dy));
  }
  mask[y*WIDTH+x]=Math.round(255*smooth(Math.min(1,distance/FEATHER)));
 }
 return mask;
}
function apply(p,w,h){
 if(w!==WIDTH||h!==HEIGHT||p.length!==WIDTH*HEIGHT*4)throw Error('Expected native 1920x720 RGBA panel');
 const alpha=opacityMask();
 for(let n=0;n<alpha.length;n++){
  if(alpha[n]===255)continue;
  const i=n*4,a=Math.round(p[i+3]*alpha[n]/255);
  // Renderer consumes straight alpha. RGB must not be multiplied a second
  // time during a feather; zero-alpha pixels are cleared in every channel.
  if(a===0){p[i]=p[i+1]=p[i+2]=p[i+3]=0;}else p[i+3]=a;
 }
 // Keep the already accepted gear exclusion even if candidate regions change.
 Panel.reserve(p,w,h);
}
function draw(cv,design,data){Panel.draw(cv,design,data);apply(cv.d,cv.w,cv.h);return cv;}
class CandidateCache {
 constructor(){this.base=new FrameCache(WIDTH,HEIGHT,true);}
 render(design,data){const cv=this.base.render(design,data);if(cv)apply(cv.d,cv.w,cv.h);return cv;}
}
function sampleDesign(style){
 const d=M.idrivePreset(2);d.name='BMW assistance window study';d.gauge=style||'id8-slim';d.background='gradient';
 d.widgets.forEach(w=>w.on=false);
 const put=(type,x,y,w,h)=>Object.assign(d.widgets.find(a=>a.type===type),{on:true,x,y,w,h});
 put('speed',.015,.12,.30,.44);put('rpm',.685,.12,.30,.44);
 put('fuel',.06,.015,.20,.10);put('oil',.73,.015,.20,.10);put('coolant',.735,.72,.20,.10);
 return M.validate(d);
}
module.exports={WIDTH,HEIGHT,FEATHER,REGIONS,apply,draw,CandidateCache,sampleDesign};
