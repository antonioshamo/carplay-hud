// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const assert=require('assert'),fs=require('fs'),os=require('os'),path=require('path'),http=require('http');
const {inspect}=require('../capabilities.js'),{ParkedMedia,atlas,wifiAddress,W,H,BYTES}=require('../parked_media.js');
const db={interfaces:{'de.bmw.InteriorLighting':{serviceId:12,fields:{ambientColor:{getter:1,setter:2,dataRef:'Color'}}},'de.bmw.CarPlayManager':{fields:{videoMode:{getter:1,dataRef:'Mode'}}},'de.bmw.Private':{fields:{vin:{getter:1}}}},datatypes:{Color:{type:'enum',items:{BLUE:1,WHITE:2}},Mode:{type:'struct',members:[{name:'value',dataRef:'Mode'}]}}};
const report=inspect(db);assert.equal(report.lighting,1);assert.equal(report.media,1);assert.equal(report.types.Color.items.BLUE,1);assert(!JSON.stringify(report).includes('vin'));assert(report.readOnly);assert.throws(()=>inspect({interfaces:[]}));
assert.equal(wifiAddress({socnet0:[{family:'IPv4',address:'10.1.1.1'}],wlan0:[{family:'IPv4',address:'192.168.1.3'}]}),'192.168.1.3');assert.equal(wifiAddress({wlan0:[{family:'IPv4',address:'8.8.8.8'}]}),null);
const bytes=Buffer.alloc(BYTES);bytes.fill(42,0,W*H);bytes.fill(77,W*H,W*H*1.25);bytes.fill(177,W*H*1.25);const packed=atlas(bytes);assert.equal(packed[W*H],77);assert.equal(packed[W*H+W/2],177);assert.equal(packed[BYTES-1],177);
async function run(){
 const {MediaFirewall}=require('../media_firewall.js'),calls=[];const fw=new MediaFirewall(async a=>{calls.push(a);return a[0]==='-a'?'iifname lo accept # handle 2\n tcp dport 5882 accept comment \"shamo-parked-media\" # handle 9\n':'';});
 await fw.set('wlan_bridge','172.16.222.97',5882);assert(calls.some(a=>a.join(' ')==='delete rule ip filter input handle 9'));assert(!calls.some(a=>a[0]==='delete'&&a[a.length-1]==='2'));assert(calls.some(a=>a.includes('172.16.222.97')&&a.includes('\"wlan_bridge\"')));await assert.rejects(fw.set('socnet0','10.1.1.1',5882),/Invalid/);await fw.set();
 console.log('ok scoped Wi-Fi rule, tagged cleanup and vehicle-network rejection');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'studio-media-'));let now=10000,parked=true;
 const cr={ready:true,targets:'map:1088x480,panel:1920x720,hud:800x480',layers:new Map(),seq:0,video(o){this.layers.set(++this.seq,o);return this.seq;},frame(ref,b){assert.equal(b.length,BYTES);assert(this.layers.has(ref));},set(ref,o){Object.assign(this.layers.get(ref),o);},drop(ref){this.layers.delete(ref);}};
 const engine={hud:'idle',panelUntil:0},media=new ParkedMedia({cr,engine,telemetry:{parked:()=>parked},now:()=>now,file:path.join(dir,'frames'),address:'127.0.0.1',port:0});
 function req(route,body,auth,origin){return new Promise((resolve,reject)=>{const u=new URL(media.base+route),r=http.request(u,{method:'POST',headers:{Host:u.host,Origin:origin||media.base,Authorization:auth===undefined?'Bearer '+media.token:auth,'Content-Type':body?'application/octet-stream':'application/json','Content-Length':body?body.length:2,'X-Sequence':String(media.lastSequence+1)}},res=>{let text='';res.on('data',b=>text+=b);res.on('end',()=>resolve({code:res.statusCode,data:JSON.parse(text)}));});r.on('error',reject);r.end(body||'{}');});}
 try{
  parked=false;await assert.rejects(media.start('center'),/fresh/);parked=true;await media.start('center');assert.equal((await req('/status',null,'bad')).code,403);assert.equal((await req('/status',null,undefined,'https://evil.invalid')).code,403);
  assert.equal((await req('/frame',bytes)).code,200);const file=fs.readFileSync(media.file);assert.equal(file.readUInt32LE(0),0x4656474d);assert.equal(file.readUInt32LE(16),1);assert.deepEqual(file.slice(64+BYTES,64+BYTES*2),bytes);assert(media.state().playing);
  assert.throws(()=>media.frame(bytes,0),/out-of-order/);assert.equal((await req('/frame',Buffer.alloc(4))).code,400);
  const firstGeneration=media.state().generation;now+=1600;media.tick();assert(!fs.existsSync(media.file));assert(!media.state().playing);
  now+=100;media.frame(bytes,20);assert(media.state().generation>firstGeneration,'new shared-file generation after pause');parked=false;media.tick();assert(!media.server);assert(!fs.existsSync(media.file));assert.equal(media.token,null);
  parked=true;await media.start('map');media.frame(bytes,0);assert.equal(cr.layers.size,1);assert.equal(cr.layers.get(media.ref).stall_ms,1000);media.place({x:0,y:0,w:.4,h:.4});assert(cr.layers.get(media.ref).w<=1088*.4);assert.throws(()=>media.place({x:1,y:0,w:1,h:1}));
  now+=300001;media.tick();assert.equal(cr.layers.size,0);assert(!media.server);
  engine.hud='shown';await assert.rejects(media.start('panel'),/HUD/);engine.hud='idle';await media.start('panel');media.frame(bytes,0);engine.hud='shown';media.tick();assert.equal(cr.layers.size,0);assert(!media.server);
  engine.hud='idle';await media.start('hud');media.frame(bytes,0);cr.ready=false;media.tick();assert(!media.server);assert.equal(cr.layers.size,0);
  console.log('ok real HTTP pairing/origin gates, bounded frames, I420 layout, movement/stale playback/expiry, HUD conflict, placement and cleanup');
 }finally{media.stop();fs.rmSync(dir,{recursive:true,force:true});}
}
console.log('ok read-only bounded capability discovery, enum schema, privacy filtering, private Wi-Fi selection and YUV atlas');
run().catch(e=>{console.error(e.stack);process.exitCode=1;});
