// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const assert=require('assert'),{Telemetry}=require('../telemetry');
const next=()=>new Promise(resolve=>setImmediate(resolve));
function row(kind,get){return {kind,field:kind,config:{fields:{[kind]:{getter:{id:1}}}},proxy:{getValue:get,shutdown(){}}};}
(async()=>{
 const t=new Telemetry(),called=[];let slowResolve,speedResolve;
 try{
  t.proxies=[row('temps',()=>{called.push('temps');return new Promise(r=>{slowResolve=r;});}),row('speed',()=>{called.push('speed');return Promise.resolve({speedVehicleCentreOfGravity:0});}),row('rpm',()=>{called.push('rpm');return Promise.resolve({actualValueRPMEngineCrankshaft:3200});})];
  let cycle=t.poll();await next();
  assert.deepEqual(called,['temps','speed','rpm'],'slow earlier field must not block speed/RPM requests');
  assert.equal(t.snapshot().speed,0);assert.equal(t.snapshot().rpm,800);
  slowResolve({temperatureEngineOilDrive:100});await cycle;clearTimeout(t.timer);
  t.proxies=[row('speed',()=>new Promise(r=>{speedResolve=r;}))];
  cycle=t.poll();await next();t.receive('speed',{speedVehicleCentreOfGravity:640});speedResolve({speedVehicleCentreOfGravity:0});await cycle;clearTimeout(t.timer);
  assert.equal(t.snapshot().speed,10,'late getter must not overwrite a newer moving notifier');
  t.proxies[0].nextPoll=0;cycle=t.poll();await next();t.close();speedResolve({speedVehicleCentreOfGravity:0});await cycle;assert.equal(t.snapshot().speed,undefined,'closed reader cannot be revived by an in-flight getter');
  console.log('ok parallel bounded telemetry, newer notification wins, no post-close readings');
 }finally{t.close();}
 // One stuck slow getter does not hold up later fast-field cycles, and the
 // scheduler cannot issue a duplicate request while that field is pending.
 let clock=1000,speedCalls=0,slowCalls=0,finish;
 const q=new Telemetry({now:()=>clock});
 try{
  q.proxies=[row('temps',()=>{slowCalls++;return new Promise(r=>{finish=r;});}),row('speed',()=>{speedCalls++;return Promise.resolve({speedVehicleCentreOfGravity:0});})];
  const first=q.poll();await next();
  for(let i=0;i<4;i++){clock+=100;await q.poll();}
  assert.equal(speedCalls,5);assert.equal(slowCalls,1);
  finish({temperatureEngineOilDrive:100});await first;
  console.log('ok 100 ms fast-field cadence continues around a pending slow getter');
 }finally{q.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
