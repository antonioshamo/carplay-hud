// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const fs=require('fs');
const {SPECS,configs}=require('./telemetry_schema.js');
function decode(kind,v){
 v=v||{};const num=(key,max,scale,offset)=>Number.isFinite(v[key])&&v[key]>=0&&v[key]<max?v[key]*scale+(offset||0):null;
 if(kind==='speed')return {speed:num('speedVehicleCentreOfGravity',65535,.015625)};
 if(kind==='rpm')return {rpm:num('actualValueRPMEngineCrankshaft',65535,.25)};
 if(kind==='temps')return {oil:num('temperatureEngineOilDrive',255,1,-48),coolant:num('temperatureEngineDrive',255,1,-48)};
 if(kind==='fuel')return {fuel:num('fluidLevelFuelTank',255,1),range:num('range',4095,1),odometer:num('mileageKilometre',16777215,1),fuelWarning:({0:'NORMAL',1:'LOW FUEL',NICHT_AKTIV:'NORMAL',AKTIV:'LOW FUEL'})[v.statusFluidLevelFuelTankSpare]||null};
 if(kind==='trip'){const h=num('rideDurationHours',4095,1),m=num('rideDurationMinutes',60,1);return {tripTime:h==null||m==null?null:h*60+m};}
 if(kind==='outside')return {outside:num('temperatureExterior',255,.5,-40)};
 if(kind==='battery')return {battery:num('conditionBatteryChargingCondition',101,1)};
 if(kind==='engineState')return {engineState:({0:'OFF',1:'STARTING',2:'RUNNING',MOTOR_AUS:'OFF',MOTOR_STARTET:'STARTING',MOTOR_LAEUFT:'RUNNING'})[v.statusEngineRunDrive]||null};
 if(kind==='torque')return {torque:num('actualValueTorqueCrankshaft',4095,.5,-1023.5)};
 if(kind==='sport')return {powerPercent:num('displaySportEnginePower',101,1),torquePercent:num('displaySportEngineTorque',101,1)};
 if(kind==='driveMode')return {driveMode:({1:'SPORT',2:'SPORT PLUS',3:'SPORT INDIVIDUAL',4:'COMFORT',5:'COMFORT PLUS',6:'COMFORT INDIVIDUAL',7:'ECO PRO',8:'ECO PRO PLUS',9:'ECO PRO INDIVIDUAL',10:'ADAPTIVE',SPORT_DYNAMIC:'SPORT',SPORT_EXPERT:'SPORT PLUS',SPORT_INDIVIDUAL:'SPORT INDIVIDUAL',COMFORT:'COMFORT',COMFORT_PLUS:'COMFORT PLUS',COMFORT_INDIVIDUAL:'COMFORT INDIVIDUAL',ECO_PRO_EFFICIENT:'ECO PRO',ECO_PRO_PLUS:'ECO PRO PLUS',ECO_PRO_INDIVIDUAL:'ECO PRO INDIVIDUAL',ADAPTIVE:'ADAPTIVE'})[v.actualValueModeDrivingExperience]||null};
 if(kind==='units')return {pressureUnit:({1:'bar',2:'kPa',3:'psi',BAR:'bar',KPA:'kPa',PSI:'psi'})[v.unitOfMeasurementAirPressure]||null,tireTemperatureUnit:({1:'C',2:'F',C:'C',F:'F'})[v.unitOfMeasurementTemperature]||null};
 if(['pressure','target','tireTemp'].includes(kind)){
  const out={},prefix={pressure:'actualValuePressureTyre',target:'targetPressureTyre',tireTemp:'actualValueTemperatureTyre'}[kind];
  for(const c of ['FL','FR','RL','RR'])out['_'+kind+c]=num(prefix+c+'H',kind==='tireTemp'?65535:65532,kind==='tireTemp'?1:.1,kind==='tireTemp'?-40:0);
  return out;
 }
 if(kind==='selection'){const raw=v.statusGearSelectionDrive,gear=({3:'P',2:'R',1:'N',5:'1',6:'2',7:'3',8:'4',9:'5',10:'6',11:'7',12:'8',13:'9',P:'P',R:'R',N:'N',_1:'1',_2:'2',_3:'3',_4:'4',_5:'5',_6:'6',_7:'7',_8:'8',_9:'9'})[raw]||null;return {gear};}
 if(kind==='gear'){const raw=v.statusActualStageDrive,gear={1:'P',2:'R',3:'N',4:'D',P:'P',R:'R',N:'N',D:'D'}[raw]||null;return {gear};}
 if(kind==='condition'){
  const raw=v.statusConditionVehicle,off=[1,2,3,5,12,'PARKEN_BN_NIO','PARKEN_BN_IO','STANDFUNKTIONEN_KUNDE_NICHT_IM_FZG','WOHNEN','FAHRBEREITSCHAFT_BEENDEN'].includes(raw);
  // BMW reports off states with an unavailable qualifier. This separate hint
  // can only re-arm a welcome with fresh zero RPM; it never authorizes output.
  const qualified=v.qualifierStatusConditionVehicle===undefined||[2,'SIGNALWERT_GUELTIG'].includes(v.qualifierStatusConditionVehicle);
  return {condition:qualified?(raw===10||raw==='FAHREN'?'ready':off?'off':null):null,welcomeOffHint:off};
 }
 return {};
}
const SLOW=new Set(['fuel','range','odometer','fuelWarning','tripTime','outside','battery','pressureUnit','tireTemperatureUnit']);
function freshness(k){return SLOW.has(k)||/^_(pressure|target|tireTemp)/.test(k)?15000:2000;}
function interval(kind){return ['speed','rpm'].includes(kind)?50:['fuel','trip','outside','battery','units','pressure','target','tireTemp'].includes(kind)?5000:250;}
function bounded(p,ms){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Telemetry timeout')),ms);Promise.resolve(p).then(v=>{clearTimeout(timer);resolve(v);},e=>{clearTimeout(timer);reject(e);});});}
class Telemetry {
 constructor(o){this.o=o||{};this.values={};this.at={};this.revisions={};this.closed=false;this.proxies=[];this.timer=null;this.now=this.o.now||Date.now;}
 receive(kind,value){const d=(this.o.decode||decode)(kind,value);this.revisions[kind]=(this.revisions[kind]||0)+1;Object.keys(d).forEach(k=>{this.values[k]=d[k];this.at[k]=this.now();});}
 snapshot(){
  const out={now:new Date(this.now())};Object.keys(this.values).forEach(k=>out[k]=this.now()>=this.at[k]&&this.now()-this.at[k]<freshness(k)?this.values[k]:null);
  // TPMS values follow the car's display units. Never infer units from value size.
  const factor={bar:1,kPa:.01,psi:1/14.5037738}[out.pressureUnit];
  for(const c of ['FL','FR','RL','RR']){
   for(const k of ['pressure','target']){const raw=out['_'+k+c];out[k+c]=raw==null||!factor?null:raw*factor;delete out['_'+k+c];}
   const raw=out['_tireTemp'+c];out['tireTemp'+c]=raw==null||!out.tireTemperatureUnit?null:out.tireTemperatureUnit==='F'?(raw-32)/1.8:raw;delete out['_tireTemp'+c];
  }
  out.power=out.torque==null||out.rpm==null?null:Math.max(0,out.torque)*out.rpm/9549.296586;
  out.connected=out.speed!=null&&out.gear!=null;return out;
 }
 parked(){const d=this.snapshot();return d.speed!==null&&d.speed!==undefined&&d.speed<.1&&d.gear==='P';}
 async start(){
  if(this.closed||this.starting)return;clearTimeout(this.retryTimer);this.starting=true;
  try{
   if(!this.rows){const file=this.o.catalog||'/etc/oap/someip/someip-interfaces.json';if(fs.statSync(file).size>64*1024*1024)throw Error('Catalog too large');this.rows=configs(JSON.parse(fs.readFileSync(file,'utf8')),this.o.specs);}
   const rows=this.rows,native=this.o.native||require('/usr/lib/someip.node');
   // Start independent polling immediately; optional services cannot delay RPM.
   if(!this.polling){this.polling=true;this.poll();}
   for(const row of rows){
    if(this.closed)break;
    if(this.proxies.some(p=>p.kind===row.kind))continue;
    let proxy,abandoned=false;
    try{
     const creating=Promise.resolve(native.buildProxy(row.config,Object.keys(row.config.instances)[0]));creating.then(p=>{if(abandoned)try{p.shutdown();}catch(e){}},()=>{});proxy=await bounded(creating,2000);
     if(this.closed){proxy.shutdown();break;}
     await bounded(proxy.init(),2000);if(this.closed){proxy.shutdown();break;}
     const entry=Object.assign({proxy},row),def=row.config.fields[row.field];
     if(def.event){
      try{await bounded(proxy.subscribe({name:row.field,onReceive:v=>{if(!this.closed&&!abandoned)this.receive(row.kind,v);}}),2000);}
      catch(e){if(!this.o.allowPollingFallback||!def.getter)throw e;}
     }
     if(this.closed){proxy.shutdown();break;}
     this.proxies.push(entry);this.poll();
    }catch(e){abandoned=true;if(proxy)try{proxy.shutdown();}catch(ignore){}}
   }
   // A notifier-only Park/ignition field is intentionally never polled as a getter.
   if(!this.polling){this.polling=true;this.poll();}
  }catch(e){}
  this.starting=false;if(!this.closed&&(!this.rows||this.proxies.length<this.rows.length))this.retryTimer=setTimeout(()=>this.start(),10000);
 }
 async poll(){
  if(this.closed)return;
  clearTimeout(this.timer);
  // Each getter has its own cadence and one bounded request in flight.
  // A slow temperature getter cannot stall subsequent speed/RPM cycles.
  const now=this.now(),jobs=this.proxies.filter(p=>p.config.fields[p.field].getter&&!p.pending&&(!p.nextPoll||now>=p.nextPoll||now<p.lastPoll)).map(async p=>{
   p.pending=true;p.lastPoll=now;p.nextPoll=now+(this.o.pollMs||interval(p.kind));
   const revision=this.revisions[p.kind]||0;
   try{const v=await bounded(p.proxy.getValue(p.field,250),500);if(!this.closed&&(this.revisions[p.kind]||0)===revision)this.receive(p.kind,v);}catch(e){/* Readings still expire; never extend cached Park or speed. */}
   p.pending=false;
  });
  if(!this.closed)this.timer=setTimeout(()=>this.poll(),50);
  await Promise.all(jobs);
 }
 close(){this.closed=true;clearTimeout(this.timer);clearTimeout(this.retryTimer);this.proxies.forEach(p=>{try{p.proxy.shutdown();}catch(e){}});this.proxies=[];this.values={};}

}
module.exports={Telemetry,decode,SPECS,freshness,interval};
