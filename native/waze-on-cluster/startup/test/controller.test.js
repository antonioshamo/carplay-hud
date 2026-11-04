// SPDX-License-Identifier: MPL-2.0
'use strict';
const assert = require('assert');
const { MirrorController } = require('../controller');
let now=10000, shown=0, hidden=0, captures=0, dashboard=true, resolveCapture;
const c=new MirrorController({now:()=>now, hide:()=>hidden++,
 capture:()=>{ captures++; return new Promise(r=>{resolveCapture=r;}); },
 isDashboard:()=>dashboard, convert:f=>f, present:()=>{shown++;return true;} });
function ready() { c.setEnabled(true); c.rendererChanged(true); c.ownerChanged('PROJECTED'); c.sourceChanged({target:'hud',state:'idle'},now); }
(async()=>{
 assert.equal(await c.tick(),false); assert.equal(captures,0);
 // A foreground event received BEFORE the user enables capture is retained.
 c.ownerChanged('PROJECTED');c.rendererChanged(true);c.sourceChanged({target:'hud',state:'idle'},now);
 assert.equal(await c.tick(),false);assert.equal(captures,0);
 assert.equal(c.blockReason(),'Mirror off');
 c.setEnabled(true);let p=c.tick(); resolveCapture(Buffer.alloc(4)); assert(await p);
 assert.equal(shown,1); // No navigation event or route state was supplied.
 console.log('PASS pre-opt-in CarPlay event starts first Dashboard frame without route or second event');
 p=c.tick();c.ownerChanged('NATIVE');resolveCapture(Buffer.alloc(4));assert.equal(await p,false);assert.equal(shown,1);assert(!c.visible);
 console.log('PASS capture finishing after BMW menu switch cannot reappear');
 ready(); p=c.tick();c.sourceChanged({target:'hud',state:'showing'},now);resolveCapture(Buffer.alloc(4));assert.equal(await p,false);assert.equal(shown,1);
 console.log('PASS independent map handoff cancels in-flight mirror');
 ready();dashboard=false;p=c.tick();resolveCapture(Buffer.alloc(4));assert.equal(await p,false);assert(!c.visible);dashboard=true;
 console.log('PASS rejected screen is hidden');
 ready();p=c.tick();resolveCapture(Buffer.alloc(4));await p;now+=751;c.watchdog();assert(!c.visible);
 console.log('PASS stale frame watchdog hides a stopped capture');
 ready();p=c.tick();c.rendererChanged(false);resolveCapture(Buffer.alloc(4));assert.equal(await p,false);assert(!c.visible);
 console.log('PASS renderer disconnect rejects old capture');
 ready();c.setEnabled(false);assert.equal(await c.tick(),false);
 assert.equal(c.blockReason(),'Mirror off');assert(!c.visible);c.setEnabled(true);
 c.ownerChanged(null);c.watchdog();assert.match(c.reason,/CarPlay event/);
 c.ownerChanged('NATIVE');c.watchdog();assert.match(c.reason,/center screen/);
 c.ownerChanged('PROJECTED');c.sourceChanged({target:'map',state:'idle'},now);c.watchdog();assert.match(c.reason,/Select windshield HUD/);
 c.sourceChanged({target:'hud',state:'idle'},now);
 now+=3000;assert.equal(await c.tick(),false);
 console.log('PASS off and stale source status cannot display');
 ready();p=c.tick();c.close();resolveCapture(Buffer.alloc(4));assert.equal(await p,false);assert(!c.visible);
 console.log('PASS shutdown cancels in-flight capture');
})().catch(e=>{console.error(e);process.exitCode=1;});
