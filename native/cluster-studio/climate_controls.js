// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
// Schema-checked, user-initiated climate commands. New seat/rear adapters use
// the captured enum contract and fresh readback; physical verification is pending.
const fs=require('fs'),{Telemetry}=require('./telemetry.js'),{schema}=require('./telemetry_schema.js');
const FRONT='de.bmw.infotainment.climate.Climate2',SPECIAL='de.bmw.infotainment.climate.Climate';
const SPECS=[[FRONT,'statusACFrontFunctions','functions'],[FRONT,'statusAirConditionDRStatus','driver'],[FRONT,'statusAirConditionPSStatus','passenger']];
const ACTIONS={
 ac:{label:'A/C',service:FRONT,field:'operationAirConditioningFront',member:'operationAircon',options:['AUS','EIN'],read:'ac'},
 maxAC:{label:'MAX A/C',service:FRONT,field:'operationAirConditioningFront',member:'operationMaximumAirCondition',options:['AUS','EIN'],read:'maxAC'},
 defrost:{label:'Front defrost',service:FRONT,field:'operationAirConditioningFront',member:'operationDefrost',options:['AUS','EIN'],read:'defrost'},
 autoDR:{label:'Driver AUTO',service:FRONT,field:'operationAirConditioningFront',member:'operationModeAirConditioningDR',options:['AUS','EIN'],read:'autoDR'},
 autoPS:{label:'Passenger AUTO',service:FRONT,field:'operationAirConditioningFront',member:'operationModeAirConditioningPS',options:['AUS','EIN'],read:'autoPS'},
 airDR:{label:'Driver airflow',service:FRONT,field:'operationAirConditioningFront',member:'operationAirdistributionProgramDR',options:['UNTEN','MITTE','MITTE_UNTEN','OBEN','OBEN_UNTEN','OBEN_MITTE','OBEN_MITTE_UNTEN'],read:'airDR'},
 airPS:{label:'Passenger airflow',service:FRONT,field:'operationAirConditioningFront',member:'operationAirdistributionProgramPS',options:['UNTEN','MITTE','MITTE_UNTEN','OBEN','OBEN_UNTEN','OBEN_MITTE','OBEN_MITTE_UNTEN'],read:'airPS'},
 freshAir:{label:'Fresh / auto / recirculate',service:SPECIAL,field:'acSpecialFunction',member:'operationAUCFront',options:['FRISCHLUFT_GEWAEHLT','AUC_GEWAEHLT','UMLUFT_GEWAEHLT'],read:'freshAir'}
};
// The seat operation wrapper reserves 31 for untouched stratification fields.
// Accept only these exact fields/defaults, never arbitrary numeric defaults.
const SEAT_NEUTRAL={oPStratificationSeatHeaterAICDriver:31,oPStratificationSeatHeaterAICPassenger:31,oPStratificationSeatHeaterAICDriverRear:31,oPStratificationSeatHeaterAICPassengerRear:31};
const STAGES=['STUFE_0','STUFE_1','STUFE_2','STUFE_3'];
for(const [id,label,suffix,member,field] of [
 ['heatDR','Driver seat heating','DR','oPFunctionStageSeatHeaterAICDriver','statusSeatHeatingDR'],
 ['heatPS','Passenger seat heating','PS','oPFunctionStageSeatHeaterAICPassenger','statusSeatHeatingPS'],
 ['heatDRR','Rear left seat heating','DRR','oPFunctionStageSeatHeaterAICDriverRear','statusSeatHeatingDRR'],
 ['heatPSR','Rear right seat heating','PSR','oPFunctionStageSeatHeaterAICPassengerRear','statusSeatHeatingPSR'],
 ['ventDR','Driver ventilation','DR','oPFunctionStageSeatClimateAICDriver','statusSeatClimateDR'],
 ['ventPS','Passenger ventilation','PS','oPFunctionStageSeatClimateAICPassenger','statusSeatClimatePS']]){
 ACTIONS[id]={label,service:SPECIAL,field:'operationStratificationSeatHeating',member,options:STAGES,read:id,kind:id,neutralBytes:SEAT_NEUTRAL,labels:['Off','Level 1','Level 2','Level 3'],unverified:true};
 SPECS.push([SPECIAL,field,id]);
}
for(const [id,label,member,options,labels,kind] of [
 ['rearPower','Rear climate','operationOn2Tier',['AUS','EIN'],['Off','On'],'rear'],
 ['rearAuto','Rear AUTO','operationModeAirConditioning2Tier',['AUS','EIN'],['Off','On'],'rear'],
 ['rearLock','Rear control lock','operationLock2Tier',['AUS','EIN'],['Off','On'],'rear'],
 ['rearAC','Rear A/C','operationAirconRearCompartment',['AUSSCHALTEN__S_AUS','EINSCHALTEN__S__EIN','MAX_AC_EINSCHALTEN__S__MAX_AC_EIN'],['Off','On','MAX A/C'],'rearAC'],
 ['rearFan','Rear fan speed','operationManualBlowerLevelClimate2SeatRow',Array.from({length:9},(_,i)=>'STUFE_'+(i+1)),Array.from({length:9},(_,i)=>'Level '+(i+1)),'rear'],
 ['rearAir','Rear airflow','operationAirDistributionProgramClimate2Seat',['UNTEN','MITTE','MITTE_UNTEN'],['Footwell','Face vents','Face + footwell'],'rear']]){
 ACTIONS[id]={label,service:SPECIAL,field:'acFond',member,options,labels,read:id,kind,unverified:true};
}
SPECS.push([SPECIAL,'statusACFond2','rear'],[SPECIAL,'statusACFond','rearAC']);
function indexed(v,names,numbers){const n=typeof v==='number'?numbers.indexOf(v):typeof v==='string'?names.indexOf(v):-1;return n<0?null:n;}
function enumValue(v,names){if(Number.isInteger(v)&&v>=0&&v<names.length)return v;const n=names.indexOf(v);return n<0?null:n;}
function airflow(v){if(v==='AUTO'||v===8)return 7;if(Number.isInteger(v)&&v>=1&&v<=7)return v-1;const n=['UNTEN','MITTE','MITTE_UNTEN','OBEN','OBEN_UNTEN','OBEN_MITTE','OBEN_MITTE_UNTEN'].indexOf(String(v).replace(/_S_/g,'_'));return n<0?null:n;}
function decode(kind,v){v=v||{};
 if(ACTIONS[kind]&&/^(heat|vent)/.test(kind)){const field=SPECS.find(v=>v[2]===kind)[1],member=field.replace('statusSeatHeating','statusSeatHeater');return {[kind]:enumValue(v[member],STAGES)};}
 if(kind==='rear')return {rearPower:enumValue(v.statusOn2Tier,['AUS','EIN']),rearAuto:enumValue(v.statusModeAirConditioning2Tier,['AUS','EIN']),rearLock:enumValue(v.statusLock2Tier,['AUS','EIN']),rearFan:indexed(v.statusManualBlowerLevel2RowOfSeats,ACTIONS.rearFan.options,[1,2,3,4,5,6,7,8,9]),rearAir:indexed(v.statusAirDistributionProgramClimate2SeatRow,ACTIONS.rearAir.options,[1,2,3])};
 if(kind==='rearAC')return {rearAC:indexed(v.statusAirconRearCompartment,ACTIONS.rearAC.options,[0,2,1])};
 if(kind==='functions')return {ac:enumValue(v.statusAC,['KLIMAANLAGE_AUS','KLIMAANLAGE_EIN']),maxAC:enumValue(v.statusMaximumAircon,['MAX_AC_AUS','MAX_AC_EIN']),defrost:enumValue(v.statusDefrost,['DEFROST_AUS','DEFROST_EIN']),freshAir:enumValue(v.statusAUCFront,['AUC_AUSSCHALTEN__S__UMLUFT_S_AUC_AUS','AUC_EINSCHALTEN__S__AUC_EIN','S__UMLUFT_EIN'])};
 if(kind==='driver')return {airDR:airflow(v.statusAirInjectionManifoldProgramDR),autoDR:enumValue(v.statusBlowerAutomaticDR,['GEBLAESEAUTOMATIK_AUS','GEBLAESEAUTOMATIK_EIN'])};
 if(kind==='passenger')return {airPS:airflow(v.statusAirDistributionProgramPS),autoPS:enumValue(v.statusBlowerAutomaticPS,['GEBLAESEAUTOMATIK_AUS','GEBLAESEAUTOMATIK_EIN'])};
 return {};
}
function profile(db,action){
 const a=ACTIONS[action];if(!a)throw Error('Unsupported climate action');
 const i=db.interfaces&&db.interfaces[a.service],f=i&&i.fields&&i.fields[a.field],instances=db.instanceIDs&&db.instanceIDs[a.service];
 if(!f||!f.setter||!Number.isInteger(f.setter.id)||!instances||Object.keys(instances).length!==1)throw Error('Climate setter unavailable');
 const type=db.datatypes[f.dataRef];if(!type||type.type!=='struct'||!Array.isArray(type.members))throw Error('Climate schema mismatch');
 const defaults={};let member;
 type.members.forEach(m=>{
  const t=db.datatypes[m.dataRef];
  if(t&&t.type==='enum'){
   const none=['KEINE_AUSWAHL','KEINE_AKTION','SIGNAL_UNBEFUELLT','SIGNAL_UNGUELTIG'].find(n=>Object.prototype.hasOwnProperty.call(t.items,n));
   if(!none)throw Error('No neutral climate value');defaults[m.name]=none;
  }else if(m.dataRef==='UInt8'&&m.defaultValue===255)defaults[m.name]=255;
  else if(m.dataRef==='UInt8'&&a.neutralBytes&&Object.prototype.hasOwnProperty.call(a.neutralBytes,m.name)&&m.defaultValue===a.neutralBytes[m.name])defaults[m.name]=m.defaultValue;
  else throw Error('Unrecognized climate neutral value');
  if(m.name===a.member)member=t;
 });
 if(!member||!a.options.every(n=>Number.isInteger(member.items[n])))throw Error('Climate action enum mismatch');
 return {defaults,instance:Object.keys(instances)[0],config:{name:i.name,serviceId:i.serviceId,version:i.version,instances:Object.assign({},instances),fields:{[a.field]:{schema:schema(db,f.dataRef,0),setter:{id:f.setter.id}}},methods:{},events:{},eventGroups:{fields:{},events:{}}}};
}
function bounded(p,ms){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Climate request timed out; use BMW controls')),ms);Promise.resolve(p).then(v=>{clearTimeout(timer);resolve(v);},e=>{clearTimeout(timer);reject(e);});});}
class ClimateControls {
 constructor(o){this.o=o||{};this.now=this.o.now||Date.now;this.reader=this.o.reader||new Telemetry(Object.assign({},o,{specs:SPECS,decode,pollMs:500}));this.profiles={};this.writers={};this.pending=false;this.closed=false;this.leaseUntil=0;this.message='Open Climate to check the car';}
 async open(){
  if(this.closed)throw Error('Climate session closed');this.leaseUntil=this.now()+8000;
  if(this.initializing)return this.initializing;
  if(this.started)return this.status();
  this.started=true;
  this.initializing=(async()=>{
   const file=this.o.catalog||'/etc/oap/someip/someip-interfaces.json';
   if(!this.o.db){const stat=fs.statSync(file);if(!stat.isFile()||stat.size>64*1024*1024)throw Error('Invalid climate catalog');}
   const db=this.o.db||JSON.parse(fs.readFileSync(file,'utf8'));
   for(const key of Object.keys(ACTIONS))try{this.profiles[key]=profile(db,key);}catch(e){}
   Promise.resolve(this.reader.start()).catch(()=>{});this.message='Only fresh, supported controls are enabled';return this.status();
  })().catch(e=>{this.message=e.message;this.started=false;return this.status();}).then(v=>{this.initializing=null;return v;});
  return this.initializing;
 }
 status(){const d=this.reader.snapshot();return {pending:this.pending,message:this.message,controls:Object.keys(ACTIONS).map(id=>({id,label:ACTIONS[id].label,choices:ACTIONS[id].labels||null,choiceCount:ACTIONS[id].options.length,unverified:!!ACTIONS[id].unverified,reason:!this.profiles[id]?'Command not supported by this firmware':d[ACTIONS[id].read]==null?'Waiting for a valid car reading':null,value:d[ACTIONS[id].read]==null?null:d[ACTIONS[id].read],available:!this.closed&&this.now()<this.leaseUntil&&!!this.profiles[id]&&d[ACTIONS[id].read]!=null})),vehicleVerified:false};}
 async command(id,value){
  const a=ACTIONS[id],p=this.profiles[id];
  if(!a||!p||!Number.isInteger(value)||value<0||value>=a.options.length)throw Error('Invalid climate request');
  if(this.closed||this.now()>=this.leaseUntil||this.reader.snapshot()[a.read]==null)throw Error('Fresh climate data required');
  if(this.pending)throw Error('Wait for the current climate change');
  this.pending=true;this.message='Waiting for BMW climate confirmation';
  const writerKey=a.service+'.'+a.field;let write;
  try{
   if(!this.writers[writerKey]){
    const native=this.o.native||require('/usr/lib/someip.node');let abandoned=false;
    const create=Promise.resolve(native.buildProxy(p.config,p.instance));create.then(proxy=>{if(abandoned||this.closed)try{proxy.shutdown();}catch(e){}},()=>{});
    try{write=await bounded(create,1500);if(this.closed)throw Error('Climate session closed');await bounded(write.init(),1500);if(this.closed)throw Error('Climate session closed');this.writers[writerKey]=write;}catch(e){abandoned=true;if(write)try{write.shutdown();}catch(ignore){}throw e;}
   }
   // Recheck freshness after connection; never act on a stale UI selection.
   if(this.closed||this.now()>=this.leaseUntil||this.reader.snapshot()[a.read]==null)throw Error('Fresh climate data required');
   const kind=a.kind||(id==='autoDR'||id==='airDR'?'driver':id==='autoPS'||id==='airPS'?'passenger':'functions'),revision=this.reader.revisions[kind]||0;
   const payload=Object.assign({},p.defaults,{[a.member]:a.options[value]});
   await bounded(this.writers[writerKey].setValue(a.field,payload,800),1200);
   const end=this.now()+1800;
   while(!this.closed&&this.now()<end){if((this.reader.revisions[kind]||0)>revision&&this.reader.snapshot()[a.read]===value){this.message=a.label+' confirmed by BMW';this.pending=false;return this.status();}await new Promise(resolve=>setTimeout(resolve,100));}
   throw Error('Change not confirmed. Check BMW climate controls.');
  }catch(e){this.message=e.message;throw e;}finally{this.pending=false;}
 }
 close(){this.closed=true;this.reader.close();Object.keys(this.writers).forEach(k=>{try{this.writers[k].shutdown();}catch(e){}});this.writers={};}
}
module.exports={ClimateControls,profile,decode,ACTIONS,SPECS};
