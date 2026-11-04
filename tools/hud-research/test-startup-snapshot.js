// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const assert=require('assert'),net=require('net'),fs=require('fs'),os=require('os'),path=require('path');
const {request}=require('./startup-snapshot');
(async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'hud-snapshot-test-'));
 const socket=path.join(dir,'p.sock');let behavior='reply',commands=[];
 const server=net.createServer(s=>{s.on('error',()=>{});s.on('data',chunk=>{
  commands.push(JSON.parse(chunk.toString()).cmd);
  if(behavior==='reply'){s.write('{"ev":"status"}\n{"ev":"lo');s.end('gs","markers":[]}\n');}
  if(behavior==='malformed')s.end('broken\n');
  if(behavior==='large')s.end(Buffer.alloc(2*1024*1024+1,32));
 });});
 await new Promise(resolve=>server.listen(socket,resolve));
 try{
  assert.deepStrictEqual(await request(socket,'logs','logs'),{ev:'logs',markers:[]});
  await assert.rejects(request(socket,'apply','logs'),/Read-only/);
  behavior='malformed';await assert.rejects(request(socket,'logs','logs'),/Invalid diagnostic/);
  behavior='large';await assert.rejects(request(socket,'logs','logs'),/exceeds limit/);
  behavior='silent';await assert.rejects(request(socket,'logs','logs',30),/timed out/);
  assert(commands.every(c=>c==='logs'));
  console.log('PASS read-only commands, split replies, unrelated events, malformed/oversize replies and timeout');
 }finally{await new Promise(resolve=>server.close(resolve));fs.rmSync(dir,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
