// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
// Uses the imported Cluster Layouts GPU/text primitives and live update engine.
// Map video supplies the refractive glass material; these lightweight surfaces
// add only a faint neutral wash. No animation loop or extra image uploads.
const C=require('./vendor/cluster-layouts/layout_common');
const label=t=>({color:[t.dim,1],glow:['#000000',.45]}),value=t=>({color:[t.text,1],glow:['#000000',.45]});
const rpmColor=(t,d)=>Number.isFinite(d.rpm)&&d.rpm>7100?'#ff453a':Number.isFinite(d.rpm)&&d.rpm>=6700?'#ffd60a':t.text;
const rpmValue=(t,d)=>({color:[rpmColor(t,d),1],glow:['#000000',.45]});
const card=(key,x,y,w,h)=>({key,kind:'panel',x,y,w,h,z:0,params:{u_box:[h/2,0,0,.035]},colors:()=>({top:'#ffffff',bottom:'#ffffff',border:'#ffffff'})});
const barColors=(t,d)=>{const color=rpmColor(t,d);return {track:'#566575',fill0:color,fill1:color,redc:'#ff453a',tip:color,tick:'#566575',num:t.dim};};
const bar=(...args)=>Object.assign(C.bar(...args),{sweep:false,z:2});
const text=(...args)=>Object.assign(C.text(...args),{z:3});
module.exports={id:'map_focus',title:'CarPlay Map',palette:look=>({bg:'#000000',text:'#f6f7fa',dim:'#d5dfe8',accent:look==='sport'?'#f36b7a':look==='efficient'?'#8edcae':'#9ad9ed'}),gearText:C.gearText,
 pieces:o=>[
  card('map-speed-card',44,284,264,160),
  text('map-speed',62,308,228,86,d=>C.speedText(o,d),value),
  text('map-speed-unit',62,403,228,26,C.speedUnit(o),label),
  card('map-rpm-card',44,486,280,158),
  text('map-rpm-label',74,503,220,22,'RPM',label),
  text('map-rpm',64,544,240,50,d=>Number.isFinite(d.rpm)?Math.round(d.rpm):'--',rpmValue),
  bar('map-rpm-bar',74,602,220,18,d=>Number.isFinite(d.rpm)?Math.max(0,Math.min(1,d.rpm/8000)):0,barColors),
  card('map-oil-card',1596,486,280,158),
  text('map-oil-label',1616,503,240,21,'OIL TEMPERATURE',label),
  text('map-oil-value',1616,550,240,46,d=>Number.isFinite(d.oil)?Math.round(C.tempIn(o,d.oil))+'°'+(o.tempUnit==='c'?'C':'F'):'--',value)
 ]};
