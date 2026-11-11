// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const M=require('./studio_model.js'),V=require('./studio_view.js'),{StudioClient}=require('./studio_client.js');
class StudioScreen {
 constructor(refresh,o){this.refresh=refresh;this.client=o&&o.client||new StudioClient();this.design=M.defaultDesign();this.page='gallery';this.entryPage='gallery';this.nav=[];this.galleryPage=0;this.widgetSlot=0;this.notice='';this.liveChanges=true;this.dirty=false;this.closed=false;this.history=[];this.redo=[];this.mediaTarget='center';this.animationAt=0;this.videoSupported=false;this.client.on('change',()=>{const s=this.client.status;if(s&&s.generation==='source-cluster-v2'&&!this.dirty){try{this.design=M.validate(s.design);}catch(e){this.notice=e.message;}}this.scheduleLive();this.refresh();});}
 open(){this.closed=false;this.client.connect();}
 compatible(){return !!(this.client.status&&this.client.status.generation==='source-cluster-v2');}
 ready(){return this.compatible()&&!this.client.pending&&!this.liveSending&&Date.now()-(this.client.statusAt||0)<2000;}
 pauseLive(){this.liveChanges=false;clearTimeout(this.liveTimer);this.liveTimer=null;}
 back(){if(this.page==='media'&&this.videoFull){this.videoFull=false;return true;}if(this.nav.length){this.page=this.nav.pop();return true;}if(this.page!==this.entryPage){this.page=this.entryPage;return true;}return false;}
 navigate(page){if(this.page!==page){this.nav.push(this.page);this.page=page;if(page!=='media')this.videoFull=false;}}
 edit(fn){this.history.push(M.clone(this.design));if(this.history.length>30)this.history.shift();this.redo=[];fn(this.design);this.design=M.validate(this.design);this.dirty=true;this.notice='';this.blockedKey=null;this.scheduleLive();}
 scheduleLive(){if(!this.dirty||!this.liveChanges||!this.ready()||this.liveTimer||this.closed||this.blockedKey===JSON.stringify(this.design))return;this.liveTimer=setTimeout(()=>{this.liveTimer=null;this.save('save');},250);if(this.liveTimer.unref)this.liveTimer.unref();}
 save(cmd,extra){
  if(!this.ready())return false;clearTimeout(this.liveTimer);this.liveTimer=null;
  const d=M.clone(this.design),key=JSON.stringify(d);this.liveSending=true;this.notice='Saving...';this.refresh();
  this.client.send(cmd,Object.assign({design:d,output:'panel'},extra)).then(()=>{this.liveSending=false;if(cmd!=='slot'&&JSON.stringify(this.design)===key)this.dirty=false;this.notice=cmd==='apply'?'Source cluster enabled':cmd==='slot'?'Design saved':'Changes saved';this.scheduleLive();this.refresh();},e=>{this.liveSending=false;this.blockedKey=key;this.notice=e.message;this.refresh();});return true;
 }
 command(cmd,extra){if(!this.client.status||this.client.pending)return false;this.notice='Waiting for confirmation...';this.client.send(cmd,extra||{}).then(()=>{this.notice=cmd==='off'?'BMW display restored':'Confirmed';this.refresh();},e=>{this.notice=e.message;this.refresh();});return true;}
 editStatus(){if(this.notice)return this.notice;if(!this.compatible())return 'Update Cluster Studio for the source theme library';if(this.dirty)return this.liveChanges?'Saving changes...':'Unsaved changes';return this.client.status.enabled?this.client.status.state:'BMW gauges active';}
 frame(focus,scale){return V.frame(this,focus,scale);}
 press(id){
  if(id==='navigate-back')return this.back();if(id==='exit')return false;
  if(id.startsWith('page:')||id.startsWith('go:')){this.navigate(id.slice(id.indexOf(':')+1));return true;}
  if(id==='live-toggle'){this.liveChanges=!this.liveChanges;clearTimeout(this.liveTimer);this.liveTimer=null;this.scheduleLive();return true;}
  if(id==='gallery-prev'||id==='gallery-next'){this.galleryPage=Math.max(0,Math.min(Math.ceil(M.THEMES.length/3)-1,this.galleryPage+(id==='gallery-next'?1:-1)));return true;}
  if(id.startsWith('theme:')){const theme=id.slice(6);if(!M.THEMES.some(t=>t.id===theme))return false;this.edit(d=>d.theme=theme);return true;}
  if(id==='apply'||id==='save')return this.save('save');
  if(id==='enable')return this.save('apply');
  if(id==='off'){this.pauseLive();return this.command('off');}
  if(id==='retry')return this.command('retry');
  if(id.startsWith('save-slot:'))return this.save('slot',{slot:Number(id.slice(10))});
  if(id.startsWith('load:')){const slot=Number(id.slice(5)),d=this.client.status&&this.client.status.slots[slot];if(d){this.edit(()=>{});this.design=M.validate(d);this.scheduleLive();}return true;}
  if(id==='undo'){if(this.history.length){this.redo.push(M.clone(this.design));this.design=this.history.pop();this.dirty=true;this.blockedKey=null;this.scheduleLive();}return true;}
  if(id==='redo'){if(this.redo.length){this.history.push(M.clone(this.design));this.design=this.redo.pop();this.dirty=true;this.blockedKey=null;this.scheduleLive();}return true;}
  if(id.startsWith('widget:')){const slot=Number(id.slice(7));if(!Number.isInteger(slot)||slot<0||slot>3)return false;this.widgetSlot=slot;this.metricPage=0;this.navigate('metric');return true;}
  if(id==='metric-prev'||id==='metric-next'){this.metricPage=Math.max(0,Math.min(Math.ceil(M.METRICS.length/12)-1,(this.metricPage||0)+(id==='metric-next'?1:-1)));return true;}
  if(id.startsWith('metric:')){const k=id.slice(7);if(!M.METRICS.includes(k))return false;this.edit(d=>d.widgets[this.widgetSlot]=k);this.back();return true;}
  if(id==='palette'){this.edit(d=>d.palette=M.PALETTES[(M.PALETTES.indexOf(d.palette)+1)%M.PALETTES.length]);return true;}
  if(id==='accent'){this.edit(d=>d.accent=M.ACCENTS[(M.ACCENTS.indexOf(d.accent)+1)%M.ACCENTS.length]);return true;}
  if(id==='units'){this.edit(d=>d.units=d.units==='mph'?'km/h':'mph');return true;}
  if(id==='temperature'){this.edit(d=>d.temperatureUnit=d.temperatureUnit==='F'?'C':'F');return true;}
  if(id==='clock'){this.edit(d=>d.clock24=!d.clock24);return true;}
  if(id==='intro-toggle'){this.edit(d=>d.startup=!d.startup);return true;}
  if(id==='rpm-scale'){this.edit(d=>{d.rpmMax=d.rpmMax>=10000?6000:d.rpmMax+1000;d.redline=Math.min(d.redline,d.rpmMax);});return true;}
  if(id==='redline'){this.edit(d=>d.redline=d.redline>=d.rpmMax?4000:d.redline+500);return true;}
  if(id==='scan')return this.command('scan');
  if(id==='media-start')return this.command('media-start',{target:this.mediaTarget});
  if(id==='media-stop')return this.command('media-stop');
  if(id==='media-target'){const a=['center','map','panel','hud'];this.mediaTarget=a[(a.indexOf(this.mediaTarget)+1)%a.length];return true;}
  if(id==='video-full'){this.videoFull=!this.videoFull;return true;}
  if(id.startsWith('video:')){const m=this.client.status&&this.client.status.media;if(!m)return false;const r=Object.assign({},m.rect),a=id.slice(6);if(a==='reset')Object.assign(r,{x:.15,y:.15,w:.7,h:.7});else if(a==='size'){const z=r.w>.85?.4:Math.min(1,r.w+.15);Object.assign(r,{x:(1-z)/2,y:(1-z)/2,w:z,h:z});}else if(a==='left')r.x=Math.max(0,r.x-.05);else if(a==='right')r.x=Math.min(1-r.w,r.x+.05);else if(a==='up')r.y=Math.max(0,r.y-.05);else if(a==='down')r.y=Math.min(1-r.h,r.y+.05);return this.command('media-place',{rect:r});}
  return false;
 }
 touch(){return false;}
 close(){this.closed=true;clearTimeout(this.liveTimer);this.liveTimer=null;this.client.close();}
}
module.exports={StudioScreen};
