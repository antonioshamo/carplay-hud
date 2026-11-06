// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const M=require('./shared/studio_model.js'),I=require('./shared/studio_intro.js'),G=require('./welcome_gpu.js'),P=require('./image_delta.js');
const {FrameCache}=require('./frame_cache.js');
class Engine {
 constructor(cr,telemetry,o){
  this.cr=cr;this.telemetry=telemetry;this.panelBlock=null;this.output='center';this.now=o&&o.now||Date.now;this.design=M.preset(0);this.enabled=false;this.ref=null;this.target=null;this.panelUntil=0;this.introUntil=0;this.lastDraw=0;this.state='Off';this.condition=null;this.hud='unknown';
  cr.on('target',(target,state,holder,reason)=>{if(target==='hud'){this.hud=state;this.hudReason=reason;if(!this.hudAllowsPanel()&&this.target==='panel'){this.stopPreview();this.drop();}}if(target===this.target)this.state='Renderer: '+state;});
  cr.on('disconnected',()=>{this.drop();this.hud='unknown';this.state='Renderer disconnected';});
  cr.on('ready',()=>{this.drop();this.hud='unknown';this.lastDraw=0;});
  cr.on('refused',(op,ref)=>{
   // Late replies to a retired layer (or another client of this connection)
   // must not tear down the currently displayed gauges.
   if(!(this.ref!=null&&ref===this.ref)&&!(this.welcome&&(ref===this.welcome.ref||this.welcome.assets.includes(ref))))return;
   this.drop();this.panelUntil=0;this.state='Renderer refused the layer';
  });
 }
 hudAllowsPanel(){
  if(['idle','released'].includes(this.hud))return true;
  // panel and HUD share a scene ID on this renderer. A queued HUD request
  // is NOT ownership: releasing our panel here creates a handoff loop.
  // Only retain a layer we already own; never claim an unknown/busy scene.
  return this.target==='panel'&&!!this.ref&&this.hud==='waiting'&&this.hudReason==='scene id in use by another target';
 }
 drop(){G.drop(this.cr,this.welcome);this.welcome=null;if(this.ref)this.cr.drop(this.ref);this.ref=null;this.target=null;this.lastDraw=0;this.lastLease=0;this.panelLease=null;this.previousPixels=null;this.frames=null;}
 configure(design,on,output){
  if(output&&!['center','parked-panel'].includes(output))throw Error('Invalid output');
  const next=M.validate(design),enabled=!!on,target=output||'center';
  const same=JSON.stringify(next)===JSON.stringify(this.design),stable=enabled&&this.enabled&&target===this.output;
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
   this.ref=this.cr.image({target,klass:'overlay',z:5,x:0,y:0,w:dw,h:dh,iw:w,ih:h,visible:false,exclusive:false,contend:true,fps:20,sampling:'bilinear'});
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
  if(now-this.lastDraw<50&&this.lastDraw)return;
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
