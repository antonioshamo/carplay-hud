// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const fs=require('fs'),path=require('path'),EventEmitter=require('events');
process.env.CLUSTER_PREVIEW_DIR=path.resolve(__dirname,'../../../native/cluster-studio/assets/cluster-themes');
const {StudioScreen}=require('../src/studio_screen'),M=require('../src/studio_model'),kit=require('../src/kit_record'),{Canvas}=require('../src/kit_canvas');
const out=path.resolve(process.argv[2]||'/private/tmp/cluster-rebuild-20261111/menu');fs.mkdirSync(out,{recursive:true});
const client=new EventEmitter();client.close=()=>{};client.status={generation:'source-cluster-v2',design:M.defaultDesign(),slots:[M.defaultDesign(),null,null,null,null],enabled:true,renderer:true,canSelectPanel:true,canRetry:true,state:'Source cluster ready',parked:false};client.statusAt=Date.now();
const s=new StudioScreen(()=>{},{client});
function render(name){const f=s.frame(0,1),cv=new Canvas(1600,580);kit.play(f.record.words(),cv);fs.writeFileSync(path.join(out,name+'.png'),cv.png());}
try{for(let n=0;n<Math.ceil(M.THEMES.length/3);n++){s.page='gallery';s.galleryPage=n;render('gallery-'+(n+1));}for(const page of ['edit','metric','style','intro','library','output','tools','features','assistance','media']){s.page=page;render(page);}console.log('Rendered all source-menu pages and all theme cards: '+out);}finally{s.close();}
