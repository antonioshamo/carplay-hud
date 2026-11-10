// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const VERSION = '0.1.30';
const fs=require('fs'),path=require('path'),net=require('net');
const M=require('./shared/studio_model.js');
const {ClimateControls}=require('./climate_controls.js');
const {Assistance}=require('./assistance.js');
const {StartupRecovery}=require('./startup_recovery.js');
const capabilities=require('./capabilities.js'),{ParkedMedia}=require('./parked_media.js');
const {ClusterRender}=require('./shared/cluster_render_client.js'),{Telemetry}=require('./telemetry.js'),{Engine}=require('./engine.js');
function validateStore(v){if(!v||v.schema!==1||typeof v.enabled!=='boolean'||!Array.isArray(v.slots)||v.slots.length!==5)throw Error('Invalid saved studio');if(v.output!==undefined&&!['center','parked-panel'].includes(v.output))throw Error('Invalid saved output');return {schema:1,enabled:v.enabled,output:v.output||'center',design:M.validate(v.design),slots:v.slots.map(d=>d===null?null:M.validate(d))};}
function save(file,v){const data=validateStore(v);fs.writeFileSync(file+'.tmp',JSON.stringify(data)+'\n',{mode:384});let fd=fs.openSync(file+'.tmp','r');try{fs.fsyncSync(fd);}finally{fs.closeSync(fd);}fs.renameSync(file+'.tmp',file);fd=fs.openSync(path.dirname(file),'r');try{fs.fsyncSync(fd);}finally{fs.closeSync(fd);}return data;}
class StudioService {
 constructor(o){this.o=o;this.clients=new Set();this.store={schema:1,enabled:false,output:'center',design:M.defaultDesign(),slots:[null,null,null,null,null]};try{this.store=validateStore(JSON.parse(fs.readFileSync(o.file,'utf8')));}catch(e){}o.engine.configure(this.store.design,this.store.enabled,this.store.output);}
 state(){
  const e=this.o.engine,parked=this.o.telemetry.parked(),renderer=!!e.cr.ready;
  const recovery=e.health(),display=e.display();
  const panelReady=!e.panelBlock&&parked&&renderer&&/(^|,)panel:1920x720(,|$)/.test(e.cr.targets||'');
  const testReason=e.panelBlock||(!parked?'Needs fresh speed 0 and gear P':!renderer?'Waiting for cluster renderer':!panelReady?'Full-cluster renderer unavailable':recovery.paused?'Renderer paused; retry saved display':recovery.retryInMs?'Waiting for renderer retry':!e.hudAllowsPanel()?'HUD active or ownership unknown':'Ready for a parked test');
  return {climateSupported:true,climate:this.climate?this.climate.status():null,assistance:this.o.assistance?this.o.assistance.status():null,panelBlocked:!!e.panelBlock,panelClearance:'native-gear-v1',independentPanelHud:renderer&&e.cr.independentPanelHud===true,output:this.store.output,
   features:this.features?{lighting:this.features.lighting,climate:this.features.climate,media:this.features.media,rows:this.features.rows.slice(0,6),scannedAt:this.features.scannedAt}:null,media:this.o.media?this.o.media.state():null,
   panelRemaining:Math.max(0,Math.ceil(((e.panelUntil||0)-e.now())/1000)),canPreview:testReason==='Ready for a parked test',canSelectPanel:panelReady,
   canRetry:!!(this.store.enabled&&parked&&renderer&&!e.suspendedMedia),testReason,ev:'status',version:VERSION,phoneDesigner:true,enabled:this.store.enabled,design:this.store.design,slots:this.store.slots,
   parked,state:e.state,renderer,data:this.o.telemetry.snapshot(),panel:e.target==='panel',recovery,displayVisible:display.visible,displayTarget:display.target,displayState:display.state,displayReason:display.reason,
   hud:{state:e.hud,holder:e.hudHolder||null,reason:e.hudReason||''}};
 }
 command(m){
  if(!m||!Number.isInteger(m.id)||m.id<0)throw Error('Invalid request');
  let next=M.clone(this.store);
  switch(m.cmd){
   case 'status':return this.state();
   case 'climate-observe':
    if(!this.climate||this.climate.closed)this.climate=this.o.createClimate?this.o.createClimate():new ClimateControls();
    return this.climate.open().then(()=>this.state());
   case 'climate-set':
    if(!this.climate)throw Error('Open Climate before changing a setting');
    return this.climate.command(m.action,m.value).then(()=>this.state());
   case 'retry':
    if(!this.store.enabled)throw Error('Choose an enabled output before retrying');
    if(!this.o.telemetry.parked())throw Error('Retry requires fresh speed 0 and gear P (Park)');
    if(!this.o.engine.cr.ready)throw Error('Waiting for cluster renderer');
    if(this.o.engine.suspendedMedia)throw Error('End the video session before retrying');
    this.o.engine.retry();return this.state();
   case 'save':next.design=M.validate(m.design);break;
   case 'apply':
    next.design=M.validate(m.design);next.enabled=true;
    if(m.output!==undefined){if(!['center','parked-panel'].includes(m.output))throw Error('Invalid output');next.output=m.output;}
    if(next.output==='parked-panel'&&!this.o.telemetry.parked())throw Error('Full cluster needs fresh speed 0 and gear P');
    break;
   case 'off':if(this.o.media)this.o.media.stop();next.enabled=false;next.design.introEnabled=false;break;
   case 'slot':if(!Number.isInteger(m.slot)||m.slot<0||m.slot>=5)throw Error('Invalid slot');next.slots[m.slot]=M.validate(m.design);break;
   case 'scan':
    if(!this.o.telemetry.parked())throw Error('Feature scan requires fresh speed 0 and gear P');
    if(this.o.media)this.o.media.stop();this.o.engine.stopPreview();
    this.features=(this.o.scan||capabilities.scan)();if(this.o.media)this.o.media.report=this.features;return this.state();
   case 'editor-start':if(!this.o.media)throw Error('Phone designer unavailable');return this.o.media.start('design').then(()=>this.state());
   case 'media-start':if(!this.o.media)throw Error('Video helper unavailable');return this.o.media.start(m.target).then(()=>this.state());
   case 'media-stop':if(this.o.media)this.o.media.stop();return this.state();
   case 'media-place':if(!this.o.media)throw Error('Video helper unavailable');this.o.media.place(m.rect);return this.state();
   case 'preview':if(this.o.media)this.o.media.stop();this.o.engine.preview(M.validate(m.design),m.seconds);return this.state();
   case 'stop-preview':this.o.engine.stopPreview();return this.state();
   default:throw Error('Unknown command');
  }
  // Confirm only after the atomic durable file replacement succeeds.
  next=save(this.o.file,next);this.store=next;
  // Saving a named design slot does not change the active design or test.
  if(m.cmd!=='slot')this.o.engine.configure(next.design,next.enabled,next.output);
  return this.state();
 }
 async listen(socket){
  this.server=net.createServer(s=>{if(this.clients.size>=4){s.destroy();return;}this.clients.add(s);s.setEncoding('utf8');let buf='';s.on('error',()=>{});s.on('close',()=>this.clients.delete(s));s.write(JSON.stringify(this.state())+'\n');
   s.on('data',d=>{buf+=d;if(buf.length>65536){s.destroy();return;}let idx;while((idx=buf.indexOf('\n'))>=0){let m;try{m=JSON.parse(buf.slice(0,idx));const request=m;Promise.resolve(this.command(m)).then(result=>{if(!s.destroyed)s.write(JSON.stringify({ev:'reply',id:request.id,ok:true,status:result})+'\n');},e=>{if(!s.destroyed)s.write(JSON.stringify({ev:'reply',id:request.id,ok:false,reason:e.message})+'\n');});}catch(e){s.write(JSON.stringify({ev:'reply',id:m&&m.id,ok:false,reason:e.message})+'\n');}buf=buf.slice(idx+1);}});
  });
  await new Promise((resolve,reject)=>{this.server.once('error',reject);this.server.listen(socket,resolve);});
  fs.chmodSync(socket,432); // 0660, group inherited from systemd RuntimeDirectory
  this.timer=setInterval(()=>{if(this.climate&&!this.climate.pending&&Date.now()>=this.climate.leaseUntil)this.climate.close();const data=JSON.stringify(this.state())+'\n';this.clients.forEach(s=>{if(s.bufferSize>131072)s.destroy();else s.write(data);});},1000);
 }
 close(){if(this.climate)this.climate.close();clearInterval(this.timer);this.clients.forEach(s=>s.destroy());if(this.server)this.server.close();}
}
async function main(){
 const file='/var/opt/cluster-studio/studio.json',socket='/run/cluster-studio/control.sock';
 // This firmware resets RuntimeDirectory ownership between ExecStartPre
 // and ExecStart. Set the restricted socket group inside the main process.
 const group=fs.readFileSync('/etc/group','utf8').split('\n').map(l=>l.split(':')).find(g=>g[0]==='tm_oap_app'&&/^\d+$/.test(g[2]));
 if(!group)throw Error('tm_oap_app group unavailable; refusing control socket');
 fs.chownSync(path.dirname(socket),0,Number(group[2]));
 fs.chmodSync(path.dirname(socket),0o2750);
 try{fs.unlinkSync(socket);}catch(e){if(e.code!=='ENOENT')throw e;}
 const assistance=new Assistance(),telemetry=new Telemetry(),cr=new ClusterRender('shamo_cluster_studio'),engine=new Engine(cr,telemetry);
 const media=new ParkedMedia({engine,telemetry,cr});media.stop();
 const service=new StudioService({file,engine,telemetry,media,assistance});media.o.designRead=()=>({design:service.store.design,slots:service.store.slots});media.o.designSave=m=>service.command(m);await service.listen(socket);cr.connect();telemetry.start();assistance.start();
 const startupRecovery=new StartupRecovery();
 const timer=setInterval(()=>{engine.tick();media.tick();startupRecovery.tick({ready:cr.ready,independent:cr.independentPanelHud,parked:telemetry.parked(),state:engine.hud,holder:engine.hudHolder,reason:engine.hudReason});},34);
 const close=()=>{clearInterval(timer);service.close();media.stop();assistance.close();telemetry.close();engine.close();process.exit(0);};process.on('SIGTERM',close);process.on('SIGINT',close);
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exit(1);});
module.exports={StudioService,validateStore,save};
