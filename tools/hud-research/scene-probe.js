#!/usr/bin/env node
// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
// Offline, read-only inventory. Candidate RIP references are NOT proven
// instruction boundaries or safe patch sites. Never modifies an executable.
const fs=require('fs'),crypto=require('crypto');
const LIMIT=16*1024*1024;
const PATTERNS=[
 ['map-only','maps:/car/instrumentcluster/map'],
 ['cards','maps:/car/instrumentcluster/instructioncard'],
 ['map-and-cards','maps:/car/instrumentcluster'],
 ['initial-url-key','initialURL'],['show-ui-key','showUI'],['suggest-ui-key','suggestUI']
];
function inspect(b){
 if(!Buffer.isBuffer(b)||b.length<64||b.length>LIMIT)throw new Error('Unsupported file size');
 if(b.readUInt32BE(0)!==0x7f454c46||b[4]!==2||b[5]!==1||b.readUInt16LE(18)!==62)throw new Error('Expected little-endian x86-64 ELF');
 const u64=o=>{if(o+8>b.length||b.readUInt32LE(o+4)!==0)throw new Error('Unsupported ELF range');return b.readUInt32LE(o);};
 const off=u64(32),step=b.readUInt16LE(54),count=b.readUInt16LE(56);
 if(step<56||count>1024||off+step*count>b.length)throw new Error('Invalid ELF headers');
 const loads=[];
 for(let i=0;i<count;i++){
  const p=off+i*step;
  if(b.readUInt32LE(p)!==1)continue;
  const s={offset:u64(p+8),va:u64(p+16),size:u64(p+32),exec:!!(b.readUInt32LE(p+4)&1)};
  if(s.offset+s.size>b.length)throw new Error('Truncated ELF load segment');
  loads.push(s);
 }
 const strings=[];
 PATTERNS.forEach(([name,text])=>{
  let pos=-1;
  while((pos=b.indexOf(text,pos+1,'ascii'))!==-1){
   const next=b[pos+text.length];
   if(next!==0 && !(name.startsWith('map')||name==='cards') )continue;
   if((name.startsWith('map')||name==='cards')&&next!==0&&next!==63)continue;
   const seg=loads.find(s=>pos>=s.offset&&pos<s.offset+s.size);
   if(seg)strings.push({name,offset:pos,address:seg.va+pos-seg.offset,candidateReferences:[]});
  }
 });
 loads.filter(s=>s.exec).forEach(s=>{
  for(let p=s.offset;p+7<=s.offset+s.size;p++){
   if((b[p]&0xf8)!==0x48||b[p+1]!==0x8d||(b[p+2]&0xc7)!==5)continue;
   const destination=s.va+p-s.offset+7+b.readInt32LE(p+3);
   strings.forEach(x=>{if(x.address===destination&&x.candidateReferences.length<64)x.candidateReferences.push(p);});
  }
 });
 return {schema:1,sha256:crypto.createHash('sha256').update(b).digest('hex'),bytes:b.length,strings,
  conclusion:'Static constants and candidate references only; active scene and route-free behavior are not established'};
}
if(require.main===module){
 try{
  if(process.argv.length!==3)throw new Error('Usage: node scene-probe.js PRIVATE-COPY-OF-carplay');
  const f=process.argv[2],s=fs.statSync(f);
  if(!s.isFile()||s.size>LIMIT)throw new Error('Unsupported file size');
  console.log(JSON.stringify(inspect(fs.readFileSync(f)),null,2));
 }catch(e){console.error(e.message);process.exitCode=1;}
}
module.exports={inspect};
