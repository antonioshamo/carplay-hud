// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const fs=require('fs'),path=require('path');
const {StudioScreen}=require('../src/studio_screen.js'),{Canvas}=require('../src/kit_canvas.js'),kit=require('../src/kit_record.js'),M=require('../src/studio_model.js'),D=require('../src/studio_draw.js');
const out=path.resolve(process.argv[2]||'/tmp/cluster-studio-previews');fs.mkdirSync(out,{recursive:true});
const s=new StudioScreen(()=>{});s.client.status={slots:[M.preset(0),M.preset(11),null,null,null],design:M.preset(0),parked:true,canPreview:true,testReason:'Ready for a parked test',state:'Preview data — not a car screenshot'};
s.client.status.media={target:'center',active:true,playing:false,urls:['http://192.168.1.1:5882/#preview-only-token'],remaining:300,note:'Illustration only — not a car screenshot',rect:{x:.15,y:.15,w:.7,h:.7}};s.videoSupported=true;
for(const page of ['gallery','edit','style','intro','library','output','features','media']){s.page=page;const f=s.frame(0,1),cv=new Canvas(1600,580);kit.play(f.record.words(),cv);fs.writeFileSync(path.join(out,page+'.png'),cv.png());}
for(const n of [0,11,23,46,79]){const cv=new Canvas(1920,720);D.draw(cv,M.preset(n),{x:0,y:0,w:1920,h:720},s.previewData());fs.writeFileSync(path.join(out,'cluster-'+n+'.png'),cv.png());}
console.log(out);
