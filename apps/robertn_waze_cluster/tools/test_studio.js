// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const assert=require('assert'),fs=require('fs'),os=require('os'),path=require('path'),EventEmitter=require('events');
const M=require('../src/studio_model.js'),V=require('../src/studio_view.js'),{StudioScreen}=require('../src/studio_screen.js'),{StudioClient}=require('../src/studio_client.js');
const {StudioService}=require('../../../native/cluster-studio/service.js');
const {Canvas}=require('../src/kit_canvas.js'),D=require('../src/studio_draw.js');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn){for(let i=0;i<100;i++){if(fn())return;await wait(10);}throw Error('timeout');}
(async()=>{
 const all=[];for(let i=0;i<100;i++){const d=M.validate(M.preset(i));all.push(JSON.stringify(d));const cv=new Canvas(480,180);D.draw(cv,d,{x:0,y:0,w:480,h:180},{now:new Date(0)});assert(cv.d.some(v=>v>0));}assert.equal(new Set(all).size,100);
 const client=new EventEmitter();client.status=null;client.connect=()=>{};client.close=()=>{};
 const s=new StudioScreen(()=>{},{client});s.page='edit';const w=s.widget(),x=V.BOX.x+(w.x+w.w/2)*V.BOX.w,y=V.BOX.y+(w.y+w.h/2)*V.BOX.h,oldx=w.x;
 s.touch('down',x,y);s.touch('move',x+100,y+30);s.touch('up',x+100,y+30);assert(s.widget().x>oldx);assert.equal(s.history.length,1);M.validate(s.design);s.press('undo');assert.equal(s.widget().x,oldx);
 s.touch('down',x,y);s.touch('move',-9999,9999);s.touch('up',-9999,9999);M.validate(s.design);assert.equal(s.widget().x,0);
 for(let i=0;i<100;i++)s.press('larger');M.validate(s.design);
 client.status={design:M.preset(99),slots:[null,null,null,null,null],parked:false};client.emit('change');assert.notEqual(s.design.preset,99,'late helper cannot overwrite draft');
 for(const page of ['gallery','edit','style','intro','library','output']){s.page=page;const f=s.frame(0,1);assert(f.items.length<=24);for(let i=0;i<f.items.length;i++){const a=f.items[i];assert(a.x>=0&&a.y>=0&&a.x+a.w<=1600&&a.y+a.h<535);for(let j=i+1;j<f.items.length;j++){const b=f.items[j];assert(!(a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y),'overlapping controls');}}}
 assert(!V.items(s).find(a=>a.id==='preview').enabled);s.close();console.log('ok 100 valid unique presets, no-data rendering, drag/clamp/undo/resize, draft preservation and every page bounds');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'studio-app-')),socket=path.join(dir,'ctl');
 const engine={cr:{ready:true},state:'Waiting',configure(){},preview(){},stopPreview(){}};const telemetry={parked:()=>true,snapshot:()=>({})};
 const service=new StudioService({file:path.join(dir,'studio.json'),engine,telemetry});await service.listen(socket);const c=new StudioClient(socket);c.connect();await until(()=>c.status);
 await c.send('apply',{design:M.preset(11)});assert(c.status.enabled);assert.equal(c.status.design.preset,11);await c.send('slot',{slot:3,design:M.preset(23)});assert.equal(c.status.slots[3].preset,23);
 await assert.rejects(c.send('slot',{slot:99,design:M.preset(0)}),/Invalid slot/);assert.equal(c.status.slots[3].preset,23);await c.send('off');assert(!c.status.enabled);
 service.close();await until(()=>!c.status);await assert.rejects(c.send('save',{design:M.preset(0)}),/Install Cluster Studio/);c.close();fs.rmSync(dir,{recursive:true,force:true});
 console.log('ok real Unix socket apply/save/slot acknowledgments, rejection, disconnect and offline behavior');
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
