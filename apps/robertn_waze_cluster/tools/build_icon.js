// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const fs=require('fs'),path=require('path'),{Canvas}=require('../src/kit_canvas.js');
function build(){
 const c=new Canvas(128,128);c.clear('#00000000');c.roundRect(4,4,120,120,24,'#101c2c');
 c.strokeRoundRect(22,31,84,65,16,4,'#4bb6ff');
 c.line(38,80,60,57,5,'#f4f7fc');c.line(60,57,91,57,5,'#f4f7fc');c.circle(38,80,5,'#4bb6ff');
 ['#55c3f1','#3659ba','#e34e59'].forEach((color,i)=>c.fillRect(48+i*12,106,9,5,color));
 const spec=require('../mgu-app.json'),file=path.join(__dirname,'..',spec.tree,'rhmiData/variantGroups/Common/images/robertn_waze_cluster_icon.png');
 fs.writeFileSync(file,c.png());
}
if(require.main===module)build();module.exports={build};
