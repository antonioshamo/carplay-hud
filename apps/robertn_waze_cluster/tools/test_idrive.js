// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const assert=require('assert'),M=require('../src/studio_model'),D=require('../src/studio_draw'),{Canvas}=require('../src/kit_canvas'),{StudioScreen}=require('../src/studio_screen');
const Shared=require('../../../native/cluster-studio/shared/studio_model'),Panel=require('../../../native/cluster-studio/panel_composition');
const bounds={x:0,y:0,w:1920,h:720};
for(let i=0;i<M.IDRIVE_TEMPLATES.length;i++){
 const design=M.idrivePreset(i);assert.deepEqual(M.validate(JSON.parse(JSON.stringify(design))),design);assert.deepEqual(Shared.validate(design),design);
 const s=new StudioScreen(()=>{});s.liveChanges=false;s.design=M.preset(0);s.design.units='km/h';s.design.temperatureUnit='C';s.design.introEnabled=true;s.design.intro='welcome';s.design.welcomeName='Personal';const old=M.clone(s.design);
 s.press('page:idrive');s.press('pick-idrive:'+i);assert.equal(s.design.template,design.template);assert.equal(s.page,'gallery');assert.equal(s.design.units,'km/h');assert.equal(s.design.temperatureUnit,'C');assert.equal(s.design.welcomeName,'Personal');assert(s.design.introEnabled);s.press('undo');assert.deepEqual(s.design,old);s.press('redo');assert.equal(s.design.template,design.template);
 s.selected='speed';s.press('right');s.press('smaller');s.press('reset-widget');assert.deepEqual(s.widget(),design.widgets.find(w=>w.type==='speed'),'reset uses the selected template');
 s.press('page:style');s.press('gauge');s.press('pick-gauge:id8-slim');assert.equal(s.design.gauge,'id8-slim');s.selected='rpm';s.press('widget-gauge');s.press('pick-gauge:id8');assert.equal(s.widget().gauge,'id8');
 // Inspect actual renderer readouts, not fabricated preview values. Units and
 // missing values must be identical across new templates and the helper.
 const cv=new Canvas(1920,720),strings=[],drawText=cv.text.bind(cv);cv.text=function(value){strings.push(String(value));return drawText.apply(null,arguments);};
 const values={now:new Date(0),speed:100,rpm:3211,oil:90,coolant:98,gear:'P'};
 D.draw(cv,design,bounds,values);assert(strings.includes('62'));assert(strings.includes('3211'));assert(strings.includes('194 °F'));
 strings.length=0;design.units='km/h';D.draw(cv,design,bounds,values);assert(strings.includes('100'));assert(strings.includes('km/h'));
 strings.length=0;D.draw(cv,design,bounds,{now:new Date(0),speed:null,rpm:null,oil:null,coolant:null});assert.equal(strings.filter(v=>v==='—').length,2);assert(!strings.includes('3211'));
 Panel.draw(cv,design,values);for(let y=660;y<720;y++)for(let x=1380;x<1520;x++)assert.equal(cv.d[(y*1920+x)*4+3],0,'factory gear opening stays untouched');
 s.close();
}
const legacy=M.preset(11);delete legacy.template;assert.equal(M.validate(legacy).template,'standard');assert.throws(()=>M.validate(Object.assign({},M.idrivePreset(0),{template:'unknown'})),/template/);
for(let n=0;n<100;n++)assert.equal(M.validate(M.preset(n)).preset,n,'existing preset identifiers are unchanged');
assert.throws(()=>M.idrivePreset(3),/template/);assert.throws(()=>M.idrivePreset(-1),/template/);
console.log('ok iDrive template selection, units/preferences, undo/redo/reset, independent styles, live/stale readouts, gear clearance and legacy design migration');

// Readouts stay centered when moved/resized, including changing digit widths.
for(const style of ['ring','digital','bar','ultra','needle','segments','sweep','vertical','minimal','dots','id8','id8-slim']){
 for(const type of ['speed','rpm','gear','clock','date','badge','signature','connection','oil','coolant']){
  const design=M.preset(0);design.gauge=style;design.signature='Welcome Antonio Shamo';
  design.widgets=[{type,on:true,x:.23,y:.11,w:.22,h:type==='speed'||type==='rpm'?.65:.20,gauge:'inherit',color:'theme'}];
  const cv=new Canvas(880,330),calls=[],text=cv.text.bind(cv);
  cv.text=function(s,x,y,size,color,opts){calls.push({s:String(s),x,opts});return text.apply(null,arguments);};
  for(const rpm of [9,750,3211,null]){
   calls.length=0;D.draw(cv,design,{x:13,y:7,w:800,h:300},{now:new Date(2026,10,7,11,58),speed:rpm,rpm,gear:'P',oil:99,coolant:101,connected:true});
   const expected=13+(.23+.22/2)*800;
   const readouts=type==='speed'||type==='rpm'?calls.filter(c=>['SPEED','ENGINE','RPM','mph','P',rpm==null?'—':String(Math.round(type==='speed'?rpm/1.609344:rpm))].includes(c.s)):calls;
   assert(readouts.length,style+' '+type+' has readouts');
   for(const c of readouts){assert.equal(c.opts.align,'center');assert(Math.abs(c.x-expected)<.0001,style+' '+type+' '+c.s+' anchors to the resized widget center');}
  }
 }
}
console.log('ok centered moved/resized text widgets and all dial styles with live and unavailable values');
