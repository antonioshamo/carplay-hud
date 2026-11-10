// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
// The installed renderer is 2D. These 96 views are rendered from the owner's
// supplied GLB, not a substitute car. Decode only the latest requested angle.
const fs=require('fs'),zlib=require('zlib'),kit=require('./kit_record.js');
const COUNT=96,W=900,H=450,DEFAULT=12,ROOT='/var/opt/cluster-studio/current/assets/x4m';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function pose(){return {angle:45,zoom:1,x:0,y:0,mode:'rotate'};}
function index(angle){return ((Math.round(angle*COUNT/360)%COUNT)+COUNT)%COUNT;}
function rect(page,s){if(page==='overview'&&!s.homePage)return {x:524,y:136,w:710,h:278};if(page==='vehicle')return {x:220,y:168,w:595,h:250};return null;}
function adjust(p,action){
 if(action==='left')p.angle-=15;else if(action==='right')p.angle+=15;
 else if(action==='in')p.zoom=clamp(p.zoom+.1,.85,1.25);else if(action==='out')p.zoom=clamp(p.zoom-.1,.85,1.25);
 else if(action==='mode')p.mode=p.mode==='move'?'rotate':'move';else if(action==='reset')Object.assign(p,pose());
 p.angle=((p.angle%360)+360)%360;
}
function drag(p,start,dx,dy){if(start.mode==='move'){p.x=clamp(start.x+dx,-85,85);p.y=clamp(start.y+dy,-35,35);}else p.angle=((start.angle+dx*.5)%360+360)%360;}
class CarModel {
 constructor(change,options){this.change=change;this.root=options&&options.root||ROOT;this.read=options&&options.read||fs.readFile;this.inflate=options&&options.inflate||zlib.inflate;this.cache=new Map();this.closed=false;this.loading=false;this.wanted=DEFAULT;this.current=null;this.retryAt=0;this.error=false;}
 get(angle){
  if(this.closed)return null;
  if(!this.current){this.current=require('./cockpit_car.js')();this.cache.set(DEFAULT,this.current);}
  this.wanted=index(angle);const hit=this.cache.get(this.wanted);
  if(hit){this.cache.delete(this.wanted);this.cache.set(this.wanted,hit);this.current=hit;this.error=false;}
  else this.load();
  return this.current;
 }
 load(){
  if(this.closed||this.loading||this.cache.has(this.wanted)||Date.now()<this.retryAt)return;
  const n=this.wanted;this.loading=true;
  const done=(err,bytes)=>{
   this.loading=false;if(this.closed)return;
   if(err||!bytes||bytes.length!==W*H*4){this.error=true;this.retryAt=Date.now()+3000;this.change();return;}
   const img=kit.makeImage(W,H,bytes);this.cache.set(n,img);
   // Keep both the visible view and newest request while limiting decoded RAM.
   for(const [key,value] of this.cache){if(this.cache.size<=6)break;if(value!==this.current&&key!==n){kit.dropImage(value);this.cache.delete(key);}}
   if(n===this.wanted){this.current=img;this.error=false;this.change();}
   this.load();
  };
  this.read(this.root+'/'+('00'+n).slice(-3)+'.rgba.z',(err,data)=>{
   if(this.closed){this.loading=false;return;}
   if(err||!data||data.length>800000){done(err||Error('Invalid model frame'));return;}
   this.inflate(data,done);
  });
 }
 close(){this.closed=true;for(const img of this.cache.values())kit.dropImage(img);this.cache.clear();this.current=null;}
}
module.exports={CarModel,pose,index,rect,adjust,drag,COUNT,W,H};
