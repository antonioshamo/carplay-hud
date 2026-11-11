// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const fs=require('fs'),path=require('path');
const dir=path.join(__dirname,'shared');if(!fs.existsSync(dir))fs.mkdirSync(dir);
for(const f of ['studio_model.js','cluster_catalog.js','kit_record.js','kit_canvas.js','kit_fonts.js','font_regular.js','font_semibold.js','font_cluster.js','font_cluster_square.js'])fs.copyFileSync(path.join(__dirname,'../../apps/robertn_waze_cluster/src',f),path.join(dir,f));
fs.copyFileSync(path.join(__dirname,'../cluster-render/js/cluster_render_client.js'),path.join(dir,'cluster_render_client.js'));

fs.writeFileSync(path.join(__dirname,'ASSET-NOTICE.md'),fs.readFileSync(path.join(__dirname,'../../apps/robertn_waze_cluster/assets/NOTICE.md'),'utf8')+'\n'+fs.readFileSync(path.join(__dirname,'../../apps/robertn_waze_cluster/assets/menu/NOTICE.md'),'utf8'));
