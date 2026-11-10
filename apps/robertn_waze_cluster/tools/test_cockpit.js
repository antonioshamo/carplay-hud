// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const assert=require('assert'),EventEmitter=require('events'),C=require('../src/cockpit_view.js'),M=require('../src/studio_model.js'),{HudScreen}=require('../src/hud_screen.js'),{SettingsControl}=require('../src/settings_control.js'),kit=require('../src/kit_record.js');
const actions=require('../../../native/cluster-studio/climate_controls.js').ACTIONS;
const controls=Object.keys(actions).map(id=>({id,label:actions[id].label,value:0,available:true,choices:actions[id].labels,choiceCount:actions[id].options.length}));
const helper={design:M.preset(0),slots:[],climateSupported:true,climate:{controls,pending:false},data:{rpm:738,oil:90,fuel:32,range:310},parked:true};
const pages=[['overview',{homePage:0}],['overview',{homePage:1}],['apps',{category:'all',appPage:0}],['apps',{category:'all',appPage:1}],['apps',{category:'display'}],['apps',{category:'vehicle'}],['apps',{category:'comfort'}],['vehicle',{vehicleTab:'engine'}],['vehicle',{vehicleTab:'tires'}],['vehicle',{vehicleTab:'journey'}],['climate',{climateTab:0}],['climate',{climateTab:1}],['climate',{climateTab:2}]];
let texts=[];const original=kit.Recorder.prototype.text;kit.Recorder.prototype.text=function(v){texts.push(String(v));return original.apply(this,arguments);};
try{
 for(const fresh of [false,true])for(const [page,cockpit] of pages){
  texts=[];const f=C.frame({helper,helperFresh:fresh,cockpit},page,5,1);assert(f.items.length<=24);assert.equal(new Set(f.items.map(b=>b.id)).size,f.items.length);
  for(let i=0;i<f.items.length;i++){const a=f.items[i];assert(a.x>=0&&a.y>=0&&a.x+a.w<=1600&&a.y+a.h<=580,page+' bounds '+a.id);assert(texts.includes(a.label),'truncated button '+a.label);for(const b of f.items.slice(i+1))assert(!(a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y),page+' overlap '+a.id+'/'+b.id);}
  if(page==='climate'){assert(texts.some(t=>t.includes(cockpit.climateTab?'NOT YET VERIFIED IN CAR':'confirmed working by owner')));for(const b of f.items.filter(b=>b.id.indexOf('climate-set:')===0))assert.equal(b.enabled,fresh);for(const b of f.items.filter(b=>b.id.indexOf('climate-unverified:')===0))assert.equal(b.enabled,false);}
  if(page==='vehicle'&&!fresh)assert(!texts.includes('738 RPM'),'no cached telemetry shown offline');

 }
 for(const pair of [['bar','2.5 bar'],['psi','36.3 psi'],['kPa','250.0 kPa']]){
  texts=[];C.frame({helper:{design:M.preset(0),data:{pressureFL:2.5,pressureUnit:pair[0]}},helperFresh:true,cockpit:{vehicleTab:'tires'}},'vehicle',0,1);
  assert(texts.includes(pair[1]),'correct pressure display: '+pair[1]);
 }
 const older={helperFresh:true,helper:{climateSupported:true,climate:{controls:controls.filter(c=>!/^heat|^vent|^rear/.test(c.id))}},cockpit:{climateTab:1}};
 const legacy=C.frame(older,'climate',0,1);assert(legacy.items.filter(b=>b.id.indexOf('climate-set:')===0).every(b=>!b.enabled&&b.value==='Update Cluster Studio'),'missing adapters explain the required helper update');
 assert.equal(C.control({helperFresh:false,helper},'heatDR'),null,'old helper state is never presented as current');
}finally{kit.Recorder.prototype.text=original;}
async function main(){
 const gpu=new EventEmitter();for(const name of ['fps','connect','claim','grab','show','close'])gpu[name]=()=>{};const frames=[];gpu.frame=r=>frames.push(r);
 const control=new SettingsControl({log:{warn(){},info(){}}}),h=new HudScreen({control,log:{warn(){},info(){}},proxies(){}},{client:gpu});
 h.active=h.ready=true;h.studio.client.status=helper;h.studio.client.statusAt=Date.now();h.studio.open=()=>{};h.studio.client.connect=()=>{};
 const requests=[];h.studio.client.send=(cmd,args)=>{requests.push({cmd,args});return Promise.resolve(helper);};
 const press=id=>{h.last={};h.render();const i=h.items.findIndex(b=>b.id===id);assert(i>=0,'missing '+id);assert(h.press(i),'unhandled '+id);};
 try{
  h.render();assert(!frames[0].images||frames[0].images.size===0,'working first screen does not wait for car bitmap');
  gpu.emit('tick');assert(frames[frames.length-1].images.size>0,'artwork follows first acknowledgement');
  for(let n=0;n<C.APPS.length;n++){
   h.page='apps';h.cockpit.category='all';h.cockpit.appPage=Math.floor(n/12);h.navigation=[];
   const id=C.APPS[n][0];press(id);assert.notEqual(h.page,'apps','app route opens: '+id);press('navigate-back');assert.equal(h.page,'apps','Back returns from '+id);
  }
  h.cockpit.appPage=0;
  for(let i=0;i<10;i++){press('nav:apps');press('studio:edit');assert.equal(h.page,'studio');press('navigate-back');assert.equal(h.page,'apps');press('nav:overview');h._touch('down',450,240);h._touch('up',220,240);assert.equal(h.cockpit.homePage,1);press('home-prev');assert.equal(h.cockpit.homePage,0);}
  press('nav:climate');await Promise.resolve();assert(requests.some(r=>r.cmd==='climate-observe'));
  for(const c of controls){press('ctab:'+(/^(heat|vent)/.test(c.id)?1:/^rear/.test(c.id)?2:0));press('climate-set:'+c.id);await Promise.resolve();assert(requests.some(r=>r.cmd==='climate-set'&&r.args.action===c.id&&r.args.value===1));assert(!h.cockpit.climateBusy);}
  press('ctab:0');
  helper.climate.pending=true;h.render();assert(!h.press(h.items.findIndex(b=>b.id==='climate-set:ac')),'a second controller cannot overlap a pending vehicle change');helper.climate.pending=false;
  h.studio.client.statusAt=Date.now()-3000;h.render();assert(!h.press(h.items.findIndex(b=>b.id==='climate-set:ac')),'stale button cannot write');
  h.studio.client.statusAt=Date.now();press('nav:overview');
  const angle=h.cockpit.car.angle;h._touch('down',800,250);h._touch('move',1000,250);h._touch('up',1000,250);assert.equal(h.cockpit.homePage,0,'car drag must not swipe the dashboard');assert.equal(h.page,'overview','rotate directly on dashboard');assert.equal(h.cockpit.car.angle,(angle+100)%360);
  press('car:mode');h._touch('down',800,250);h._touch('up',830,270);assert.equal(h.cockpit.car.x,30);assert.equal(h.cockpit.car.y,20);press('car:in');assert(h.cockpit.car.zoom>1);press('car:reset');assert.deepEqual(h.cockpit.car,require('../src/car_model.js').pose());
  const before=requests.length;h.observeClimate();assert.equal(requests.length,before,'hidden climate page cannot renew observers');
  h.page='climate';h.active=false;h.observeClimate();assert.equal(requests.length,before,'unfocused settings cannot renew observers');
  console.log('ok all new pages, proxy limits, complete labels, no overlap, unverified/disabled controls, stale data, ten navigation/swipe cycles, correct Back destination and climate request routing');
 }finally{h.close();control.close();}
}
main().catch(e=>{console.error(e.stack);process.exitCode=1;});
