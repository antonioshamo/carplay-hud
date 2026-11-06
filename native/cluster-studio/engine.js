// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const M=require('./shared/studio_model.js'),I=require('./shared/studio_intro.js'),G=require('./welcome_gpu.js'),P=require('./image_delta.js');
const {FrameCache}=require('./frame_cache.js');
class Engine {
 constructor(cr,telemetry,o){
  this.cr=cr;this.telemetry=telemetry;this.panelBlock=null;this.output='center';this.now=o&&o.now||Date.now;this.design=M.preset(0);this.enabled=false;this.ref=null;this.target=null;this.panelUntil=0;this.introUntil=0;this.lastDraw=0;this.state='Off';this.condition=null;this.hud='unknown';
  this.targets={};this.layerState=null;this.layerReason='';this.clearRecovery();
  cr.on('target',(target,state,holder,reason)=>{
   const previous=this.targets[target];this.targets[target]={state,holder,reason:reason||''};
   if(target===this.target&&previous&&previous.state==='shown'&&state==='waiting'&&holder==='none'&&/^(taken:|not rendered:)/.test(reason||''))this.pendingLoss={ref:this.ref,target,at:this.now()+1000};
   if(target==='hud'){this.hud=state;this.hudHolder=holder;this.hudReason=reason;if(!this.hudAllowsPanel()&&this.target==='panel'){this.stopPreview();this.drop();}}
   if(target===this.target)this.state='Renderer: '+state;
  });
  cr.on('disconnected',()=>{this.drop();this.targets={};this.hud='unknown';this.state='Renderer disconnected';});
  cr.on('ready',()=>{this.drop();this.targets={};this.hud='unknown';this.lastDraw=0;});
  cr.on('layer',(ref,state,reason)=>{if(ref!==this.ref)return;this.layerState=state;this.layerReason=reason||'';if(state==='error')this.failed('layer',reason);});
  cr.on('refused',(op,ref,reason)=>{
   // Late replies to a retired layer (or another client of this connection)
   // must not tear down the currently displayed gauges.
   if(!(this.ref!=null&&ref===this.ref)&&!(this.welcome&&(ref===this.welcome.ref||this.welcome.assets.includes(ref))))return;
   // A rejected welcome is optional. Its assets must not tear down healthy
   // gauges; the safety lease of the gauge image itself is not optional.
   if(ref!==this.ref){G.drop(this.cr,this.welcome);this.welcome=null;this.introUntil=0;return;}
   this.failed(op,reason);
  });
 }
 clearRecovery(){this.failures=0;this.retryAt=0;this.recoveryPaused=false;this.lastFailure=null;this.healthyAt=0;this.losses=[];this.pendingLoss=null;}
 failed(op,reason){
  this.failures++;this.lastFailure={at:new Date(this.now()).toISOString(),target:this.target,op,reason:String(reason||'Renderer rejected the layer').slice(0,240)};
  this.drop();this.panelUntil=0;this.introUntil=0;this.pendingWelcome=0;
  this.recoveryPaused=this.failures>=3;this.retryAt=this.recoveryPaused?0:this.now()+(this.failures===1?2000:5000);
  this.state=this.recoveryPaused?'Display paused · retry saved display':'Renderer retry pending';
 }
 retry(){this.drop();this.panelUntil=0;this.introUntil=0;this.pendingWelcome=0;this.clearRecovery();}
 health(){return {paused:this.recoveryPaused,retryInMs:Math.max(0,this.retryAt-this.now()),attempts:this.failures,failure:this.lastFailure};}
 display(){
  const t=this.target&&this.targets[this.target];
  return {target:this.target,visible:!!(this.ref&&this.layerState==='shown'&&t&&t.state==='shown'),state:t?t.state:null,holder:t?t.holder:null,reason:(t&&t.reason)||this.layerReason||'',layerState:this.layerState};
 }
 hudAllowsPanel(){
  if(['idle','released'].includes(this.hud))return true;
  // A queued HUD or a HUD suspended for a stock popup has no mapping of
  // its own. Keep the existing gauge demand so the slot manager can resume
  // it after BMW releases the call/speech dialog. Dropping it here hands
  // the shared scene to the queued map and strands the saved gauges.
  // This only retains an existing layer; the renderer still arbitrates
  // BMW dialogs/locks. Never acquire a new layer from an unknown HUD state.
  const queued=this.hudReason==='scene id in use by another target';
  const popup=this.hudHolder==='stock'&&this.hudReason==='a stock pop-up shows in its place';
  return this.target==='panel'&&!!this.ref&&this.hud==='waiting'&&(queued||popup);
 }
 drop(){G.drop(this.cr,this.welcome);this.welcome=null;if(this.ref)this.cr.drop(this.ref);this.ref=null;this.target=null;this.pendingLoss=null;this.layerState=null;this.layerReason='';this.healthyAt=0;this.lastDraw=0;this.lastLease=0;this.panelLease=null;this.previousPixels=null;this.frames=null;}
 configure(design,on,output){
  if(output&&!['center','parked-panel'].includes(output))throw Error('Invalid output');
  const next=M.validate(design),enabled=!!on,target=output||'center';
  const same=JSON.stringify(next)===JSON.stringify(this.design),stable=enabled&&this.enabled&&target===this.output;
  if(!enabled||target!==this.output)this.clearRecovery();
  this.design=next;this.enabled=enabled;this.output=target;
  if(stable&&!this.panelUntil){
   // Apply edits to the existing image. Releasing/reacquiring its scene
   // for a save exposes the factory gauges and restarts arbitration.
   if(!same){this.lastDraw=0;this.pendingWelcome=0;this.introUntil=0;G.drop(this.cr,this.welcome);this.welcome=null;}
   return;
  }
  this.pendingWelcome=0;this.drop();this.panelUntil=0;this.introUntil=0;
 }
 preview(design,seconds){
  if(this.panelBlock)throw Error(this.panelBlock);
  if(this.recoveryPaused||this.now()<this.retryAt)throw Error('Renderer recovery pending; use Retry saved display');
  seconds=seconds===undefined?10:seconds;if(![10,30,60].includes(seconds))throw Error('Choose a 10, 30 or 60 second test');
  if(!this.telemetry.parked())throw Error('Full-screen test needs fresh speed 0 and gear P');
  if(!this.cr.ready||!/(^|,)panel:1920x720(,|$)/.test(this.cr.targets||''))throw Error('Full-cluster renderer unavailable');
  // Never steal the shared scene from HUD. Unknown ownership also blocks it.
  if(!['idle','released'].includes(this.hud))throw Error('HUD is active or its state is unknown; full-screen test unavailable');
  this.panelDesign=M.validate(design);this.drop();this.panelUntil=this.now()+seconds*1000;this.introAt=this.now();this.introUntil=design.introEnabled?this.now()+I.duration(design):0;this.lastDraw=0;this.lastLease=0;
 }
 stopPreview(){if(this.panelUntil)this.introUntil=0;if(this.target==='panel')this.drop();this.panelUntil=0;}
 tick(){
  const now=this.now(),data=this.telemetry.snapshot();
  if(this.pendingLoss&&now>=this.pendingLoss.at){
   const loss=this.pendingLoss,t=this.targets[loss.target];this.pendingLoss=null;
   // Let the slot manager classify a removal before counting it. BMW calls,
   // stock dialogs, foreign owners and display locks are not upload failures.
   if(loss.ref===this.ref&&t&&t.state==='waiting'&&t.holder==='none'&&/^(taken:|not rendered:)/.test(t.reason)){
    this.losses=this.losses.filter(at=>now-at<60000);this.losses.push(now);
    if(this.losses.length>=3){this.failures=2;this.failed('target',t.reason);}
   }
  }
  if(this.recoveryPaused||now<this.retryAt){this.state=this.recoveryPaused?'Display paused · retry saved display':'Renderer retry in '+Math.ceil((this.retryAt-now)/1000)+' s';return;}
  // Count a recovery only after the renderer reports a stable, shown layer.
  // Repeated short-lived mappings must not erase the retry limit.
  if(this.display().visible){if(!this.healthyAt)this.healthyAt=now;if(this.failures&&now-this.healthyAt>=10000)this.clearRecovery();}else this.healthyAt=0;
  if(this.suspendedMedia){this.drop();this.introUntil=0;this.state='Parked video test';return;}
  if(data.welcomeOffHint===true&&data.rpm===0){this.condition='off';this.pendingWelcome=0;if(!this.panelUntil){this.introUntil=0;G.drop(this.cr,this.welcome);this.welcome=null;}}
  if(data.condition==='ready'&&this.condition!=='ready'&&this.design.introEnabled&&!this.panelUntil)this.pendingWelcome=now+10000;
  if(data.condition){this.condition=data.condition;if(data.condition!=='ready')this.pendingWelcome=0;}
  if(this.pendingWelcome){
   if(now>=this.pendingWelcome||this.panelUntil||(data.speed!=null&&data.speed>=.1)||(data.gear!=null&&data.gear!=='P'))this.pendingWelcome=0;
   else if(data.condition==='ready'&&this.telemetry.parked()){this.pendingWelcome=0;this.introAt=now;this.introUntil=now+I.duration(this.design);this.drop();}
  }
  if(this.panelUntil&&(now>=this.panelUntil||!this.telemetry.parked())){this.stopPreview();this.state='Full-screen test ended';}
  if(this.introUntil&&(now>=this.introUntil||!this.telemetry.parked())){this.introUntil=0;G.drop(this.cr,this.welcome);this.welcome=null;}
  if(!this.cr.ready){this.state='Waiting for cluster renderer';return;}
  if(!this.enabled&&!this.panelUntil&&!this.introUntil){this.drop();this.state='Off';return;}
  const held=this.enabled&&this.output==='parked-panel';
  if(held&&!this.panelUntil&&(!this.telemetry.parked()||!this.hudAllowsPanel())){
   this.drop();this.introUntil=0;this.state=this.telemetry.parked()?'Full cluster waiting for HUD release':'BMW gauges active; full cluster resumes in Park';return;
  }
  const target=this.panelUntil||held?'panel':'map';
  const design=this.panelUntil?this.panelDesign:this.design;
  if(!new RegExp('(^|,)'+target+':'+(target==='panel'?'1920x720':'1088x480')+'(,|$)').test(this.cr.targets||'')){this.drop();this.state='Unsupported cluster geometry';return;}
  if(this.target!==target){this.drop();this.target=target;}
  const w=target==='panel'?1920:1088,h=target==='panel'?720:480;
  const dw=target==='panel'?1920:1088,dh=target==='panel'?720:480;
  if(!this.ref){
   // Ask to keep the ordinary foreground slot. This does not enable the
   // renderer's panel_take_over_stock option or bypass display locks.
   this.ref=this.cr.image({target,klass:'overlay',z:5,x:0,y:0,w:dw,h:dh,iw:w,ih:h,visible:false,exclusive:false,contend:true,fps:30,sampling:'bilinear'});
   this.state='Layer prepared';
  }
  if(this.introUntil&&!this.welcome)this.welcome=G.create(this.cr,target,dw,dh,design,now-this.introAt);
  if(target==='panel'&&(!this.lastLease||now-this.lastLease>=500)){
   const lease=Math.max(1,Math.min(1500,this.panelUntil?this.panelUntil-now:1500));
   const renew=(ref,old,ms)=>{if(old)this.cr.stop(ref,old);return this.cr.animate(ref,{property:'translate',keys:'0:0,0,0 '+ms+':0,0,0 '+(ms+1)+':0,1200,0',interp:'step',loop:false});};
   this.panelLease=renew(this.ref,this.panelLease,lease);
   if(this.welcome)this.welcome.expiry=renew(this.welcome.ref,this.welcome.expiry,Math.max(1,Math.min(lease,this.introUntil-now)));
   this.lastLease=now;
  }
  if(now-this.lastDraw<34&&this.lastDraw)return;
  // No sample values ever reach the physical cluster.
  if(!this.frames)this.frames=new FrameCache(w,h,target==='panel');
  const cv=this.frames.render(design,data);
  if(!cv){this.lastDraw=now;return;}
  const first=!this.lastDraw,update=P.delta(this.previousPixels,cv.d,w,h);
  if(update)this.cr.pixels(this.ref,update.rects,update.pixels);
  this.previousPixels=cv.d;if(first)this.cr.set(this.ref,{visible:true});

  this.lastDraw=now;
 }
 close(){this.drop();this.cr.close();}
}
module.exports={Engine};
