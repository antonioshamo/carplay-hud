// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
/* Retire only our exact, successful one-attempt ENET test launcher after the
 * normal executable has been patched. Never restart the running CarPlay. */
var fs=require('fs'),path=require('path'),crypto=require('crypto'),cp=require('child_process');
var TEXT='[Service]\nExecStart=\nExecStart=/var/opt/shamo-carplay-map-trial/launch.sh -c /etc/cinemo/cinemo_options.xml\n';
function hash(file){return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');}
function owned(file,base){
 base=base||'/var/opt/shamo-carplay-map-trial';
 try{return path.basename(file)==='89-shamo-map-scene-trial.conf'&&fs.readFileSync(file,'utf8')===TEXT&&
 hash(path.join(base,'launch.sh'))==='45751f66656c630551d97e707e6e9c87ac8d1dc8721b4ace81235bc96c4bc0a3'&&
 hash(path.join(base,'carplay'))==='78a80cc14f108889a6c8f6b2ef685dfe4aed3656f7f1c9b8f35b7806c27f7d9f';}catch(e){return false;}
}
function retire(dirs,done){
 var files=dirs.map(function(d){return path.join(d,'carplay.service.d','89-shamo-map-scene-trial.conf');}).filter(function(f){return owned(f);});
 if(!files.length){done(null);return;}
 var moved=[];
 try{files.forEach(function(f){var b=f+'.retired-'+process.pid;fs.renameSync(f,b);moved.push([f,b]);});}catch(e){rollback();done(e);return;}
 function rollback(){moved.forEach(function(x){try{fs.renameSync(x[1],x[0]);}catch(e){}});}
 cp.execFile('systemctl',['daemon-reload'],{timeout:15000},function(err){if(err)rollback();done(err||null);});
}
module.exports={owned:owned,retire:retire};
