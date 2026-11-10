// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const assert=require('assert'),EventEmitter=require('events');
const kit=require('../src/kit_record.js'),{RenderClient}=require('../src/mgu_render_client.js');
const {HudScreen}=require('../src/hud_screen.js'),{SettingsControl}=require('../src/settings_control.js');
const Car=require('../src/car_model.js');
const IM=10,DROP=11,PM=0x4d520003,PX=0x4d520004,FRAME=7;
function transport(pixmap){
 const packets=[],client=new RenderClient('test',console,{kit});client.ready=client.native=true;client.placement={w:1600,h:580};client.info={pixmap,pixmapSide:1024};client._write=b=>{packets.push(b);return true;};
 const size=600*300*4,slots=[0,1].map(()=>Object.assign(kit.makeImage(600,300,Buffer.alloc(size)),{stream:true,generation:0}));
 try{
  for(let n=0;n<96;n++){
   const image=slots[n%2],data=Buffer.alloc(size,n);image.data=data;image.prepared=Buffer.from(data);image.generation++;
   const r=new kit.Recorder(1600,580);r.image(image,524,136,600,300);client.frame(r);
   assert.equal(packets[packets.length-1].readUInt32LE(0),FRAME,'publish frame after complete image upload');
   if(pixmap)assert.equal(packets[packets.length-2].readUInt32LE(0),PX,'upload to reusable pixel buffer');
   client.waiting=false;
  }
  const count=t=>packets.filter(p=>p.readUInt32LE(0)===t).length;
  assert.equal(count(DROP),0,'rotation never removes the visible image');assert.equal(client.sent.image.size,2);
  if(pixmap){assert.equal(count(PM),2,'two native texture allocations for all 96 views');assert.equal(count(PX),96);assert.equal(count(IM),0);}
  else assert.equal(count(IM),96,'compatible image path on older renderers');
  assert(client.imageBytes===2*size);
  const n=packets.length,r=new kit.Recorder(1600,580);r.image(slots[1],0,0,600,300);client.frame(r);assert.equal(packets.length,n+1,'unchanged car sends only drawing commands');
  client._reset();client.frame(r);assert(packets.slice(n+1).some(p=>p.readUInt32LE(0)===(pixmap?PX:IM)),'reconnect restores complete pixels');
 }finally{slots.forEach(kit.dropImage);client.close();}
}
transport(true);transport(false);
// Preview/native parity must not brighten or double-darken tinted windows.
const {Canvas}=require('../src/kit_canvas.js'),raw=Buffer.from([40,70,110,255,120,80,40,128,40,20,60,64,0,0,0,0]),prepared=Buffer.from(raw);
for(let i=0;i<raw.length;i+=4)for(let k=0;k<3;k++)prepared[i+k]=Math.floor((raw[i+k]*raw[i+3]+127)/255);
for(const scale of [.5,1,1.7,3]){const a=new Canvas(16,16),b=new Canvas(16,16);a.clear('#405587');b.clear('#405587');a.image({w:2,h:2,data:raw},1,2,2*scale,2*scale,0,.7);b.image({w:2,h:2,data:prepared,premultiplied:true},1,2,2*scale,2*scale,0,.7);for(let i=0;i<a.d.length;i++)assert(Math.abs(a.d[i]-b.d[i])<=2,'prepared alpha retains the same colors and tint');}
// The input target must advance even while the renderer has not acknowledged
// its prior frame; advancing an image buffer must wait for that acknowledgement.
const gpu=new EventEmitter();for(const k of ['fps','claim','grab','show','close'])gpu[k]=()=>{};
let frames=0,gets=0,wanted=45;gpu.frame=()=>{frames++;gpu.waiting=true;};
const control=new SettingsControl({log:{info(){},warn(){}}}),h=new HudScreen({control,log:{warn(){},info(){}},proxies(){}},{client:gpu});h.carModel.close();
const poster=require('../src/cockpit_car.js')();h.carModel={current:poster,get:angle=>{gets++;wanted=angle;return poster;},request:angle=>{wanted=angle;},close(){}};
try{
 h.ready=h.active=h.artworkReady=true;h.render();const initial=frames;h._touch('down',800,250);
 for(let i=1;i<=40;i++)h._touch('move',800+i*4,250);
 assert.equal(wanted,125,'input target advances while the display is busy');assert.equal(gets,1);assert.equal(frames,initial,'no image/frame queue builds up');
 gpu.waiting=false;gpu.emit('tick');assert.equal(gets,2);assert.equal(frames,initial+1);
 h._model();h._model();assert.equal(gets,2,'control lookup cannot rotate display buffers');
}finally{h.close();control.close();}
console.log('ok reusable native/fallback image uploads, unchanged-frame/reconnect behavior and latest-angle input under renderer backpressure');
