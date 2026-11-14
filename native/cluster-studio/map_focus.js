// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
// Uses the imported Cluster Layouts GPU/text primitives and live update engine.
// A single translucent, rounded surface with a restrained rim highlight.
// Dark backing keeps readings legible over light maps; no extra animated layers.
// Apple-inspired styling, not native Liquid Glass or backdrop refraction.
const C=require('./vendor/cluster-layouts/layout_common');
const label=t=>({color:[t.dim,1]}),value=t=>({color:[t.text,1]});
const card=(key,x,y,w,h)=>({key,kind:'panel',x,y,w,h,z:0,params:{u_box:[34,1.5,.85,.84]},colors:()=>({top:'#182432',bottom:'#070d16',border:'#536475'})});
const barColors=(t,d)=>({track:'#35404e',fill0:t.accent,fill1:t.accent,redc:'#e34756',tip:t.accent,tick:'#35404e',num:t.dim});
const bar=(...args)=>Object.assign(C.bar(...args),{sweep:false,z:2});
const text=(...args)=>Object.assign(C.text(...args),{z:3});
module.exports={id:'map_focus',title:'CarPlay Map',palette:look=>({bg:'#000000',text:'#f6f7fa',dim:'#d5dfe8',accent:look==='sport'?'#f36b7a':look==='efficient'?'#8edcae':'#9ad9ed'}),gearText:C.gearText,
 pieces:o=>[
  card('map-speed-card',44,284,264,160),
  text('map-speed',62,308,228,86,d=>C.speedText(o,d),value),
  text('map-speed-unit',62,403,228,26,C.speedUnit(o),label),
  card('map-rpm-card',44,486,280,158),
  text('map-rpm-label',74,503,220,22,'RPM',label),
  text('map-rpm',64,544,240,50,d=>Number.isFinite(d.rpm)?Math.round(d.rpm):'--',value),
  bar('map-rpm-bar',74,602,220,18,d=>Number.isFinite(d.rpm)?Math.max(0,Math.min(1,d.rpm/(o.rpmMax||8000))):0,barColors),
  card('map-oil-card',1596,486,280,158),
  text('map-oil-label',1616,503,240,21,'OIL TEMPERATURE',label),
  text('map-oil-value',1616,550,240,46,d=>Number.isFinite(d.oil)?Math.round(C.tempIn(o,d.oil))+'°'+(o.tempUnit==='c'?'C':'F'):'--',value)
 ]};
