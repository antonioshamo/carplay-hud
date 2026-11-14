// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const assert=require('assert'),fs=require('fs'),os=require('os'),path=require('path'),cp=require('child_process');
const {MapRequest}=require('../map_request');
const base=fs.mkdtempSync(path.join(os.tmpdir(),'map-request-test-'));
fs.chmodSync(base,0o755);
const originalMask=process.umask(0o027);
let now=1000;
const req=new MapRequest({dir:path.join(base,'cluster-info'),now:()=>now});
function readable(){
 assert(fs.statSync(req.dir).mode&0o001,'map helper must traverse the directory under service UMask=0027');
 assert(fs.statSync(req.file).mode&0o004,'map helper must read heartbeat written under service UMask=0027');
 assert.equal(fs.statSync(req.file).mode&0o777,0o644);
 if(process.platform==='linux'&&process.getuid()===0){
  const r=cp.spawnSync(process.execPath,['-e',"process.stdout.write(require('fs').readFileSync(process.argv[1],'utf8'))",req.file],{uid:65534,gid:65534,encoding:'utf8'});
  assert.equal(r.status,0,r.stderr);assert.equal(r.stdout,'panel 0 0 1920 720\n');
 }
}
try{
 assert(req.update(true));readable();
 // Repeated atomic replacements must preserve access, not only the first file.
 for(let i=0;i<4;i++){now+=250;assert(req.update(true));readable();}
 // Repair a directory left by a release that inherited the root service mask.
 fs.chmodSync(req.dir,0o750);now+=250;assert(req.update(true));readable();
 assert.equal(fs.statSync(req.dir).mode&0o777,0o751,'only traversal is added to an existing directory');
 req.release();assert(!fs.existsSync(req.file));
 assert.equal(fs.readdirSync(req.dir).length,0,'no temporary heartbeat files remain');
 // A pre-existing path redirected outside the shared directory is rejected.
 fs.rmdirSync(req.dir);const elsewhere=path.join(base,'elsewhere');fs.mkdirSync(elsewhere,0o700);fs.symlinkSync(elsewhere,req.dir);
 now+=250;assert.equal(req.update(true),false);assert(req.error);assert.equal(fs.readdirSync(elsewhere).length,0);
 fs.unlinkSync(req.dir);fs.rmdirSync(elsewhere);
 console.log('ok service umask, cross-account read when root, atomic refresh, existing-directory repair, cleanup and symlink rejection');
}finally{process.umask(originalMask);req.release();if(fs.existsSync(req.dir))fs.rmdirSync(req.dir);fs.rmdirSync(base);}
