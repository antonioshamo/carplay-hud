// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path');
const {SettingsControl}=require('../src/settings_control.js');
const {HudScreen,PROXIES}=require('../src/hud_screen.js');
const {RenderClient}=require('../src/mgu_render_client.js');
const kit=require('../src/kit_record.js'),view=require('../src/hud_view.js');
const {FakeGraphics}=require('./fake_graphics.js');
const {FakeRender,FakePatch}=require('./fakes.js');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn){for(let i=0;i<250;i++){if(fn())return;await wait(10);}throw Error('condition timed out');}
const g=new FakeGraphics(`/tmp/hud-g-${process.pid}`,23),r=new FakeRender(`/tmp/hud-dr-${process.pid}`),p=new FakePatch(`/tmp/hud-dp-${process.pid}`);
const log={warn:()=>{},info:()=>{}},c=new SettingsControl({renderPath:r.path,patchPath:p.path,pendingPath:'/nonexistent',ackMs:250,retryMs:20});
const client=new RenderClient('robertn_waze_cluster',log,{kit,socket:g.path,mode:'layer'});
let proxyItems=[],proxyUpdates=0,classic=0,modes=[];
const h=new HudScreen({control:c,log,proxies:items=>{proxyItems=items;proxyUpdates++;},classic:()=>classic++},{client});
h.on('mode',on=>modes.push(on));c.on('change',()=>h.render());
const press=id=>{const i=h.items.findIndex(b=>b.id===id);assert(i>=0,id);assert(h.press(i),id);};
async function settled(){await until(()=>!client.waiting);}
async function tap(id){await settled();const b=h.items.find(x=>x.id===id);assert(b,id);g.touch(1,b.x+b.w/2,b.y+b.h/2);g.touch(3,b.x+b.w/2,b.y+b.h/2);await wait(25);}
p.on('command',m=>{const ev={target:'target-reply','hud-size':'hud-size-reply','hud-pos':'hud-pos-reply','hud-style':'hud-style-reply'}[m.cmd];if(ev)p._broadcast(Object.assign({},m,{ev,ok:true}));});
(async()=>{
 try{
  await Promise.all([g.listen(),r.listen(),p.listen()]);p.announce('patched','high',null);r.stream(true);await until(()=>r.state==='showing');c.open();
  await until(()=>c.canChangeDisplay());h.connect();await until(()=>h.ready);assert(!h.active);assert.equal(g.count(7),0,'no drawing in the background');
  assert(g.last(1).payload.toString().startsWith('robertn_waze_cluster\0proto=mgu-render/1'));
  h.hostVisible(true);await until(()=>g.count(7)>0);await settled();
  assert.equal(client.maxFps,60,'preview requests 60 fps');assert(h.active);assert.equal(g.last(3).payload.readUInt32LE(),1);assert.equal(g.last(0x4d520002).payload.readUInt32LE(),1);
  const pl=g.last(2).payload;assert.deepEqual([0,4,8,12].map(i=>pl.readInt32LE(i)),[160,100,1600,580]);
  assert(g.count(4)>0,'actual font atlases uploaded');assert(proxyItems.some(x=>x.id==='hud'));
  const proxyBefore=proxyUpdates;h.render();await settled();h.render();await settled();assert.equal(proxyUpdates,proxyBefore,'animation frames do not rewrite unchanged BMW proxies');
  console.log('ok real renderer handshake, placement, atlas upload, frame and foreground input claims');
  await tap('hud');await until(()=>c.displayTarget()==='hud'&&!c._busy());assert.equal(c.settingsNotice(),'Applied and saved');
  assert(p.received.some(m=>m.cmd==='target'&&m.target==='hud'));
  await tap('nav:layout');assert.equal(h.page,'layout');await tap('size:75');await until(()=>c.hudWidth()===75&&!c._busy());
  await tap('right');await until(()=>c.hudOffset()[0]===10&&!c._busy());await tap('step');assert.equal(c.moveStep,40);
  await tap('up');await until(()=>c.hudOffset()[1]===-40&&!c._busy());await tap('center');await until(()=>c.hudOffset().every(x=>x===0)&&!c._busy());
  console.log('ok graphic touch controls change and confirm HUD target, width, movement and saved settings');
  const size=c.hudWidth(),b=h.items.find(x=>x.id==='larger');g.touch(1,b.x+10,b.y+10);g.touch(2,b.x+80,b.y+10);g.touch(3,b.x+80,b.y+10);await wait(30);assert.equal(c.hudWidth(),size,'drag cancels tap');
  h.hostFocus(false);await until(()=>g.last(3).payload.readUInt32LE()===0);assert(!h.active);assert.equal(g.last(9).payload.readUInt32LE(),0);assert.equal(g.last(0x4d520002).payload.readUInt32LE(),0);
  g.touch(1,b.x+10,b.y+10);g.touch(3,b.x+10,b.y+10);await wait(20);assert.equal(c.hudWidth(),size,'hidden controls cannot act');
  h.hostVisible(true);assert(h.active,'returning to host resets focus');await settled();
  console.log('ok touch-drag cancellation; popup hides graphics and releases touch/dial; hidden input ignored');
  const beforeCloseModes=modes.length;client.emit('closed');assert(h.ready&&!h.active,'foreground exit keeps graphics capability');assert.equal(modes.length,beforeCloseModes,'exit does not remap the entry to classic');h.hostVisible(true);await settled();assert(h.active,'modern host reopens after a foreground exit');
  h.focus=0;g.ccu(1,100,1);await wait(20);assert.equal(h.focus,0,'first controller sample is a baseline');
  g.ccu(2,102,0);await until(()=>h.focus===2);g.ccu(3,102,1);await until(()=>h.page==='appearance');
  assert.equal(h.focus,2);g.ccu(4,10000,0);await wait(20);assert.equal(h.focus,2,'reconnect jumps do not change selection');
  const before=p.received.length;assert.equal(h.press(h.items.findIndex(x=>x.id==='clear')),false);assert.equal(p.received.length,before,'unsupported settings stay inert');
  h.info.controller=false;h.proxyFocus(4,true);assert.equal(h.focus,4);h.proxyPress(4);await until(()=>h.page==='support');
  await tap('nav:overview');await tap('open-studio');assert.equal(h.page,'studio');
  await tap('page:edit');assert.equal(h.studio.page,'edit');await settled();
  const sw=h.studio.widget(),sx=274+(sw.x+sw.w/2)*976,sy=153+(sw.y+sw.h/2)*366,sold=sw.x;
  g.touch(1,sx,sy);g.touch(2,sx+60,sy+10);g.touch(3,sx+60,sy+10);await wait(30);assert(h.studio.widget().x>sold,'real touch wire drags Studio widget');
  h.studio.page='media';h.studio.client.status={media:{target:'center',playing:true,active:true,generation:1,rect:{x:0,y:0,w:1,h:1}},slots:[]};h.studio.client.statusAt=Date.now();h.render();await settled();assert(g.count(13)>0,'media binds a real VIDEO shared-file source');const videoCount=g.count(13);h.studio.client.status.media.generation=2;h.render();await settled();assert(g.count(13)>videoCount&&g.count(14)>0,'reopened shared file rebinds after pause');h.studio.videoFull=true;h.render();await settled();assert.equal(h.items.length,2,'movie view keeps exit and stop controls');h.studio.client.statusAt=Date.now()-3000;h.render();await settled();assert(!h.videoBound,'stale helper status removes center video');h.studio.page='edit';h.studio.client.status=null;h.render();await settled();
  h.hostFocus(false);const hiddenX=h.studio.widget().x;g.touch(1,sx,sy);g.touch(2,sx+120,sy);g.touch(3,sx+120,sy);await wait(20);assert.equal(h.studio.widget().x,hiddenX);
  h.hostVisible(true);await settled();await tap('exit');assert.equal(h.page,'overview');await wait(310);await tap('nav:support');
  await tap('classic');assert.equal(classic,1);
  console.log('ok rotary selection/press, baseline and jump handling, native-proxy fallback, disabled actions and Classic');
  const m=view.model(c);
  for(const page of ['overview','layout','appearance','startup','support','details']){
   for(const sample of [m,Object.assign({},m,{target:'hud',canRestart:true,startup:true,width:85,offset:[400,-400]}),Object.assign({},m,{target:null,state:'offline',busy:true})]){
    const f=view.frame(sample,page,0,0,.5),items=f.items;assert(items.length<=PROXIES);
    for(let i=0;i<items.length;i++){
     const a=items[i];assert(a.x>=0&&a.y>=0&&a.x+a.w<=view.W&&a.y+a.h<=535);
     for(let j=i+1;j<items.length;j++){const b=items[j];assert(!(a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y),'overlapping controls');}
    }
   }
  }
  console.log('ok every page fits the canvas, has nonoverlapping hit areas and fits the native proxy count');
  await g.close();await until(()=>!h.ready);assert(!h.active);assert.equal(modes.slice(-1)[0],false);
  h._ready({appArea:{x:0,y:0,w:1600,h:580},modes:['layer'],frontGate:false});assert(!h.ready,'legacy renderer cannot overlay other apps');
  console.log('ok renderer loss and missing foreground gate fall back without an active overlay');
  // The deployed linker uses flat exact ./filename.js keys. Catch imports that work
  // on a laptop but cannot link on the unit, plus omitted licenses/font resources.
  const base=path.join(__dirname,'..'),manifest=require('../mgu-app.json'),names=new Set(manifest.modules.map(f=>'./'+path.basename(f)));
  for(const file of manifest.modules){const source=fs.readFileSync(path.join(base,file),'utf8');for(const m of source.matchAll(/require\(['"](\.[^'"]+)['"]\)/g))assert(names.has(m[1]),file+' '+m[1]);}
  for(const name of ['LICENSE-kit.txt','LICENSE-Inter.txt'])assert(fs.existsSync(path.join(base,manifest.tree,'licenses',name)));
  assert.equal(require('../release.json').requires['mgu-render'],'0.6.11');
  console.log('ok complete source manifest, unit-linkable module imports, licenses and graphics dependency');
 }finally{h.close();c.close();await Promise.all([g.close(),r.close(),p.close()]);}
})().then(()=>console.log('all design checks passed'),e=>{console.error(e.stack);process.exitCode=1;});
