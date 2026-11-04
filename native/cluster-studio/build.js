// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const fs=require('fs'),path=require('path');
const dir=path.join(__dirname,'shared');if(!fs.existsSync(dir))fs.mkdirSync(dir);
for(const f of ['studio_model.js','studio_draw.js','kit_canvas.js','kit_fonts.js','font_regular.js','font_semibold.js'])fs.copyFileSync(path.join(__dirname,'../../apps/robertn_waze_cluster/src',f),path.join(dir,f));
fs.copyFileSync(path.join(__dirname,'../cluster-render/js/cluster_render_client.js'),path.join(dir,'cluster_render_client.js'));
