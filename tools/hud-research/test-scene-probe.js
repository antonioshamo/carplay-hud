// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const assert=require('assert'),{inspect}=require('./scene-probe');
const b=Buffer.alloc(2048);b.writeUInt32BE(0x7f454c46,0);b[4]=2;b[5]=1;b.writeUInt16LE(62,18);
b.writeUInt32LE(64,32);b.writeUInt16LE(56,54);b.writeUInt16LE(1,56);
b.writeUInt32LE(1,64);b.writeUInt32LE(5,68);b.writeUInt32LE(0,72);b.writeUInt32LE(0x400000,80);b.writeUInt32LE(b.length,96);
b.write('maps:/car/instrumentcluster/map\0',1000);b.write('maps:/car/instrumentcluster/instructioncard\0',1100);
b[200]=0x48;b[201]=0x8d;b[202]=0x3d;b.writeInt32LE(1000-207,203);
const original=Buffer.from(b),r=inspect(b);
assert.deepEqual(r.strings.map(s=>s.name),['map-only','cards']);
assert.deepEqual(r.strings[0].candidateReferences,[200]);assert(b.equals(original));
assert(!JSON.stringify(r).includes('maps:/')); // summary has named categories, not raw firmware strings
assert.throws(()=>inspect(Buffer.alloc(64)));const bad=Buffer.from(b);bad.writeUInt16LE(1,54);assert.throws(()=>inspect(bad));
console.log('PASS read-only scene inventory, candidate reference, no prefix misclassification, malformed ELF refusal');
