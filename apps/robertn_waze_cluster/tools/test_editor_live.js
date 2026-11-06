// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const assert=require('assert'),EventEmitter=require('events');
const M=require('../src/studio_model.js'),V=require('../src/studio_view.js'),{StudioScreen}=require('../src/studio_screen.js');
const {Canvas}=require('../src/kit_canvas.js'),D=require('../src/studio_draw.js');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
class Client extends EventEmitter {
 constructor(){super();this.calls=[];this.pending=null;this.status={design:M.preset(11),slots:[null,null,null,null,null],enabled:true,renderer:true,parked:true,output:'parked-panel',panel:true,panelClearance:'native-gear-v1',canPreview:true};this.statusAt=Date.now();}
 connect(){this.emit('change');}close(){}
 send(cmd,extra){assert(!this.pending,'commands must never overlap');const call={cmd,extra:M.clone(extra||{})};this.calls.push(call);return new Promise((resolve,reject)=>{this.pending={resolve,reject,call};});}
 ack(){const p=this.pending;this.pending=null;if(p.call.cmd==='slot')this.status.slots[p.call.extra.slot]=p.call.extra.design;else if(p.call.extra.design)this.status.design=p.call.extra.design;this.statusAt=Date.now();p.resolve(this.status);this.emit('change');}
 fail(){const p=this.pending;this.pending=null;p.reject(Error('Disconnected'));this.emit('change');}
}
(async()=>{
 const c=new Client(),s=new StudioScreen(()=>{},{client:c});s.open();assert(s.liveChanges);assert.equal(s.design.preset,11);
 s.press('page:edit');s.press('right');s.press('down');s.press('larger');await wait(190);
 assert.equal(c.calls.length,1,'rapid edits coalesce');assert.equal(c.calls[0].cmd,'save','live editing preserves output and enabled state');assert.deepEqual(c.calls[0].extra.design,s.design);
 s.press('left');const latest=M.clone(s.design);c.ack();await wait(0);assert(s.dirty,'old acknowledgement cannot mark a newer draft saved');assert.deepEqual(s.design,latest,'old status cannot overwrite a newer edit');await wait(330);assert.equal(c.calls.length,2);assert.deepEqual(c.calls[1].extra.design,latest);c.ack();await wait(0);assert(!s.dirty);
 s.press('live-toggle');s.press('right');await wait(340);assert.equal(c.calls.length,2,'draft mode sends nothing');assert(s.dirty);s.press('apply');assert.equal(c.calls[2].cmd,'apply');c.ack();await wait(0);assert(!s.dirty);
 s.press('live-toggle');c.status.parked=false;s.press('up');await wait(330);assert.equal(c.calls.length,3,'moving or unknown Park blocks live changes');c.status.parked=true;c.statusAt=Date.now()-2500;c.emit('change');await wait(190);assert.equal(c.calls.length,3,'stale Park cannot enable live editing');
 c.statusAt=Date.now();c.emit('change');await wait(190);assert.equal(c.calls.length,4);c.fail();await wait(340);assert.equal(c.calls.length,4,'failure does not create a save storm');assert(s.dirty);assert(/Not saved/.test(s.notice));
 s.press('down');await wait(190);assert.equal(c.calls.length,5,'new edit retries');c.ack();await wait(0);
 c.status.enabled=false;s.press('right');await wait(340);assert.equal(c.calls.length,5,'editing never silently enables a disabled display');c.status.enabled=true;c.statusAt=Date.now();c.emit('change');await wait(190);c.ack();await wait(0);
 s.page='edit';s.selected='speed';s.liveChanges=true;const w=s.widget(),x=V.BOX.x+(w.x+w.w/2)*V.BOX.w,y=V.BOX.y+(w.y+w.h/2)*V.BOX.h;
 s.touch('down',x,y);s.touch('move',x+10,y);await wait(330);c.ack();await wait(0);assert(!s.dirty);s.touch('move',x+30,y);s.touch('up',x+30,y);assert(s.dirty,'continuing a drag after an acknowledgement creates another revision');await wait(330);c.ack();await wait(0);assert(!s.dirty);
 s.press('live-toggle');s.press('left');const saved=M.clone(c.status.design);s.press('save-slot:1');c.ack();await wait(0);assert(s.dirty,'slot save does not claim the active draft was applied');assert.deepEqual(c.status.design,saved);
 s.nav=[];s.page='gallery';s.press('edit');s.press('select');s.press('widget:rpm');assert.equal(s.page,'edit');s.press('navigate-back');assert.equal(s.page,'widgets');s.press('navigate-back');assert.equal(s.page,'edit');s.press('navigate-back');assert.equal(s.page,'gallery');assert.equal(s.press('navigate-back'),false,'root Back leaves Studio');
 s.press('page:style');s.press('gauge');s.press('pick-gauge:needle');assert.equal(s.design.gauge,'needle');s.press('page:edit');s.press('widget-gauge');s.press('pick-gauge:dots');assert.equal(s.widget().gauge,'dots');
 s.page='output';c.statusAt=Date.now();c.status.canPreview=false;c.status.canSelectPanel=true;c.status.canRetry=true;c.status.displayVisible=false;c.status.state='Full cluster waiting for HUD release';
 assert(V.items(s).find(b=>b.id==='apply-panel').enabled,'saved output can be selected while HUD blocks a temporary test');
 assert(!V.items(s).find(b=>b.id==='preview').enabled,'blocked test stays blocked');
 s.dirty=false;assert(/waiting for HUD/.test(s.editStatus()),'prepared panel cannot claim to be shown');
 s.liveChanges=false;s.press('right');const draft=M.clone(s.design),stored=M.clone(c.status.design);
 s.press('retry');assert.equal(c.pending.call.cmd,'retry');assert.deepEqual(c.pending.call.extra,{},'retry cannot overwrite saved design with an unsaved draft');c.ack();await wait(0);
 assert.deepEqual(c.status.design,stored);assert.deepEqual(s.design,draft);assert(s.dirty);
 c.statusAt=Date.now()-2500;assert(!V.items(s).find(b=>b.id==='retry').enabled);assert(!V.items(s).find(b=>b.id==='apply-panel').enabled);c.statusAt=Date.now();
 c.status.canSelectPanel=false;assert(!V.items(s).find(b=>b.id==='apply-panel').enabled);c.status.canSelectPanel=true;
 // Add restores a real widget type, selects/unlocks it for immediate dragging,
 // and preserves live-save/undo semantics rather than resetting the layout.
 s.page='edit';s.design=M.idrivePreset(2);s.liveChanges=false;
 assert(V.items(s).some(b=>b.id==='page:add'&&b.label==='Add widget'));
 for(const type of M.TYPES){
  const w=s.design.widgets.find(w=>w.type===type);w.on=false;w.locked=true;
  const before=M.clone(s.design);s.press('page:add');assert(V.items(s).find(b=>b.id==='add-widget:'+type).enabled);
  s.press('add-widget:'+type);assert.equal(s.page,'edit');assert.equal(s.selected,type);assert(s.widget().on);assert(!s.widget().locked);assert.equal(s.design.widgets.length,M.TYPES.length);
  const added=M.clone(s.design);s.press('undo');assert.deepEqual(s.design,before);s.press('redo');assert.deepEqual(s.design,added);
  s.press('page:add');assert(!V.items(s).find(b=>b.id==='add-widget:'+type).enabled);s.press('add-widget:'+type);assert.deepEqual(s.design,added,'already added cannot duplicate a widget');s.press('navigate-back');
 }
 s.press('add-widget:invalid');M.validate(s.design);
 s.selected='coolant';s.press('toggle');s.press('page:add');s.liveChanges=true;c.statusAt=Date.now();s.press('add-widget:coolant');
 const n=c.calls.length;await wait(340);assert.equal(c.calls.length,n+1,'new widget is live-saved');assert(c.calls[n].extra.design.widgets.find(w=>w.type==='coolant').on);c.ack();await wait(0);assert(!s.dirty);s.liveChanges=false;
 const pages=['gallery','idrive','layouts','themes','gauges','widgets','add','edit','properties','style','intro','library','phone','output','assistance','features','media','tools'];
 for(const page of pages){s.page=page;const items=s.frame(0,1).items;assert(items.length<=24,page+' fits installed RHMI proxy contract');for(const id of ['navigate-back','apply','live-toggle'])assert(items.some(b=>b.id===id),page+' has '+id);const seen=new Set();items.forEach((a,i)=>{assert(!seen.has(a.id),page+' unique button '+a.id);seen.add(a.id);assert(a.x>=0&&a.y>=0&&a.x+a.w<=1600&&a.y+a.h<535);items.slice(i+1).forEach(b=>assert(!(a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y),page+' overlapping '+a.id+' '+b.id));});}
 for(const style of M.STYLES){const d=M.preset(11);d.gauge=style[0];M.validate(d);const cv=new Canvas(480,180);D.draw(cv,d,{x:0,y:0,w:480,h:180},s.previewData());assert(cv.d.some(v=>v));}
 s.liveChanges=true;s.dirty=true;c.statusAt=Date.now();s.scheduleLive();const before=c.calls.length;s.close();await wait(350);assert.equal(c.calls.length,before,'closing cancels queued writes');
 console.log('ok live coalescing, sequential acknowledgements, late replies, draft/Apply, Park/freshness, disconnect retry, slots, Back history, Add widget live-save/undo, all 18 pages and 12 real dial styles');
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
