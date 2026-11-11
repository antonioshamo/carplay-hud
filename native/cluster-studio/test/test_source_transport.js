// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
// Real native service/client protocol, fake BMW display backends. Shader
// appearance is verified separately by tools/render_source.js.
const assert=require('assert'),fs=require('fs'),path=require('path'),cp=require('child_process');
const {ClusterRender}=require('../shared/cluster_render_client'),{Engine}=require('../engine'),M=require('../shared/studio_model'),{sample}=require('./source_scene');
const bin=path.resolve(__dirname,'../../cluster-render/build/host/host_service'),socket='/tmp/source-cluster-transport-'+process.pid+'.sock';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,ms){for(let i=0;i<(ms||6000);i+=20){if(fn())return;await wait(20);}throw Error('Source transport condition timed out');}
async function main(){
 assert(fs.existsSync(bin),'Build native/cluster-render host tests first');let proc;
 async function start(){proc=cp.spawn(bin,[socket,'--independent-panel-hud'],{stdio:['pipe','pipe','ignore']});await new Promise((resolve,reject)=>{proc.stdout.once('data',resolve);proc.once('error',reject);});}
 await start();let raw=Object.assign(sample(),{gear:'P',speed:0}),hudState='';const cr=new ClusterRender('source-protocol-test',socket),hud=new ClusterRender('existing-hud-test',socket),refusals=[];
 const e=new Engine(cr,{snapshot:()=>raw,parked:()=>raw.gear==='P'&&raw.speed===0});cr.on('refused',(op,ref,reason)=>refusals.push({op,ref,reason}));hud.on('refused',(op,ref,reason)=>refusals.push({op,ref,reason}));hud.on('layer',(ref,state)=>hudState=state);
 const timer=setInterval(()=>e.tick(),34);cr.connect();hud.connect();
 try{
  await until(()=>cr.ready&&hud.ready);assert(cr.independentPanelHud);
  const hudRef=hud.image({target:'hud',klass:'content',x:0,y:0,w:32,h:32,iw:32,ih:32,contend:false});hud.pixels(hudRef,null,Buffer.alloc(32*32*4,255));await until(()=>hudState==='shown');
  e.configure(Object.assign(M.defaultDesign(),{startup:true}),true,'panel');await until(()=>e.display().visible);await wait(500);raw=sample();await wait(180);assert(e.display().visible,'leaving Park during sweep retains live cluster');
  for(let pass=0;pass<2;pass++)for(const t of M.THEMES){e.configure(Object.assign(M.defaultDesign(),{theme:t.id,palette:pass?'sport':'comfort'}),true,'panel');await until(()=>e.display().visible);await wait(80);assert(!refusals.length,JSON.stringify(refusals));assert.equal(hudState,'shown','HUD stays shown during theme switch');assert(hud.layers.has(hudRef));}
  proc.stdin.write('steal panel\n');await until(()=>e.panelState&&e.panelState.state==='waiting');assert.equal(hudState,'shown');proc.stdin.write('free panel\n');await until(()=>e.display().visible);assert.equal(hudState,'shown','panel ownership recovery does not change HUD');
  const previous=proc;previous.stdin.end();await until(()=>!cr.ready);await start();await until(()=>cr.ready);await until(()=>e.display().visible,10000);assert.equal(hudState,'shown');assert(!refusals.length,JSON.stringify(refusals));
  raw=Object.assign(sample(),{rpm:null});await until(()=>e.adapter&&e.adapter.meshes.length===0);assert.equal(hudState,'shown','stale cluster data leaves HUD intact');raw=sample();await until(()=>e.display().visible);
  e.configure(e.design,false,'panel');await wait(100);assert.equal(cr.layers.size,0);assert.equal(hudState,'shown');
  console.log('ok native protocol: 24 theme switches, startup/Drive, all part/uniform/animation limits, ownership recovery, service reconnect, stale-data fallback and independent HUD');
 }finally{clearInterval(timer);e.close();hud.close();if(proc)proc.stdin.end();try{fs.unlinkSync(socket);}catch(_){} }
}
main().catch(e=>{console.error(e.stack);process.exitCode=1;});
