// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
var assert=require('assert'),fs=require('fs'),crypto=require('crypto');
var map=require('../carplay_map_startup'),locator=require('../carplay_locate');
var empty=Buffer.alloc(20);assert.equal(map.inspect(empty,{}).supported,false);
var wrote=false;assert.equal(map.apply(empty,{},function(){wrote=true;}),false);assert.equal(wrote,false);
if(!process.env.CARPLAY_BIN){console.log('PASS unsupported input stays unchanged; set CARPLAY_BIN for private firmware checks');process.exit(0);}
var stock=fs.readFileSync(process.env.CARPLAY_BIN),loc=locator.locate(stock),regions=map.inspect(stock,loc).regions;
assert.equal(map.inspect(stock,loc).state,'original');
function apply(b){map.apply(b,locator.locate(b),function(label,o,data){data.copy(b,o);});return b;}
var patched=apply(Buffer.from(stock));assert.equal(map.inspect(patched,loc).state,'patched');assert(apply(Buffer.from(patched)).equals(patched));
regions.forEach(function(r){var b=Buffer.from(patched);stock.copy(b,r[0],r[0],r[0]+r[1]);assert.equal(map.inspect(b,loc).state,'partial');assert(apply(b).equals(patched));});
var restored=Buffer.from(patched);regions.forEach(function(r){stock.copy(restored,r[0],r[0],r[0]+r[1]);});assert(restored.equals(stock));
var bad=Buffer.from(stock);bad[0x9f9a0]^=1;assert.equal(map.inspect(bad,locator.locate(bad)).fingerprint,false);assert.throws(function(){apply(bad);},/fingerprint/);
bad=Buffer.from(patched);bad[3378480]=1;assert.equal(map.inspect(bad,loc).state,'unknown');assert.throws(function(){apply(bad);},/not recognized/);
if(process.env.CARPLAY_TRIAL_BASE&&process.env.CARPLAY_TRIAL_READY){var baseline=fs.readFileSync(process.env.CARPLAY_TRIAL_BASE),ready=fs.readFileSync(process.env.CARPLAY_TRIAL_READY);assert(apply(baseline).equals(ready));console.log('PASS byte-for-byte equivalence to the successful on-car candidate');}
console.log('PASS map-only startup: original, apply, idempotence, four partial repairs, full reversal, fingerprint and corrupt-site refusal');
