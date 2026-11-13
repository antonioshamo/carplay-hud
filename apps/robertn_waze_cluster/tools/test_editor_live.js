// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const assert=require('assert'),EventEmitter=require('events'),M=require('../src/studio_model'),{StudioScreen}=require('../src/studio_screen');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
class Client extends EventEmitter{constructor(){super();this.calls=[];this.status={generation:'source-cluster-v2',design:M.defaultDesign(),slots:[null,null,null,null,null],enabled:true,renderer:true,parked:false,output:'panel'};this.statusAt=Date.now();}connect(){this.emit('change');}close(){}send(cmd,args){this.calls.push({cmd,args});return Promise.resolve();}}
async function main(){const c=new Client(),s=new StudioScreen(()=>{},{client:c});try{
 s.open();for(let i=0;i<M.THEMES.length;i++)s.press('theme:'+M.THEMES[i].id);await wait(300);assert.equal(c.calls.length,1);assert.equal(c.calls[0].args.design.theme,'freedom');assert(!s.dirty,'Drive live save acknowledged');
 s.press('page:edit');s.press('widget:2');s.press('metric:torque');assert.equal(s.page,'edit');assert.equal(s.design.widgets[2],'torque');s.press('undo');assert.equal(s.design.widgets[2],'coolant');s.press('redo');assert.equal(s.design.widgets[2],'torque');await wait(300);
 s.press('live-toggle');s.press('temperature');await wait(300);const n=c.calls.length;assert(s.dirty);s.press('apply');await wait(1);assert.equal(c.calls.length,n+1);assert(!s.dirty);
 s.press('page:style');assert(s.back());assert.equal(s.page,'edit');assert(s.back());assert.equal(s.page,'gallery');assert(!s.back());
 c.statusAt=Date.now()-5000;s.press('theme:m');s.liveChanges=true;s.scheduleLive();await wait(300);assert(s.dirty);assert.equal(c.calls.length,n+1,'no writes using stale helper state');
 c.statusAt=Date.now();s.scheduleLive();s.close();await wait(300);assert.equal(c.calls.length,n+1,'close cancels deferred save');
 }finally{s.close();}console.log('ok coalesced live changes, no Park requirement for editing, complete widget picker, undo/redo, Apply, Back stack, stale helper and close cancellation');}
main().catch(e=>{console.error(e.stack);process.exitCode=1;});
