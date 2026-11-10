// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const assert=require('assert'),{ClimateControls,profile,decode,ACTIONS}=require('../climate_controls.js');
const {inspect}=require('../capabilities.js');
// Minimal synthetic firmware contract. No private vehicle catalog is shipped.
async function rejects(p,re){let error;try{await p;}catch(e){error=e;}assert(error,'expected rejection');assert(re.test(error.message),error.message);}
function fixture(){
 const db={interfaces:{},datatypes:{},instanceIDs:{}};
 for(const id of Object.keys(ACTIONS)){
  const a=ACTIONS[id],ref=a.service+'.'+a.field;
  if(!db.interfaces[a.service]){db.interfaces[a.service]={name:a.service,serviceId:42,version:{major:1,minor:0},fields:{}};db.instanceIDs[a.service]={'1':1};}
  db.interfaces[a.service].fields[a.field]={setter:{id:43},dataRef:ref};
  if(!db.datatypes[ref])db.datatypes[ref]={type:'struct',members:[]};
  db.datatypes[ref+'.'+a.member]={type:'enum',enumWidth:1,items:Object.assign({KEINE_AUSWAHL:20,SIGNAL_UNBEFUELLT:31},a.options.reduce((v,k,i)=>{v[k]=i;return v;},{}))};
  db.datatypes[ref].members.push({name:a.member,dataRef:ref+'.'+a.member});
 }
 const seat=ACTIONS.heatDR,seatRef=seat.service+'.'+seat.field;for(const name of Object.keys(seat.neutralBytes))db.datatypes[seatRef].members.push({name,dataRef:'UInt8',defaultValue:31});
 const a=ACTIONS.ac,ref=a.service+'.'+a.field;db.datatypes[ref].members.push({name:'untouchedTemperature',dataRef:'UInt8',defaultValue:255});
 return db;
}
async function main(){
 const db=fixture(),reads=Object.keys(ACTIONS).reduce((o,id)=>(o[id]=0,o),{}),revisions={functions:0,driver:0,passenger:0};for(const id of Object.keys(ACTIONS))if(ACTIONS[id].kind)revisions[ACTIONS[id].kind]=0;
 let now=1000,writes=[],shutdowns=0,confirm=true,rejectWrite=false;
 const reader={revisions,snapshot:()=>reads,start:()=>Promise.resolve(),close(){this.closed=true;}};
 const native={buildProxy:config=>({init:()=>Promise.resolve(),shutdown(){shutdowns++;},setValue(field,payload){writes.push({field,payload});if(rejectWrite)return Promise.reject(Error('Rejected by vehicle'));if(confirm)setTimeout(()=>{for(const id of Object.keys(ACTIONS)){const a=ACTIONS[id],n=a.options.indexOf(payload[a.member]);if(n>=0){reads[a.read]=n;revisions[a.kind||(id==='autoDR'||id==='airDR'?'driver':id==='autoPS'||id==='airPS'?'passenger':'functions')]++;}}},15);return Promise.resolve();}})};
 const c=new ClimateControls({db,reader,native,now:()=>now});
 assert.equal(c.status().controls.filter(x=>x.available).length,0);
 await c.open();assert.equal(writes.length,0,'opening the page never changes climate');assert.equal(c.status().controls.filter(x=>x.available).length,Object.keys(ACTIONS).length);
 for(const id of Object.keys(ACTIONS)){
  const p=profile(db,id);assert(p.config.fields[ACTIONS[id].field].setter);assert(!p.config.fields[ACTIONS[id].field].getter);
  const result=await c.command(id,1),write=writes[writes.length-1];assert.equal(result.pending,false);assert(result.message.includes('confirmed'));
  for(const name of Object.keys(write.payload))assert.equal(write.payload[name],name===ACTIONS[id].member?ACTIONS[id].options[1]:p.defaults[name]);
 }
 const before=writes.length;await rejects(c.command('temperature',99),/Invalid/);await rejects(c.command('ac',-1),/Invalid/);reads.ac=null;await rejects(c.command('ac',1),/Fresh/);reads.ac=1;
 now=10000;await rejects(c.command('ac',0),/Fresh/);assert.equal(writes.length,before);await c.open();
 rejectWrite=true;await rejects(c.command('ac',0),/Rejected/);assert.equal(c.pending,false);rejectWrite=false;
 // A setter reply alone, or an old matching reading, is not confirmation.
 confirm=false;let clock=Date.now();c.now=Date.now;c.leaseUntil=clock+8000;
 await rejects(c.command('ac',1),/not confirmed/);assert.equal(c.pending,false);
 confirm=true;const job=c.command('ac',0);await rejects(c.command('maxAC',0),/Wait/);await job;
 c.close();assert(reader.closed);assert.equal(shutdowns,4);await rejects(c.command('ac',1),/Fresh/);
 // Closing while proxy initialization is delayed must never issue a late write.
 let finishInit,lateWrites=0,lateShutdown=0;
 const slow=new ClimateControls({db,reader:{revisions:{},snapshot:()=>({ac:0}),start:()=>Promise.resolve(),close(){}},native:{buildProxy:()=>({init:()=>new Promise(resolve=>{finishInit=resolve;}),setValue(){lateWrites++;},shutdown(){lateShutdown++;}})}});
 await slow.open();const delayed=slow.command('ac',1);await new Promise(resolve=>setTimeout(resolve,10));slow.close();finishInit();await rejects(delayed,/closed/);assert.equal(lateWrites,0);assert(lateShutdown>0);
 const bad=fixture();delete bad.datatypes[ACTIONS.ac.service+'.'+ACTIONS.ac.field+'.'+ACTIONS.ac.member].items.KEINE_AUSWAHL;delete bad.datatypes[ACTIONS.ac.service+'.'+ACTIONS.ac.field+'.'+ACTIONS.ac.member].items.SIGNAL_UNBEFUELLT;assert.throws(()=>profile(bad,'ac'),/neutral/);
 assert.equal(decode('functions',{statusAC:3}).ac,null);assert.equal(decode('driver',{statusBlowerAutomaticDR:2}).autoDR,null);assert.equal(decode('driver',{statusAirInjectionManifoldProgramDR:'AUTO'}).airDR,7);assert.equal(decode('passenger',{statusAirDistributionProgramPS:'OBEN_MITTE'}).airPS,5);
 for(const invalid of [NaN,Infinity,-1,.5,1.5,'1',true,{},null])assert.equal(decode('functions',{statusAC:invalid}).ac,null,'invalid climate enum must stay unavailable');
 assert.equal(decode('heatDR',{statusSeatHeaterDR:3}).heatDR,3);
 assert.equal(decode('heatPSR',{statusSeatHeaterPSR:15}).heatPSR,null);
 assert.equal(decode('ventPS',{statusSeatClimatePS:'STUFE_2'}).ventPS,2);
 assert.equal(decode('rearAC',{statusAirconRearCompartment:2}).rearAC,1);
 assert.equal(decode('rearAC',{statusAirconRearCompartment:1}).rearAC,2);
 assert.equal(decode('rearAC',{statusAirconRearCompartment:3}).rearAC,null);
 assert.equal(decode('rear',{statusManualBlowerLevel2RowOfSeats:9}).rearFan,8);
 assert.equal(decode('rear',{statusManualBlowerLevel2RowOfSeats:0}).rearFan,null);
 assert.equal(decode('rear',{statusAirDistributionProgramClimate2SeatRow:3}).rearAir,2);
 for(const id of ['heatDR','heatPS','heatDRR','heatPSR','ventDR','ventPS']){
  for(const invalid of [-1,4,15,.5,'1',null]){const field=id.startsWith('heat')?'statusSeatHeater'+id.slice(4):'statusSeatClimate'+id.slice(4);assert.equal(decode(id,{[field]:invalid})[id],null);}
 }
 for(const change of ['default','name']){const bad=fixture(),members=bad.datatypes[ACTIONS.heatDR.service+'.'+ACTIONS.heatDR.field].members,m=members.find(v=>v.dataRef==='UInt8');if(change==='default')m.defaultValue=1;else m.name='unknownSeatSetting';assert.throws(()=>profile(bad,'heatDR'),/neutral/);}
 const scan=inspect(db);assert(scan.climate>0);assert(scan.readOnly);
 console.log('ok climate schema allowlist, neutral fields, no writes on open, 20 commands, fresh readback, stale/expired/invalid requests, rejection, concurrency and shutdown');
}
main().catch(e=>{console.error(e.stack);process.exitCode=1;});
