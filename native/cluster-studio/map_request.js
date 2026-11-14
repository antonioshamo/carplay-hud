// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
// Atomic heartbeat file, following Cluster Layouts' map_window.js approach.
// Dedicated filename/version: old consumers cannot accidentally claim the panel.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
class MapRequest {
 constructor(o={}){this.dir=o.dir||'/dev/shm/cluster-info';this.file=path.join(this.dir,'map_focus.txt');this.now=o.now||Date.now;this.last=null;this.held=false;this.error=null;}
 update(enabled){
  if(!enabled){this.release();return false;}
  const now=this.now();if(this.last!==null&&now>=this.last&&now-this.last<200)return this.held;
  let tmp,fd,dirFd;
  try{
   try{fs.mkdirSync(this.dir,0o755);}catch(e){if(e.code!=='EEXIST')throw e;}
   dirFd=fs.openSync(this.dir,fs.constants.O_RDONLY|fs.constants.O_DIRECTORY|fs.constants.O_NOFOLLOW);
   const stat=fs.fstatSync(dirFd);
   if(!stat.isDirectory())throw Error('Map request directory is not a directory');
   // Cluster Studio runs as root with UMask=0027. The hmi_5000 map helper
   // needs traversal only; preserve the shared directory's other permissions.
   if(!(stat.mode&0o001))fs.fchmodSync(dirFd,(stat.mode&0o7777)|0o001);
   fs.closeSync(dirFd);dirFd=undefined;
   tmp=this.file+'.'+process.pid+'.'+crypto.randomBytes(8).toString('hex')+'.tmp';
   fd=fs.openSync(tmp,fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_EXCL|fs.constants.O_NOFOLLOW,0o600);
   fs.writeFileSync(fd,'panel 0 0 1920 720\n');
   // Explicit mode after creation: the service mask must not remove the
   // other account's read bit on each atomic heartbeat replacement.
   fs.fchmodSync(fd,0o644);fs.closeSync(fd);fd=undefined;
   fs.renameSync(tmp,this.file);tmp=null;
   this.last=now;this.held=true;this.error=null;return true;
  }catch(e){this.error=String(e.message);this.release();return false;}
  finally{
   if(fd!==undefined)try{fs.closeSync(fd);}catch(_){}
   if(dirFd!==undefined)try{fs.closeSync(dirFd);}catch(_){}
   if(tmp)try{fs.unlinkSync(tmp);}catch(_){}
  }
 }
 release(){if(this.held)try{fs.unlinkSync(this.file);}catch(_){}this.held=false;this.last=null;}
}
module.exports={MapRequest};
