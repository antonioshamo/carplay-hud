// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const M=require('./shared/studio_model.js'),D=require('./shared/studio_draw.js'),{Canvas}=require('./shared/kit_canvas.js'),I=require('./shared/studio_intro.js'),G=require('./welcome_gpu.js');
class Engine {
 constructor(cr,telemetry,o){
  this.cr=cr;this.telemetry=telemetry;this.now=o&&o.now||Date.now;this.design=M.preset(0);this.enabled=false;this.ref=null;this.target=null;this.panelUntil=0;this.introUntil=0;this.lastDraw=0;this.state='Off';this.condition=null;this.hud='unknown';
  cr.on('target',(target,state)=>{if(target==='hud'){this.hud=state;if(!['idle','released'].includes(state)&&this.target==='panel')this.stopPreview();}if(target===this.target)this.state='Renderer: '+state;});
  cr.on('disconnected',()=>{this.drop();this.hud='unknown';this.state='Renderer disconnected';});
  cr.on('ready',()=>{this.drop();this.hud='unknown';this.lastDraw=0;});
  cr.on('refused',()=>{this.drop();this.panelUntil=0;this.state='Renderer refused the layer';});
 }
 drop(){G.drop(this.cr,this.welcome);this.welcome=null;if(this.ref)this.cr.drop(this.ref);this.ref=null;this.target=null;this.lastDraw=0;}
 configure(design,on){this.design=M.validate(design);this.enabled=!!on;this.drop();this.panelUntil=0;this.introUntil=0;}
 preview(design){
  if(!this.telemetry.parked())throw Error('Full-screen test needs fresh speed 0 and gear P');
  if(!this.cr.ready||!/(^|,)panel:1920x720(,|$)/.test(this.cr.targets||''))throw Error('Full-cluster renderer unavailable');
  // Never steal the shared scene from HUD. Unknown ownership also blocks it.
  if(!['idle','released'].includes(this.hud))throw Error('HUD is active or its state is unknown; full-screen test unavailable');
  this.panelDesign=M.validate(design);this.drop();this.panelUntil=this.now()+10000;this.introAt=this.now();this.introUntil=design.introEnabled?this.now()+I.duration(design):0;this.lastDraw=0;
 }
 stopPreview(){if(this.panelUntil)this.introUntil=0;if(this.target==='panel')this.drop();this.panelUntil=0;}
 tick(){
  const now=this.now(),data=this.telemetry.snapshot();
  if(data.condition==='ready'&&this.condition!== 'ready'&&this.design.introEnabled&&!this.panelUntil&&this.telemetry.parked()){this.introAt=now;this.introUntil=now+I.duration(this.design);this.drop();}
  if(data.condition)this.condition=data.condition;
  if(this.panelUntil&&(now>=this.panelUntil||!this.telemetry.parked())){this.stopPreview();this.state='Full-screen test ended';}
  if(this.introUntil&&(now>=this.introUntil||!this.telemetry.parked())){this.introUntil=0;G.drop(this.cr,this.welcome);this.welcome=null;}
  if(!this.cr.ready){this.state='Waiting for cluster renderer';return;}
  if(!this.enabled&&!this.panelUntil&&!this.introUntil){this.drop();this.state='Off';return;}
  const target=this.panelUntil?'panel':'map';
  if(!new RegExp('(^|,)'+target+':'+(target==='panel'?'1920x720':'1088x480')+'(,|$)').test(this.cr.targets||'')){this.drop();this.state='Unsupported cluster geometry';return;}
  if(this.target!==target){this.drop();this.target=target;}
  const w=target==='panel'?960:544,h=target==='panel'?360:240;
  const dw=target==='panel'?1920:1088,dh=target==='panel'?720:480;
  if(!this.ref){
   this.ref=this.cr.image({target,klass:'overlay',z:5,x:0,y:0,w:dw,h:dh,iw:w,ih:h,visible:false,exclusive:false,contend:target==='map',fps:1,sampling:'bilinear'});
   this.state='Layer prepared';
  }
  if(this.introUntil&&!this.welcome)this.welcome=G.create(this.cr,target,dw,dh,target==='panel'?this.panelDesign:this.design,now-this.introAt);
  if(now-this.lastDraw<1000&&this.lastDraw)return;
  // No sample values ever reach the physical cluster.
  const cv=new Canvas(w,h);cv.clear([0,0,0,0]);
  D.draw(cv,target==='panel'?this.panelDesign:this.design,{x:0,y:0,w,h},data);
  const first=!this.lastDraw;this.cr.pixels(this.ref,null,Buffer.from(cv.d));if(first)this.cr.set(this.ref,{visible:true});
  if(first&&target==='panel')this.cr.animate(this.ref,{property:'translate',keys:'0:0,0,0 '+Math.max(1,this.panelUntil-now)+':0,0,0 '+Math.max(2,this.panelUntil-now+1)+':0,1200,0',interp:'step',loop:false});
  this.lastDraw=now;
 }
 close(){this.drop();this.cr.close();}
}
module.exports={Engine};
