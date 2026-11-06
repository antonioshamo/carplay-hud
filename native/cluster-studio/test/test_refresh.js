// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const assert=require('assert'),EventEmitter=require('events'),{Engine}=require('../engine'),{Telemetry}=require('../telemetry'),M=require('../shared/studio_model');
class Render extends EventEmitter {
 constructor(){super();this.ready=true;this.targets='panel:1920x720';this.uploads=0;this.n=0;}
 image(o){this.options=o;return ++this.n;}drop(){}set(){}stop(){}close(){}animate(){return ++this.n;}pixels(){this.uploads++;}
}
let now=10000;const t=new Telemetry({now:()=>now}),r=new Render(),e=new Engine(r,t,{now:()=>now});
const d=M.acceptedDesign();d.introEnabled=false;e.configure(d,true,'parked-panel');r.emit('target','hud','idle');
for(let i=0;i<=20;i++){
 t.receive('speed',{speedVehicleCentreOfGravity:0});t.receive('selection',{statusGearSelectionDrive:'P'});t.receive('rpm',{actualValueRPMEngineCrankshaft:(700+i*37)*4});
 e.tick();assert.equal(r.uploads,i+1,'each new 50 ms RPM sample reaches the renderer');assert.equal(e.lastDraw,now);
 assert(e.frames.commands.some(c=>c.op==='text'&&c.args[0]===String(700+i*37)),'numeric RPM is the latest real reading, not interpolated');
 now+=50;
}
assert.equal(r.options.fps,20);const count=r.uploads;for(let i=0;i<10;i++){e.tick();now+=50;}assert.equal(r.uploads,count,'unchanged data sends no extra bitmaps');
now+=2001;e.tick();assert.equal(e.ref,null,'fast drawing must not extend stale Park');e.close();t.close();
console.log('ok 20 Hz renderer/engine path, latest actual RPM on every frame, no duplicate frames, stale-data fallback');
