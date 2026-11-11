// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const assert=require('assert'),fs=require('fs'),os=require('os'),path=require('path');
const M=require('../src/studio_model'),{StudioClient}=require('../src/studio_client'),{StudioService}=require('../../../native/cluster-studio/service');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn){for(let i=0;i<100;i++){if(fn())return;await wait(10);}throw Error('timeout');}
async function main(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'source-studio-')),socket=path.join(dir,'ctl');let configurations=0;
 const engine={cr:{ready:true,targets:'panel:1920x720',independentPanelHud:true},now:Date.now,state:'Ready',health:()=>({paused:false,retryInMs:0}),display:()=>({visible:false}),hudAllowsPanel:()=>true,configure(){configurations++;},stopPreview(){},retry(){}};
 const service=new StudioService({file:path.join(dir,'studio.json'),engine,telemetry:{parked:()=>false,snapshot:()=>({gear:'D',speed:20,rpm:1500})}}),c=new StudioClient(socket);
 try{
  await service.listen(socket);c.connect();await until(()=>c.status);assert.equal(c.status.generation,'source-cluster-v2');assert(!c.status.enabled,'legacy replacement is opt-in');
  for(const t of M.THEMES){const d=Object.assign(M.defaultDesign(),{theme:t.id});await c.send('apply',{design:d,output:'panel'});assert.equal(c.status.design.theme,t.id);assert(c.status.enabled);}
  const before=configurations;await c.send('slot',{slot:3,design:M.defaultDesign()});assert.equal(configurations,before,'saving a slot cannot rebuild active display');
  await assert.rejects(c.send('apply',{design:{schema:1},output:'parked-panel'}),/retired/);
  await assert.rejects(c.send('slot',{slot:99,design:M.defaultDesign()}),/Invalid slot/);
  await assert.rejects(c.send('editor-start'),/Old phone designer removed/);
  await assert.rejects(c.send('media-start',{target:'design'}),/Old phone designer removed/);
  await c.send('off');assert(!c.status.enabled);assert(!c.status.design.startup);
  const onDisk=JSON.parse(fs.readFileSync(path.join(dir,'studio.json')));assert.equal(onDisk.schema,2);assert(onDisk.slots[3]);
 }finally{c.close();service.close();fs.rmSync(dir,{recursive:true,force:true});}
 console.log('ok real control socket, 12 themes in Drive state, durable settings, slots without activation, legacy-client rejection and factory restore');
}
main().catch(e=>{console.error(e.stack);process.exitCode=1;});
