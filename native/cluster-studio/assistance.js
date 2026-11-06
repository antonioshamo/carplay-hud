// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const {Telemetry}=require('./telemetry.js');
// These two read-only preference fields were received during the vehicle
// capture. An enabled preference is NOT an active warning or engaged cruise.
const SPECS=[
 ['de.bmw.infotainment.fasus.FASuS','statusIDriveFAS','assistancePreferences'],
 ['de.bmw.infotainment.fasus.FASuS','statusIDriveFASExtended','assistanceExtended']
];
const FIELDS=[
 ['laneDeparture','Lane departure warning','statusLaneDepartureWarning','assistancePreferences'],
 ['laneChange','Lane change warning','statusChangeOfLaneWarning','assistancePreferences'],
 ['forwardCollision','Forward collision warning','statusForwardCollisionWarning','assistancePreferences'],
 ['personWarning','Pedestrian warning','statusPersonWarning','assistancePreferences'],
 ['laneSteering','Lane departure steering intervention','statusSteeringInterventionLaneDepartureWarning','assistancePreferences'],
 ['laneChangeAssistant','Lane change assistant','statusChangeOfLaneAssistant','assistanceExtended'],
 ['adaptiveGap','Situational distance selection','statusSituationalGapChoice','assistanceExtended'],
 ['steeringLights','Steering wheel light indicators','statusLEDSteeringWheel','assistanceExtended']
];
function preference(v){
 if(v==='EIN'||v===1)return 'on';
 if(v==='AUS'||v===0)return 'off';
 if(v==='NICHT_AKTIVIERBAR'||v===2)return 'unavailable';
 return null;
}
function decode(kind,value){
 const out={};FIELDS.filter(f=>f[3]===kind).forEach(f=>{out[f[0]]=preference(value&&value[f[2]]);});return out;
}
class Assistance extends Telemetry {
 constructor(o){super(Object.assign({},o,{specs:SPECS,decode,pollMs:1000}));}
 status(){
  const data=this.snapshot();
  return {kind:'preferences',readOnly:true,preferences:FIELDS.map(f=>({id:f[0],label:f[1],value:data[f[0]]||null})),
   liveAvailable:false,cruiseMode:null,setSpeed:null,followingDistance:null,laneAlert:null,
   note:'Settings only. Use BMW gauges for active cruise, following distance and lane alerts.'};
 }
}
module.exports={Assistance,SPECS,FIELDS,decode,preference};
