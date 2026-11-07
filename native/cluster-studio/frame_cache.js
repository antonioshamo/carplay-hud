// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const {Canvas}=require('./shared/kit_canvas'),D=require('./shared/studio_draw'),Panel=require('./panel_composition');
// Retain the unchanged drawing prefix (background, faces, ticks, etc.).
// Replaying from the first changed command preserves arbitrary overlaps and
// the original paint order, unlike caching widgets above/below one another.
class FrameCache {
 constructor(w,h,panel){this.w=w;this.h=h;this.panel=panel;this.commands=[];this.prefixLength=0;this.prefix=new Canvas(w,h);this.frames=[new Canvas(w,h),new Canvas(w,h)];this.index=0;this.valid=false;}
 record(design,data){
  const commands=[],r={};
  // Layout measurements must match the canvas used to replay the commands.
  r.textWidth=this.prefix.textWidth.bind(this.prefix);
  for(const op of ['gradientRect','fillRect','roundRect','text','arc','line','strokeRoundRect','quad','polyline'])r[op]=function(){const args=Array.from(arguments);commands.push({op,args,key:op+JSON.stringify(args)});};
  const b={x:0,y:0,w:this.w,h:this.h};
  if(this.panel){
   D.draw(r,Object.assign({},design,{background:design.background==='transparent'?'black':design.background,widgets:[]}),b,data);
   commands.push({op:'shade',key:'shade'});
   D.draw(r,Object.assign({},design,{background:'transparent'}),b,data);
   commands.push({op:'reserve',key:'reserve'});
  }else D.draw(r,design,b,data);
  return commands;
 }
 play(cv,commands,from,to){for(let i=from;i<to;i++){const c=commands[i];if(c.op==='shade')Panel.shadeBackground(cv.d,this.w,this.h);else if(c.op==='reserve')Panel.reserve(cv.d,this.w,this.h);else cv[c.op].apply(cv,c.args);}}
 render(design,data){
  const commands=this.record(design,data);let same=0;
  while(same<commands.length&&same<this.commands.length&&commands[same].key===this.commands[same].key)same++;
  if(this.valid&&same===commands.length&&same===this.commands.length)return null;
  if(!this.valid||same<this.prefixLength){this.prefix.clear([0,0,0,0]);this.prefixLength=0;}
  // Commands before 'same' are identical in both frames. Extend the cache
  // only through that prefix, never through a changing live value.
  this.play(this.prefix,commands,this.prefixLength,same);this.prefixLength=same;
  const cv=this.frames[this.index];this.index=1-this.index;cv.d.set(this.prefix.d);
  this.play(cv,commands,same,commands.length);
  this.commands=commands;this.valid=true;return cv;
 }
}
module.exports={FrameCache};
