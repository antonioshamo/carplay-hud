// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const fs=require('fs'),path=require('path'),net=require('net');
const M=require('./shared/studio_model.js');
const {ClusterRender}=require('./shared/cluster_render_client.js'),{Telemetry}=require('./telemetry.js'),{Engine}=require('./engine.js');
function validateStore(v){if(!v||v.schema!==1||typeof v.enabled!=='boolean'||!Array.isArray(v.slots)||v.slots.length!==5)throw Error('Invalid saved studio');return {schema:1,enabled:v.enabled,design:M.validate(v.design),slots:v.slots.map(d=>d===null?null:M.validate(d))};}
function save(file,v){const data=validateStore(v);fs.writeFileSync(file+'.tmp',JSON.stringify(data)+'\n',{mode:384});let fd=fs.openSync(file+'.tmp','r');try{fs.fsyncSync(fd);}finally{fs.closeSync(fd);}fs.renameSync(file+'.tmp',file);fd=fs.openSync(path.dirname(file),'r');try{fs.fsyncSync(fd);}finally{fs.closeSync(fd);}return data;}
class StudioService {
 constructor(o){this.o=o;this.clients=new Set();this.store={schema:1,enabled:false,design:M.preset(0),slots:[null,null,null,null,null]};try{this.store=validateStore(JSON.parse(fs.readFileSync(o.file,'utf8')));}catch(e){}o.engine.configure(this.store.design,this.store.enabled);}
 state(){const testReason=!this.o.telemetry.parked()?'Needs fresh speed 0 and gear P':!this.o.engine.cr.ready?'Waiting for cluster renderer':!['idle','released'].includes(this.o.engine.hud)?'HUD active or ownership unknown':'Ready for a 10-second parked test';return {canPreview:testReason==='Ready for a 10-second parked test',testReason,ev:'status',enabled:this.store.enabled,design:this.store.design,slots:this.store.slots,parked:this.o.telemetry.parked(),state:this.o.engine.state,renderer:!!this.o.engine.cr.ready,data:this.o.telemetry.snapshot(),panel:!!this.o.engine.panelUntil};}
 command(m){
  if(!m||!Number.isInteger(m.id)||m.id<0)throw Error('Invalid request');
  let next=M.clone(this.store);
  switch(m.cmd){
   case 'status':return this.state();
   case 'save':next.design=M.validate(m.design);break;
   case 'apply':next.design=M.validate(m.design);next.enabled=true;break;
   case 'off':next.enabled=false;next.design.introEnabled=false;break;
   case 'slot':if(!Number.isInteger(m.slot)||m.slot<0||m.slot>=5)throw Error('Invalid slot');next.slots[m.slot]=M.validate(m.design);break;
   case 'preview':this.o.engine.preview(M.validate(m.design));return this.state();
   case 'stop-preview':this.o.engine.stopPreview();return this.state();
   default:throw Error('Unknown command');
  }
  // Confirm only after the atomic durable file replacement succeeds.
  next=save(this.o.file,next);this.store=next;this.o.engine.configure(next.design,next.enabled);return this.state();
 }
 async listen(socket){
  this.server=net.createServer(s=>{if(this.clients.size>=4){s.destroy();return;}this.clients.add(s);s.setEncoding('utf8');let buf='';s.on('error',()=>{});s.on('close',()=>this.clients.delete(s));s.write(JSON.stringify(this.state())+'\n');
   s.on('data',d=>{buf+=d;if(buf.length>65536){s.destroy();return;}let idx;while((idx=buf.indexOf('\n'))>=0){let m;try{m=JSON.parse(buf.slice(0,idx));const result=this.command(m);s.write(JSON.stringify({ev:'reply',id:m.id,ok:true,status:result})+'\n');}catch(e){s.write(JSON.stringify({ev:'reply',id:m&&m.id,ok:false,reason:e.message})+'\n');}buf=buf.slice(idx+1);}});
  });
  await new Promise((resolve,reject)=>{this.server.once('error',reject);this.server.listen(socket,resolve);});
  fs.chmodSync(socket,432); // 0660, group inherited from systemd RuntimeDirectory
  this.timer=setInterval(()=>{const data=JSON.stringify(this.state())+'\n';this.clients.forEach(s=>{if(s.bufferSize>131072)s.destroy();else s.write(data);});},1000);
 }
 close(){clearInterval(this.timer);this.clients.forEach(s=>s.destroy());if(this.server)this.server.close();}
}
async function main(){
 const file='/var/opt/cluster-studio/studio.json',socket='/run/cluster-studio/control.sock';
 try{fs.unlinkSync(socket);}catch(e){if(e.code!=='ENOENT')throw e;}
 const telemetry=new Telemetry(),cr=new ClusterRender('shamo_cluster_studio'),engine=new Engine(cr,telemetry);
 const service=new StudioService({file,engine,telemetry});await service.listen(socket);cr.connect();telemetry.start();
 const timer=setInterval(()=>engine.tick(),100);
 const close=()=>{clearInterval(timer);service.close();telemetry.close();engine.close();process.exit(0);};process.on('SIGTERM',close);process.on('SIGINT',close);
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exit(1);});
module.exports={StudioService,validateStore,save};
