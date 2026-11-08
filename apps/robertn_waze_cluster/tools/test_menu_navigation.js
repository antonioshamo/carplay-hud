// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const assert=require('assert'),kit=require('../src/kit_record.js'),M=require('../src/studio_model.js'),V=require('../src/studio_view.js'),H=require('../src/hud_view.js'),{StudioScreen}=require('../src/studio_screen.js');
const s=new StudioScreen(()=>{}),original=kit.Recorder.prototype.text;
let rendered=[];
kit.Recorder.prototype.text=function(value){rendered.push(String(value));return original.apply(this,arguments);};
function inspect(){
 rendered=[];const f=s.frame(3,1),buttons=f.items;
 assert(buttons.length<=24,s.page+' BMW proxy limit');assert.equal(new Set(buttons.map(b=>b.id)).size,buttons.length);
 for(const id of ['navigate-back','live-toggle','apply'])assert(buttons.some(b=>b.id===id),s.page+' '+id);
 assert(rendered.includes(V.TITLES[s.page]),s.page+' clear page title');
 for(let i=0;i<buttons.length;i++){
  const a=buttons[i];assert(a.x>=0&&a.y>=0&&a.x+a.w<=1600&&a.y+a.h<=(a.chrome==='dock'?574:535),s.page+' bounds '+a.id);
  assert(rendered.includes(a.label),s.page+' clipped button: '+a.label);
  for(let j=i+1;j<buttons.length;j++){const b=buttons[j];assert(!(a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y),s.page+' overlapping '+a.id+' / '+b.id);}
 }
}
try{
 // Offline, connected, busy and every design all use the actual rendered labels.
 for(const status of [null,{slots:[],parked:true,enabled:true,renderer:true,design:s.design}]){
  s.client.status=status;s.client.statusAt=Date.now();
  for(const page of Object.keys(V.TITLES)){s.page=page;inspect();}
 }
 s.client.status=null;
 for(let n=0;n<103;n++){s.design=n<100?M.preset(n):M.idrivePreset(n-100);for(const page of ['gallery','style','properties']){s.page=page;inspect();}}
 const overlap=(a,b)=>Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)>1e-8&&Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)>1e-8;
 for(let n=0;n<103;n++){
  const d=n<100?M.preset(n):M.idrivePreset(n-100),widgets=d.widgets.filter(w=>w.on);
  for(let i=0;i<widgets.length;i++){
   const w=widgets[i];assert(!overlap(w,{x:1380/1920,y:660/720,w:140/1920,h:60/720}),'template '+n+' '+w.type+' covers native gear opening');
   if(!['speed','rpm'].includes(w.type))assert(!overlap(w,{x:.35,y:0,w:.30,h:.17}),'template '+n+' '+w.type+' under top cutout');
   if(n<100)for(const other of widgets.slice(i+1))assert(!overlap(w,other),'template '+n+' overlaps '+w.type+'/'+other.type);
  }
 }
 for(const type of M.TYPES){s.selected=type;s.page='edit';inspect();}
 // Every category can be traversed in both directions without wraparound or
 // unreachable items. Selecting a widget opens the correct page of its group.
 const visited=new Set();
 for(let group=0;group<M.GROUPS.length;group++){
  s.page='add';s.press('widget-group:'+group);const count=Math.ceil(M.GROUPS[group][1].length/V.WIDGETS_PER_PAGE);
  s.press('widget-prev');assert.equal(s.widgetPage,0);
  for(let page=0;page<count;page++){
   assert.equal(s.widgetPage,page);inspect();
   for(const b of V.items(s).filter(b=>b.id.startsWith('add-widget:')))visited.add(b.id.slice(11));
   assert.equal(V.items(s).find(b=>b.id==='widget-next').enabled,page<count-1);s.press('widget-next');
  }
  assert.equal(s.widgetPage,count-1);for(let page=count-1;page>0;page--)s.press('widget-prev');assert.equal(s.widgetPage,0);
 }
 assert.deepEqual(Array.from(visited).sort(),M.TYPES.slice().sort());
 for(const type of M.TYPES){s.selected=type;s.page='edit';s.press('select');assert(V.items(s).some(b=>b.id==='widget:'+type),type+' selected widget visible in chooser');}
 for(const entry of ['gallery','intro','library'])for(let repeat=0;repeat<10;repeat++){
  s.entryPage=entry;s.page=entry;s.nav=[];s.press('page:edit');s.press('page:add');s.press('navigate-back');assert.equal(s.page,'edit');s.press('navigate-back');assert.equal(s.page,entry);assert.equal(s.press('navigate-back'),false,'Back returns to cockpit without exiting the app');
 }
 const m={target:'hud',state:'showing',offset:[0,0],width:60,logs:[],captureButton:'Capture logs (5 min)',canDisplay:true,canSize:true,canMove:true,canStyle:true,canCorners:true};
 for(const page of H.tabs.map(t=>t[0]).concat(['details'])){rendered=[];const f=H.frame(m,page,0,0,1);for(const b of f.items)if(!['up','left','right','down','center'].includes(b.id))assert(rendered.includes(b.label),page+' clipped HUD label: '+b.label);}
 console.log('ok all menu pages, 103 template labels, 37 widget names, bidirectional paging, 30 repeated Back journeys and actual rendered button text');
}finally{kit.Recorder.prototype.text=original;s.close();}
