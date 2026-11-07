// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
// Construct only the read-only, explicitly named fields from this unit's catalog.
// No BMW catalog, SDK or private vehicle capture is shipped in this package.
const SPECS=[
 ['de.bmw.infotainment.vehicle.Vehicle2','statusCarSpeed2','speed'],
 ['de.bmw.infrastructure.VehicleInformation','DataPowerTrain2','selection'],
 ['de.bmw.infrastructure.VehicleCondition','vehicleConditionNoCrc','condition'],
 ['de.bmw.infotainment.vehicle.CDS','statusEngineSpeed2','rpm'],
 ['de.bmw.infotainment.vehicle.CDS','statusEngineTemperature','temps'],
 ['de.bmw.infotainment.KombiIF','statusRangeTankStatus','fuel'],
 ['de.bmw.infotainment.KombiIF','statusBordcomputerTravelData','trip'],
 ['de.bmw.infrastructure.EnvironmentalInformation','ExteriorTemperature','outside'],
 ['de.bmw.infotainment.vehicle.CDS','statusBattery2','battery'],
 ['de.bmw.infotainment.vehicle.CDS','statusEngineStatus','engineState'],
 ['de.bmw.infotainment.drivingexcitement.FES','statusActualValueTorque2','torque'],
 ['de.bmw.infotainment.drivingexcitement.FES','statusVehicleDynamicEngine','sport'],
 ['de.bmw.infotainment.drivingexcitement.FES','statusFESVehicleDynamicSwitchHMI','driveMode'],
 ['de.bmw.infotainment.vehicle.Vehicle','statusNewCurrentUnitsStatusExt','units'],
 ['de.bmw.infotainment.vehicle.TPMS','statusTyrePressure','pressure'],
 ['de.bmw.infotainment.vehicle.TPMS','statusTargetTyrePressure','target'],
 ['de.bmw.infotainment.vehicle.TPMS','statusTyreTemperature','tireTemp']
];
function schema(db,ref,depth){
 if(depth>8)throw Error('Recursive telemetry type');
 if(['Bool','UInt8','UInt16','UInt32','Int8','Int16','Int32'].includes(ref))return {t:ref};
 const d=db.datatypes&&db.datatypes[ref];if(!d)throw Error('Missing telemetry type');
 if(d.type==='enum'&&[1,2,4].includes(d.enumWidth)&&d.items&&Object.keys(d.items).every(k=>Number.isInteger(d.items[k])))return {t:'Enum',w:d.enumWidth,e:Object.assign({},d.items)};
 if(d.type==='struct'&&Array.isArray(d.members)&&d.members.length<=32)return {t:'Struct',e:d.members.map(m=>{
  const out=Object.assign({n:m.name},schema(db,m.dataRef,depth+1));if(m.defaultValue!==undefined)out.d=m.defaultValue;return out;
 })};
 throw Error('Unsupported telemetry type');
}
function configs(db,specs){
 if(!db||!db.interfaces||!db.datatypes||!db.instanceIDs)throw Error('Invalid firmware catalog');
 const rows=[];
 for(const spec of specs||SPECS){
  const [name,field,kind]=spec,i=db.interfaces[name],instances=db.instanceIDs[name];
  if(!i||!instances||Object.keys(instances).length!==1||!i.fields||!i.fields[field])continue;
  const f=i.fields[field];if(!f.getter&&!f.notifier)continue;
  try{
   const def={schema:schema(db,f.dataRef,0)},groups={fields:{},events:{}};
   if(f.getter&&Number.isInteger(f.getter.id))def.getter={id:f.getter.id};
   if(f.notifier&&Number.isInteger(f.notifier.id)&&Array.isArray(f.notifier.eventgroups)){
    def.event={id:f.notifier.id,groups:f.notifier.eventgroups.slice()};groups.fields[def.event.id]=def.event.groups;
   }
   if(!def.getter&&!def.event)continue;
   rows.push({kind,field,config:{name:i.name,serviceId:i.serviceId,version:i.version,instances:Object.assign({},instances),methods:{},fields:{[field]:def},events:{},eventGroups:groups}});
  }catch(e){}
 }
 return rows;
}
module.exports={SPECS,schema,configs};
