// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const assert=require('assert');
const {ProfileSync}=require('../src/profile_sync');
const {SettingsControl}=require('../src/settings_control');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const reply=id=>({ev:'profile-reply',ok:true,known:true,id,target:'map',hud_width_pct:70,hud_x:10,hud_y:20});
function rig(read,extra){
 const c=new SettingsControl({ackMs:1000}),sent=[],render=[];
 c.render.link='up';c.patch.link='up';c.render.send=m=>render.push(m);c.patch.send=()=>{};
 c.renderStatus={state:'showing',target:'hud',hud_width_pct:60,hud_x:0,hud_y:0};
 c.patchStatus={state:'patched',startup_trial:true,restore_defaults:true};
 const s=new ProfileSync(Object.assign({control:c,readProfile:read,pollMs:10000,profileMs:200},extra));
 s.patch.open=()=>{s.patch.link='up';s.patch.emit('connect');};s.patch.close=()=>{s.patch.link='down';};s.patch.send=m=>sent.push(m);
 return {s,c,sent,render,close(){s.stop();c.close();}};
}
(async()=>{
 let x,resolve;
 try{
  x=rig(()=>new Promise(r=>{resolve=r;}));x.s.start();await wait(0);x.s.stop();resolve('late');await wait(0);
  assert.equal(x.sent.length,0,'stopped profile read must not send commands');
  assert.equal(x.s._timer,null,'stopped profile read must not restart polling');x.close();
  console.log('ok stopping while the profile getter is pending cancels its result and poll');

  let reads=0;x=rig(()=>{reads++;return 'A';});x.s.start();x.s.start();await wait(0);
  assert.equal(reads,1);assert.equal(x.sent.length,1);
  assert.equal(x.c.setHudSize(65),false,'profile load and manual size edit cannot overlap');
  assert.equal(x.c.setStartup('off'),false);assert.equal(x.c.canRestoreDefaults(),false);
  x.s._onPatch(reply('A'));assert.equal(x.render[0].target,'map');assert(x.c.canChangeDisplay());x.close();
  console.log('ok one profile transaction blocks competing map/startup/restore settings');

  x=rig(()=> 'A');assert(x.c.setHudSize(65));x.s.start();await wait(0);
  assert.equal(x.sent.length,0,'profile loading waits for manual save and live acknowledgement');
  x.c._onPatch({ev:'hud-size-reply',ok:true,hud_width_pct:65});assert.equal(x.sent.length,0);
  x.c._onRender({ev:'status',state:'showing',target:'hud',hud_width_pct:65,hud_x:0,hud_y:0});
  assert.equal(x.sent.length,1);x.s._onPatch(reply('A'));x.close();
  console.log('ok profile loading cannot undo an in-flight manual setting');

  x=rig(()=> 'A');x.c._restoring=true;x.s.start();await wait(0);assert.equal(x.sent.length,0);
  x.c._restoring=false;x.c.emit('change');assert.equal(x.sent.length,1);
  const before=x.render.length;x.s.stop();x.s._onPatch(reply('A'));assert.equal(x.render.length,before);assert(x.c.canChangeDisplay());x.close();
  console.log('ok defaults restore excludes profile commands, and shutdown ignores late replies');

  let who='A';x=rig(()=>who);x.s.start();await wait(0);who='B';await x.s._poll();await wait(0);
  assert.equal(x.sent.length,1,'profile requests are serialized');
  x.s._onPatch(reply('A'));assert.equal(x.render.length,0,'outdated driver cannot move the live map');
  assert.equal(x.sent.length,2);assert.equal(x.sent[1].id,'B');x.s._onPatch(reply('B'));assert.equal(x.render.length,2);x.close();
  console.log('ok rapid driver changes apply only the current profile');

  const readsPending=[];x=rig(()=>new Promise(r=>readsPending.push(r)));x.s.start();await wait(0);x.s.stop();x.s.start();await wait(0);
  readsPending[0]('old');await wait(0);assert.equal(x.sent.length,0);
  readsPending[1]('new');await wait(0);assert.equal(x.sent.length,1);assert.equal(x.sent[0].id,'new');x.close();
  console.log('ok a stopped session cannot modify a restarted session');

  x=rig(()=> 'A',{profileMs:25});x.s.start();await wait(40);assert(x.c.canChangeDisplay());
  x.s._onPatch(reply('A'));assert.equal(x.render.length,0,'timed-out profile reply cannot override subsequent edits');x.close();
  console.log('ok timed-out profile loading releases settings and rejects late replies');

  x=rig(()=> 'A');x.s.start();await wait(0);x.s.patch.link='down';x.s.patch.emit('close');assert(x.c.canChangeDisplay());
  x.s.patch.link='up';x.s.patch.emit('connect');assert.equal(x.sent.length,2);x.s._onPatch(reply('A'));x.close();
  console.log('ok patch reconnect releases and reacquires the settings transaction');
 }finally{if(x)x.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
