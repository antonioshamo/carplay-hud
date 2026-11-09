// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const assert=require('assert'),M=require('../shared/studio_model'),D=require('../shared/studio_draw'),{Telemetry,decode,interval}=require('../telemetry'),{FrameCache}=require('../frame_cache');
const V=require('../../../apps/robertn_waze_cluster/src/studio_view'),{StudioScreen}=require('../../../apps/robertn_waze_cluster/src/studio_screen'),EventEmitter=require('events');
assert.equal(M.TYPES.length,37);assert.deepEqual(M.GROUPS.reduce((a,g)=>a.concat(g[1]),[]).sort(),M.TYPES.slice().sort());
for(const d of Array.from({length:100},(_,i)=>M.preset(i)).concat(M.IDRIVE_TEMPLATES.map((_,i)=>M.idrivePreset(i)),M.acceptedDesign())){
 assert(d.widgets.find(w=>w.type==='fuel').on,'fuel default on every design');assert.equal(M.validate(d).widgets.length,37);
}
const old=M.idrivePreset(0);old.widgets=old.widgets.filter(w=>M.LEGACY_TYPES.includes(w.type));old.widgets.find(w=>w.type==='speed').x=.041;old.widgets.find(w=>w.type==='coolant').x=.40;old.widgets.find(w=>w.type==='oil').x=.54;
const fixed=M.validate(old);assert.equal(fixed.widgets.find(w=>w.type==='speed').x,.041,'custom geometry preserved');assert.equal(fixed.widgets.find(w=>w.type==='coolant').x,.37);assert.equal(fixed.widgets.find(w=>w.type==='oil').x,.51);assert(fixed.widgets.find(w=>w.type==='fuel').on);assert.deepEqual(M.validate(fixed),fixed,'migration idempotent');
const bad=M.clone(old);bad.widgets.pop();assert.throws(()=>M.validate(bad));const duplicate=M.clone(fixed);duplicate.widgets.push(duplicate.widgets[0]);assert.throws(()=>M.validate(duplicate));
assert.deepEqual(decode('fuel',{fluidLevelFuelTank:0,range:0,mileageKilometre:0,statusFluidLevelFuelTankSpare:'AKTIV'}),{fuel:0,range:0,odometer:0,fuelWarning:'LOW FUEL'});
assert.deepEqual(decode('fuel',{fluidLevelFuelTank:255,range:4095,mileageKilometre:16777215,statusFluidLevelFuelTankSpare:3}),{fuel:null,range:null,odometer:null,fuelWarning:null});
assert.equal(decode('battery',{conditionBatteryChargingCondition:150}).battery,null);assert.equal(decode('trip',{rideDurationHours:4095,rideDurationMinutes:0}).tripTime,null);
let now=10000;const t=new Telemetry({now:()=>now});t.receive('pressure',{actualValuePressureTyreFLH:350});t.receive('tireTemp',{actualValueTemperatureTyreFLH:126});assert.equal(t.snapshot().pressureFL,null,'unknown units never guessed');
t.receive('units',{unitOfMeasurementAirPressure:'PSI',unitOfMeasurementTemperature:'F'});assert(Math.abs(t.snapshot().pressureFL-35/14.5037738)<1e-9);assert(Math.abs(t.snapshot().tireTempFL-30)<1e-9);
t.receive('units',{unitOfMeasurementAirPressure:'BAR',unitOfMeasurementTemperature:'C'});t.receive('pressure',{actualValuePressureTyreFLH:25,actualValuePressureTyreFRH:65532});assert.equal(t.snapshot().pressureFL,2.5);assert.equal(t.snapshot().pressureFR,null);
t.receive('fuel',{fluidLevelFuelTank:30,range:300,mileageKilometre:10000,statusFluidLevelFuelTankSpare:0});t.receive('rpm',{actualValueRPMEngineCrankshaft:12000});t.receive('torque',{actualValueTorqueCrankshaft:2447});t.receive('speed',{speedVehicleCentreOfGravity:0});t.receive('selection',{statusGearSelectionDrive:'P'});assert(t.parked());assert(Math.abs(t.snapshot().power-200*3000/9549.296586)<1e-9);
now+=2001;assert(!t.parked());assert.equal(t.snapshot().power,null);assert.equal(t.snapshot().fuel,30,'slow readings have separate freshness, Park never extended');now+=13000;assert.equal(t.snapshot().fuel,null);assert.equal(t.snapshot().pressureFL,null);assert.equal(interval('rpm'),50);assert.equal(interval('pressure'),5000);
const imperial=M.idrivePreset(0);assert.equal(M.reading('range',imperial,{range:160.9344}).value,'100');assert.equal(M.reading('fuel',imperial,{fuel:32.5}).value,'50');assert.equal(M.reading('outside',imperial,{outside:0}).value,'32');assert(!M.reading('fuel',imperial,{fuel:NaN}).available);
for(const units of ['mph','km/h'])for(const pair of [[0,'0'],[32.5,'50'],[65,'100'],[66,'100']]){const r=M.reading('fuel',Object.assign({},imperial,{units}),{fuel:pair[0]});assert.equal(r.value,pair[1]);assert.equal(r.unit,'%');}
for(const fuel of [undefined,null,-1,255,NaN,Infinity,'32'])assert(!M.reading('fuel',imperial,{fuel}).available,'invalid fuel never looks full or empty');
const capacity=M.validate(Object.assign({},imperial,{fuelCapacityLitres:80}));assert.equal(M.reading('fuel',capacity,{fuel:40}).value,'50');
for(const fuelCapacityLitres of [null,0,151,NaN,'65'])assert.throws(()=>M.validate(Object.assign({},imperial,{fuelCapacityLitres})));
const client=new EventEmitter();client.close=()=>{};const screen=new StudioScreen(()=>{},{client});screen.liveChanges=false;screen.design=fixed;
for(let i=0;i<M.GROUPS.length;i++){
 screen.page='add';screen.press('widget-group:'+i);const found=[];for(let page=0;page<Math.ceil(M.GROUPS[i][1].length/V.WIDGETS_PER_PAGE);page++){const controls=V.items(screen);assert(controls.length<=24);found.push(...controls.filter(b=>b.id.startsWith('add-widget:')).map(b=>b.id.slice(11)));screen.press('widget-next');}assert.deepEqual(found,M.GROUPS[i][1]);
 for(const b of V.items(screen)){assert(b.y+b.h<=(b.chrome==='dock'?574:535));assert(b.x+b.w<=1600);}
 for(const type of M.GROUPS[i][1]){const w=screen.design.widgets.find(w=>w.type===type);w.on=false;screen.press('add-widget:'+type);assert(screen.widget().on);assert.equal(screen.selected,type);assert.equal(screen.page,'edit');screen.press('undo');assert(!screen.design.widgets.find(w=>w.type===type).on);screen.page='add';}
}
const draw=M.preset(0);draw.widgets.forEach(w=>w.on=false);const cache=new FrameCache(480,180,false);const readings=screen.previewData();
for(const type of Object.keys(M.METRICS)){
 draw.widgets.forEach(w=>w.on=w.type===type);const cv=cache.render(draw,readings);assert(cv);const missing=cache.render(draw,{});assert(missing,'missing '+type+' replaces previous digits');const actual=cache.render(draw,readings);assert(actual,'new '+type+' invalidates cached frame');
 const texts=[];const rec={text:(s,x,y,size,c,o)=>texts.push({s,x,o}),textWidth:()=>100,gradientRect(){},fillRect(){},roundRect(){}};D.draw(rec,draw,{x:0,y:0,w:1920,h:720},readings);const w=draw.widgets.find(w=>w.type===type);assert(texts.every(t=>Math.abs(t.x-(w.x+w.w/2)*1920)<1e-8&&t.o.align==='center'),'label and value share center '+type);
}
screen.close();t.close();console.log('ok 37-widget library, all default fuel, migration, centering, add/undo, units, invalid/stale data and frame-cache invalidation');
