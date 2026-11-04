// SPDX-License-Identifier: GPL-3.0-or-later
// Export the actual animation drawing as PNG frames, including its gauge handoff.
'use strict';
const fs=require('fs'),path=require('path'),{Canvas}=require('../src/kit_canvas.js'),M=require('../src/studio_model.js'),D=require('../src/studio_draw.js');
const out=path.resolve(process.argv[2]||'/tmp/welcome-frames');fs.mkdirSync(out,{recursive:true});
for(const mode of ['slide','apple','welcome']){
 const d=M.preset(0);d.intro=mode;d.introDuration=mode==='apple'?5500:3000;
 const dir=path.join(out,mode);fs.mkdirSync(dir,{recursive:true});
 for(let ms=0;ms<d.introDuration+1200;ms+=100){const cv=new Canvas(640,264);D.sequence(cv,d,{x:0,y:0,w:640,h:240},{now:new Date(2026,10,4,10,28),speed:0,rpm:750,gear:'P',coolant:88},ms);cv.text('APP PREVIEW / SAMPLE VALUES',12,257,12,'#9baec5');fs.writeFileSync(path.join(dir,String(ms).padStart(5,'0')+'.png'),cv.png());}
}
console.log(out);
