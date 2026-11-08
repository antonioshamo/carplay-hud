// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),vm=require('vm'),EventEmitter=require('events');
const {SettingsControl}=require('../src/settings_control');
// Deliver coalesced socket messages deterministically, including a screen
// closing from a status callback before the rest of that packet is parsed.
function clientModule(file){
 const sockets=[],timers=new Map();let timerId=0;
 const net={connect(){const s=new EventEmitter();s.setEncoding=()=>{};s.end=s.destroy=()=>{};s.write=()=>{};sockets.push(s);return s;}};
 const module={exports:{}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src',file),'utf8'),{
  module,exports:module.exports,require:n=>n==='net'?net:require(n),Buffer,process,
  setTimeout:fn=>{timers.set(++timerId,fn);return timerId;},clearTimeout:id=>timers.delete(id)
 },{filename:file});
 return {exports:module.exports,sockets,timers};
}
const packet=messages=>messages.map(m=>JSON.stringify(m)+'\n').join('');
const tests=[];function test(name,run){tests.push({name,run});}
test('Studio ignores remaining packet messages after settings close',()=>{
 const r=clientModule('studio_client.js'),c=new r.exports.StudioClient();c.connect();
 c.once('change',()=>c.close());r.sockets[0].emit('data',packet([{ev:'status',enabled:true},{ev:'status',enabled:true}]));
 assert.strictEqual(c.status,null,'closed settings must not regain stale helper status');
 assert.strictEqual(c.socket,null);
});
test('Studio ignores old connection data after reopening',()=>{
 const r=clientModule('studio_client.js'),c=new r.exports.StudioClient();c.connect();const old=r.sockets[0];
 c.once('change',()=>{c.close();c.connect();});
 old.emit('data',packet([{ev:'status',design:'first'},{ev:'status',design:'old'}]));
 assert.strictEqual(c.status,null,'new connection must await its own status');
 const current=r.sockets[1];current.emit('data',packet([{ev:'status',design:'new'}]));
 old.emit('data',packet([{ev:'status',design:'late'}]));old.emit('close');
 assert.strictEqual(c.status.design,'new');assert.strictEqual(c.socket,current);c.close();
});
test('Map control stops parsing a packet when its session closes',()=>{
 const r=clientModule('waze_cluster_control.js'),seen=[];
 const c=new r.exports.LineSocket({onMessage:m=>{seen.push(m.state);c.close();}});c.open();
 r.sockets[0].emit('data',packet([{ev:'status',state:'showing'},{ev:'status',state:'idle'}]));
 assert.deepStrictEqual(seen,['showing'],'late status cannot repopulate cleared map state');
 assert.strictEqual(r.timers.size,0);
});
test('Pending startup and display saves exclude competing settings',()=>{
 const c=new SettingsControl({ackMs:1000,pendingPath:'/nonexistent/hud-session-test'}),sent=[];
 c.render.link=c.patch.link='up';c.render.send=m=>sent.push(m);c.patch.send=m=>sent.push(m);
 c.renderStatus={state:'showing',target:'hud',hud_width_pct:60,hud_x:0,hud_y:0};
 c.patchStatus={state:'patched',startup_trial:true,restore_defaults:true};
 try{
  assert(c.setStartup('dashboard'));assert.strictEqual(c.setDisplay('map'),false,'target cannot change during startup save');
  assert.strictEqual(c.canDisable(),false,'cannot revert while startup is saving');
  assert.strictEqual(c.disableMap(),false,'direct actions obey the same transaction guard');
  c._onPatch({ev:'startup-mode-reply',ok:true,mode:'dashboard'});
  assert(c.canDisable());assert(c.setHudSize(65));
  assert.strictEqual(c.canDisable(),false,'cannot revert while live/save acknowledgements are outstanding');
  c.patchStatus.state='original';assert.strictEqual(c.canEnable(),false);assert.strictEqual(c.enableMap(),false);
  c._onPatch({ev:'hud-size-reply',ok:true,hud_width_pct:65});
  assert.strictEqual(c.canEnable(),false,'save reply alone does not end the live transaction');
  c._onRender({ev:'status',state:'showing',target:'hud',hud_width_pct:65,hud_x:0,hud_y:0});
  assert(c.canEnable());assert(c.enableMap());assert.strictEqual(sent.filter(m=>m.cmd==='apply').length,1);
 }finally{c.close();}
});
let failed=0;for(const t of tests){try{t.run();console.log('ok '+t.name);}catch(e){failed++;console.error('FAIL '+t.name+'\n'+e.stack);}}
if(failed)process.exitCode=1;
