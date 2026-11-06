// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
// The real renderer service, framing, clients, slot manager and Engine.
// Only the vehicle/display backends are fake; this does not prove car output.
const assert=require('assert'),fs=require('fs'),path=require('path'),os=require('os'),{spawn}=require('child_process');
const {ClusterRender}=require('../../cluster-render/js/cluster_render_client'),{Engine}=require('../engine'),M=require('../shared/studio_model');
const bin=process.argv[2]||path.resolve(__dirname,'../../cluster-render/build/host/host_service');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'studio-renderer-')),socket=path.join(dir,'render.sock');
let service,engine,timer,carplay,cr;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(check,label,ms){const end=Date.now()+(ms||8000);while(Date.now()<end){if(check())return;await sleep(25);}throw Error(label+'; engine '+engine.state+' '+JSON.stringify(engine.display()));}
async function start(){
 service=spawn(bin,[socket],{stdio:['pipe','pipe','pipe']});let stderr='';service.stderr.on('data',b=>{stderr=(stderr+b).slice(-5000);});
 await new Promise((resolve,reject)=>{service.once('error',reject);service.stdout.once('data',resolve);service.once('exit',code=>reject(Error('Renderer exited '+code+': '+stderr)));});
}
(async()=>{
 await start();let parked=true;
 cr=new ClusterRender('studio-integration',socket);carplay=new ClusterRender('map-integration',socket);
 const errors=[];cr.on('refused',(op,ref,reason)=>errors.push({op,ref,reason}));
 engine=new Engine(cr,{parked:()=>parked,snapshot:()=>({speed:parked?0:10,gear:parked?'P':'D',rpm:720+Math.floor(Date.now()%1000/100),now:new Date()})});
 const design=M.idrivePreset(2);design.introEnabled=false;engine.configure(design,true,'center');
 cr.connect();carplay.connect();timer=setInterval(()=>engine.tick(),34);
 await until(()=>engine.display().visible&&engine.target==='map','center gauge shown through protocol');
 const center=engine.ref;await sleep(1200);assert.equal(engine.ref,center,'updates do not rebuild the layer');
 const hud=carplay.image({target:'hud',iw:160,ih:80,w:800,h:480});carplay.pixels(hud,null,Buffer.alloc(160*80*4,255));
 await until(()=>engine.hud==='shown','HUD is using its scene');
 engine.configure(design,true,'parked-panel');await sleep(300);
 assert.equal(engine.ref,null);assert.equal(engine.output,'parked-panel','HUD wait never changes saved output to center');
 carplay.drop(hud);await until(()=>engine.target==='panel'&&engine.display().visible,'full cluster resumes after HUD releases');
 const panel=engine.ref;
 service.stdin.write('steal panel\n');await until(()=>!engine.display().visible,'BMW interruption reported');
 await sleep(1200);assert.equal(engine.ref,panel,'stock interruption retains layer');
 service.stdin.write('free panel\n');await until(()=>engine.display().visible,'panel returns after BMW releases');assert.equal(engine.ref,panel);
 // Repeated shared-scene observations cannot cause a center-layout fallback.
 const queued=carplay.image({target:'hud',iw:160,ih:80,w:800,h:480});carplay.pixels(queued,null,Buffer.alloc(160*80*4,255));
 await until(()=>engine.hud==='waiting','second HUD request queues behind panel');await sleep(1200);assert.equal(engine.ref,panel);
 parked=false;await until(()=>engine.ref===null,'movement releases panel');
 await until(()=>engine.hud==='shown','HUD resumes once panel is released');
 parked=true;await sleep(500);assert.equal(engine.ref,null,'fresh Park cannot steal an active HUD');
 carplay.drop(queued);await until(()=>engine.display().visible&&engine.target==='panel','saved panel returns without choosing center');
 service.stdin.end();await until(()=>!cr.ready,'renderer disconnect');assert.equal(engine.ref,null);
 await start();await until(()=>engine.display().visible&&engine.target==='panel','saved panel returns after renderer restart',12000);
 assert.deepEqual(engine.design,design);assert.deepEqual(errors,[]);assert(!engine.health().paused);
 engine.configure(design,false,'parked-panel');await sleep(100);assert.equal(engine.ref,null);
 console.log('ok real protocol: changing values, HUD conflict/release, stock interruption, Park, reconnect, saved full-panel recovery and explicit restore');
})().catch(e=>{console.error(e.stack);process.exitCode=1;}).then(()=>{
 clearInterval(timer);if(engine)engine.close();if(carplay)carplay.close();if(service)service.stdin.end();
 setTimeout(()=>{try{fs.unlinkSync(socket);}catch(e){}try{fs.rmdirSync(dir);}catch(e){}},100);
});
