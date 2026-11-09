// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const assert=require('assert'),fs=require('fs'),os=require('os'),path=require('path'),EventEmitter=require('events');
const M=require('../src/studio_model'),D=require('../src/studio_draw'),V=require('../src/studio_view'),kit=require('../src/kit_record');
const {Canvas}=require('../src/kit_canvas'),{StudioScreen}=require('../src/studio_screen');
const {StudioService,save}=require('../../../native/cluster-studio/service'),{FrameCache}=require('../../../native/cluster-studio/frame_cache'),Panel=require('../../../native/cluster-studio/panel_composition');
const d=M.defaultDesign(),values={now:new Date(2026,10,8,10,28),speed:100,rpm:3211,gear:'P',fuel:32,range:310,coolant:88,oil:92,outside:13};
assert.equal(d.template,'bmw-factory');assert.deepEqual(M.validate(d),d);assert.equal(d.gauge,'bmw');
for(const type of ['speed','rpm','fuel','range','oil','coolant'])assert(d.widgets.find(w=>w.type===type).on);
assert.equal(M.preset(0).gauge,'ultra','existing numbered templates remain unchanged');
assert.deepEqual(M.baseDesign(d),d,'reset uses the BMW template, not the old preset');
for(const panel of [false,true]){
 const w=panel?1920:1088,h=panel?720:480,cache=new FrameCache(w,h,panel),design=M.clone(d);
 for(let i=0;i<8;i++){
  const data=Object.assign({},values,{rpm:i<6?700+i*317:null,speed:i<6?i*20:null});
  if(i===3){design.theme=6;design.widgets.reverse();M.move(design,'oil',-.04,-.02);}
  if(i===5)design.background='black';
  const cv=cache.render(design,data),expected=new Canvas(w,h);
  if(panel)Panel.draw(expected,design,data);else D.draw(expected,design,{x:0,y:0,w,h},data);
  assert.deepEqual(cv?cv.d:cache.frames[1-cache.index].d,expected.d,'cache and full draw match after values, edits and unavailable data');
  assert.equal(cache.render(design,data),null,'no redraw when values did not change');
  for(let y=0;y<h;y++)for(let x=Math.ceil(w*(y<h*.24?.42:.40));x<Math.floor(w*(y<h*.24?.58:.60));x++)assert.equal(expected.d[(y*w+x)*4+3],0,'native middle stays transparent');
  if(panel)for(let y=660;y<720;y++)for(let x=1380;x<1520;x++)assert.equal(expected.d[(y*w+x)*4+3],0,'accepted P clearance preserved');
 }
}
const cv=new Canvas(1920,720),strings=[],text=cv.text.bind(cv);cv.text=(s,x,y,size,c,o)=>{strings.push({s:String(s),x,y,c,o});return text(s,x,y,size,c,o);};
D.draw(cv,d,{x:0,y:0,w:1920,h:720},values);
for(const s of ['62','3211','49%','193 mi','190 °F','198°F'])assert(strings.some(a=>a.s===s),'actual converted reading '+s);
for(const type of ['oil','coolant','fuel']){const w=d.widgets.find(a=>a.type===type),cx=(w.x+w.w/2)*1920;assert(strings.some(a=>Math.abs(a.x-cx)<.0001&&a.o.align==='center'));}
for(const type of M.TYPES){const a=M.clone(d);M.move(a,type,.4,.4);M.resize(a,type,3);M.dimension(a,type,'w',.2);M.align(a,type,'x');M.validate(a);const w=a.widgets.find(w=>w.type===type);const edge=['speed','rpm'].includes(type)?.42:.40;assert(w.x+w.w<=edge+.000001||w.x>=1-edge-.000001,'widgets remain in their allowed side envelope');}
// Rounded rails and gradual native-center blending survive CPU/GPU recording.
const rails=[],probe=new Canvas(1920,720),polyline=probe.polyline.bind(probe);
probe.polyline=(p,w,c)=>{if(p.length===81&&w>2)rails.push(p);return polyline(p,w,c);};
D.draw(probe,d,{x:0,y:0,w:1920,h:720},values);
assert.equal(rails.length,4,'each dial is clipped into the upper and lower side regions');
const foot=rails[0].slice(0,17);assert(Math.max(...foot.map(p=>p[1]))-Math.min(...foot.map(p=>p[1]))<21,'factory foot is shallow, not a circular bowl');
assert(foot[0][0]-foot[foot.length-1][0]>250,'wide foot follows the supplied factory close-up');
for(const rail of rails)for(let i=1;i<rail.length-1;i++){
 const a=[rail[i][0]-rail[i-1][0],rail[i][1]-rail[i-1][1]],b=[rail[i+1][0]-rail[i][0],rail[i+1][1]-rail[i][1]];
 const angle=Math.acos(Math.min(1,Math.max(-1,(a[0]*b[0]+a[1]*b[1])/(Math.hypot(...a)*Math.hypot(...b)))));
 assert(angle<.17,'no sharp polygon joins');
}
const background=new Canvas(1920,720);D.draw(background,Object.assign({},d,{widgets:[]}),{x:0,y:0,w:1920,h:720},values);
// The old photo showed native numerals through partially transparent sides.
// Every pixel outside the native center must be opaque, including old readouts.
for(let y=0;y<720;y++)for(let x=0;x<1920;x++){
 const expected=M.FACTORY_REGIONS.some(z=>x>=Math.round(z[0]*1920)&&x<Math.round((z[0]+z[2])*1920)&&y>=Math.round(z[1]*720)&&y<Math.round((z[1]+z[3])*720))?255:0;
 const i=(y*1920+x)*4;assert.equal(background.d[i+3],expected,'opaque sides with no native-number bleed');
 assert.equal(background.d[i]+background.d[i+1]+background.d[i+2],0,'pure black background');
}
const old=M.clone(d),badge=old.widgets.find(w=>w.type==='badge');Object.assign(badge,{x:.405,y:.105,w:.19,h:.11,on:true});assert(!M.validate(old).widgets.find(w=>w.type==='badge').on,'old duplicate badge retired');
badge.x=.12;badge.y=.2;assert(M.validate(old).widgets.find(w=>w.type==='badge').on,'user-positioned badge retained');
const rec=new kit.Recorder(960,360);D.draw(rec,d,{x:0,y:0,w:960,h:360},values);const soft=new Canvas(960,360);kit.play(rec.words(),soft);assert.equal(soft.d[(200*960+480)*4+3],0,'recorded preview also leaves the middle clear');
const client=new EventEmitter();client.status=null;client.close=()=>{};const screen=new StudioScreen(()=>{},{client});assert.equal(screen.design.template,'bmw-factory');
screen.design=M.idrivePreset(2);screen.design.units='km/h';screen.design.introEnabled=true;screen.press('pick-factory');assert.equal(screen.design.template,'bmw-factory');assert.equal(screen.design.units,'km/h');assert(screen.design.introEnabled);screen.press('undo');assert.equal(screen.design.template,'id8-minimal');screen.press('redo');assert.equal(screen.design.template,'bmw-factory');
for(const page of ['gallery','gauges','edit','properties','style']){screen.page=page;const items=V.items(screen);assert(items.length<=24);for(let i=0;i<items.length;i++){const a=items[i];assert(a.x+a.w<=1600&&a.y+a.h<=574);for(const b of items.slice(i+1))assert(!(a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y),'controls do not overlap');}}
screen.page='gallery';assert(V.items(screen).some(b=>b.id==='pick-factory'&&b.enabled));screen.close();
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'bmw-factory-')),file=path.join(dir,'studio.json'),engine={configure(){}};
try{
 const fresh=new StudioService({file,engine});assert.equal(fresh.store.design.template,'bmw-factory');
 const old=M.preset(0);old.widgets.find(w=>w.type==='oil').color='#123456';old.name='Keep my layout';const store={schema:1,enabled:true,output:'center',design:old,slots:[M.idrivePreset(2),null,null,null,null]};save(file,store);
 const restored=new StudioService({file,engine});assert.deepEqual(restored.store,store,'existing saved design and named slots survive update');
 restored.store.design=d;save(file,restored.store);assert.deepEqual(new StudioService({file,engine}).store.design,d,'new default persists exactly');
}finally{fs.unlinkSync(file);fs.rmdirSync(dir);}
console.log('ok BMW default: factory appearance, units, centered values, native window/P alpha, cached refresh, edit/undo/reset, bounded menus, old/new save reload');
