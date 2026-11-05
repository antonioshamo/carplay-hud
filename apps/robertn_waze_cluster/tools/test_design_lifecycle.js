// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const assert=require('assert');
const root=require('path').resolve(__dirname,'..');
const {HudScreen}=require(root+'/src/hud_screen.js'),{SettingsControl}=require(root+'/src/settings_control.js');
const {RenderClient}=require(root+'/src/mgu_render_client.js'),{FakeGraphics}=require(root+'/tools/fake_graphics.js'),kit=require(root+'/src/kit_record.js');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function until(f){for(let i=0;i<250;i++){if(f())return;await wait(10);}throw Error('condition timed out');}
const g=new FakeGraphics('/tmp/hud-lifecycle-'+process.pid,23),log={warn(){},info(){}},c=new SettingsControl({log});
const client=new RenderClient('robertn_waze_cluster',log,{kit,socket:g.path,mode:'layer'});
const h=new HudScreen({control:c,log,proxies(){},classic(){}},{client});
(async()=>{try{
 await g.listen();h.connect();await until(()=>h.ready);h.hostVisible(true);await until(()=>g.count(7)>0&&!client.waiting);
 g.ack=false;const initial=g.count(7);h.render();await until(()=>client.waiting&&g.count(7)>initial);const frames=g.count(7);h.hostFocus(false);h.hostVisible(true);await wait(80);
 assert(g.count(7)>frames,'reopening must submit a fresh frame even when the hidden frame was never acknowledged');
 console.log('PASS reopen after an unacknowledged hidden frame');
 const n=g.count(7);await until(()=>g.count(7)>n);assert(g.count(7)>n,'unacknowledged frames must not block the keepalive');
 const cap=g.count(7);await wait(120);assert(g.count(7)<=cap+1,'a missing acknowledgment must not cause frame flooding');
 console.log('PASS bounded keepalive when the compositor does not acknowledge');
 g.ack=true;client.waiting=false;client.emit('closed');assert(!h.active);await wait(850);assert(h.active,'a dismissed layer must resume if the same host is still visible and focused');
 client.emit('closed');h.hostVisible(false);await wait(850);assert(!h.active,'leaving the host must prevent delayed redisplay');
 h.hostVisible(true);client.emit('closed');h.hostFocus(false);await wait(850);assert(!h.active,'a popup must prevent delayed redisplay');
 console.log('PASS temporary dismissal recovery respects host visibility and popup focus');
 }finally{h.close();c.close();await g.close();}})().catch(e=>{console.error(e.stack);process.exitCode=1;});
