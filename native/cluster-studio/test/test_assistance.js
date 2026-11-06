// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const assert=require('assert'),fs=require('fs'),{Assistance,SPECS,decode,preference}=require('../assistance'),{configs}=require('../telemetry_schema');
let now=10000;const a=new Assistance({now:()=>now});
assert(a.status().preferences.every(p=>p.value===null));
for(const value of ['EIN',1])assert.equal(preference(value),'on');
for(const value of ['AUS',0])assert.equal(preference(value),'off');
for(const value of ['NICHT_AKTIVIERBAR',2])assert.equal(preference(value),'unavailable');
for(const value of [3,7,255,-1,NaN,Infinity,true,false,'1','SIGNAL_UNGUELTIG','SIGNAL_UNBEFUELLT','RESERVIERT_FEHLER',undefined,null])assert.equal(preference(value),null);
a.receive('assistancePreferences',{statusLaneDepartureWarning:'EIN',statusForwardCollisionWarning:'EIN',statusPersonWarning:'AUS'});
a.receive('assistanceExtended',{statusSituationalGapChoice:'EIN',statusLEDSteeringWheel:'EIN'});
let status=a.status();assert(status.readOnly);assert.equal(status.kind,'preferences');assert.equal(status.preferences.find(p=>p.id==='laneDeparture').value,'on');assert.equal(status.preferences.find(p=>p.id==='personWarning').value,'off');assert.equal(status.preferences.find(p=>p.id==='adaptiveGap').value,'on');
for(const k of ['cruiseMode','setSpeed','followingDistance','laneAlert'])assert.strictEqual(status[k],null,'an enabled setting must not become '+k);
assert.strictEqual(status.liveAvailable,false);assert(!a.parked(),'assistance cannot authorize vehicle output');
a.receive('assistancePreferences',{statusLaneDepartureWarning:'SIGNAL_UNBEFUELLT'});assert.equal(a.status().preferences.find(p=>p.id==='laneDeparture').value,null,'invalid new data replaces previous On');
now+=2000;assert(a.status().preferences.every(p=>p.value===null),'all old preferences expire');now=9000;assert(a.status().preferences.every(p=>p.value===null),'backwards clock cannot revive readings');a.close();
assert.deepEqual(decode('unknown',{displayXCC:140,displayGapChoice:4}),{});
const arg=k=>{const i=process.argv.indexOf(k);return i<0?null:process.argv[i+1];};
const catalog=arg('--catalog'),observer=arg('--observer');
if(catalog&&observer){
 const rows=configs(JSON.parse(fs.readFileSync(catalog,'utf8')),SPECS),old=JSON.parse(fs.readFileSync(observer,'utf8')).find(p=>p.name==='FASuS');
 assert.equal(rows.length,2);assert(old);
 for(const row of rows){for(const k of ['serviceId','version','instances'])assert.deepEqual(row.config[k],old[k]);assert.deepEqual(row.config.fields[row.field],old.fields[row.field]);assert.deepEqual(row.config.methods,{});assert(!row.config.fields[row.field].setter);}
 console.log('ok both assistance preference schemas match the read-only vehicle observer');
}
console.log('ok assistance preferences, enum bounds, freshness, clock rollback and no invented cruise/lane state');
