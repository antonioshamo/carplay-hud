// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
// Actual socket client and HudScreen with a controlled renderer peer. This does
// not emulate BMW's compositor or prove that the physical surface is visible.
const assert=require('assert'),{HudScreen}=require('../src/hud_screen.js');
const {RenderClient}=require('../src/mgu_render_client.js'),{SettingsControl}=require('../src/settings_control.js');
const {FakeGraphics}=require('./fake_graphics.js'),kit=require('../src/kit_record.js');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn){for(let n=0;n<250;n++){if(fn())return;await wait(10);}throw Error('presentation condition timed out');}
(async()=>{
 const g=new FakeGraphics('/tmp/hud-present-'+process.pid),log={warn(){},info(){}},c=new SettingsControl({log});
 g.onScreen=false;g.front=false;
 const client=new RenderClient('robertn_waze_cluster',log,{kit,socket:g.path,mode:'layer'});
 const modes=[],h=new HudScreen({control:c,log,proxies(){},classic(){}},{client});h.on('mode',v=>modes.push(v));
 try{
  await g.listen();h.connect();await until(()=>h.ready);h.hostVisible(true);
  await until(()=>h.lastAck&&h.presentation&&!h.presentation.onScreen);
  assert(h.active,'connection alone initially permits a presentation attempt');
  const old=client.sock;
  // Exercise the production interval, not just a manually invoked watchdog.
  await wait(3100);
  await until(()=>client.sock!==old&&client.ready&&g.count(1)===2&&h.lastAck);
  assert.equal(h.recoveryAttempts,1,'an acknowledged but hidden frame must not clear the recovery budget');
  old.emit('data',Buffer.from([106,0,0,0,0,0,0,0]));old.emit('close');
  assert(client.ready&&h.active,'late events from the discarded socket cannot hide the replacement');
  h._checkPresentation(h.presentationSince+2501);
  assert(h.presentationFailed&&!h.active,'persistent missing picture must leave the proxy-only page');
  assert.equal(modes[modes.length-1],false,'native fallback requested');
  assert(/ownership/.test(h.failureReason),'failure identifies foreground gating without bypassing it');
  const attempts=g.count(1);h._checkPresentation(Date.now()+10000);await wait(80);
  assert.equal(g.count(1),attempts,'no automatic reconnect loop after bounded recovery');
  console.log('PASS hidden picture despite frame acknowledgements: one reconnect, then fallback; old socket events ignored');

  g.onScreen=true;g.front=true;h.hostVisible(true);
  await until(()=>h.lastAck&&h.presentation.onScreen);
  assert(h.active&&!h.presentationFailed);assert.equal(h.recoveryAttempts,0);
  h.hostFocus(false);const paused=g.count(1);h._checkPresentation(Date.now()+10000);
  assert.equal(g.count(1),paused,'popup/hidden host must not reconnect or seize focus');
  h.hostVisible(true);await until(()=>h.lastAck);
  console.log('PASS manual retry restores graphics; hidden or unfocused app leaves BMW alone');

  g.send(103,Buffer.from('surface draw failed'));
  await until(()=>h.presentationFailed);
  assert(!h.active&&/surface draw failed/.test(h.failureReason));
  assert.equal(modes[modes.length-1],false);
  console.log('PASS renderer error produces a usable fallback instead of an inert button list');
 }finally{h.close();c.close();await g.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
