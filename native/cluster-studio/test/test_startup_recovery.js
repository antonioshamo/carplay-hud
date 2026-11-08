// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const assert=require('assert'),{StartupRecovery}=require('../startup_recovery');
const bad={ready:true,independent:true,parked:true,state:'waiting',holder:'none',reason:'not rendered: the renderer is not subscribed'};
function rig(extra){let now=0,count=0,marks=0;const r=new StartupRecovery(Object.assign({now:()=>now,uptime:()=>now+30000,mark:()=>marks++,restart:()=>count++,log(){}},extra));return {r,tick:(at,s)=>{now=at;r.tick(s||bad);},counts:()=>[count,marks]};}
let x=rig();x.tick(0);x.tick(14000);assert.deepEqual(x.counts(),[0,0]);x.tick(15000);x.tick(30000);assert.deepEqual(x.counts(),[1,1]);
// Brief mapped acknowledgements must not hide the repeated missing subscription.
x=rig();x.tick(0);x.tick(5000,Object.assign({},bad,{state:'shown',holder:'us',reason:''}));x.tick(7000);x.tick(15000);assert.deepEqual(x.counts(),[1,1]);
// A genuinely stable shown target cancels the accumulated failure.
x=rig();x.tick(0);x.tick(2000,Object.assign({},bad,{state:'shown',holder:'us'}));x.tick(12000,Object.assign({},bad,{state:'shown',holder:'us'}));x.tick(20000);assert.deepEqual(x.counts(),[0,0]);
for(const replacement of [{ready:false},{independent:false},{independent:'true'},{parked:false},{parked:undefined},{parked:'true'},{holder:'stock'},{holder:'foreign'},{reason:'scene id in use by another target'},{state:'idle'},{state:'released'}]){x=rig();x.tick(0,Object.assign({},bad,replacement));x.tick(20000,Object.assign({},bad,replacement));assert.deepEqual(x.counts(),[0,0]);}
for(const uptime of [NaN,-1,Infinity]){x=rig({uptime:()=>uptime});x.tick(0);x.tick(20000);assert.deepEqual(x.counts(),[0,0]);}
// Reconnects after the old three-minute cutoff still get the same bounded
// repair. Crossing that cutoff during the failure must not abandon it.
for(const uptime of [180001,3600000]){x=rig({uptime:()=>uptime});x.tick(0);x.tick(14000);assert.deepEqual(x.counts(),[0,0]);x.tick(15000);x.tick(60000);assert.deepEqual(x.counts(),[1,1]);}
x=rig();x.tick(145000);x.tick(160000);assert.deepEqual(x.counts(),[1,1],'failure spanning 180s uptime still repaired');
// Loss of fresh Park telemetry resets the countdown. No restart in Drive,
// and no delayed immediate restart when Park returns.
x=rig();x.tick(0);x.tick(14000,Object.assign({},bad,{parked:false}));x.tick(30000,Object.assign({},bad,{parked:false}));x.tick(31000);x.tick(45000);assert.deepEqual(x.counts(),[0,0]);x.tick(46000);assert.deepEqual(x.counts(),[1,1]);
x=rig({mark:()=>{throw Error('EEXIST');}});x.tick(0);x.tick(20000);x.tick(40000);assert.deepEqual(x.counts(),[0,0]);assert(x.r.attempted,'a previous helper attempt cannot restart it again');
x=rig();x.tick(10000);x.tick(5000);x.tick(15000);assert.deepEqual(x.counts(),[0,0],'clock rollback cannot trigger recovery');
console.log('ok late and early reconnect recovery, one restart per boot, exact failure, fresh stationary telemetry, stable recovery, no stock/foreign interference, marker refusal and clock rollback');
