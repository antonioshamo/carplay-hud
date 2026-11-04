// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const M=require('./studio_model.js'),V=require('./studio_view.js'),{StudioClient}=require('./studio_client.js');
class StudioScreen {
 constructor(refresh,options){this.refresh=refresh;this.client=options&&options.client||new StudioClient();this.design=M.preset(0);this.page='gallery';this.selected='speed';this.dirty=false;this.history=[];this.notice='';this.drag=null;this.animationAt=0;this.loaded=false;this.client.on('change',()=>{if(!this.loaded&&this.client.status){if(!this.dirty)this.design=M.clone(this.client.status.design);this.loaded=true;}this.refresh();});}
 open(){this.client.connect();}
 widget(){return this.design.widgets.find(w=>w.type===this.selected);}
 checkpoint(){this.history.push(M.clone(this.design));if(this.history.length>30)this.history.shift();this.dirty=true;this.notice='Draft — use My designs to save';}
 previewData(){return {now:new Date(2026,10,4,10,28),speed:100,rpm:3200,gear:'D',oil:92,coolant:88,connected:false};}
 frame(focus,scale){return V.frame(this,focus,scale);}
 press(id){
  if(id==='exit')return false;
  if(id.indexOf('page:')===0){this.page=id.slice(5);this.drag=null;return true;}
  if(id==='edit'){this.page='edit';return true;}
  if(id==='play'){this.animationAt=Date.now();return true;}
  if(id==='select'){this.selected=M.TYPES[(M.TYPES.indexOf(this.selected)+1)%M.TYPES.length];return true;}
  if(id==='undo'){if(this.history.length){this.design=this.history.pop();this.dirty=true;}return true;}
  if(['apply','off','save','preview','stop-preview'].includes(id)||id.startsWith('save-slot:')){
   const extra={design:this.design};let cmd=id;if(id.startsWith('save-slot:')){cmd='slot';extra.slot=Number(id.split(':')[1]);}
   this.notice='Waiting for confirmation';const snapshot=JSON.stringify(this.design);
   this.client.send(cmd,extra).then(()=>{if(cmd==='off')this.design.introEnabled=false;if(['save','apply','slot'].includes(cmd)&&JSON.stringify(this.design)===snapshot)this.dirty=false;this.notice=cmd==='preview'?'Parked test requested — expires in 10 seconds':cmd==='off'?'Custom center layout disabled':cmd==='stop-preview'?'Full-cluster test ended':'Saved in the car';this.refresh();},e=>{this.notice=e.message;this.refresh();});return true;
  }
  if(id.startsWith('load:')){const a=this.client.status&&this.client.status.slots[Number(id.split(':')[1])];if(a){this.checkpoint();this.design=M.clone(a);}return true;}
  this.checkpoint();const d=this.design;
  if(['previous','next','shuffle','layout'].includes(id)){const n=id==='shuffle'?Math.floor(Math.random()*100):id==='layout'?d.theme*10+(d.preset%10+1)%10:(d.preset+(id==='next'?1:99))%100;const intro={};['intro','introEnabled','introDuration','introShine','introLight'].forEach(k=>intro[k]=d[k]);this.design=Object.assign(M.preset(n),intro);}
  else if(id==='theme'){d.theme=(d.theme+1)%10;d.preset=d.theme*10+d.preset%10;}
  else if(id==='toggle')this.widget().on=!this.widget().on;
  else if(id==='front'){const w=this.widget();d.widgets.splice(d.widgets.indexOf(w),1);d.widgets.push(w);}
  else if(['left','right','up','down'].includes(id))M.move(d,this.selected,id==='left'?-.01:id==='right'?.01:0,id==='up'?-.01:id==='down'?.01:0);
  else if(id==='smaller'||id==='larger')M.resize(d,this.selected,id==='larger'?1.1:1/1.1);
  else if(id==='snap'||id==='borders')d[id]=!d[id];
  else if(id==='clock')d.clock24=!d.clock24;
  else if(id==='units')d.units=d.units==='mph'?'km/h':'mph';
  else if(id==='title')d.title=(d.title+1)%M.TITLES.length;
  else if(id==='intro-toggle')d.introEnabled=!d.introEnabled;
  else if(id==='animation'){const modes=['slide','reveal','apple','welcome','none'];d.intro=modes[(modes.indexOf(d.intro)+1)%modes.length];if(d.intro==='apple')d.introDuration=5500;this.animationAt=Date.now();}
  else if(id==='duration')d.introDuration=[3000,4500,5500,7000][([3000,4500,5500,7000].indexOf(d.introDuration)+1)%4];
  else if(id==='shine')d.introShine=!d.introShine;
  else if(id==='light')d.introLight=['white','blue','red','theme'][(['white','blue','red','theme'].indexOf(d.introLight)+1)%4];
  else if(id==='gauge')d.gauge=['ring','digital','bar','ultra'][(['ring','digital','bar','ultra'].indexOf(d.gauge)+1)%4];
  else if(id==='background')d.background=['gradient','black','transparent'][(['gradient','black','transparent'].indexOf(d.background)+1)%3];
  else {this.history.pop();return false;}
  return true;
 }
 touch(phase,x,y){
  if(this.page!=='edit')return false;const b=V.BOX;
  if(phase==='down'){
   if(x<b.x||x>b.x+b.w||y<b.y||y>b.y+b.h)return false;
   const nx=(x-b.x)/b.w,ny=(y-b.y)/b.h;
   const hit=this.design.widgets.slice().reverse().find(w=>w.on&&nx>=w.x&&nx<=w.x+w.w&&ny>=w.y&&ny<=w.y+w.h);
   if(hit){this.selected=hit.type;this.drag={x,y,wx:hit.x,wy:hit.y,started:false};}this.refresh();return true;
  }
  if(!this.drag)return false;
  if(phase==='move'||phase==='up'){const a=this.drag;if(!a.started&&Math.hypot(x-a.x,y-a.y)>5){this.checkpoint();a.started=true;}if(a.started){const w=this.widget();w.x=a.wx;w.y=a.wy;M.move(this.design,this.selected,(x-a.x)/b.w,(y-a.y)/b.h);}if(phase==='up')this.drag=null;this.refresh();return true;}
  this.drag=null;return true;
 }
 close(){this.drag=null;this.client.close();}
}
module.exports={StudioScreen};
