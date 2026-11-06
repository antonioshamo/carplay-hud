// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const assert=require('assert');const base=require('path').resolve(__dirname,'../../..')+'/';
const {Telemetry}=require(base+'native/cluster-studio/telemetry'),M=require(base+'apps/robertn_waze_cluster/src/studio_model'),D=require(base+'apps/robertn_waze_cluster/src/studio_draw');
let now=1000;const t=new Telemetry({now:()=>now});
t.receive('speed',{speedVehicleCentreOfGravity:3840});t.receive('rpm',{actualValueRPMEngineCrankshaft:12000});t.receive('selection',{statusGearSelectionDrive:3});t.receive('temps',{temperatureEngineOilDrive:138,temperatureEngineDrive:148});
assert.equal(t.snapshot().speed,60);assert.equal(t.snapshot().rpm,3000);assert.equal(t.snapshot().oil,90);assert.equal(t.snapshot().coolant,100);
function drawn(d,data){const text=[];const r={text:s=>text.push(String(s)),roundRect(){},gradientRect(){},fillRect(){},line(){},arc(){},strokeRoundRect(){}};D.draw(r,d,{x:0,y:0,w:1920,h:720},data);return text;}
for(let i=0;i<100;i++){const d=M.preset(i);d.widgets.find(x=>x.type==='rpm').on=true;
 const mph=drawn(d,t.snapshot());assert(mph.includes('37'),'60 km/h is 37 mph, preset '+i);assert(mph.some(x=>x==='3000'||x==='3000 RPM'),'actual RPM displayed '+i);
 d.units='km/h';assert(drawn(d,t.snapshot()).includes('60'),'metric speed preserved '+i);
}
now+=2001;assert.equal(t.snapshot().speed,null);assert.equal(t.snapshot().rpm,null);const missing=drawn(M.preset(0),t.snapshot());assert(missing.includes('—'));assert(missing.includes('RPM unavailable'));assert(!missing.includes('3000 RPM'));
t.receive('speed',{speedVehicleCentreOfGravity:65535});t.receive('rpm',{actualValueRPMEngineCrankshaft:65535});assert.equal(t.snapshot().speed,null);assert.equal(t.snapshot().rpm,null);
console.log('PASS all 100 template combinations: raw-unit conversion, actual RPM, mph/km/h, invalid values and stale data');
