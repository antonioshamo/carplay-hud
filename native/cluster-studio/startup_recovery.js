// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const fs=require('fs'),cp=require('child_process');
// A reproduced boot-only RAMSES subscription failure. This restarts our
// renderer once, never the head unit, CarPlay, or BMW's display services.
class StartupRecovery {
 constructor(o){
  o=o||{};this.now=o.now||(()=>{const t=process.hrtime();return t[0]*1000+t[1]/1e6;});this.uptime=o.uptime||(()=>Number(fs.readFileSync('/proc/uptime','utf8').split(' ')[0])*1000);
  this.mark=o.mark||(()=>{
   const file='/run/cluster-studio-render-recovery.json',boot=fs.readFileSync('/proc/sys/kernel/random/boot_id','utf8').trim();
   if(!/^[a-f0-9-]{36}$/.test(boot))throw Error('Invalid boot identity');
   const fd=fs.openSync(file,'wx',384);
   try{fs.writeSync(fd,JSON.stringify({boot,at:new Date().toISOString(),reason:'HUD mapped without renderer subscription'})+'\n');fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
  });
  this.restart=o.restart||(()=>cp.execFile('/bin/systemctl',['try-restart','cluster-render.service'],{timeout:15000},e=>console.log('HUD startup renderer recovery '+(e?'failed: '+e.message:'completed'))));
  this.log=o.log||(s=>console.log(s));this.attempted=false;this.badAt=null;this.shownAt=null;this.lastCheck=null;
 }
 tick(s){
  if(this.attempted)return;
  const now=this.now();if(this.lastCheck!==null&&now<this.lastCheck){this.badAt=null;this.shownAt=null;this.lastCheck=now;return;}
  if(this.lastCheck!==null&&now-this.lastCheck<1000)return;this.lastCheck=now;
  let uptime;try{uptime=this.uptime();}catch(e){return;}
  // Only during initial boot, and only on an explicitly separated mapping.
  // Gear does not gate the HUD. The existing full-panel safety lease remains.
  if(!Number.isFinite(uptime)||uptime<0||uptime>180000||s.ready!==true||s.independent!==true){this.badAt=null;this.shownAt=null;return;}
  const bad=s.state==='waiting'&&s.holder==='none'&&s.reason==='not rendered: the renderer is not subscribed';
  if(bad){
   this.shownAt=null;if(this.badAt===null)this.badAt=now;
   if(now-this.badAt<15000)return;
   this.attempted=true;
   try{this.mark();}catch(e){this.log('HUD startup renderer recovery withheld: '+e.message);return;}
   this.log('HUD startup: one custom-renderer restart for repeated missing subscription');this.restart();return;
  }
  if(s.state==='shown'&&s.holder==='us'){
   if(this.shownAt===null)this.shownAt=now;
   if(now-this.shownAt>=10000)this.badAt=null;
  }else this.shownAt=null;
  if(s.holder==='stock'||s.holder==='foreign'||s.state==='idle'||s.state==='released'){this.badAt=null;this.shownAt=null;}
 }
}
module.exports={StartupRecovery};
