// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
// Actual socket client and HudScreen with a controlled renderer peer. This does
// not emulate BMW's compositor or prove that the physical surface is visible.
const assert=require('assert'),{HudScreen}=require('../src/hud_screen.js');
const {RenderClient}=require('../src/mgu_render_client.js'),{SettingsControl}=require('../src/settings_control.js');
const {FakeGraphics}=require('./fake_graphics.js'),kit=require('../src/kit_record.js');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn){for(let n=0;n<250;n++){if(fn())return;await wait(10);}throw Error('presentation condition timed out');}
async function startupRecovery(){
 const g=new FakeGraphics('/tmp/hud-startup-recover-'+process.pid),log={warn(){},info(){}},c=new SettingsControl({log});
 const client=new RenderClient('robertn_waze_cluster',log,{kit,socket:g.path,mode:'layer'});
 const h=new HudScreen({control:c,log,proxies(){}},{client}),view=require('../src/hud_view.js'),frame=view.frame;
 clearInterval(h.timer);g.modes=0;
 try{
  await g.listen();h.hostVisible(true);h.connect();await until(()=>h.failureReason);
  assert(h.presentationFailed&&!h.active,'unavailable startup capability must enter scheduled recovery');
  assert(/dashboard mode/.test(h.failureReason));assert.equal(g.count(7),0,'unsupported mode never draws');
  const first=client.sock;g.modes=1;h._maintain(h.retryAt);
  await until(()=>h.presented);assert.notEqual(client.sock,first);assert.equal(h.autoRetries,0);
  const fonts=g.count(4),old=client.sock;
  g.send(103,Buffer.from('surface resources lost'));await until(()=>h.presentationFailed);
  h._maintain(h.retryAt);await until(()=>h.presented);
  assert.notEqual(client.sock,old,'renderer errors recreate this app connection');
  assert(g.count(4)>fonts,'fresh connection reuploads font resources');
  view.frame=()=>{throw Error('test drawing failure');};h.render(true);view.frame=frame;
  assert(h.presentationFailed&&!h.active&&/test drawing failure/.test(h.failureReason),'draw exceptions expose their cause and schedule recovery');
  h._maintain(h.retryAt);await until(()=>h.presented);
  g.modes=0;h._presentationFailed('test unavailable mode');h.retry();await until(()=>h.presentationFailed);
  for(let n=0;n<3;n++){h._maintain(h.retryAt);await until(()=>h.presentationFailed);}
  const attempts=g.count(1);h._maintain(h.retryAt+1000);await wait(30);
  assert.equal(h.autoRetries,3);assert.equal(g.count(1),attempts,'unavailable renderer retries stop after three attempts');
  g.modes=1;h.retry();await until(()=>h.presented);
  h._presentationFailed('test focus pause');h.hostFocus(false);const paused=g.count(1);h._maintain(h.retryAt+1000);await wait(30);
  assert.equal(g.count(1),paused,'automatic recovery does not reconnect behind another screen');
  h.close();h._maintain(Date.now()+60000);assert.equal(g.count(1),paused,'closed dashboard never restarts');
  console.log('PASS startup capability recovery, surface resource reupload, draw-error recovery, retry limits and focus/close gates');
 }finally{view.frame=frame;if(!h.closed)h.close();c.close();await g.close();}
}
(async()=>{
 const g=new FakeGraphics('/tmp/hud-present-'+process.pid),log={warn(){},info(){}},c=new SettingsControl({log});
 g.onScreen=false;g.front=true;
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
  assert.equal(modes[modes.length-1],false,'graphics failure reported without navigation');
  assert(/visible/.test(h.failureReason),'failure identifies foreground gating without bypassing it');
  const attempts=g.count(1);h._checkPresentation(Date.now()+10000);await wait(80);
  assert.equal(g.count(1),attempts,'no automatic reconnect loop after bounded recovery');
  console.log('PASS hidden picture despite frame acknowledgements: one reconnect, then recoverable error; old socket events ignored');

  g.onScreen=true;g.front=true;h.retry();
  await until(()=>h.lastAck&&h.presentation.onScreen);
  assert(h.active&&!h.presentationFailed);assert.equal(h.recoveryAttempts,0);
  h.hostFocus(false);const paused=g.count(1);h._checkPresentation(Date.now()+10000);
  assert.equal(g.count(1),paused,'popup/hidden host must not reconnect or seize focus');
  h.hostVisible(true);await until(()=>h.lastAck);
  g.front=false;h.presentation={front:false,onScreen:false};const beforeGate=g.count(1);h._checkPresentation(h.presentationSince+10000);assert.equal(g.count(1),beforeGate,'foreground delay is not a renderer fault');assert(!h.presentationFailed);g.front=true;
  console.log('PASS manual retry restores graphics; hidden or unfocused app leaves BMW alone');

  g.send(103,Buffer.from('surface draw failed'));
  await until(()=>h.presentationFailed);
  assert(!h.active&&/surface draw failed/.test(h.failureReason));
  assert.equal(modes[modes.length-1],false);
  console.log('PASS renderer error produces a recoverable graphical error');
 }finally{h.close();c.close();await g.close();}
})().then(startupRecovery).catch(e=>{console.error(e.stack);process.exitCode=1;});
