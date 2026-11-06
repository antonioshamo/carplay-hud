// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
var assert=require('assert'),fs=require('fs'),vm=require('vm'),path=require('path');
var filename='/etc/systemd/system/carplay.service.d/89-shamo-map-scene-trial.conf';
var text='[Service]\nExecStart=\nExecStart=/var/opt/shamo-carplay-map-trial/launch.sh -c /etc/cinemo/cinemo_options.xml\n';
function setup(bad){var files={},calls=[],reloadError=null;files[filename]=text;files['/var/opt/shamo-carplay-map-trial/launch.sh']='launcher';files['/var/opt/shamo-carplay-map-trial/carplay']='candidate';if(bad)files[filename]+='Environment=OTHER=1\n';
var ctx={module:{exports:{}},process:{pid:42},require:function(n){if(n==='path')return path;if(n==='fs')return {readFileSync:function(f){if(!(f in files))throw Error('missing');return files[f];},renameSync:function(a,b){calls.push(['rename',a,b]);files[b]=files[a];delete files[a];}};if(n==='crypto')return {createHash:function(){var value;return {update:function(v){value=v;return this;},digest:function(){return value==='launcher'?'45751f66656c630551d97e707e6e9c87ac8d1dc8721b4ace81235bc96c4bc0a3':value==='candidate'?'78a80cc14f108889a6c8f6b2ef685dfe4aed3656f7f1c9b8f35b7806c27f7d9f':'unknown';}};}};if(n==='child_process')return {execFile:function(cmd,args,opts,cb){calls.push([cmd,args.join(' ')]);cb(reloadError);}};throw Error(n);}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../startup_trial.js'),'utf8'),ctx);return {m:ctx.module.exports,files:files,calls:calls,fail:function(){reloadError=Error('reload failed');}};}
var x=setup();assert(x.m.owned(filename));x.m.retire(['/etc/systemd/system'],function(err){assert.ifError(err);});assert(!(filename in x.files));assert(x.files[filename+'.retired-42']);assert.equal(x.calls[1][0],'systemctl');assert.equal(x.calls[1][1],'daemon-reload');
x=setup(true);assert(!x.m.owned(filename));x.m.retire(['/etc/systemd/system'],function(err){assert.ifError(err);});assert.equal(x.calls.length,0);assert(filename in x.files);
x=setup();x.files['/var/opt/shamo-carplay-map-trial/carplay']='other';assert(!x.m.owned(filename));
x=setup();x.fail();x.m.retire(['/etc/systemd/system'],function(err){assert(err);});assert.equal(x.files[filename],text);assert(!x.files[filename+'.retired-42']);
console.log('PASS exact trial ownership, preserve foreign launchers, retire without restart, reload-failure rollback');
