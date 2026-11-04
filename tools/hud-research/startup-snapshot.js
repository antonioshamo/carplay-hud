#!/usr/bin/env node
// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
// Read-only head-unit snapshot. Output may contain private diagnostic data:
// keep it outside the repository. Never starts navigation or changes a patch.
const fs=require('fs'),net=require('net'),crypto=require('crypto');
function request(socketPath,command,event,timeout) {
 if(!['logs','capture-status'].includes(command))return Promise.reject(new Error('Read-only command required'));
 return new Promise((resolve,reject)=>{
  const socket=net.connect(socketPath);let data='',bytes=0,done=false;
  const timer=setTimeout(()=>finish(new Error('Diagnostic socket timed out')),timeout||4000);
  function finish(error,value){if(done)return;done=true;clearTimeout(timer);socket.destroy();error?reject(error):resolve(value);}
  socket.on('connect',()=>socket.write(JSON.stringify({cmd:command})+'\n'));
  socket.on('error',error=>finish(error));
  socket.on('end',()=>finish(new Error('Diagnostic socket closed before replying')));
  socket.on('data',chunk=>{
   bytes+=chunk.length;if(bytes>2*1024*1024)return finish(new Error('Diagnostic reply exceeds limit'));
   data+=chunk.toString('utf8');let end;
   while((end=data.indexOf('\n'))!==-1){
    const line=data.slice(0,end);data=data.slice(end+1);
    let value;try{value=JSON.parse(line);}catch(e){return finish(new Error('Invalid diagnostic JSON'));}
    if(value.ev===event)return finish(null,value);
   }
  });
 });
}
function read(file){
 try{const stat=fs.statSync(file);if(!stat.isFile()||stat.size>65536)throw new Error('Unexpected file size');
  return {modifiedAt:stat.mtime.toISOString(),value:JSON.parse(fs.readFileSync(file,'utf8'))};
 }catch(e){return {unavailable:e.code||e.message};}
}
async function snapshot(){
 const result={schema:1,at:new Date().toISOString(),
  status:read('/run/waze-on-cluster/status.json'),
  stream:read('/run/waze-on-cluster/stream.json')};
 try{const file='/usr/bin/carplay',stat=fs.statSync(file);
  if(!stat.isFile()||stat.size>32*1024*1024)throw new Error('Unsupported executable size');
  result.carplay={bytes:stat.size,sha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')};
 }catch(e){result.carplay={unavailable:e.code||e.message};}
 try{result.logs=await request('/dev/shm/waze-on-cluster/patch.sock','logs','logs');}
 catch(e){result.logs={unavailable:e.code||e.message};}
 return result;
}
if(require.main===module){
 if(process.platform!=='linux'){console.error('Run on the head unit over the existing private SSH connection');process.exitCode=1;}
 else snapshot().then(value=>process.stdout.write(JSON.stringify(value,null,2)+'\n')).catch(e=>{console.error(e.message);process.exitCode=1;});
}
module.exports={request,snapshot};
