// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const assert=require('assert'),fs=require('fs'),os=require('os'),path=require('path'),net=require('net'),cp=require('child_process');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'woc-defaults-')),target=path.join(dir,'carplay'),sock=path.join(dir,'patch.sock'),mounts=path.join(dir,'mounts'),mount=path.join(dir,'mount');
const original=require('./synthetic_carplay.js').build().buf;fs.writeFileSync(target,original);fs.mkdirSync(path.join(dir,'proc'));
fs.writeFileSync(mounts,'/dev/root / ext4 ro 0 0\n');
fs.writeFileSync(mount,'#!'+process.execPath+'\nrequire("fs").writeFileSync('+JSON.stringify(mounts)+',"/dev/root / ext4 "+(process.argv[3].includes("rw")?"rw":"ro")+" 0 0\\n");\n',{mode:493});
const env=Object.assign({},process.env,{WOC_CARPLAY:target,WOC_PATCH_SOCK:sock,WOC_PATCH_GROUP:'',WOC_LOCAL_CONF:path.join(dir,'settings.conf'),WOC_MOUNT:mount,WOC_PROC_MOUNTS:mounts,WOC_PROC:path.join(dir,'proc'),WOC_RECMGR_CONF:path.join(dir,'no-recmgr'),WOC_RECMGR_AT_BOOT:path.join(dir,'no-recmgr-boot'),WOC_PROC_STAT:path.join(dir,'no-stat'),WOC_BOOT_ID:path.join(dir,'no-boot'),WOC_UNIT_DIRS:path.join(dir,'no-units'),WOC_STREAM_STATE:path.join(dir,'no-stream'),WOC_CAPTURE_SOCK:path.join(dir,'no-capture'),WOC_DLT_RECEIVE:path.join(dir,'no-dlt'),WOC_DLT_RETRY_MS:'600000',WOC_REMOUNT_LOCK:path.join(dir,'lock'),WOC_RESYNC_FILE:path.join(dir,'resync')});
const daemon=cp.spawn(process.execPath,[path.join(__dirname,'../patchd.js')],{env,stdio:['ignore','pipe','pipe']});let logs='';daemon.stdout.on('data',d=>logs+=d);daemon.stderr.on('data',d=>logs+=d);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function ask(cmd){return new Promise((resolve,reject)=>{const s=net.connect(sock);let buf='';const finish=(err,r)=>{clearTimeout(timer);s.destroy();err?reject(err):resolve(r);};const timer=setTimeout(()=>finish(Error('timeout '+logs)),8000);s.on('error',e=>finish(e));s.on('connect',()=>s.write(JSON.stringify(cmd)+'\n'));s.on('data',d=>{buf+=d;let i;while((i=buf.indexOf('\n'))>=0){const m=JSON.parse(buf.slice(0,i));buf=buf.slice(i+1);if(m.ev===cmd.cmd+'-reply'){finish(null,m);return;}}});});}
(async()=>{try{
 for(let i=0;i<100&&!fs.existsSync(sock);i++)await wait(20);
 let r=await ask({cmd:'restore-defaults'});assert(r.ok,r.reason);assert(fs.existsSync(path.join(dir,'bmw-defaults')));assert(fs.readFileSync(target).equals(original));
 assert(!(await ask({cmd:'startup-mode',mode:'dashboard'})).ok);
 const hook=cp.spawnSync(process.execPath,[path.join(__dirname,'../patchd.js'),'activate'],{env,encoding:'utf8'});assert.equal(hook.status,0,hook.stderr);assert(fs.readFileSync(target).equals(original),'update activation cannot repatch defaults');
 const patch=cp.spawnSync(process.execPath,[path.join(__dirname,'../carplay_patch.js'),'apply','--target',target,'--panel','high','--yes'],{encoding:'utf8'});assert.equal(patch.status,0,patch.stderr);assert(!fs.readFileSync(target).equals(original));
 r=await ask({cmd:'restore-defaults'});assert(r.ok,r.reason);assert(fs.readFileSync(target).equals(original),'byte-exact original restored');assert.equal(fs.readFileSync(path.join(dir,'startup-mode'),'utf8'),'off\n');
 assert(/\bro\b/.test(fs.readFileSync(mounts,'utf8')),'root remounted read-only');
 const pending=path.join(dir,'activation-pending');if(fs.existsSync(pending))fs.unlinkSync(pending);
 r=await ask({cmd:'restore-defaults'});assert(r.ok,'repeat restore succeeds');
 fs.writeFileSync(target,'unknown incompatible firmware');r=await ask({cmd:'restore-defaults'});assert(!r.ok);assert.equal(fs.readFileSync(target,'utf8'),'unknown incompatible firmware');assert(fs.existsSync(path.join(dir,'bmw-defaults')));
 console.log('ok real patch daemon: pristine/idempotent restore, byte-exact revert, persistence, update suppression, startup block and incompatible firmware failure');
 }finally{daemon.kill('SIGTERM');await new Promise(resolve=>{if(daemon.exitCode!==null)resolve();else daemon.once('exit',resolve);});fs.rmSync(dir,{recursive:true,force:true});}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
