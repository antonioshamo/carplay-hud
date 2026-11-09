// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
// Actual drawing code with sample values. Native content is illustrated only;
// this tool never changes a vehicle or supplies telemetry to the runtime.
const fs=require('fs'),path=require('path');
const M=require('../src/studio_model'),D=require('../src/studio_draw'),A=require('../src/studio_assets');
const {Canvas}=require('../src/kit_canvas');
const Panel=require('../../../native/cluster-studio/panel_composition');
const out=path.resolve(process.argv[2]||'/tmp/bmw-factory-reference');fs.mkdirSync(out,{recursive:true});
const d=M.defaultDesign(),values={now:new Date(2026,10,8,17,59),rpm:940,speed:0,fuel:37.85,range:276.8,coolant:86,oil:66,outside:13};
for(const theme of [0,6]){
 d.theme=theme;const raw=new Canvas(1920,720);Panel.draw(raw,d,values);fs.writeFileSync(path.join(out,'cluster-'+theme+'.png'),raw.png());
 const cv=new Canvas(1920,800);cv.fillRect(0,0,1920,800,'#080a0e');cv.fillRect(0,0,1920,720,'#050505');
 cv.image({w:raw.w,h:raw.h,data:raw.d},0,0,1920,720);
 // These two elements stand in for the preserved native layer in a preview.
 cv.image(A.badge(),820,154,280,280/3);cv.text('P',1450,698,38,'#f1f3f5',{font:'cluster',align:'center'});
 cv.text('OFFLINE DESIGN PREVIEW',42,758,20,'#c1c7d0',{font:'bold'});
 cv.text('Sample readings. BMW center and gear indicator illustrated; not a car screenshot.',42,785,17,'#8b949f');
 fs.writeFileSync(path.join(out,'composition-'+theme+'.png'),cv.png());
}
console.log(out);
