// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const fs=require('fs'),path=require('path');
const SPECS=[
 ['de.bmw.infotainment.vehicle.Vehicle2','statusCarSpeed2','speed'],
 ['de.bmw.infrastructure.VehicleInformation','statusGearboxDrive','gear'],
 ['de.bmw.infrastructure.VehicleCondition','VehicleCondition','condition'],
 ['de.bmw.infotainment.vehicle.CDS','statusEngineSpeed2','rpm'],
 ['de.bmw.infotainment.vehicle.CDS','statusEngineTemperature','temps']
];
function decode(kind,v){
 v=v||{};const num=(key,max,scale,offset)=>typeof v[key]==='number'&&v[key]>=0&&v[key]<max?v[key]*scale+(offset||0):null;
 if(kind==='speed')return {speed:num('speedVehicleCentreOfGravity',65535,.015625)};
 if(kind==='rpm')return {rpm:num('actualValueRPMEngineCrankshaft',65535,.25)};
 if(kind==='temps')return {oil:num('temperatureEngineOilDrive',255,1,-48),coolant:num('temperatureEngineDrive',255,1,-48)};
 if(kind==='gear'){const raw=v.statusActualStageDrive,gear={1:'P',2:'R',3:'N',4:'D',P:'P',R:'R',N:'N',D:'D'}[raw]||null;return {gear};}
 if(kind==='condition'){const raw=v.statusConditionVehicle;return {condition:raw===10||raw==='FAHREN'?'ready':[1,2,3,5,12,'PARKEN_BN_NIO','PARKEN_BN_IO','STANDFUNKTIONEN_KUNDE_NICHT_IM_FZG','WOHNEN','FAHRBEREITSCHAFT_BEENDEN'].includes(raw)?'off':null};}
 return {};
}
class Telemetry {
 constructor(o){this.o=o||{};this.values={};this.at={};this.closed=false;this.proxies=[];this.timer=null;this.now=this.o.now||Date.now;}
 receive(kind,value){const d=decode(kind,value);Object.keys(d).forEach(k=>{this.values[k]=d[k];this.at[k]=this.now();});}
 snapshot(){const out={now:new Date(this.now())};Object.keys(this.values).forEach(k=>out[k]=this.now()>=this.at[k]&&this.now()-this.at[k]<2000?this.values[k]:null);out.connected=out.speed!=null&&out.gear!=null;return out;}
 parked(){const d=this.snapshot();return d.speed!==null&&d.speed!==undefined&&d.speed<.1&&d.gear==='P';}
 async start(){
  const root=this.o.root||'/var/opt/public/oap';
  let home;try{home=fs.readdirSync(root).filter(n=>/^oap_[0-9]+$/.test(n)).map(n=>path.join(root,n)).find(d=>{try{return JSON.parse(fs.readFileSync(path.join(d,'source/package.json'),'utf8')).name==='robertn_waze_cluster';}catch(e){return false;}});}catch(e){}
  if(!home)return this.retry();
  let native;try{native=this.o.native||require('/usr/lib/someip.node');}catch(e){return this.retry();}
  // Getter-only observation. No writes, diagnostics, inferred gears or demo fallback.
  for(const s of SPECS){
   if(this.closed)return;
   try{
    const cfg=JSON.parse(fs.readFileSync(path.join(home,'someipInterfaces',s[0].replace(/\./g,'_')+'.json'),'utf8'));
    if(!cfg.fields||!cfg.fields[s[1]]||!cfg.fields[s[1]].getter)continue;
    const proxy=await new Promise((resolve,reject)=>setImmediate(()=>{try{native.buildProxy(cfg,'1').then(p=>p.init().then(()=>resolve(p)),reject).catch(reject);}catch(e){reject(e);}}));
    if(this.closed){await proxy.shutdown();return;}this.proxies.push({proxy,spec:s});
   }catch(e){}
  }
  if(!this.proxies.length)return this.retry();
  this.poll();
 }
 retry(){if(!this.closed)this.timer=setTimeout(()=>this.start(),10000);}
 async poll(){
  if(this.closed)return;
  for(const p of this.proxies){
   if(this.closed)return;
   try{const v=await new Promise((resolve,reject)=>setImmediate(()=>{try{p.proxy.getValue(p.spec[1],250).then(resolve,reject);}catch(e){reject(e);}}));this.receive(p.spec[2],v);}catch(e){this.receive(p.spec[2],{});}
  }
  if(!this.closed)this.timer=setTimeout(()=>this.poll(),300);
 }
 close(){this.closed=true;clearTimeout(this.timer);this.proxies.forEach(p=>{try{p.proxy.shutdown();}catch(e){}});this.values={};}
}
module.exports={Telemetry,decode,SPECS};
