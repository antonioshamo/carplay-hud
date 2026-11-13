// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
// Wire-level renderer fixture. No BMW compositor is simulated.
const net=require('net'),fs=require('fs');
function message(type,payload){
 const b=Buffer.alloc(8+payload.length);b.writeUInt32LE(type,0);b.writeUInt32LE(payload.length,4);payload.copy(b,8);return b;
}
function words(type,values){return message(type,Buffer.from(new Uint32Array(values).buffer));}
class FakeGraphics {
 constructor(path,caps=7){this.path=path;this.caps=caps;this.modes=1;this.clients=new Set();this.received=[];this.ack=true;this.onScreen=true;this.front=true;}
 listen(){
  this.server=net.createServer(s=>{
   this.clients.add(s);let input=Buffer.alloc(0),shown=false,hasFrame=false;
   const state=()=>s.write(words(0x4d520102,[1,shown&&hasFrame&&this.onScreen?1:0,this.front?1:0]));s.on('error',()=>{});s.on('close',()=>this.clients.delete(s));
   s.on('data',data=>{
    input=Buffer.concat([input,data]);
    while(input.length>=8&&input.length>=8+input.readUInt32LE(4)){
     const type=input.readUInt32LE(0),n=input.readUInt32LE(4),p=Buffer.from(input.slice(8,8+n));input=input.slice(8+n);
     this.received.push({type,payload:p});
     if(type===1){
      s.write(words(0x4d520101,[1,this.modes,this.caps,0,0,0,0,160,100,1600,580,2048,60000]));
      s.write(words(101,[1,1920,720]));state();
     }
     if(type===3){shown=!!p.readUInt32LE(0);state();}
     if(type===7){hasFrame=true;state();if(this.ack)s.write(words(102,[1,16]));}
    }
   });
  });return new Promise((resolve,reject)=>{this.server.on('error',reject);this.server.listen(this.path,resolve);});
 }
 send(type,payload){for(const s of this.clients)s.write(message(type,payload));}
 touch(phase,x,y){const p=Buffer.alloc(12);p.writeUInt32LE(phase);p.writeFloatLE(x,4);p.writeFloatLE(y,8);this.send(105,p);}
 ccu(seq,knob,press=0,tilt=0){const p=Buffer.alloc(8);p[0]=seq;p.writeUInt16BE(knob,1);p[3]=press;p[4]=tilt;this.send(0x4d520103,p);}
 count(t){return this.received.filter(m=>m.type===t).length;}
 last(t){return this.received.filter(m=>m.type===t).slice(-1)[0];}
 async close(){for(const s of this.clients)s.destroy();if(this.server)await new Promise(r=>this.server.close(r));try{fs.unlinkSync(this.path);}catch(e){}}
}
module.exports={FakeGraphics};
