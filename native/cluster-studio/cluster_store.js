// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const M=require('./shared/studio_model');
function empty(){return {schema:2,generation:'source-cluster-v2',enabled:false,output:'panel',design:M.defaultDesign(),slots:[null,null,null,null,null]};}
function validate(v){
 if(!v||v.schema!==2||v.generation!=='source-cluster-v2'||typeof v.enabled!=='boolean'||v.output!=='panel'||!Array.isArray(v.slots)||v.slots.length!==5)throw Error('Invalid source cluster save');
 return {schema:2,generation:v.generation,enabled:v.enabled,output:'panel',design:M.validate(v.design),slots:v.slots.map(d=>d===null?null:M.validate(d))};
}
function syncDir(file){const fd=fs.openSync(path.dirname(file),'r');try{fs.fsyncSync(fd);}finally{fs.closeSync(fd);}}
function save(file,v){const data=validate(v),tmp=file+'.tmp';fs.writeFileSync(tmp,JSON.stringify(data)+'\n',{mode:384});const fd=fs.openSync(tmp,'r');try{fs.fsyncSync(fd);}finally{fs.closeSync(fd);}fs.renameSync(tmp,file);syncDir(file);return data;}
function load(file){
 let raw;try{raw=fs.readFileSync(file);}catch(e){if(e.code==='ENOENT')return empty();throw e;}
 let old;try{old=JSON.parse(raw);}catch(e){throw Error('Cluster save is unreadable; original file kept');}
 if(old.schema===2)return validate(old);
 if(old.schema!==1||typeof old.enabled!=='boolean'||!old.design||!Array.isArray(old.slots)||old.slots.length!==5)throw Error('Unknown cluster save format; original file kept');
 // Keep an exact, immutable copy BEFORE replacing a legacy document. Neither
 // the old enabled flag, old startup animation nor old widget code is imported.
 const hash=crypto.createHash('sha256').update(raw).digest('hex').slice(0,16);
 const backup=file+'.legacy-'+hash+'.json';
 try{fs.writeFileSync(backup,raw,{flag:'wx',mode:384});const fd=fs.openSync(backup,'r');try{fs.fsyncSync(fd);}finally{fs.closeSync(fd);}syncDir(backup);}
 catch(e){if(e.code!=='EEXIST')throw e;if(!fs.readFileSync(backup).equals(raw))throw Error('Legacy backup does not match; original save kept');}
 const next=empty();next.design.name='My cluster';return save(file,next);
}
module.exports={empty,validate,save,load};
