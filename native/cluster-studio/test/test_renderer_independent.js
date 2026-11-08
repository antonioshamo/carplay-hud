// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
// Real renderer protocol and Engine, fake display/vehicle backends. This proves
// arbitration for a configured separate scene, not compatibility with a car.
const assert=require('assert'),fs=require('fs'),path=require('path'),os=require('os'),{spawn}=require('child_process');
const {ClusterRender}=require('../../cluster-render/js/cluster_render_client'),{Engine}=require('../engine'),M=require('../shared/studio_model');
const bin=process.argv[2]||path.resolve(__dirname,'../../cluster-render/build/host/host_service');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'studio-independent-')),socket=path.join(dir,'render.sock');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let service,engine,timer,cr,map,hud,hudState='unknown';
const errors=[];
async function until(check,label,ms){const end=Date.now()+(ms||8000);while(Date.now()<end){if(check())return;await sleep(25);}throw Error(label+'; HUD '+hudState+'; panel '+JSON.stringify(engine&&engine.display()));}
async function start(){
 service=spawn(bin,[socket,'--independent-panel-hud'],{stdio:['pipe','pipe','pipe']});let stderr='';
 service.stderr.on('data',b=>{stderr=(stderr+b).slice(-5000);});
 await new Promise((resolve,reject)=>{service.once('error',reject);service.stdout.once('data',resolve);service.once('exit',code=>reject(Error('Renderer exited '+code+': '+stderr)));});
}
(async()=>{
 await start();let parked=true;
 cr=new ClusterRender('independent-studio',socket);map=new ClusterRender('independent-map',socket);
 [cr,map].forEach(c=>c.on('refused',(op,ref,reason)=>errors.push({op,ref,reason})));
 map.on('ready',()=>{hudState='unknown';hud=map.image({target:'hud',iw:160,ih:80,w:800,h:480});map.pixels(hud,null,Buffer.alloc(160*80*4,255));});
 map.on('layer',(ref,state)=>{if(ref===hud)hudState=state;});
 map.on('disconnected',()=>{hudState='disconnected';});
 engine=new Engine(cr,{parked:()=>parked,snapshot:()=>({speed:parked?0:10,gear:parked?'P':'D',rpm:740,now:new Date()})});
 const design=M.idrivePreset(2);design.introEnabled=false;engine.configure(design,true,'parked-panel');
 cr.connect();map.connect();timer=setInterval(()=>engine.tick(),34);
 await until(()=>cr.independentPanelHud&&engine.display().visible&&hudState==='shown','independent panel and HUD shown together');
 const panel=engine.ref;await sleep(1200);assert.equal(engine.ref,panel);assert.equal(hudState,'shown');
 service.stdin.write('steal panel\n');await until(()=>!engine.display().visible,'BMW panel interruption');
 await sleep(1200);assert.equal(hudState,'shown','panel interruption cannot blank independent HUD');assert.equal(engine.ref,panel);
 service.stdin.write('free panel\n');await until(()=>engine.display().visible,'custom panel returns after interruption');assert.equal(engine.ref,panel);
 service.stdin.write('steal hud\n');await until(()=>hudState!=='shown','BMW HUD interruption');
 await sleep(1200);assert(engine.display().visible,'HUD interruption cannot drop independent panel');assert.equal(engine.ref,panel);
 service.stdin.write('free hud\n');await until(()=>hudState==='shown','HUD returns after interruption');
 const changed=M.idrivePreset(1);changed.introEnabled=false;engine.configure(changed,true,'parked-panel');await sleep(300);
 assert.equal(engine.ref,panel,'live design edit preserves panel layer');assert.equal(hudState,'shown');
 parked=false;await until(()=>engine.ref===null,'movement restores factory panel');assert.equal(hudState,'shown');
 parked=true;await until(()=>engine.display().visible,'saved panel returns beside existing HUD');
 service.stdin.end();await until(()=>!cr.ready&&!map.ready,'both clients see renderer disconnect');
 assert.equal(cr.independentPanelHud,false,'capability resets on disconnect');
 await start();await until(()=>engine.display().visible&&hudState==='shown','both outputs recover after renderer restart',12000);
 assert.deepEqual(engine.design,changed);assert.deepEqual(errors,[]);assert(!engine.health().paused);
 engine.configure(changed,false,'parked-panel');await sleep(100);assert.equal(engine.ref,null);assert.equal(hudState,'shown');
 console.log('ok separate resources: simultaneous panel/HUD, interruptions in both directions, live edits, Park transitions, reconnect and explicit restore');
})().catch(e=>{console.error(e.stack);process.exitCode=1;}).then(()=>{
 clearInterval(timer);if(engine)engine.close();if(map)map.close();if(service)service.stdin.end();
 setTimeout(()=>{try{fs.unlinkSync(socket);}catch(e){}try{fs.rmdirSync(dir);}catch(e){}},100);
});
