// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
// The installed renderer is 2D. These 96 views are rendered from the owner's
// supplied GLB. Prepared rotation buffers retain that model's materials.
const fs=require('fs'),zlib=require('zlib'),crypto=require('crypto'),kit=require('./kit_record.js'),views=require('./car_views.js');
const COUNT=96,W=900,H=450,DEFAULT=12,ROOT='/var/opt/cluster-studio/current/assets/x4m';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function pose(){return {angle:45,zoom:1,x:0,y:0,mode:'rotate'};}
function index(angle){return ((Math.round(angle*COUNT/360)%COUNT)+COUNT)%COUNT;}
function rect(page,s){if(page==='overview'&&!s.homePage)return {x:524,y:136,w:710,h:278};if(page==='vehicle')return {x:220,y:168,w:595,h:250};return null;}
function placement(area,p,bounds,crop){
 const b=bounds||{x:0,y:0,w:W,h:H},scale=Math.min(area.w/b.w,area.h/b.h)*.96*p.zoom;
 const c=crop||{x:0,y:0,w:W,h:H};
 return {x:area.x+area.w/2-(b.x+b.w/2-c.x)*scale+p.x,y:area.y+area.h/2-(b.y+b.h/2-c.y)*scale+p.y,w:c.w*scale,h:c.h*scale};
}
function adjust(p,action){
 if(action==='left')p.angle-=15;else if(action==='right')p.angle+=15;
 else if(action==='in')p.zoom=clamp(p.zoom+.1,.85,1.25);else if(action==='out')p.zoom=clamp(p.zoom-.1,.85,1.25);
 else if(action==='mode')p.mode=p.mode==='move'?'rotate':'move';else if(action==='reset')Object.assign(p,pose());
 p.angle=((p.angle%360)+360)%360;
}
function drag(p,start,dx,dy){if(start.mode==='move'){p.x=clamp(start.x+dx,-85,85);p.y=clamp(start.y+dy,-35,35);}else p.angle=((start.angle+dx*.5)%360+360)%360;}
class CarModel {
 constructor(change,options){this.change=change;this.root=options&&options.root||ROOT;this.read=options&&options.read||fs.readFile;this.inflate=options&&options.inflate||zlib.inflate;this.cache=new Map();this.closed=false;this.loading=false;this.wanted=DEFAULT;this.currentIndex=DEFAULT;this.available=DEFAULT;this.current=null;this.slots=[];this.slot=0;this.direction=1;this.retryAt=0;this.error=false;}
 request(angle){
  if(this.closed)return;
  const n=index(angle),delta=((n-this.wanted+COUNT*1.5)%COUNT)-COUNT/2;
  if(delta)this.direction=delta>0?1:-1;
  this.wanted=n;
  const distance=k=>Math.min((k-n+COUNT)%COUNT,(n-k+COUNT)%COUNT);
  if(distance(this.available)>distance(this.currentIndex))this.available=this.currentIndex;
  this.load();
 }
 get(angle){
  if(this.closed)return null;
  if(!this.current)this.current=this.poster=require('./cockpit_car.js')();
  this.request(angle);
  const n=this.cache.has(this.wanted)?this.wanted:this.available,hit=this.cache.get(n);
  if(hit&&n===this.wanted)this.available=n;
  if(hit&&(this.current===this.poster||n!==this.currentIndex)){
   this.slot=1-this.slot;
   let img=this.slots[this.slot];
   if(!img){img=kit.makeImage(views.width,views.height,hit.data);img.stream=true;img.premultiplied=true;img.crop=views.crop;img.generation=0;this.slots[this.slot]=img;}
   img.data=hit.data;img.prepared=hit.prepared;img.generation++;
   this.current=img;this.currentIndex=n;this.available=n;
   this.cache.delete(n);this.cache.set(n,hit);this.error=false;
  }
  return this.current;
 }
 next(){
  if(!this.cache.has(this.wanted))return this.wanted;
  for(const d of [1,-1,2,-2]){const n=(this.wanted+d*this.direction+COUNT)%COUNT;if(!this.cache.has(n))return n;}
  return null;
 }
 load(){
  if(this.closed||this.loading||Date.now()<this.retryAt)return;
  const n=this.next();if(n===null)return;this.loading=true;
  const done=(err,bytes)=>{
   this.loading=false;if(this.closed)return;
   const size=views.width*views.height*4;
   if(err||!bytes||bytes.length!==size){this.error=true;this.retryAt=Date.now()+3000;this.change();return;}
   this.cache.set(n,{data:bytes,prepared:bytes});
   const distance=k=>Math.min((k-this.wanted+COUNT)%COUNT,(this.wanted-k+COUNT)%COUNT);
   // A fast drag must still make forward progress while its final target keeps
   // changing. An older decode cannot move the displayed car away from it.
   const progressed=n===this.wanted||distance(n)<distance(this.available);
   if(progressed)this.available=n;
   for(const key of this.cache.keys()){if(this.cache.size<=12)break;if(key!==this.currentIndex&&key!==this.available&&key!==this.wanted)this.cache.delete(key);}
   if(progressed){this.error=false;this.change();}
   this.load();
  };
  const spec=views.views[n];
  this.read(this.root+'/'+spec.file,(err,data)=>{
   if(this.closed){this.loading=false;return;}
   if(err||!data||data.length!==spec.bytes||crypto.createHash('sha256').update(data).digest('hex')!==spec.sha256){done(err||Error('Model update required'));return;}
   this.inflate(data,done);
  });
 }
 close(){this.closed=true;for(const img of this.slots)if(img)kit.dropImage(img);if(this.poster)kit.dropImage(this.poster);this.cache.clear();this.slots=[];this.current=null;}
}
module.exports={CarModel,pose,index,rect,placement,adjust,drag,COUNT,W,H,views};
