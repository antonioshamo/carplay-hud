// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const assert=require('assert'),fs=require('fs'),os=require('os'),path=require('path');
const {MapRequest}=require('../map_request'),{Engine}=require('../engine'),{RecordingRenderer,sample,scene}=require('./source_scene'),M=require('../shared/studio_model');
async function main(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'map-focus-js-'));let now=100000;
 const req=new MapRequest({dir,now:()=>now}),file=path.join(dir,'map_focus.txt');
 const cr=new RecordingRenderer();let raw=sample();const telemetry={snapshot:()=>raw,parked:()=>raw.gear==='P'&&raw.speed===0};
 const e=new Engine(cr,telemetry,{now:()=>now,mapRequest:req}),oldNow=Date.now;Date.now=()=>now;
 const tick=async n=>{for(let i=0;i<n;i++){now+=20;e.tick();if(e.source)e.source._tick();await new Promise(r=>setImmediate(r));}};
 try{
  const d=M.validate(Object.assign(M.defaultDesign(),{theme:'map_focus'}));assert.equal(d.center,'map');
  e.configure(d,true,'panel');await tick(70);
  assert(cr.scene().parts.length>0);assert.equal(fs.readFileSync(file,'utf8'),'panel 0 0 1920 720\n');
  for(const gear of ['P','R','N','D','1','8']){raw=Object.assign(sample(),{gear,cruise:{engaged:true}});await tick(12);assert(e.adapter.meshes.length>0,gear);assert(fs.existsSync(file),gear+' map request');}
  cr.panelFocusVideo=false;await tick(12);assert(!fs.existsSync(file),'old renderer cannot activate map');
  cr.panelFocusVideo=true;await tick(45);assert(fs.existsSync(file));
  raw.rpm=null;await tick(12);assert(!fs.existsSync(file),'stale readings remove map lease');
  raw=sample();await tick(45);assert(fs.existsSync(file));
  e.configure(M.defaultDesign(),true,'panel');assert(!fs.existsSync(file),'switching themes immediately gives map back');
  e.configure(d,true,'panel');await tick(45);e.configure(d,false,'panel');assert(!fs.existsSync(file),'off removes map');
  // Restore BMW gauges, then enable the saved map theme while already in Drive.
  raw=Object.assign(sample(),{gear:'D'});
  for(let i=0;i<3;i++){
   e.configure(d,true,'panel');await tick(70);
   assert(e.adapter.meshes.length>0,'re-enable restores gauge meshes in Drive');
   assert(fs.existsSync(file),'re-enable restores full-panel heartbeat in Drive');
   e.configure(d,false,'panel');assert(!fs.existsSync(file));
  }
 }finally{e.close();Date.now=oldNow;fs.rmSync(dir,{recursive:true,force:true});}
 const layout=require('../map_focus');const speed=layout.pieces({speedUnit:'mph'}).find(p=>p.key==='map-speed');assert.equal(speed.text(sample()),'62','speed uses live data object');assert.equal(layout.pieces({speedUnit:'kmh'}).find(p=>p.key==='map-speed').text({speed:100}),'100');
 const out=await scene('map_focus','comfort');assert(out.stats.meshes<=2);assert(out.parts.length>=10);assert.deepEqual(out.reservedWindow,[0,0,0,0]);
 console.log('ok full-panel request, Drive gears, cruise independence, old renderer, stale readings, switch/off cleanup, native scene budget');
}
main().catch(e=>{console.error(e.stack);process.exit(1);});
