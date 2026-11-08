// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const EventEmitter=require('events'),net=require('net');
class StudioClient extends EventEmitter {
 constructor(socket){super();this.path=socket||'/run/cluster-studio/control.sock';this.status=null;this.socket=null;this.closed=true;this.seq=0;this.pending=null;this.retry=null;}
 connect(){clearTimeout(this.retry);this.retry=null;this.closed=false;if(this.socket)return;const s=net.connect(this.path);this.socket=s;let buf='';s.setEncoding('utf8');s.on('error',()=>{});
 // A change listener can close/reopen settings while this packet is being
 // parsed. Check the session for every message, not just the data event.
 s.on('data',d=>{if(this.closed||this.socket!==s)return;buf+=d;if(buf.length>131072){s.destroy();return;}let i;while(!this.closed&&this.socket===s&&(i=buf.indexOf('\n'))>=0){try{const m=JSON.parse(buf.slice(0,i));if(m.ev==='status'){this.status=m;this.statusAt=Date.now();this.emit('change');}else if(m.ev==='reply'&&this.pending&&m.id===this.pending.id){const p=this.pending;this.pending=null;clearTimeout(p.timer);if(m.ok){if(m.status){this.status=m.status;this.statusAt=Date.now();}p.resolve(m.status);}else p.reject(Error(m.reason||'Could not save'));this.emit('change');}}catch(e){}buf=buf.slice(i+1);}});
 s.on('close',()=>{if(this.socket!==s)return;this.socket=null;this.status=null;if(this.pending){clearTimeout(this.pending.timer);this.pending.reject(Error('Helper disconnected; save not confirmed'));this.pending=null;}this.emit('change');if(!this.closed)this.retry=setTimeout(()=>{this.retry=null;if(!this.closed)this.connect();},2000);});}
 ready(){if(this.status&&!this.pending)return Promise.resolve();this.connect();return new Promise((resolve,reject)=>{const done=()=>{if(this.status&&!this.pending){clearTimeout(timer);this.removeListener('change',done);resolve();}};const timer=setTimeout(()=>{this.removeListener('change',done);reject(Error('Cluster Studio offline; cluster restore not confirmed'));},5000);this.on('change',done);done();});}
 send(cmd,extra){if(!this.socket||!this.status)return Promise.reject(Error('Install Cluster Studio 0.1.25 or newer from your Store source'));if(this.pending)return Promise.reject(Error('Wait for the previous change'));
 const id=++this.seq;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.pending=null;reject(Error('No confirmation from helper'));this.emit('change');},cmd.indexOf('climate-')===0?8000:4000);this.pending={id,resolve,reject,timer};this.socket.write(JSON.stringify(Object.assign({id,cmd},extra))+'\n');});}
 close(){this.closed=true;clearTimeout(this.retry);this.retry=null;if(this.pending){clearTimeout(this.pending.timer);this.pending.reject(Error('Settings closed'));this.pending=null;}if(this.socket)this.socket.destroy();this.socket=null;this.status=null;}
}
module.exports={StudioClient};
