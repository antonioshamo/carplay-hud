// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const M=require('./studio_model.js'),V=require('./studio_view.js'),I=require('./studio_intro.js'),{StudioClient}=require('./studio_client.js');
class StudioScreen {
 constructor(refresh,options){this.refresh=refresh;this.client=options&&options.client||new StudioClient();this.design=M.preset(0);this.page='gallery';this.styleTarget='design';this.testSeconds=30;this.mediaTarget='center';this.videoSupported=false;this.selected='speed';this.dirty=false;this.history=[];this.redo=[];this.moveStep=.01;this.notice='';this.drag=null;this.animationAt=0;this.loaded=false;this.liveChanges=true;this.nav=[];this.liveTimer=null;this.liveSending=false;this.liveBlocked=null;this.lastLiveAt=0;this.isClosed=false;this.client.on('change',()=>{if(this.client.status){const key=JSON.stringify(this.client.status.design);if((!this.loaded||key!==this.remoteKey)&&!this.dirty)this.design=M.clone(this.client.status.design);this.remoteKey=key;this.loaded=true;}this.scheduleLive();this.refresh();});}
 open(){this.isClosed=false;this.client.connect();}
 pauseLive(){this.liveChanges=false;clearTimeout(this.liveTimer);this.liveTimer=null;}
 back(){if(this.page==='media'&&this.videoFull){this.videoFull=false;return true;}if(this.nav.length){this.page=this.nav.pop();this.drag=null;return true;}if(this.page!=='gallery'){this.page='gallery';return true;}return false;}
 liveReady(){const a=this.client.status;return !!(a&&a.enabled&&a.renderer&&a.parked&&Date.now()-(this.client.statusAt||0)<2000&&!a.panelRemaining&&!this.isClosed);}
 scheduleLive(){
  if(!this.liveChanges||!this.dirty||this.liveSending||this.client.pending||!this.liveReady()||this.liveBlocked===JSON.stringify(this.design)||this.liveTimer)return;
  this.liveTimer=setTimeout(()=>{this.liveTimer=null;this.flushLive();},Math.max(150,300-(Date.now()-this.lastLiveAt)));
  if(this.liveTimer.unref)this.liveTimer.unref();
 }
 flushLive(){
  if(!this.liveChanges||!this.dirty||!this.liveReady()||this.client.pending||this.liveSending)return;
  const design=M.clone(this.design),key=JSON.stringify(design);this.liveSending=true;this.lastLiveAt=Date.now();this.notice='Applying live changes…';this.refresh();
  this.client.send('save',{design}).then(()=>{this.liveSending=false;if(JSON.stringify(this.design)===key)this.dirty=false;this.notice='Design saved';this.scheduleLive();this.refresh();},e=>{this.liveSending=false;this.liveBlocked=key;this.notice='Not saved: '+e.message;this.refresh();});
 }
 editStatus(){
  if(this.liveSending)return 'Applying live changes…';
  if(this.dirty){if(!this.client.status)return 'Draft kept · helper offline';if(!this.liveChanges)return 'Draft · press Apply';if(!this.client.status.enabled)return 'Draft · choose output, then Apply';if(!this.liveReady())return 'Draft · live changes waiting for Park';return 'Changes pending';}
  return this.client.status&&this.client.status.enabled?'Saved · '+(this.client.status.panel?'Full cluster':this.client.status.state||'Display enabled'):'Design preview';
 }
 widget(){return this.design.widgets.find(w=>w.type===this.selected);}
 checkpoint(){this.redo=[];this.history.push(M.clone(this.design));if(this.history.length>30)this.history.shift();this.dirty=true;this.notice='';}
 previewData(){return {now:new Date(2026,10,4,10,28),speed:100,rpm:3200,gear:'D',oil:92,coolant:88,connected:false};}
 frame(focus,scale){return V.frame(this,focus,scale);}
 press(id){const before=JSON.stringify(this.design),page=this.page;const result=this._press(id);if(this.page!==page&&id!=='navigate-back'){this.nav.push(page);if(this.nav.length>20)this.nav.shift();}if(JSON.stringify(this.design)!==before){this.dirty=true;this.liveBlocked=null;this.scheduleLive();}return result;}
 _press(id){
  if(id==='navigate-back')return this.back();
  if(id==='live-toggle'){this.liveChanges=!this.liveChanges;clearTimeout(this.liveTimer);this.liveTimer=null;this.liveBlocked=null;this.notice=this.liveChanges?'Live changes on · updates the active design in Park':'Live changes off · press Apply when ready';this.scheduleLive();return true;}
  if(id==='exit')return false;
  if(id==='video-full'){this.videoFull=!this.videoFull;return true;}
  if(id.indexOf('page:')===0||id.indexOf('go:')===0){this.page=id.slice(id.indexOf(':')+1);this.videoFull=false;this.drag=null;return true;}
  if(id==='tested-layout'){this.checkpoint();this.design=M.acceptedDesign();this.page='gallery';return true;}
  if(id==='edit'){this.page='edit';return true;}
  if(id==='gauge'||id==='widget-gauge'){this.styleTarget=id==='gauge'?'design':this.selected;this.page='gauges';return true;}
  if(id==='play'){I.prepare(this.design);this.animationAt=Date.now();return true;}
  if(id==='select'){this.page='widgets';return true;}
  if(id.startsWith('widget:')){this.selected=id.slice(7);this.page='edit';return true;}
  if(id==='precision'){this.moveStep=this.moveStep===.01?.05:.01;return true;}
  if(id==='undo'){if(this.history.length){this.redo.push(M.clone(this.design));this.design=this.history.pop();this.dirty=true;}return true;}
  if(id==='redo'){if(this.redo.length){this.history.push(M.clone(this.design));this.design=this.redo.pop();this.dirty=true;}return true;}
  if(id==='test-length'){this.testSeconds=[10,30,60][([10,30,60].indexOf(this.testSeconds)+1)%3];return true;}
  if(id==='media-target'){this.mediaTarget=['center','map','panel','hud'][(['center','map','panel','hud'].indexOf(this.mediaTarget)+1)%4];return true;}
  if(id.startsWith('video:')){const current=this.client.status&&this.client.status.media;if(!current)return true;const r=Object.assign({},current.rect),action=id.slice(6);if(action==='reset')Object.assign(r,{x:.15,y:.15,w:.7,h:.7});else if(action==='size'){const size=r.w>.85?.4:Math.min(1,r.w+.15);r.x=(1-size)/2;r.y=(1-size)/2;r.w=size;r.h=size;}else if(action==='left')r.x=Math.max(0,r.x-.05);else if(action==='right')r.x=Math.min(1-r.w,r.x+.05);else if(action==='up')r.y=Math.max(0,r.y-.05);else if(action==='down')r.y=Math.min(1-r.h,r.y+.05);this.client.send('media-place',{rect:r}).then(()=>this.refresh(),e=>{this.notice=e.message;this.refresh();});return true;}
  if(['scan','editor-start','media-start','media-stop','apply','apply-panel','apply-center','off','save','preview','stop-preview'].includes(id)||id.startsWith('save-slot:')){
   const extra={design:this.design,seconds:this.testSeconds,target:this.mediaTarget};let cmd=id;if(id==='apply-panel'||id==='apply-center'){cmd='apply';extra.output=id==='apply-panel'?'parked-panel':'center';}if(id.startsWith('save-slot:')){cmd='slot';extra.slot=Number(id.split(':')[1]);}
   clearTimeout(this.liveTimer);this.liveTimer=null;if(id==='off'){this.liveChanges=false;}this.liveBlocked=null;this.notice='Waiting for confirmation';const snapshot=JSON.stringify(this.design);
   this.client.send(cmd,extra).then(()=>{if(cmd==='off')this.design.introEnabled=false;if(['save','apply'].includes(cmd)&&JSON.stringify(this.design)===snapshot)this.dirty=false;this.notice=cmd==='scan'?'Feature scan complete — details on the phone page':cmd==='editor-start'?'Phone designer opened':cmd==='media-start'?'Phone video session opened':cmd==='media-stop'?'Video session ended':cmd==='preview'?'Parked test requested — expires in '+this.testSeconds+' seconds':cmd==='off'?'BMW display restored':cmd==='stop-preview'?'Full-cluster test ended':'Saved in the car';this.scheduleLive();this.refresh();},e=>{this.liveBlocked=snapshot;this.notice='Not saved: '+e.message;this.refresh();});return true;
  }
  if(id.startsWith('load:')){const a=this.client.status&&this.client.status.slots[Number(id.split(':')[1])];if(a){this.checkpoint();this.design=M.clone(a);}return true;}
  const editable=['toggle','front','back','left','right','up','down','smaller','larger','width-less','width-more','height-less','height-more','align-x','align-y','reset-widget'];
  if(editable.includes(id)&&this.widget().locked){this.notice='Unlock this widget to change it';return true;}
  this.checkpoint();const d=this.design;
  if(id.startsWith('pick-gauge:')){const style=id.slice(11);if(M.GAUGES.slice(1).includes(style)){if(this.styleTarget==='design')d.gauge=style;else d.widgets.find(w=>w.type===this.styleTarget).gauge=style;}this.page=this.styleTarget==='design'?'style':'properties';}
  else if(id.startsWith('pick-idrive:')){const prefs={};['intro','introEnabled','introDuration','introShine','introLight','welcomeName','signature','temperatureUnit','units','clock24','snap'].forEach(k=>{if(d[k]!==undefined)prefs[k]=d[k];});this.design=Object.assign(M.idrivePreset(Number(id.split(':')[1])),prefs);this.page='gallery';}
  else if(id.startsWith('pick-layout:')){const intro={};['intro','introEnabled','introDuration','introShine','introLight','welcomeName','signature','name','temperatureUnit'].forEach(k=>{if(d[k]!==undefined)intro[k]=d[k];});this.design=Object.assign(M.preset(d.theme*10+Number(id.split(':')[1])),intro);this.page='gallery';}
  else if(id.startsWith('pick-theme:')){d.theme=Number(id.split(':')[1]);d.preset=d.theme*10+d.preset%10;this.page='style';}
  else if(id==='lock')this.widget().locked=!this.widget().locked;
  else if(id==='widget-color'){const w=this.widget();w.color=M.ACCENTS[(M.ACCENTS.indexOf(w.color||'theme')+1)%M.ACCENTS.length];}
  else if(id==='widget-gauge'){const w=this.widget();w.gauge=M.GAUGES[(M.GAUGES.indexOf(w.gauge||'inherit')+1)%M.GAUGES.length];}
  else if(id==='temperature')d.temperatureUnit=d.temperatureUnit==='F'?'C':'F';
  else if(id==='back'){const w=this.widget();d.widgets.splice(d.widgets.indexOf(w),1);d.widgets.unshift(w);}
  else if(/^width-|^height-/.test(id))M.dimension(d,this.selected,id.startsWith('width')?'w':'h',id.endsWith('more')?.02:-.02);
  else if(id==='align-x'||id==='align-y')M.align(d,this.selected,id.slice(-1));
  else if(id==='reset-widget'){const w=M.baseDesign(d).widgets.find(w=>w.type===this.selected);d.widgets[d.widgets.findIndex(w=>w.type===this.selected)]=w;}
  else if(['previous','next','shuffle','layout'].includes(id)){const n=id==='shuffle'?Math.floor(Math.random()*100):id==='layout'?d.theme*10+(d.preset%10+1)%10:(d.preset+(id==='next'?1:99))%100;const intro={};['intro','introEnabled','introDuration','introShine','introLight','welcomeName','signature','name','temperatureUnit'].forEach(k=>{if(d[k]!==undefined)intro[k]=d[k];});this.design=Object.assign(M.preset(n),intro);}
  else if(id==='theme'){d.theme=(d.theme+1)%10;d.preset=d.theme*10+d.preset%10;}
  else if(id==='toggle')this.widget().on=!this.widget().on;
  else if(id==='front'){const w=this.widget();d.widgets.splice(d.widgets.indexOf(w),1);d.widgets.push(w);}
  else if(['left','right','up','down'].includes(id))M.move(d,this.selected,id==='left'?-this.moveStep:id==='right'?this.moveStep:0,id==='up'?-this.moveStep:id==='down'?this.moveStep:0);
  else if(id==='smaller'||id==='larger')M.resize(d,this.selected,id==='larger'?1.1:1/1.1);
  else if(id==='snap'||id==='borders')d[id]=!d[id];
  else if(id==='clock')d.clock24=!d.clock24;
  else if(id==='units')d.units=d.units==='mph'?'km/h':'mph';
  else if(id==='title'){d.title=(d.title+1)%M.TITLES.length;d.signature=M.TITLES[d.title];}
  else if(id==='intro-toggle')d.introEnabled=!d.introEnabled;
  else if(id==='animation'){const modes=['slide','reveal','apple','welcome','none'];d.intro=modes[(modes.indexOf(d.intro)+1)%modes.length];if(d.intro==='apple')d.introDuration=5500;I.prepare(d);this.animationAt=Date.now();}
  else if(id==='duration')d.introDuration=[3000,4500,5500,7000][([3000,4500,5500,7000].indexOf(d.introDuration)+1)%4];
  else if(id==='shine')d.introShine=!d.introShine;
  else if(id==='light')d.introLight=['white','blue','red','theme'][(['white','blue','red','theme'].indexOf(d.introLight)+1)%4];
  else if(id==='background')d.background=['gradient','black','transparent'][(['gradient','black','transparent'].indexOf(d.background)+1)%3];
  else {this.history.pop();return false;}
  return true;
 }
 touch(phase,x,y){
  if(this.page!=='edit')return false;const b=V.BOX;
  if(phase==='down'){
   this.drag=null;
   if(x<b.x||x>b.x+b.w||y<b.y||y>b.y+b.h)return false;
   const nx=(x-b.x)/b.w,ny=(y-b.y)/b.h;
   const hit=this.design.widgets.slice().reverse().find(w=>w.on&&nx>=w.x&&nx<=w.x+w.w&&ny>=w.y&&ny<=w.y+w.h);
   if(hit){this.selected=hit.type;if(hit.locked){this.notice='Widget locked — unlock to move';this.refresh();return true;}this.drag={x,y,wx:hit.x,wy:hit.y,started:false};}this.refresh();return true;
  }
  if(!this.drag)return false;
  if(phase==='move'||phase==='up'){const a=this.drag;if(!a.started&&Math.hypot(x-a.x,y-a.y)>5){this.checkpoint();a.started=true;}if(a.started){const w=this.widget();w.x=a.wx;w.y=a.wy;M.move(this.design,this.selected,(x-a.x)/b.w,(y-a.y)/b.h);}if(a.started){this.dirty=true;this.liveBlocked=null;this.scheduleLive();}if(phase==='up')this.drag=null;this.refresh();return true;}
  this.drag=null;return true;
 }
 close(){this.isClosed=true;clearTimeout(this.liveTimer);this.liveTimer=null;this.drag=null;this.client.close();}
}
module.exports={StudioScreen};
