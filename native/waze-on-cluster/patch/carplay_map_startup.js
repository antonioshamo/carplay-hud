// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
// Route-free map startup verified on the owner's 22.28.3 build. Unknown builds
// keep the existing patch. Normalize only existing patch regions before the
// whole-image fingerprint; never locate by an unchecked fixed offset alone.
var crypto=require('crypto');
var HASH='5fea4d072ac62cda2e439e7f49561bf9f839a2a1d75ea61cd6552c5abe8d1c35';
var RANGES=[[208,16],[502053,4],[3378480,32],[1576672,5]];
function bytes64(n){var b=Buffer.alloc(8);b.writeUInt32LE(n,0);return b;}
var STOCK=[Buffer.concat([bytes64(0x338d21),bytes64(0x338d21)]),Buffer.from('bb822200','hex'),Buffer.alloc(32),Buffer.from('41554883c7','hex')];
var PATCHED=[Buffer.concat([bytes64(0x338d50),bytes64(0x338d50)]),Buffer.from('07e42b00','hex'),Buffer.from('maps:/car/instrumentcluster/map\0'),Buffer.from('e92b090000','hex')];
function inspect(buf,loc){
 var no={supported:false,state:'original',regions:[],reason:'This CarPlay build has not been verified for route-free startup'};
 if(buf.length!==3484912||!loc.ok||loc.buildId!=='5de62156575d737391ea42254e778a97dbbb51f8')return no;
 var r=loc.res,normalize=[[loc.variant.slot,4],[loc.sink.offset,loc.sink.len],[loc.selfstart.offset,5],[r.mm,8],[r.px,8],[r.safe1,8],[r.safe2,8]].concat(RANGES),copy=Buffer.from(buf);
 normalize.forEach(function(x){copy.fill(0,x[0],x[0]+x[1]);});
 var fingerprint=crypto.createHash('sha256').update(copy).digest('hex')===HASH;
 var states=RANGES.map(function(x,i){var b=buf.slice(x[0],x[0]+x[1]);return b.equals(STOCK[i])?'original':b.equals(PATCHED[i])?'patched':'unknown';});
 var state=states.indexOf('unknown')>=0?'unknown':states.every(function(s){return s==='original';})?'original':states.every(function(s){return s==='patched';})?'patched':'partial';
 return {supported:true,fingerprint:fingerprint,state:state,regions:RANGES.map(function(x){return x.slice();}),reason:state==='unknown'?'Map startup bytes are not recognized':null};
}
function apply(buf,loc,put){var s=inspect(buf,loc);if(!s.supported)return false;if(!s.fingerprint)throw Error('Map startup fingerprint does not match the verified build');if(s.state==='unknown')throw Error(s.reason);RANGES.forEach(function(r,i){put('map startup -> dedicated map on stream ready',r[0],PATCHED[i]);});return true;}
module.exports={inspect:inspect,apply:apply};
