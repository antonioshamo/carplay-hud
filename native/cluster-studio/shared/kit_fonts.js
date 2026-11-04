// SPDX-License-Identifier: MIT
// Inter font atlas adapter, adapted from robertnisipeanu/mgu-store.
// See LICENSE-kit.txt and LICENSE-Inter.txt. English UI; no firmware fonts.
'use strict';
const zlib=require('zlib');
const faces={regular:require('./font_regular.js'),semibold:require('./font_semibold.js')};
const cache={};
function get(name,size) {
 const key=['bold','num','gear'].indexOf(name)>=0?'semibold':'regular';
 if(!cache[key])cache[key]=faces[key].sizes.map(s=>{
  const f=Object.assign({},s);let pixels;
  Object.defineProperty(f,'alpha',{get:()=>pixels||(pixels=zlib.inflateSync(Buffer.from(s.alpha,'base64')))});
  return f;
 });
 const sizes=cache[key].sort((a,b)=>a.size-b.size);return sizes.find(f=>f.size>=size)||sizes[sizes.length-1];
}
function measure(f,text) {let w=0;for(const ch of String(text)){const g=f.glyphs[ch.codePointAt(0)]||f.glyphs[63];if(g)w+=g[6];}return w;}
module.exports={get,measure};
