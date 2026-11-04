// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
// Renders the actual UI command stream with sample status, not a car screenshot.
const fs=require('fs'),path=require('path');
const view=require('../src/hud_view.js'),kit=require('../src/kit_record.js'),{Canvas}=require('../src/kit_canvas.js');
const out=path.resolve(process.argv[2]||'/tmp/carplay-hud-design');fs.mkdirSync(out,{recursive:true});
const m={target:'hud',state:'showing',width:60,offset:[0,0],step:10,background:false,corners:true,startup:false,
 startupResult:'Dashboard experiment is off',notice:'Settings saved',busy:false,
 logs:['Map renderer connected','Output: windshield HUD','HUD width: 60%','HUD offset: 0 / 0 px','Startup helper: off'],
 captureText:'No capture in progress',captureButton:'Capture logs (5 min)'};
for(const k of ['canDisplay','canSize','canLarger','canSmaller','canMove','canStyle','canCorners','canStartup','canDisable','canCapture'])m[k]=true;
for(const page of ['overview','layout','appearance','startup','support','details']){
 const f=view.frame(m,page,Math.max(0,view.tabs.findIndex(t=>t[0]===page)),0,1),cv=new Canvas(view.W,view.H);kit.play(f.record.words(),cv);
 const file=path.join(out,page+'.png');fs.writeFileSync(file,cv.png());console.log(file);
}
