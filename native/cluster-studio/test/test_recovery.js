// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const assert=require('assert'),EventEmitter=require('events'),fs=require('fs'),os=require('os'),path=require('path');
const {Engine}=require('../engine'),{StudioService}=require('../service'),M=require('../shared/studio_model');
class Render extends EventEmitter {
 constructor(){super();this.ready=true;this.targets='map:1088x480,panel:1920x720,hud:800x480';this.seq=0;this.layers=new Map();}
 image(o){this.layers.set(++this.seq,o);return this.seq;}drop(ref){this.layers.delete(ref);}set(){}pixels(){}stop(){}close(){}animate(){return 1;}
}
let now=10000,parked=true;
const t={parked:()=>parked,snapshot:()=>({speed:parked?0:12,gear:parked?'P':'D',rpm:700,now:new Date(now)})};
const r=new Render(),e=new Engine(r,t,{now:()=>now}),d=M.idrivePreset(2);d.introEnabled=false;
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'studio-recovery-')),file=path.join(dir,'studio.json');
try{
 const s=new StudioService({engine:e,telemetry:t,file});
 r.emit('target','hud','idle');s.command({cmd:'apply',id:1,design:d,output:'center'});e.tick();
 const rejected=e.ref;r.emit('refused','pixels',rejected,'buffer rejected');e.tick();
 assert.equal(e.ref,null,'a rejected layer must not be recreated on the next 34 ms tick');
 assert.equal(e.health().failure.reason,'buffer rejected');
 const backoff=e.health().retryInMs;assert(backoff>=2000);
 for(let i=0;i<50;i++){now+=34;e.tick();assert.equal(e.ref,null,'no rapid layer/reacquire loop');}
 now+=backoff;e.tick();assert(e.ref&&e.ref!==rejected,'one delayed automatic retry');
 const retry=e.ref;r.emit('refused','pixels',rejected,'late reply');assert.equal(e.ref,retry,'retired replies cannot affect new output');
 r.emit('layer',retry,'error','image buffer refused');now+=5000;e.tick();assert(e.ref);
 r.emit('refused','pixels',e.ref,'buffer rejected');assert(e.health().paused,'repeated errors stop automatic reacquisition');
 for(let i=0;i<60;i++){now+=1000;e.tick();assert.equal(e.ref,null);}
 assert(s.store.enabled);assert.deepEqual(s.store.design,d,'recovery never discards the saved layout');
 s.command({cmd:'save',id:2,design:d});e.tick();assert.equal(e.ref,null,'live saves cannot reset the error limit');
 assert(s.state().recovery.paused);s.command({cmd:'retry',id:3});e.tick();assert(e.ref,'explicit retry resumes saved output');
 assert.equal(e.target,'map');assert.equal(s.store.output,'center');
 r.emit('target','map','shown','us','');r.emit('layer',e.ref,'shown','');
 assert(s.state().displayVisible);assert.equal(s.state().displayTarget,'map');
 r.emit('target','map','waiting','stock','taken: fetch removed');
 assert(!s.state().displayVisible,'allocated layer is not proof of visible output');assert.equal(s.state().displayReason,'taken: fetch removed');
 // Saving an output choice is independent of whether a temporary test can
 // take the shared scene immediately. It must never enable a center fallback.
 r.emit('target','hud','shown','us','');assert(s.state().canSelectPanel);assert(!s.state().canPreview);
 s.command({cmd:'apply',id:4,design:d,output:'parked-panel'});e.tick();assert.equal(e.ref,null);assert.equal(e.output,'parked-panel');
 assert(!s.state().displayVisible);assert(/HUD/.test(s.state().state));
 r.emit('target','hud','idle');e.tick();assert.equal(e.target,'panel');assert(!s.state().displayVisible,'prepared is not shown');
 r.emit('target','panel','shown','us','');r.emit('layer',e.ref,'shown','');assert(s.state().displayVisible);
 const panel=e.ref;r.emit('target','hud','waiting','none','scene id in use by another target');e.tick();assert.equal(e.ref,panel);
 assert(s.state().canSelectPanel,'queued HUD cannot disable the saved-output control');
 parked=false;e.tick();assert.equal(e.ref,null);assert(!s.state().canSelectPanel);assert.throws(()=>s.command({cmd:'retry',id:5}),/Park/);
 assert.equal(s.store.output,'parked-panel');assert.deepEqual(s.store.design,d);
 parked=true;r.emit('target','hud','idle');e.tick();assert.equal(e.target,'panel');
 r.emit('layer',e.ref,'error','failed');s.command({cmd:'off',id:6});assert(!s.state().enabled);assert(!s.state().recovery.paused);e.tick();assert.equal(e.ref,null);
 assert.throws(()=>s.command({cmd:'retry',id:7}),/enabled/,'Retry cannot switch a restored BMW display back on');
 const restart=new StudioService({engine:e,telemetry:t,file});assert.equal(restart.store.output,'parked-panel');assert(!restart.store.enabled);
 s.command({cmd:'apply',id:8,design:d,output:'center'});e.tick();const center=e.ref;
 for(let i=0;i<4;i++){
  r.emit('target','map','shown','us','');r.emit('layer',center,'shown','');
  r.emit('target','map','waiting','none','taken: fetch removed');now+=200;
  r.emit('target','map','waiting','stock','taken: fetch removed');now+=1200;e.tick();
  assert(!e.health().paused,'later stock classification must not count as a failed mapping');
 }
 for(let i=0;i<3;i++){
  r.emit('target','map','shown','us','');r.emit('layer',center,'shown','');e.tick();
  r.emit('target','map','waiting','none','taken: fetch removed');now+=1200;e.tick();
  if(i<2)assert.equal(e.ref,center,'ordinary slot-manager recovery retains the image');
 }
 assert(e.health().paused,'repeated unattributed display removals pause the flashing source');assert.equal(e.ref,null);
 s.command({cmd:'retry',id:9});e.tick();r.emit('target','map','shown','us','');r.emit('layer',e.ref,'shown','');
 e.tick();now+=11000;e.tick();assert(!e.health().failure,'stable mapping clears the recovery history');
 const healthy=e.ref,welcome=r.image({target:'map'});e.welcome={ref:welcome,assets:[]};e.introUntil=now+3000;
 r.emit('refused','animate',welcome,'optional welcome rejected');
 assert.equal(e.ref,healthy,'optional welcome error must not discard healthy gauges');assert.equal(e.welcome,null);assert.equal(e.introUntil,0);
 console.log('ok bounded renderer recovery, exact reason, stale-error isolation, explicit retry, saved output, visibility and Park gates');
}finally{e.close();fs.unlinkSync(file);fs.rmdirSync(dir);}
