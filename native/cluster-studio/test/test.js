// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const assert=require('assert'),fs=require('fs'),os=require('os'),path=require('path'),EventEmitter=require('events');
require('../build.js');
const M=require('../shared/studio_model.js'),{Engine}=require('../engine.js'),{Telemetry,decode}=require('../telemetry.js'),{StudioService}=require('../service.js');
class Render extends EventEmitter{constructor(){super();this.ready=true;this.targets='map:1088x480,panel:1920x720,hud:800x480';this.layers=new Map();this.seq=0;this.animations=[];}image(o){this.layers.set(++this.seq,o);return this.seq;}drop(r){this.layers.delete(r);}pixels(r,_,data){assert.equal(data.length,this.layers.get(r).iw*this.layers.get(r).ih*4);}set(r,o){Object.assign(this.layers.get(r),o);}animate(r,o){this.animations.push({r,o});}close(){}}
let now=10000;const t=new Telemetry({now:()=>now}),r=new Render(),e=new Engine(r,t,{now:()=>now});
const parked=()=>{t.receive('speed',{speedVehicleCentreOfGravity:0});t.receive('gear',{statusActualStageDrive:1});};
assert(!t.parked());assert.throws(()=>e.preview(M.preset(0)),/fresh/);parked();assert(t.parked());assert.throws(()=>e.preview(M.preset(0)),/HUD/);
r.emit('target','hud','shown');assert.throws(()=>e.preview(M.preset(0)),/HUD/);r.emit('target','hud','idle');
e.preview(M.preset(11));e.tick();assert.equal(e.target,'panel');assert.equal(r.layers.size,1);assert(r.animations.some(a=>a.o.keys.endsWith('10001:0,1200,0')),'renderer-side expiry');
t.receive('gear',{statusActualStageDrive:4});e.tick();assert.equal(r.layers.size,0,'gear change drops full-screen output');
parked();e.preview(M.preset(0));e.tick();now+=2001;e.tick();assert.equal(r.layers.size,0,'stale data drops full-screen output');
parked();e.preview(M.preset(0));e.tick();r.emit('target','hud','acquiring');assert.equal(r.layers.size,0,'HUD acquisition cancels test');
r.emit('target','hud','idle');e.preview(M.preset(0));e.tick();now+=10001;parked();e.tick();assert.equal(r.layers.size,0,'wall-clock expiry');
const design=M.preset(11);design.introEnabled=true;e.configure(design,true);t.receive('condition',{statusConditionVehicle:10});e.tick();assert.equal(e.target,'map');assert(e.introUntil>now);assert(r.animations.some(a=>a.o.keys.includes('3001:0,1200,0')));
now+=3001;parked();t.receive('condition',{statusConditionVehicle:10});e.tick();assert.equal(e.introUntil,0);assert.equal(e.target,'map');
assert.deepEqual(e.design,design);r.emit('disconnected');assert.equal(r.layers.size,0,'no stale image replay after disconnect');
assert.equal(decode('speed',{speedVehicleCentreOfGravity:65535}).speed,null);assert.equal(decode('rpm',{actualValueRPMEngineCrankshaft:65535}).rpm,null);assert.equal(decode('temps',{temperatureEngineOilDrive:255}).oil,null);assert.equal(decode('gear',{statusActualStageDrive:0}).gear,null);assert.equal(decode('speed',{speedVehicleCentreOfGravity:6400}).speed,100);assert.equal(decode('rpm',{actualValueRPMEngineCrankshaft:12800}).rpm,3200);
console.log('ok renderer geometry, parked gates, stale signals, movement, HUD conflict, native expiry, startup and no stale replay');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cluster-studio-test-')),file=path.join(dir,'studio.json');
const s=new StudioService({engine:e,telemetry:t,file});
s.command({cmd:'apply',id:1,design:M.preset(46)});s.command({cmd:'slot',id:2,slot:4,design:M.preset(23)});
const s2=new StudioService({engine:e,telemetry:t,file});assert(s2.store.enabled);assert.equal(s2.store.design.preset,46);assert.equal(s2.store.slots[4].preset,23);
assert.throws(()=>s.command({cmd:'slot',id:3,slot:8,design:M.preset(0)}));const before=fs.readFileSync(file,'utf8');const invalid=M.preset(0);invalid.widgets[0].w=Infinity;assert.throws(()=>s.command({cmd:'apply',id:4,design:invalid}));assert.equal(fs.readFileSync(file,'utf8'),before);
const broken=new StudioService({engine:e,telemetry:t,file:path.join(dir,'missing/file')});assert.throws(()=>broken.command({cmd:'apply',id:5,design:M.preset(0)}));assert(!broken.store.enabled,'failed save never reports applied');
fs.writeFileSync(file,'broken');const recovered=new StudioService({engine:e,telemetry:t,file});assert(!recovered.store.enabled,'corrupt configuration fails off');
console.log('ok atomic persistence, five slots, restart restore, input bounds and failed-save/corrupt-store behavior');
e.close();t.close();fs.rmSync(dir,{recursive:true,force:true});
