// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const assert=require('assert'),fs=require('fs'),os=require('os'),path=require('path'),EventEmitter=require('events');
// Isolate lifecycle/arbitration from bitmap cost so a ten-minute sequence
// can run deterministically. test.js and test_panel_composition use real draws.
const Module=require('module'),originalLoad=Module._load;
Module._load=function(name,parent){
 if(parent&&/\/engine\.js$/.test(parent.filename)){
  if(name==='./shared/kit_canvas.js')return {Canvas:class {constructor(){this.d=Buffer.alloc(4);}clear(){}}};
  if(name==='./shared/studio_draw.js')return {draw(){}};
  if(name==='./panel_composition.js')return {draw(){}};
  if(name==='./image_delta.js')return {delta(){return null;}};
 }
 return originalLoad.apply(this,arguments);
};
const {Engine}=require('../engine');Module._load=originalLoad;
const {Telemetry}=require('../telemetry'),{StudioService}=require('../service'),M=require('../shared/studio_model');
class Render extends EventEmitter {
 constructor(){super();this.ready=true;this.targets='map:1088x480,panel:1920x720,hud:800x480';this.layers=new Map();this.seq=0;this.drops=0;this.animation=0;}
 image(o){this.layers.set(++this.seq,o);return this.seq;}
 drop(r){if(this.layers.delete(r))this.drops++;}
 set(){} pixels(){} stop(){} close(){}
 animate(){return ++this.animation;}
}
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gauge-stability-'));
let now=10000;const t=new Telemetry({now:()=>now}),r=new Render(),e=new Engine(r,t,{now:()=>now});
const park=()=>{t.receive('speed',{speedVehicleCentreOfGravity:0});t.receive('selection',{statusGearSelectionDrive:'P'});};
const d=M.preset(11);d.introEnabled=false;
try {
 const s=new StudioService({engine:e,telemetry:t,file:path.join(dir,'studio.json')});
 park();r.emit('target','hud','idle');s.command({cmd:'apply',id:1,design:d,output:'parked-panel'});e.tick();
 const ref=e.ref;assert(ref);assert.equal(r.layers.get(ref).klass,'overlay');assert.equal(r.layers.get(ref).contend,true,'saved gauges request the ordinary foreground slot');
 // A new HUD request is queued behind this panel on scene 0x01000400.
 r.emit('target','hud','waiting','none','scene id in use by another target');
 assert.equal(e.ref,ref,'queued HUD request must not release the current panel');
 for(let i=0;i<6000;i++){
  now+=100;park();
  if(i%1200===0)s.command({cmd:'apply',id:2,design:d,output:'parked-panel'});
  if(i%100===0)r.emit('target','hud','waiting','none','scene id in use by another target');
  e.tick();assert.equal(e.ref,ref,'ten-minute replay keeps one gauge layer');
 }
 assert.equal(r.drops,0);
 const edited=M.clone(d);edited.theme=(edited.theme+1)%M.THEMES.length;
 s.command({cmd:'save',id:3,design:edited});e.tick();assert.equal(e.ref,ref,'design edits update in place');
 s.command({cmd:'slot',id:4,slot:0,design:d});e.tick();assert.equal(e.ref,ref,'slot save leaves active output alone');
 assert.equal(e.design.theme,edited.theme);
 r.emit('refused','pixels',999,'late old-layer reply');assert.equal(e.ref,ref,'unrelated refusal leaves current gauges alone');
 r.emit('refused','status',undefined,'unrelated status error');assert.equal(e.ref,ref);
 r.emit('refused','pixels',ref,'current layer rejected');assert.equal(e.ref,null,'current-layer failure still releases output');
 e.tick();assert.equal(e.ref,null,'cannot claim a busy scene after losing ownership');
 r.emit('target','hud','idle');e.tick();assert(e.ref);
 r.emit('target','hud','shown','us','');assert.equal(e.ref,null,'real HUD ownership still prevents a scene collision');
 e.tick();assert.equal(e.ref,null);r.emit('target','hud','idle');e.tick();assert(e.ref);
 t.receive('selection',{statusGearSelectionDrive:'R'});e.tick();assert.equal(e.ref,null,'reverse immediately restores BMW');
 park();e.tick();assert(e.ref);now+=2001;e.tick();assert.equal(e.ref,null,'stale Park still restores BMW');
 park();e.tick();assert(e.ref);t.receive('speed',{speedVehicleCentreOfGravity:64});e.tick();assert.equal(e.ref,null,'movement immediately restores BMW');
 park();e.tick();r.emit('disconnected');assert.equal(e.ref,null);r.emit('ready');e.tick();assert.equal(e.ref,null,'reconnection requires a fresh ownership report');
 r.emit('target','hud','idle');e.tick();assert(e.ref);
 // Slot saves should also leave a deliberately timed preview intact.
 e.preview(d,30);e.tick();const preview=e.ref,until=e.panelUntil;
 s.command({cmd:'slot',id:5,slot:1,design:edited});assert.equal(e.ref,preview);assert.equal(e.panelUntil,until);
 s.command({cmd:'off',id:6});assert.equal(e.ref,null);assert.equal(e.enabled,false);
 console.log('ok ten-minute foreground replay, queued HUD ownership, edits/slots, scoped errors, reconnect, restore, stale Park and motion');
}finally{e.close();t.close();for(const f of fs.readdirSync(dir))fs.unlinkSync(path.join(dir,f));fs.rmdirSync(dir);}
