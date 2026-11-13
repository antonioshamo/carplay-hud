// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
// Atomic heartbeat file, following Cluster Layouts' map_window.js approach.
// Dedicated filename/version: old consumers cannot accidentally claim the panel.
const fs=require('fs'),path=require('path');
class MapRequest {
 constructor(o={}){this.dir=o.dir||'/dev/shm/cluster-info';this.file=path.join(this.dir,'map_focus.txt');this.now=o.now||Date.now;this.last=null;this.held=false;this.error=null;}
 update(enabled){if(!enabled){this.release();return false;}const now=this.now();if(this.last!==null&&now>=this.last&&now-this.last<200)return this.held;
  const tmp=this.file+'.'+process.pid+'.tmp';
  try{try{fs.mkdirSync(this.dir,0o1777);}catch(e){if(e.code!=='EEXIST')throw e;}fs.writeFileSync(tmp,'panel 0 0 1920 720\n',{mode:0o644});fs.renameSync(tmp,this.file);this.last=now;this.held=true;this.error=null;return true;}
  catch(e){this.error=String(e.message);try{fs.unlinkSync(tmp);}catch(_){}this.release();return false;}
 }
 release(){if(this.held)try{fs.unlinkSync(this.file);}catch(_){}this.held=false;this.last=null;}
}
module.exports={MapRequest};
