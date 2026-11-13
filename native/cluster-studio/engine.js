// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const M=require('./shared/studio_model');
const Layouts=require('./vendor/cluster-layouts/layouts');
const {startCluster}=require('./vendor/cluster-layouts/engine');
const {SourceMesh}=require('./source_mesh');
const Clock=require('./vendor/cluster-layouts/clock');
const {lookNow}=require('./vendor/cluster-layouts/themes');
const C=require('./vendor/cluster-layouts/layout_common');
const MapFocus=require('./map_focus'),{MapRequest}=require('./map_request');
function widgets(design,raw){
 const value=k=>{let v=raw[k],unit='';if(['driveMode','engineState','fuelWarning'].includes(k))return typeof v==='string'&&v?v:'--';if(!Number.isFinite(v))return '--';if(k==='fuel'){v=Math.max(0,Math.min(100,v/design.fuelCapacityLitres*100));unit='%';}else if(['oil','coolant','outside'].includes(k)||/^tireTemp/.test(k)){if(design.temperatureUnit==='F')v=v*1.8+32;unit='°'+design.temperatureUnit;}else if(k==='range'||k==='odometer'){if(design.units==='mph')v/=1.609344;unit=design.units==='mph'?' mi':' km';}else if(/^(pressure|target)/.test(k)){if(design.units==='mph')v*=14.5037738;return v.toFixed(1)+(design.units==='mph'?' psi':' bar');}else if(k==='torque'){if(design.units==='mph')v*=.737562149;unit=design.units==='mph'?' lb-ft':' Nm';}else if(k==='power'){if(design.units==='mph')v*=1.34102209;unit=design.units==='mph'?' hp':' kW';}else if(k==='tripTime')return Math.floor(v/60)+'h '+Math.round(v%60)+'m';else if(['battery','powerPercent','torquePercent'].includes(k))unit='%';return Math.round(v)+unit;};
 return value;
}
function sourceData(raw,d){
 const n=k=>Number.isFinite(raw[k])?raw[k]:null;
 const stage=['P','R','N','D'].includes(raw.gear)?raw.gear:/^[1-9]$/.test(raw.gear||'')?'D':null;
 return {speed:n('speed'),rpm:n('rpm'),stage,gear:/^[1-9]$/.test(raw.gear||'')?Number(raw.gear):null,mode:null,
  oil:n('oil'),coolant:n('coolant'),outside:n('outside'),torque:n('torque'),kw:n('power'),frange:n('range'),driveMode:raw.driveMode||null,
  fuelPct:n('fuel')==null?null:Math.max(0,Math.min(100,raw.fuel/d.fuelCapacityLitres*100)),engineOn:n('rpm')==null?null:raw.rpm>0,
  tyres:{p:{FL:n('pressureFL'),FR:n('pressureFR'),RL:n('pressureRL'),RR:n('pressureRR')},t:{FL:n('tireTempFL'),FR:n('tireTempFR'),RL:n('tireTempRL'),RR:n('tireTempRR')}},
  // No demo lane objects, inferred cruise engagement or synthetic diagnostics.
  dap:null,soc:null,erange:null,gearbox:null,iat:null,battTemp:null,boostActual:null,boostTarget:null,timing:null,hpfp:null};
}
class Engine {
 constructor(cr,telemetry,o){
  this.mapRequest=o&&o.mapRequest||new MapRequest();
  this.cr=cr;this.telemetry=telemetry;this.now=o&&o.now||Date.now;this.design=M.defaultDesign();this.enabled=false;this.output='panel';this.target=null;this.ref=null;this.panelUntil=0;this.panelBlock=null;
  this.hud='unknown';this.hudHolder=null;this.hudReason='';this.state='BMW gauges active';this.layerStates=new Map();this.clearRecovery();this.swept=false;
  cr.on('target',(target,state,holder,reason)=>{if(target==='hud'){this.hud=state;this.hudHolder=holder;this.hudReason=reason;}if(target==='panel')this.panelState={state,holder,reason};});
  cr.on('ready',()=>{this.hud='unknown';this.panelState=null;this.layerStates.clear();if(this.adapter)this.adapter.reconnect();});
  cr.on('disconnected',()=>{this.hud='unknown';this.panelState=null;this.layerStates.clear();this.state='Waiting for cluster renderer';});
  cr.on('layer',(ref,state,reason)=>{if(!this.owns(ref))return;this.layerStates.set(ref,state);if(state==='error')this.failed('layer',reason);});
  cr.on('refused',(op,ref,reason)=>{if(this.owns(ref))this.failed(op,reason);});
 }
 owns(ref){return this.adapter&&(this.adapter.meshes.includes(ref)||this.adapter.assets.has(ref));}
 clearRecovery(){this.failures=0;this.retryAt=0;this.recoveryPaused=false;this.lastFailure=null;}
 failed(op,reason){if(this.recoveryPaused)return;this.failures++;this.lastFailure={at:new Date(this.now()).toISOString(),op,reason:String(reason||'Renderer refused cluster').slice(0,240)};this.drop();this.recoveryPaused=this.failures>=3;this.retryAt=this.recoveryPaused?0:this.now()+(this.failures===1?2000:5000);this.state=this.recoveryPaused?'Cluster paused; BMW gauges active':'Waiting to retry source cluster';}
 health(){return {paused:this.recoveryPaused,retryInMs:Math.max(0,this.retryAt-this.now()),attempts:this.failures,failure:this.lastFailure};}
 display(){const refs=this.adapter?this.adapter.meshes:[],t=this.panelState;return {target:refs.length?'panel':null,visible:!!(refs.length&&refs.every(r=>this.layerStates.get(r)==='shown')&&t&&t.state==='shown'),state:t&&t.state||null,holder:t&&t.holder||null,reason:t&&t.reason||'',layerState:refs.length?'source meshes':'off'};}
 hudAllowsPanel(){
  // Observe only. Never start, stop, retarget or reconfigure the HUD.
  if(this.cr.ready&&this.cr.independentPanelHud===true)return true;
  if(['idle','released'].includes(this.hud))return true;
  const queued=this.hudReason==='scene id in use by another target',popup=this.hudHolder==='stock'&&this.hudReason==='a stock pop-up shows in its place';
  return !!(this.adapter&&this.adapter.meshes.length)&&this.hud==='waiting'&&(queued||popup);
 }
 options(){const d=this.design;return {centre:'stock',bottomStrip:'stock',vehicle:'ice',cluster:'standard',speedUnit:d.units==='mph'?'mph':'kmh',tempUnit:d.temperatureUnit==='F'?'f':'c',rpmMax:d.rpmMax,redline:d.redline,black:true,boxBezel:false};}
 sourceLayout(){return this.design.theme==='map_focus'?MapFocus:Layouts.byId(this.design.theme);}
 window(){if(this.design.theme==='map_focus')return [0,0,0,0];const w=this.sourceLayout().mapWindow;return w?[Math.min(711,w.x),Math.min(128,w.y),Math.max(1209,w.x+w.w),660]:[416,120,1504,660];}
 layout(){const l=this.sourceLayout();if(l.id==='map_focus')return l;return Object.assign({},l,{pieces:o=>{
  let p=l.pieces(o).map(x=>Object.assign({},x));
  // M's original speed/gear sit below its short map window. The X4 M needs
  // that entire center for native assistance: move speed into the left card.
  if(l.id==='m'){p=p.filter(x=>!['gear','gearStack'].includes(x.key)&&! /^(fuelBar|chargeBar)/.test(x.key));p.forEach(x=>{if(x.key==='speedDigits')Object.assign(x,{x:200,y:426,w:280,h:85});if(x.key==='speedUnit')Object.assign(x,{x:415,y:474,w:90,h:28});});}
  if(l.id==='gt3')p.forEach(x=>{if(['coolant','oil'].includes(x.key))Object.assign(x,{y:x.y+12,h:44});});
  p=p.filter(x=>!/^stripFuel/.test(x.key));
  for(const x of [0,1504])p.push(Object.assign(C.flat('personal-bg-'+x,x,606,416,54,'bg'),{z:45}));
  this.design.widgets.forEach((k,i)=>{const x=[18,216,1522,1720][i],key='personal-'+i;
   const label=({fuel:'FUEL %',oil:'OIL',coolant:'COOLANT',range:'RANGE',outside:'OUTSIDE',power:'POWER (CALC)',torque:'TORQUE',battery:'BATTERY',odometer:'ODOMETER',tripTime:'JOURNEY',powerPercent:'POWER %',torquePercent:'TORQUE %',driveMode:'DRIVE MODE',engineState:'ENGINE',fuelWarning:'FUEL RESERVE'})[k]||k.replace('pressure','TIRE ').replace('tireTemp','TEMP ').replace('target','TARGET ');
   const small=['driveMode','engineState','fuelWarning'].includes(k);
   p.push(C.text(key+'-label',x,609,180,16,label,t=>({color:[t.dim||'#9ba8ba',1]}),{z:46}),C.text(key+'-value',x,small?636:630,180,small?19:28,()=>widgets(this.design,this.telemetry.snapshot())(k),t=>({color:[t.text||t.fg||'#ffffff',1]}),{z:46}));
  });return p;
 }});}
 data(){return sourceData(this.telemetry.snapshot(),this.design);}
 live(){const d=this.telemetry.snapshot();return Number.isFinite(d.speed)&&d.speed>=0&&Number.isFinite(d.rpm)&&d.rpm>=0&&/^(P|R|N|D|[1-9])$/.test(d.gear||'');}
 allowed(){return this.enabled&&!this.suspendedMedia&&!this.recoveryPaused&&this.now()>=this.retryAt&&this.cr.ready&&(this.design.theme!=='map_focus'||(this.cr.panelFocusVideo===true&&this.cr.independentPanelHud===true))&&/(^|,)panel:1920x720(,|$)/.test(this.cr.targets||'')&&this.hudAllowsPanel()&&this.live();}
 start(){
  const adapter=this.adapter=new SourceMesh(this.cr,{failed:reason=>this.failed('mesh',reason),window:()=>this.window(),fullMap:()=>this.design.theme==='map_focus'&&this.cr.panelFocusVideo===true});
  const catalog=()=>M.THEMES.find(t=>t.id===this.design.theme);
  this.source=startCluster({client:adapter,layout:()=>this.layout(),options:()=>this.options(),data:()=>this.data(),font:()=>catalog().font,
   theme:()=>{const p=Object.assign({},this.sourceLayout().palette(lookNow(this.design.palette,this.data())));p.bg='#000000';if(this.design.accent!=='source'){p.mark=this.design.accent;p.lit=this.design.accent;p.glow=this.design.accent;p.accent=this.design.accent;p.needle=this.design.accent;}return p;},
   enabled:()=>this.allowed(),live:()=>this.live(),sweep:()=>{if(this.swept||!this.design.startup||!this.telemetry.parked())return false;this.swept=true;return true;},settleMs:600,target:'panel',contend:false,log:{info:()=>{},warn:()=>{}}});
 }
 configure(design,on,output){
  if(output&&output!=='panel')throw Error('Old cluster output removed');const next=M.validate(design),same=JSON.stringify(next)===JSON.stringify(this.design);this.design=next;if(next.theme!=='map_focus')this.mapRequest.release();this.enabled=!!on;this.output='panel';
  Clock.setTwelve(!next.clock24);Clock.setZone('eastern');
  if(!this.enabled){this.drop();this.clearRecovery();this.state='BMW gauges active';return;}
  if(this.source&&!same){this.source.rebuild();this.source.recolour();}else if(!this.source&&!this.recoveryPaused&&this.now()>=this.retryAt)this.start();
 }
 tick(){
  if(this.enabled&&!this.source&&!this.recoveryPaused&&this.now()>=this.retryAt)this.start();
  if(this.adapter&&!this.telemetry.parked())this.adapter.cancelAnimations();
  if(this.adapter&&this.allowed()&&(!this.lastLease||this.now()-this.lastLease>=400)){this.adapter.renew();this.lastLease=this.now();}
  this.mapRequest.update(this.design.theme==='map_focus'&&this.allowed()&&!!(this.adapter&&this.adapter.meshes.length));
  this.ref=this.adapter&&this.adapter.meshes[0]||null;this.target=this.ref?'panel':null;
  if(this.recoveryPaused||this.now()<this.retryAt)return;
  this.state=!this.enabled?'BMW gauges active':!this.cr.ready?'Waiting for cluster renderer':!this.live()?'BMW gauges active; waiting for fresh readings':!this.hudAllowsPanel()?'Cluster waiting for independent display resource':this.design.theme==='map_focus'&&!this.cr.panelFocusVideo?'Update Cluster renderer for full-screen maps':this.design.theme==='map_focus'?(this.mapRequest.error?'Map request failed; '+this.mapRequest.error:'CarPlay Map; open Apple Maps in CarPlay. Vehicle verification pending'):this.display().visible?'Source cluster shown; BMW center and warnings retained':'Source cluster starting';
 }
 retry(){this.drop();this.clearRecovery();if(this.enabled)this.start();}
 preview(){throw Error('Timed legacy cluster preview removed; use the theme gallery');}
 stopPreview(){}
 drop(){this.mapRequest.release();const src=this.source;this.source=null;if(src)src.stop();if(this.adapter)this.adapter.close();this.adapter=null;this.ref=null;this.target=null;this.lastLease=0;this.layerStates.clear();}
 close(){this.drop();this.cr.close();}
}
module.exports={Engine,sourceData,widgets};
