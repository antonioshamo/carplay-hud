// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const assert=require('assert'),EventEmitter=require('events'),{Engine}=require('../engine'),{Telemetry}=require('../telemetry'),M=require('../shared/studio_model');
class Render extends EventEmitter {
 constructor(){super();this.ready=true;this.targets='panel:1920x720';this.uploads=0;this.n=0;}
 image(o){this.options=o;return ++this.n;}drop(){}set(){}stop(){}close(){}animate(){return ++this.n;}pixels(){this.uploads++;}
}
const designs=M.STYLES.map(style=>{const d=M.acceptedDesign();d.gauge=style[0];return d;}).concat(M.IDRIVE_TEMPLATES.map((t,i)=>M.idrivePreset(i)));
for(const d of designs)for(const output of ['parked-panel','center']){
 let now=10000;const t=new Telemetry({now:()=>now}),r=new Render(),e=new Engine(r,t,{now:()=>now});
 r.targets='panel:1920x720,map:1088x480';d.introEnabled=false;e.configure(d,true,output);r.emit('target','hud','idle');
 for(let i=0;i<=12;i++){
  t.receive('speed',{speedVehicleCentreOfGravity:output==='center'?(20+i)*64:0});t.receive('selection',{statusGearSelectionDrive:'P'});t.receive('rpm',{actualValueRPMEngineCrankshaft:(700+i*37)*4});
  e.tick();assert.equal(r.uploads,i+1,'each new 34 ms sample reaches every template/output');assert.equal(e.lastDraw,now);
  assert(e.frames.commands.some(c=>c.op==='text'&&[String(700+i*37),String(700+i*37)+' RPM'].includes(c.args[0])),'numeric RPM is the latest real reading, not interpolated');
  const drawn=e.lastDraw;now+=10;e.tick();assert.equal(e.lastDraw,drawn,'bounded rendering under a burst of notifications');now+=24;
 }
 assert.equal(r.options.fps,30);const count=r.uploads;for(let i=0;i<10;i++){e.tick();now+=34;}assert.equal(r.uploads,count,'unchanged data sends no extra bitmaps');
 now+=2001;e.tick();if(output==='parked-panel')assert.equal(e.ref,null,'fast drawing must not extend stale Park');
 else assert(e.frames.commands.some(c=>c.op==='text'&&['—','RPM unavailable'].includes(c.args[0])),'stale values are not kept on the center display');
 e.close();t.close();
}
console.log('ok 30 fps limit for all 12 styles and 3 iDrive templates, center/full panel, latest real samples, bounded bursts, no duplicate images and stale-data fallback');
