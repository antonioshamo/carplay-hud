// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const fs=require('fs'),http=require('http'),os=require('os'),crypto=require('crypto');
const {MediaFirewall}=require('./media_firewall.js');
const {PANEL_BLOCK}=require('./display_policy.js');
const W=640,H=360,BYTES=W*H*3/2,FILE='/dev/shm/mgu-video-shamo-clips';
function wifiAddress(ifaces){
 for(const name of Object.keys(ifaces).sort((a,b)=>(b==='wlan_bridge')-(a==='wlan_bridge')))if(/^(wlan|wl|ap|wifi|p2p)/i.test(name))for(const a of ifaces[name])if(a.family==='IPv4'&&!a.internal&&/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(a.address))return a.address;
 return null;
}
function atlas(i420){
 const out=Buffer.alloc(BYTES),y=W*H,plane=y/4; i420.copy(out,0,0,y);
 for(let row=0;row<H/2;row++){i420.copy(out,y+row*W,y+row*W/2,y+(row+1)*W/2);i420.copy(out,y+row*W+W/2,y+plane+row*W/2,y+plane+(row+1)*W/2);}
 return out;
}
class ParkedMedia {
 constructor(o){this.o=o;this.firewall=o.firewall||(process.platform==='linux'?new MediaFirewall():null);this.now=o.now||Date.now;this.file=o.file||FILE;this.target='center';this.note='Off';this.server=null;this.sockets=new Set();this.ref=null;this.fd=null;this.seq=0;this.generation=0;this.lastFrame=0;this.deadline=0;this.token=null;this.urls=[];this.rect={x:.15,y:.15,w:.7,h:.7};this.report=null;}
 state(){return {active:!!this.server,target:this.target,note:this.note,urls:this.urls,frames:this.seq,generation:this.generation,playing:!!this.lastFrame&&this.now()-this.lastFrame<1500,remaining:Math.max(0,Math.ceil((this.deadline-this.now())/1000)),rect:this.rect};}
 allowed(){
  if(this.target==='panel')throw Error(PANEL_BLOCK);
  if(!this.o.telemetry.parked())throw Error('Video needs fresh speed 0 and gear P');
  if(this.o.engine.panelUntil)throw Error('End the full-cluster gauge test before playing a clip');
  if(this.target!=='center'&&this.target!=='design'){
   const cr=this.o.cr,geometry={map:'1088x480',panel:'1920x720',hud:'800x480'}[this.target];
   if(!cr.ready||!(cr.targets||'').split(',').includes(this.target+':'+geometry))throw Error('Requested display is unavailable');
   if(this.target==='panel'&&!['idle','released'].includes(this.o.engine.hud))throw Error('Turn off the HUD map before a full-cluster video test');
  }
 }
 async start(target){
  if(!['center','map','panel','hud','design'].includes(target))throw Error('Unknown video display');
  this.stop();this.target=target;this.allowed();
  const ifaces=os.networkInterfaces(),address=this.o.address||wifiAddress(ifaces),iface=Object.keys(ifaces).find(n=>ifaces[n].some(a=>a.address===address));if(!address)throw Error('Connect your phone to the car Wi-Fi; no private Wi-Fi address found');
  this.token=crypto.randomBytes(24).toString('hex');this.deadline=this.now()+300000;this.seq=0;this.lastSequence=-1;
  const server=http.createServer((req,res)=>this.request(req,res));this.server=server;
  server.on('connection',s=>{if(this.sockets.size>=4){s.destroy();return;}this.sockets.add(s);s.on('close',()=>this.sockets.delete(s));});
  server.setTimeout(3000,s=>s.destroy());
  try{await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(this.o.port===undefined?5882:this.o.port,address,resolve);});if(this.firewall&&!this.o.address)await this.firewall.set(iface,address,5882);this.allowed();}
  catch(e){this.stop();throw Error('Phone video listener failed: '+e.message);}
  if(this.server!==server)throw Error('Video session was cancelled');
  this.o.engine.suspendedMedia=target!=='design';
  this.base='http://'+address+':'+server.address().port;
  this.urls=[this.base+'/#'+this.token];this.note=target==='design'?'Scan the code to edit your design. Five-minute parked session.':'Scan the code and choose a saved clip. Five-minute parked session.';
  return this.state();
 }
 clearFrame(){
  if(this.ref)this.o.cr.drop(this.ref);this.ref=null;
  if(this.fd!==null){fs.closeSync(this.fd);this.fd=null;}try{fs.unlinkSync(this.file);}catch(e){if(e.code!=='ENOENT')this.note='Could not remove video frame file';}
  this.lastFrame=0;
 }
 stop(reason){this.o.engine.suspendedMedia=false;this.clearFrame();this.token=null;this.urls=[];this.deadline=0;if(this.server)this.server.close();this.server=null;this.sockets.forEach(s=>s.destroy());this.sockets.clear();this.note=reason||'Off';if(this.firewall&&!this.o.address)this.firewall.set().catch(e=>{this.note=e.message;});}
 tick(){
  if(!this.server)return;
  try{this.allowed();if(this.now()>=this.deadline)throw Error('Five-minute test ended');}catch(e){this.stop(e.message);return;}
  if(this.lastFrame&&this.now()-this.lastFrame>=1500){this.clearFrame();this.note='Paused — no fresh video frames';}
 }
 place(rect){
  if(!rect||!['x','y','w','h'].every(k=>Number.isFinite(rect[k]))||rect.x<0||rect.y<0||rect.w<.2||rect.h<.2||rect.x+rect.w>1.00001||rect.y+rect.h>1.00001)throw Error('Invalid video placement');
  this.rect={x:rect.x,y:rect.y,w:rect.w,h:rect.h};if(this.ref)this.o.cr.set(this.ref,this.geometry());
 }
 geometry(){const size={map:[1088,480],panel:[1920,720],hud:[800,480]}[this.target],r=this.rect;let w=size[0]*r.w,h=w*H/W;if(h>size[1]*r.h){h=size[1]*r.h;w=h*W/H;}return {x:Math.round(size[0]*r.x+(size[0]*r.w-w)/2),y:Math.round(size[1]*r.y+(size[1]*r.h-h)/2),w:Math.round(w),h:Math.round(h)};}
 frame(bytes,sequence){
  this.allowed();if(this.target==='design')throw Error('Phone designer does not accept video');if(!this.server||this.now()>=this.deadline)throw Error('Session expired');
  if(bytes.length!==BYTES||!Number.isSafeInteger(sequence)||sequence<0||sequence<=this.lastSequence)throw Error('Invalid or out-of-order video frame');
  if(this.lastFrame&&this.now()-this.lastFrame<45)throw Error('Video frame rate exceeds limit');
  if(this.target==='center'){
   if(this.fd===null){this.generation++;this.fd=fs.openSync(this.file,'wx',420);fs.ftruncateSync(this.fd,64+3*BYTES);this.slot=0;const header=Buffer.alloc(64);[0x4656474d,1,W,H,0,0,3,0,0].forEach((v,i)=>header.writeUInt32LE(v,i*4));fs.writeSync(this.fd,header,0,64,0);}
   this.slot=(this.slot+1)%3;fs.writeSync(this.fd,bytes,0,BYTES,64+this.slot*BYTES);
   const word=Buffer.alloc(4);word.writeUInt32LE(this.slot,0);fs.writeSync(this.fd,word,0,4,20);word.writeUInt32LE(this.seq+1,0);fs.writeSync(this.fd,word,0,4,16);
  }else{
   if(!this.ref)this.ref=this.o.cr.video(Object.assign({target:this.target,klass:'content',z:6,vw:W,vh:H,fps:15,stall_ms:1000,exclusive:false,contend:false},this.geometry()));
   this.o.cr.frame(this.ref,atlas(bytes));
  }
  this.lastSequence=sequence;this.seq++;this.lastFrame=this.now();this.note='Receiving phone video · 640 × 360 · up to 15 fps';
 }
 request(req,res){
  const end=(code,message)=>{res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({message}));};
  if(!this.base||req.headers.host!==this.base.slice(7)){end(403,'Wrong host');return;}
  if(req.method==='GET'&&req.url==='/'){
   res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY','Content-Security-Policy':"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; media-src blob: https:; connect-src 'self'; img-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"});res.end(fs.readFileSync(__dirname+(this.target==='design'?'/phone_design.html':'/phone_media.html')));return;
  }
  if(!this.token||req.headers.authorization!=='Bearer '+this.token||req.headers.origin!==this.base){end(403,'Pair again using the code on the car');return;}
  if(req.method==='POST'&&req.url==='/status'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(this.state()));return;}
  if(req.method==='POST'&&req.url==='/report'){
   res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(this.report||{note:'Run the feature scan in the car first.'}));return;
  }
  if(req.method==='POST'&&['/design','/design/save'].includes(req.url)){
   try{this.allowed();if(this.now()>=this.deadline||this.target!=='design'||!this.o.designRead)throw Error('Open a phone designer session first');}catch(e){end(409,e.message);return;}
   if(req.url==='/design'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(this.o.designRead()));return;}
   if(req.headers['content-type']!=='application/json'){end(400,'Use a design document');req.resume();return;}
   const chunks=[];let bytes=0;req.on('data',b=>{bytes+=b.length;if(bytes>32768){req.destroy();return;}chunks.push(b);});
   req.on('end',()=>{try{
    this.allowed();if(!this.server||this.now()>=this.deadline||this.target!=='design')throw Error('Session expired');
    const body=JSON.parse(Buffer.concat(chunks).toString('utf8'));
    const result=this.o.designSave({id:1,cmd:body.slot===undefined?'save':'slot',slot:body.slot,design:body.design});
    res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({design:result.design,slots:result.slots}));
   }catch(e){end(409,e.message);}});req.on('error',()=>{});return;
  }
  if(req.method==='POST'&&req.url==='/pause'){this.clearFrame();this.note='Paused by phone';end(200,'Paused');return;}
  if(req.method!=='POST'||req.url!=='/frame'){end(404,'Not found');return;}
  if(req.headers['content-type']!=='application/octet-stream'||Number(req.headers['content-length'])!==BYTES){end(400,'Incorrect frame size');req.resume();return;}
  const parts=[];let size=0;req.on('data',b=>{size+=b.length;if(size>BYTES){req.destroy();return;}parts.push(b);});
  req.on('end',()=>{try{this.frame(Buffer.concat(parts),Number(req.headers['x-sequence']));end(200,'Frame received');}catch(e){this.clearFrame();end(409,e.message);}});
  req.on('error',()=>{});
 }
}
module.exports={ParkedMedia,atlas,wifiAddress,W,H,BYTES,FILE};
