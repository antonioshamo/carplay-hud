// SPDX-License-Identifier: GPL-3.0-or-later
// Offline study. Coordinates must be calibrated against native warning states
// before any vehicle output. Never imported by the installed engine.
(function(root,factory){if(typeof module==='object')module.exports=factory();else root.FactoryPersonal=factory();})(this,function(){
 'use strict';
 const WIDTH=1920,HEIGHT=720;
 const SLOTS=Object.freeze([
  Object.freeze({id:'left',label:'Left · above speed',rect:Object.freeze([500,230,710,305])}),
  Object.freeze({id:'rightTop',label:'Right · top',rect:Object.freeze([1280,230,1580,305])}),
  Object.freeze({id:'rightMiddle',label:'Right · middle',rect:Object.freeze([1280,320,1580,395])}),
  Object.freeze({id:'rightBottom',label:'Right · bottom',rect:Object.freeze([1280,410,1580,485])})
 ]);
 const COLORS=Object.freeze(['#ed334c','#45c5ff','#aa9aff','#f0b465','#7ce0bc','#e9eff5']);
 const METRICS=Object.freeze([
  ['none','BMW original'],['fuel','Fuel remaining'],['range','Fuel range'],['oil','Oil temperature'],['coolant','Coolant'],
  ['outside','Outside temperature'],['battery','12V battery charge'],['odometer','Odometer'],['tripTime','Driving time'],
  ['torque','Engine torque'],['power','Calculated power'],['engineState','Engine status'],['driveMode','Driving mode'],
  ['powerPercent','Sport power level'],['torquePercent','Sport torque level'],
  ['pressureFL','Front left tire pressure'],['pressureFR','Front right tire pressure'],
  ['pressureRL','Rear left tire pressure'],['pressureRR','Rear right tire pressure'],
  ['targetFL','Front left target pressure'],['targetFR','Front right target pressure'],
  ['targetRL','Rear left target pressure'],['targetRR','Rear right target pressure'],
  ['tireTempFL','Front left tire temperature'],['tireTempFR','Front right tire temperature'],
  ['tireTempRL','Rear left tire temperature'],['tireTempRR','Rear right tire temperature'],['fuelWarning','Fuel reserve']
 ].map(Object.freeze));
 function defaults(){return {schema:1,enabled:true,accent:COLORS[1],units:'mph',temperatureUnit:'F',slots:{left:'range',rightTop:'oil',rightMiddle:'coolant',rightBottom:'fuel'}};}
 function validate(v){
  if(!v||v.schema!==1||typeof v.enabled!=='boolean'||!COLORS.includes(v.accent)||!['mph','km/h'].includes(v.units)||!['C','F'].includes(v.temperatureUnit)||!v.slots)throw Error('Invalid factory personalization');
  if(Object.keys(v.slots).some(id=>!SLOTS.some(s=>s.id===id)))throw Error('Only the four side slots can be customized');
  const slots={};SLOTS.forEach(s=>{const m=v.slots[s.id];if(!METRICS.some(a=>a[0]===m))throw Error('Unknown widget');slots[s.id]=m;});
  return {schema:1,enabled:v.enabled,accent:v.accent,units:v.units,temperatureUnit:v.temperatureUnit,slots};
 }
 function setWidget(v,id,type){const d=validate(v);if(!Object.prototype.hasOwnProperty.call(d.slots,id))throw Error('Unknown side slot');d.slots[id]=type;return validate(d);}
 function swap(v,a,b){const d=validate(v);if(!SLOTS.some(s=>s.id===a)||!SLOTS.some(s=>s.id===b))throw Error('Unknown side slot');const m=d.slots[a];d.slots[a]=d.slots[b];d.slots[b]=m;return d;}
 function restore(){const d=defaults();d.enabled=false;SLOTS.forEach(s=>d.slots[s.id]='none');return d;}
 function reading(type,v,data){
  const label=(METRICS.find(m=>m[0]===type)||['',''])[1];let n=data[type],unit='',digits=0;
  const isText=['engineState','driveMode','fuelWarning'].includes(type);
  if(isText){return {label,value:typeof n==='string'&&n.length<=32?n:'—',unit:''};}
  if(typeof n!=='number'||!Number.isFinite(n))return {label,value:'—',unit:''};
  if(type==='oil'||type==='coolant'||type==='outside'||type.indexOf('tireTemp')===0){unit='°'+v.temperatureUnit;if(v.temperatureUnit==='F')n=n*1.8+32;}
  else if(type==='fuel'){if(n<0||n>=255)return {label,value:'—',unit:''};unit='%';n=Math.max(0,Math.min(100,n/(v.fuelCapacityLitres||65)*100));}
  else if(type==='range'||type==='odometer'){unit=v.units==='mph'?'mi':'km';if(v.units==='mph')n/=1.609344;}
  else if(type==='battery'||/Percent$/.test(type))unit='%';
  else if(type.indexOf('pressure')===0||type.indexOf('target')===0){unit=v.units==='mph'?'psi':'bar';if(v.units==='mph')n*=14.5037738;digits=1;}
  else if(type==='torque'){unit=v.units==='mph'?'lb-ft':'Nm';if(v.units==='mph')n*=.737562149;}
  else if(type==='power'){unit=v.units==='mph'?'hp':'kW';if(v.units==='mph')n*=1.34102209;}
  else if(type==='tripTime')return {label,value:Math.floor(n/60)+':'+String(Math.floor(n%60)).padStart(2,'0'),unit:'h:mm'};
  return {label,value:n.toFixed(digits),unit};
 }
 return {WIDTH,HEIGHT,SLOTS,COLORS,METRICS,defaults,validate,setWidget,swap,restore,reading};
});
