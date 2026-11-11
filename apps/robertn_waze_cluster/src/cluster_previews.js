// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const fs=require('fs'),path=require('path'),zlib=require('zlib'),kit=require('./kit_record.js');
const {THEMES,PALETTES}=require('./cluster_catalog.js');
const cache=new Map();
function get(theme,palette){
 if(!THEMES.some(t=>t.id===theme)||!PALETTES.includes(palette))return null;
 const key=theme+'-'+palette,old=cache.get(key);if(old&&kit.imageById.has(old.imageId))return old;
 try{const root=process.env.CLUSTER_PREVIEW_DIR||'/var/opt/cluster-studio/current/assets/cluster-themes',p=zlib.inflateSync(fs.readFileSync(path.join(root,key+'.rgba.z')));if(p.length!==512*192*4)throw Error('Invalid theme picture');const img=kit.makeImage(512,192,p);cache.set(key,img);while(cache.size>6){const first=cache.keys().next().value;kit.dropImage(cache.get(first));cache.delete(first);}return img;}catch(e){return null;}
}
module.exports={get};
