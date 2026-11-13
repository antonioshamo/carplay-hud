// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const assert=require('assert'),fs=require('fs'),os=require('os'),path=require('path');
const {RecordingRenderer,sample,scene}=require('./source_scene'),{Engine,widgets}=require('../engine'),{SourceMesh}=require('../source_mesh'),Store=require('../cluster_store'),M=require('../shared/studio_model');
const immediate=()=>new Promise(r=>setImmediate(r));
async function main(){
 for(const theme of M.THEMES)for(const palette of M.PALETTES){const s=await scene(theme.id,palette);assert(s.parts.length>0);assert(s.stats.meshes<=4);assert(s.stats.maxLayers<=8);assert(s.parts.every(p=>p.opts.fs.includes('u_sourceLease')));}
 for(const theme of M.THEMES){const s=await scene(theme.id,'comfort',{design:{startup:true},data:{gear:'P',speed:0}});assert(s.stats.meshes<=4,theme.id+' startup within layer and animation limits');}
 const format=widgets(M.defaultDesign(),Object.assign(sample(),{targetFL:2.4,targetFR:2.4,targetRL:2.6,targetRR:2.6,odometer:160934.4,tripTime:83,powerPercent:41,torquePercent:35,engineState:'RUNNING',fuelWarning:'LOW FUEL'}));
 for(const metric of M.METRICS)assert.notEqual(format(metric),'--','supported metric '+metric);
 assert.equal(format('fuel'),'49%');assert.equal(format('odometer'),'100000 mi');assert.equal(format('tripTime'),'1h 23m');assert.equal(format('targetFL'),'34.8 psi');assert.equal(widgets(M.defaultDesign(),{} )('fuelWarning'),'--');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'source-cluster-test-')),file=path.join(dir,'studio.json');
 const legacy={schema:1,enabled:true,output:'parked-panel',design:{schema:1,introEnabled:true,preset:99},slots:[null,null,null,null,{legacy:'kept'}]},raw=JSON.stringify(legacy);
 fs.writeFileSync(file,raw);const migrated=Store.load(file);assert.equal(migrated.schema,2);assert.equal(migrated.enabled,false);assert.equal(migrated.design.startup,false);assert(!('preset' in migrated.design));assert.equal(fs.readFileSync(path.join(dir,fs.readdirSync(dir).find(f=>f.includes('.legacy-'))),'utf8'),raw);assert.deepEqual(Store.load(file),migrated);assert.equal(fs.readdirSync(dir).filter(f=>f.includes('.legacy-')).length,1);
 assert.throws(()=>M.validate(legacy.design),/retired/);assert.throws(()=>Store.validate(legacy));
 fs.writeFileSync(file,'{broken');assert.throws(()=>Store.load(file),/original file kept/);assert.equal(fs.readFileSync(file,'utf8'),'{broken');
 let now=100000,rawData=sample();const clock=Date.now;Date.now=()=>now;
 const r=new RecordingRenderer(),t={snapshot:()=>rawData,parked:()=>rawData.gear==='P'&&rawData.speed===0},e=new Engine(r,t,{now:()=>now,mapRequest:{update(){},release(){}}});
 async function tick(n){for(let i=0;i<n;i++){now+=20;e.tick();if(e.source)e.source._tick();await immediate();}}
 try{
  e.configure(M.defaultDesign(),true,'panel');await tick(50);assert(r.scene().parts.length>0,'Drive creates source gauges');
  for(let pass=0;pass<3;pass++)for(const theme of M.THEMES){const d=Object.assign(M.defaultDesign(),{theme:theme.id});e.configure(d,true,'panel');await tick(4);assert(r.scene().parts.length>0,theme.id+' switch');assert(r.layers.size<10,'bounded layer/asset count');assert(r.maxLayers<=8,'native eight layer budget during switch');}
  // Changes of gear must not release healthy source scenes or start a sweep.
  const builds=e.adapter.stats.builds;r.ops=[];for(const gear of ['P','R','N','D','1','8','D']){rawData=Object.assign(sample(),{gear,speed:gear==='P'?0:10});await tick(4);assert(e.adapter.meshes.length>0,gear+' keeps cluster');}assert.equal(e.adapter.stats.builds,builds);
  const uploads=r.ops.filter(o=>o[0]==='pixels').length;assert.equal(uploads,0,'fresh readings do not upload bitmap gauge frames');
  rawData=Object.assign(sample(),{rpm:null});await tick(2);assert.equal(e.adapter.meshes.length,0,'stale RPM restores factory instead of displaying zero');
  rawData=sample();await tick(40);assert(e.adapter.meshes.length>0);
  r.independentPanelHud=false;r.emit('target','hud','shown','us','');await tick(2);assert.equal(e.adapter.meshes.length,0,'shared display yields without changing HUD');
  r.independentPanelHud=true;await tick(40);assert(e.adapter.meshes.length>0,'independent resources recover');
  const retired=e.adapter.meshes[0];e.configure(e.design,false,'panel');await tick(2);r.emit('refused','part',retired,'late old response');assert.equal(e.failures,0);assert.equal(r.layers.size,0,'off removes every cluster resource');
 }finally{e.close();Date.now=clock;}
 console.log('ok source theme/palette scenes, exact legacy backup and retirement, 3 switch passes, 7 gear states, no bitmap streaming, stale data, shared HUD yielding, independent recovery, resource budgets and complete off');
}
main().catch(e=>{console.error(e.stack);process.exitCode=1;});
