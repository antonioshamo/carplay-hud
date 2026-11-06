// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const assert=require('assert'),fs=require('fs'),os=require('os'),path=require('path'),EventEmitter=require('events');
require('../build.js');
const M=require('../shared/studio_model.js'),{Engine}=require('../engine.js'),{Telemetry,decode}=require('../telemetry.js'),{StudioService}=require('../service.js');
class Render extends EventEmitter{
 constructor(){super();this.ready=true;this.targets='map:1088x480,panel:1920x720,hud:800x480';this.layers=new Map();this.seq=0;this.animations=[];this.uploads=0;}
 image(o){this.layers.set(++this.seq,Object.assign({kind:'image'},o));return this.seq;}
 asset(o){return this.image(Object.assign({},o,{kind:'asset',iw:o.w,ih:o.h}));}
 effect(o){return this.image(Object.assign({},o,{kind:'effect'}));}
 bind(r,name,a){assert(this.layers.has(a));}
 uniform(r,name,v){assert(this.layers.has(r));assert(v.every(Number.isFinite));const layer=this.layers.get(r);layer.uniforms=layer.uniforms||{};layer.uniforms[name]=v;}
 drop(r){this.layers.delete(r);}
 pixels(r,rects,data){if(!rects)this.lastPixels=Buffer.from(data);assert.equal(data.length,rects?rects.reduce((n,x)=>n+x.w*x.h*4,0):this.layers.get(r).iw*this.layers.get(r).ih*4);this.uploads++;}
 set(r,o){Object.assign(this.layers.get(r),o);}
 animate(r,o){this.animations.push({r,o});return this.animations.length;}
 stop(r,a){this.animations[a-1].stopped=true;}
 close(){}
}
let now=10000;const t=new Telemetry({now:()=>now}),r=new Render(),e=new Engine(r,t,{now:()=>now});
assert.equal(e.panelBlock,null,'parked gauges use the accepted native clearance');
const parked=()=>{t.receive('speed',{speedVehicleCentreOfGravity:0});t.receive('gear',{statusActualStageDrive:1});};
assert(!t.parked());assert.throws(()=>e.preview(M.preset(0)),/fresh/);parked();assert(t.parked());assert.throws(()=>e.preview(M.preset(0)),/HUD/);
r.emit('target','hud','shown');assert.throws(()=>e.preview(M.preset(0)),/HUD/);r.emit('target','hud','idle');
e.preview(M.preset(11));e.tick();assert.equal(e.target,'panel');assert.equal(r.layers.get(e.ref).iw,1920);assert.equal(r.layers.get(e.ref).ih,720);assert.equal(r.layers.size,1);assert(r.animations.some(a=>a.o.keys.endsWith('1501:0,1200,0')),'renderer-side expiry');
t.receive('gear',{statusActualStageDrive:4});e.tick();assert.equal(r.layers.size,0,'gear change drops full-screen output');
parked();e.preview(M.preset(0));e.tick();now+=2001;e.tick();assert.equal(r.layers.size,0,'stale data drops full-screen output');
parked();e.preview(M.preset(0));e.tick();r.emit('target','hud','acquiring');assert.equal(r.layers.size,0,'HUD acquisition cancels test');
r.emit('target','hud','idle');e.preview(M.preset(0));e.tick();now+=10001;parked();e.tick();assert.equal(r.layers.size,0,'wall-clock expiry');
const design=M.preset(11);design.introEnabled=true;e.configure(design,true);t.receive('condition',{statusConditionVehicle:10});e.tick();assert.equal(e.target,'map');assert(e.introUntil>now);assert(r.animations.some(a=>a.o.keys.includes('3001:0,1200,0')));
const baseRef=e.ref,uploads=r.uploads;
for(let n=1;n<30;n++){now+=16;parked();e.tick();}
assert.equal(r.uploads,uploads,'native animation sends no per-frame bitmaps');
assert.equal(e.ref,baseRef,'gauges remain prepared beneath the animation');
const G=require('../welcome_gpu.js');
for(const duration of [3000,4500,5500,7000]){const d=M.preset(0);d.introDuration=duration;const keys=G.keyframes(d,123,duration);for(const key of Object.values(keys)){const rows=key.split(' ');assert(rows.length<=256);let previous=-1;for(const row of rows){const parts=row.split(':');assert(+parts[0]>previous);previous=+parts[0];assert(parts[1].split(',').every(v=>Number.isFinite(+v)));}assert.equal(previous,duration-123);}}
now+=3001;parked();t.receive('condition',{statusConditionVehicle:10});e.tick();assert.equal(e.introUntil,0);assert.equal(e.target,'map');assert.equal(e.ref,baseRef,'no black layer rebuild at gauge handoff');assert.equal(r.layers.size,1,'all intro assets released');
const prior=M.clone(e.design);e.preview(design);e.tick();assert(e.introUntil);e.stopPreview();assert.equal(e.introUntil,0,'ending test also ends its animation');assert.deepEqual(e.design,prior);
assert.deepEqual(e.design,design);r.emit('disconnected');assert.equal(r.layers.size,0,'no stale image replay after disconnect');
assert.equal(decode('speed',{speedVehicleCentreOfGravity:65535}).speed,null);assert.equal(decode('rpm',{actualValueRPMEngineCrankshaft:65535}).rpm,null);assert.equal(decode('temps',{temperatureEngineOilDrive:255}).oil,null);assert.equal(decode('gear',{statusActualStageDrive:0}).gear,null);assert.equal(decode('speed',{speedVehicleCentreOfGravity:6400}).speed,100);assert.equal(decode('rpm',{actualValueRPMEngineCrankshaft:12800}).rpm,3200);
parked();r.emit('target','hud','idle');e.preview(M.preset(0),60);e.tick();const leaseCount=r.animations.length;now+=500;parked();e.tick();assert(r.animations.length>leaseCount,'long test renews short renderer lease');assert.equal(e.panelUntil-now,59500);for(let n=0;n<45;n++){now+=500;parked();e.tick();}assert.equal(r.animations.filter(a=>a.r===e.ref&&!a.stopped).length,1,'renewals replace the lease without exhausting the 16-animation limit');assert.throws(()=>e.preview(M.preset(0),999),/Choose/);e.stopPreview();
{
 const rt=new Render(),tt=new Telemetry({now:()=>now}),ee=new Engine(rt,tt,{now:()=>now});const d=M.preset(0);d.introEnabled=true;ee.configure(d,true);
 tt.receive('condition',{statusConditionVehicle:10});ee.tick();assert(!ee.introUntil,'wait for fresh Park');
 now+=500;tt.receive('speed',{speedVehicleCentreOfGravity:0});tt.receive('selection',{statusGearSelectionDrive:'P'});ee.tick();assert(ee.introUntil>now,'late Park allows the pending ignition welcome');
 now+=3100;tt.receive('condition',{statusConditionVehicle:10});tt.receive('speed',{speedVehicleCentreOfGravity:0});tt.receive('selection',{statusGearSelectionDrive:'P'});ee.tick();assert(!ee.introUntil,'same ignition does not replay welcome');
 tt.receive('condition',{statusConditionVehicle:12});ee.tick();tt.receive('condition',{statusConditionVehicle:10});ee.tick();assert(ee.introUntil>now,'next ignition gets one welcome');ee.close();tt.close();
}
// The recorded BMW off-state has an unavailable qualifier. It must not
// authorize output, but fresh engine zero plus that state re-arms a welcome.
{
 const rt=new Render(),tt=new Telemetry({now:()=>now}),ee=new Engine(rt,tt,{now:()=>now}),d=M.preset(11);d.introEnabled=true;ee.configure(d,true);
 const park=()=>{tt.receive('speed',{speedVehicleCentreOfGravity:0});tt.receive('selection',{statusGearSelectionDrive:'P'});};
 const ready=()=>tt.receive('condition',{statusConditionVehicle:'FAHREN',qualifierStatusConditionVehicle:'SIGNALWERT_GUELTIG'});
 const off=()=>tt.receive('condition',{statusConditionVehicle:'WOHNEN',qualifierStatusConditionVehicle:'WERT_NICHT_VERFUEGBAR'});
 park();ready();tt.receive('rpm',{actualValueRPMEngineCrankshaft:3200});ee.tick();assert(ee.introUntil>now);
 now+=3100;park();ready();ee.tick();assert(!ee.introUntil);
 off();ee.tick();assert.equal(ee.condition,'ready','unqualified off hint without fresh zero RPM cannot rearm');
 park();ready();ee.tick();assert(!ee.introUntil,'unqualified noise must not replay welcome');
 off();tt.receive('rpm',{actualValueRPMEngineCrankshaft:0});ee.tick();assert.equal(tt.snapshot().condition,null,'unqualified state remains invalid for vehicle readiness');assert(!ee.introUntil);
 now+=1000;park();ready();tt.receive('rpm',{actualValueRPMEngineCrankshaft:4800});ee.tick();assert(ee.introUntil>now,'recorded wake/start sequence gets a second welcome without restarting the helper');
 now+=3100;park();ready();ee.tick();assert(!ee.introUntil,'repeated ready does not replay');
 off();tt.receive('rpm',{actualValueRPMEngineCrankshaft:0});now+=2100;park();ee.tick();ready();ee.tick();assert(!ee.introUntil,'stale off and RPM cannot rearm');
 ee.close();tt.close();
}
{
 const rt=new Render(),tt=new Telemetry({now:()=>now}),ee=new Engine(rt,tt,{now:()=>now});
 const park=()=>{tt.receive('speed',{speedVehicleCentreOfGravity:0});tt.receive('gear',{statusActualStageDrive:1});};
 const d=M.preset(11);d.introEnabled=true;ee.configure(d,true,'parked-panel');
 park();ee.tick();assert.equal(rt.layers.size,0,'unknown HUD ownership prevents saved panel output');
 rt.emit('target','hud','idle');tt.receive('condition',{statusConditionVehicle:10});ee.tick();assert.equal(ee.target,'panel');
 const welcome=rt.layers.get(ee.welcome.ref);assert.equal(welcome.uniforms.u_panel[0],1);assert.deepEqual(welcome.uniforms.u_native,[1380,660,1520,720]);
 assert(welcome.fs.includes('discard'),'GPU welcome preserves the same native opening');
 now+=70001;park();ee.tick();assert.equal(ee.target,'panel','saved output is not a timed preview');
 tt.receive('gear',{statusActualStageDrive:4});ee.tick();assert.equal(rt.layers.size,0,'saved full panel leaves factory cluster when out of Park');
 park();ee.tick();assert.equal(ee.target,'panel','saved layout resumes when Park is fresh');
 now+=2100;ee.tick();assert.equal(rt.layers.size,0,'stale Park removes held panel');
 park();ee.tick();rt.emit('target','hud','shown');assert.equal(rt.layers.size,0,'HUD activation removes held panel immediately');
 ee.tick();assert.equal(rt.layers.size,0);rt.emit('target','hud','idle');ee.tick();assert.equal(ee.target,'panel');
 ee.configure(d,false,'parked-panel');ee.tick();assert.equal(rt.layers.size,0,'restore persists off');ee.close();tt.close();
}
console.log('ok renderer geometry, parked gates, stale signals, movement, HUD conflict, native expiry, startup and no stale replay');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cluster-studio-test-')),file=path.join(dir,'studio.json');
const s=new StudioService({engine:e,telemetry:t,file});
parked();s.command({cmd:'apply',id:1,design:M.preset(46),output:'parked-panel'});s.command({cmd:'slot',id:2,slot:4,design:M.preset(23)});
const s2=new StudioService({engine:e,telemetry:t,file});assert(s2.store.enabled);assert.equal(s2.store.output,'parked-panel');assert.equal(e.output,'parked-panel','restart restores selected output');assert.equal(s2.store.design.preset,46);assert.equal(s2.store.slots[4].preset,23);
assert.throws(()=>s.command({cmd:'slot',id:3,slot:8,design:M.preset(0)}));const before=fs.readFileSync(file,'utf8');const invalid=M.preset(0);invalid.widgets[0].w=Infinity;assert.throws(()=>s.command({cmd:'apply',id:4,design:invalid}));assert.equal(fs.readFileSync(file,'utf8'),before);
const broken=new StudioService({engine:e,telemetry:t,file:path.join(dir,'missing/file')});assert.throws(()=>broken.command({cmd:'apply',id:5,design:M.preset(0)}));assert(!broken.store.enabled,'failed save never reports applied');
fs.writeFileSync(file,'broken');const recovered=new StudioService({engine:e,telemetry:t,file});assert(!recovered.store.enabled,'corrupt configuration fails off');
console.log('ok atomic persistence, five slots, restart restore, input bounds and failed-save/corrupt-store behavior');
e.close();t.close();fs.rmSync(dir,{recursive:true,force:true});

require('./test_features.js');
