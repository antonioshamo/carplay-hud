// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const cp=require('child_process');
const TAG='shamo-parked-media';
// Only our tagged rule in the existing input chain. No policy/chain changes.
function run(args){return new Promise((resolve,reject)=>cp.execFile('nft',args,{timeout:2000,maxBuffer:1024*1024},(err,out)=>err?reject(Error('Could not update the parked-video Wi-Fi rule')):resolve(out)));}
class MediaFirewall {
 constructor(exec){this.exec=exec||run;this.queue=Promise.resolve();}
 set(iface,address,port){
  const job=async()=>{
   const out=await this.exec(['-a','list','chain','ip','filter','input']);
   for(const line of out.split('\n')){const m=line.includes('comment "'+TAG+'"')&&/# handle (\d+)\s*$/.exec(line);if(m)await this.exec(['delete','rule','ip','filter','input','handle',m[1]]);}
   if(!iface)return;
   if(!/^(wlan|wl|ap|wifi|p2p)[a-zA-Z0-9_.-]*$/.test(iface)||!/^\d{1,3}(\.\d{1,3}){3}$/.test(address)||port!==5882)throw Error('Invalid parked-video network scope');
   await this.exec(['insert','rule','ip','filter','input','iifname','"'+iface+'"','ip','daddr',address,'tcp','dport','5882','accept','comment','"'+TAG+'"']);
  };
  this.queue=this.queue.then(job,job);return this.queue;
 }
}
if(require.main===module)new MediaFirewall().set().catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={MediaFirewall};
