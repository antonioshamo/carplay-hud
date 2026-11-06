// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const EventEmitter=require('events');
const {RenderClient}=require('./mgu_render_client.js');
const kit=require('./kit_record.js');
const view=require('./hud_view.js');
const trace=require('./startup_trace.js');
const {StudioScreen}=require('./studio_screen.js');
const HOST='ST_WOC_Design',PROXIES=24;
class HudScreen extends EventEmitter {
 constructor(host,options) {
  super();this.host=host;this.gpu=options&&options.client||new RenderClient('robertn_waze_cluster',host.log,{kit,mode:'layer'});
  this.page='overview';this.navigation=[];this.logPage=0;this.focus=0;this.items=[];this.ready=false;this.visible=false;this.focused=true;
  this.active=false;this.info=null;this.scale=1;this.closed=false;this.touch=null;this.ccu=null;this.last={};this.dirty=false;this.suspended=false;
  this.studio=new StudioScreen(()=>{this.dirty=true;});
  this.sentAt=0;this.reshowTimer=null;
  this.gpu.fps(60);
  this.gpu.on('ready',(screen,info)=>this._ready(info));
  this.gpu.on('close',()=>{this.ready=false;this.hide();this.emit('mode',false);});
  this.gpu.on('closed',()=>{
   trace.record('graphics-dismissed');this.suspended=true;this.hide();clearTimeout(this.reshowTimer);
   // An outside touch can leave this same host visible. Let the HMI finish
   // the transition, then recover only if it still owns the visible page.
   this.reshowTimer=setTimeout(()=>{this.suspended=false;this.updateShow();},700);
  });
  this.gpu.on('state',s=>trace.record('graphics-state',JSON.stringify(s)));
  this.gpu.on('touch',(p,x,y)=>this._touch(p,x,y));
  this.gpu.on('ccu',e=>this._ccu(e));
  this.gpu.on('tick',()=>{if(this.dirty||(this.page==='studio'&&this.studio.page==='intro'&&Date.now()-this.studio.animationAt<this.studio.design.introDuration+150))this.render();});
  this.timer=setInterval(()=>{if(this.active)this.render();},1000);
  if(this.timer.unref)this.timer.unref();
 }
 connect(){this.gpu.connect();}
 _ready(info){
  trace.record('graphics-ready',JSON.stringify(info));
  this.info=info;this.studio.videoSupported=!!(info&&info.video);
  // A legacy renderer without a foreground gate must never cover BMW screens.
  const b=info&&info.appArea;
  this.ready=!!(info&&info.frontGate&&Array.isArray(info.modes)&&info.modes.indexOf('layer')>=0&&b&&b.w>=800&&b.h>=300);
  if(!this.ready){this.hide();this.emit('mode',false);return;}
  this.scale=Math.min(b.w/view.W,b.h/view.H);
  this.gpu.mode('layer');
  this.gpu.place({x:b.x,y:b.y,w:b.w,h:b.h,scale:this.scale,ox:(b.w-view.W*this.scale)/2,oy:(b.h-view.H*this.scale)/2});
  this.suspended=false;this.ccu=null;this.emit('mode',true);this.updateShow();
 }
 hostVisible(on){if(this.visible!==!!on)trace.record('graphics-host-visible',!!on);this.visible=!!on;if(on){this.suspended=false;this.focused=true;}this.updateShow();}
 hostFocus(on){if(this.focused!==!!on)trace.record('graphics-host-focus',!!on);this.focused=!!on;if(on){this.suspended=false;this.ccu=null;}this.updateShow();}
 updateShow(){
  const on=this.ready&&this.visible&&this.focused&&!this.closed&&!this.suspended;
  if(!on){this.hide();return;}
  this.active=true;this.gpu.claim([{x:0,y:0,w:view.W,h:view.H}]);this.gpu.grab(!!this.info.controller);
  this.render(true);if(this.active)this.gpu.show(true);
 }
 hide(){this.active=false;if(this.studio)this.studio.drag=null;this.touch=null;this.ccu=null;this.gpu.claim([]);this.gpu.grab(false);this.gpu.show(false);}
 render(force){
  if(!this.active||!this.ready||this.closed)return;
  // A hidden compositor surface may never acknowledge its previous frame.
  // Force the first frame on return; keep subsequent recovery at 1 Hz.
  if(!force&&this.gpu.waiting&&Date.now()-this.sentAt<1000){this.dirty=true;return;}
  try {
   const f=this.page==='studio'?this.studio.frame(this.focus,this.scale):view.frame(view.model(this.host.control),this.page,this.focus,this.logPage,this.scale);
   const media=this.studio.client.status&&this.studio.client.status.media;const showVideo=this.page==='studio'&&this.studio.page==='media'&&media&&media.target==='center'&&media.playing&&Date.now()-(this.studio.client.statusAt||0)<2000&&this.studio.videoSupported;
   if(showVideo&&(!this.videoBound||this.videoGeneration!==media.generation)){if(this.videoBound)this.gpu.video(9001,null);this.gpu.video(9001,'/dev/shm/mgu-video-shamo-clips');this.videoBound=true;this.videoGeneration=media.generation;}else if(!showVideo&&this.videoBound){this.gpu.video(9001,null);this.videoBound=false;}
   this.items=f.items;this.focus=Math.max(0,Math.min(this.focus,this.items.length-1));
   const proxyKey=JSON.stringify(this.items.map(b=>[b.id,b.label,!!b.enabled]));
   if(proxyKey!==this.proxyKey){this.host.proxies(this.items);this.proxyKey=proxyKey;}
   // A false socket.write result means backpressure, not a lost frame.
   this.sentAt=Date.now();this.gpu.frame(f.record);
   this.dirty=false;
  } catch(err) {
   trace.error('graphics-render-failed',err);this.host.log.warn('Settings graphics: '+err.message);
   this.ready=false;this.hide();this.emit('mode',false);
  }
 }
 proxyFocus(i,on){if(on&&this.active&&!(this.info&&this.info.controller)){this.focus=i;this.render();}}
 proxyPress(i){if(this.active&&!(this.info&&this.info.controller))this.press(i);}
 press(i){
  if(!this.active||!this.items[i])return false;
  const id=this.items[i].id;
  const fresh=(this.page==='studio'?require('./studio_view.js').items(this.studio):view.layout(view.model(this.host.control),this.page,this.logPage)).find(b=>b.id===id);
  if(!fresh||!fresh.enabled)return false;
  const now=Date.now();if(now-(this.last[id]||0)<300)return false;this.last[id]=now;
  if(this.page==='studio'){const before=this.studio.page;const handled=this.studio.press(id);if(id==='exit'||(id==='navigate-back'&&!handled)){this.page='overview';this.studio.drag=null;this.focus=0;}else if(before!==this.studio.page)this.focus=0;this.render();return true;}
  if(id==='navigate-back'){if(this.navigation.length)this.page=this.navigation.pop();else if(this.page!=='overview')this.page='overview';else if(this.host.exit)this.host.exit();this.focus=0;this.render();return true;}
  if(id==='open-studio'||id.indexOf('studio:')===0){this.page='studio';this.studio.page=id==='open-studio'?'gallery':id.slice(7);this.studio.nav=[];this.studio.open();this.focus=0;this.render();return true;}
  if(id.indexOf('nav:')===0){if(this.page!==id.slice(4))this.navigation.push(this.page);if(this.navigation.length>20)this.navigation.shift();this.page=id.slice(4);this.logPage=0;this.focus=Math.max(0,view.tabs.findIndex(t=>t[0]===this.page));this.touch=null;this.ccu=null;this.render();return true;}
  const c=this.host.control;
  switch(id){
   case 'apply-current':c.applyCurrent();break;
   case 'route-free-hud':c.useIndependentHud();break;
   case 'hud':c.setDisplay('hud');break;
   case 'cluster':c.setDisplay('map');break;
   case 'startup-on':c.startHudAutomatically();break;
   case 'startup-off':c.setStartup('off');break;
   case 'larger':c.stepHudSize(1);break;
   case 'smaller':c.stepHudSize(-1);break;
   case 'standard':c.setHudSize(0);break;
   case 'left':case 'right':case 'up':case 'down':c.moveHud(id);break;
   case 'center':c.centreHud();break;
   case 'step':c.cycleMoveStep();break;
   case 'original':c.setHudStyle('hud_black_background',false);break;
   case 'clear':c.setHudStyle('hud_black_background',true);break;
   case 'rounded':c.setHudStyle('hud_round_corners',true);break;
   case 'square':c.setHudStyle('hud_round_corners',false);break;
   case 'enable':c.enableMap();break;
   case 'disable':c.disableMap();break;
   case 'restore-defaults':this.studio.pauseLive();this.studio.open();c.restoreDefaults(this.studio.client);break;
   case 'capture':c.capture();break;
   case 'restart':c.requestRestart();break;
   case 'classic':this.host.classic();return true;
   case 'logs-prev':this.logPage=Math.max(0,this.logPage-1);break;
   case 'logs-next':this.logPage++;break;
   default:if(/^size:(40|60|75)$/.test(id))c.setHudSize(Number(id.split(':')[1]));else return false;
  }
  this.render();return true;
 }
 hit(x,y){return this.items.findIndex(b=>x>=b.x&&x<b.x+b.w&&y>=b.y&&y<b.y+b.h);}
 _touch(phase,x,y){
  if(!this.active||!Number.isFinite(x)||!Number.isFinite(y))return;
  if(this.page==='studio'&&this.studio.touch(phase,x,y)){this.touch=null;return;}
  if(phase==='down'){this.touch={i:this.hit(x,y),x,y,page:this.page};return;}
  const t=this.touch;if(!t)return;
  if(Math.hypot(x-t.x,y-t.y)>20)t.cancel=true;
  if(phase==='up'){this.touch=null;if(!t.cancel&&t.page===this.page&&t.i>=0&&t.i===this.hit(x,y)){this.focus=t.i;this.press(t.i);}}
 }
 _ccu(e){
  if(!this.active||!(this.info&&this.info.controller))return;
  const prev=this.ccu;this.ccu=e;if(!prev)return;
  const steps=((e.knob-prev.knob+0x18000)%0x10000)-0x8000;
  if(e.knob!==0xffff&&prev.knob!==0xffff&&steps&&Math.abs(steps)<=24){
   this.focus=Math.max(0,Math.min(this.items.length-1,this.focus+steps));this.render();
  }
  if((e.press===1||e.press===2)&&e.press!==prev.press&&e.seq!==prev.seq)this.press(this.focus);
 }
 close(){this.closed=true;clearTimeout(this.reshowTimer);this.studio.close();clearInterval(this.timer);this.hide();this.gpu.removeAllListeners('close');this.gpu.close();}
}
module.exports={HudScreen,HOST,PROXIES};
