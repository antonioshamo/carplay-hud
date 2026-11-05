// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const assert=require('assert'),fs=require('fs'),os=require('os'),path=require('path'),cp=require('child_process'),EventEmitter=require('events'),PassThrough=require('stream').PassThrough;
const {collect,redact,dltSample,safeMain}=require('./collect.js');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'hud-diag-test-'));
function mkdir(p){if(fs.existsSync(p))return;mkdir(path.dirname(p));fs.mkdirSync(p);}
function write(p,v){const dest=path.join(temp,p);mkdir(path.dirname(dest));fs.writeFileSync(dest,typeof v==='object'?JSON.stringify(v):v);}
const home='var/opt/public/oap/oap_12226',source=home+'/source',reg='var/opt/public/oap/oap_12201/data/apps/robertn_waze_cluster.json';
write(reg,{userId:12226,version:'0.4.123',state:'INSTALLED',provisioningCache:{secret:'NEVER_INCLUDE_REGISTRY_SECRET'}});
write(source+'/package.json',{name:'robertn_waze_cluster',version:'0.4.123',main:'javascript/runner.js'});
write(source+'/config/base.json',{rhmiLoadingEnabled:true,entryPointLoadingEnabled:true,password:'NEVER_INCLUDE_CONFIG_SECRET'});
write(source+'/javascript/build.json',{version:'0.4.123',bundle:{sdkModulesFrom:'fixture@1'},main:{from:'fixture runner'}});
write(source+'/javascript/runnerConfig.json',{JS_RELATIVE_PATH:'./app.js',DATA_RELATIVE_PATH:'../../data'});
write(source+'/javascript/runner.js',"require('./app.js');\n");
write(source+'/javascript/app.js',"throw Error('THE_APP_MUST_NOT_BE_EXECUTED');\n");
write(source+'/rhmiData/uiDescriptions/ID7/uiDescription.json',{containers:{1:{},20:{}}});
write('proc/100/status','Name:\tnode\nState:\tS (sleeping)\nUid:\t12226 12226 12226 12226\nVmRSS:\t42000 kB\n');
write('proc/101/status','Name:\tnode\nUid:\t999 999 999 999\n');
let calls=[];
function run(file,args){
 calls.push([file,args]);
 if(file===process.execPath){assert.equal(args[0],'--check');return cp.spawnSync(file,args,{encoding:'utf8'});}
 assert.equal(file,'journalctl');assert(args.includes('-b'));assert(args.includes('--no-pager'));
 return {status:0,stdout:args.includes('_UID=12226')?'TypeError: screen initialization failed token=PRIVATE lat=42.123 longitude=-83.123 vin=WBA12345678901234\nunrelated ordinary status\n':
  'robertn_other_app startup secret=OTHER_APP_SECRET\nrobertn_waze_cluster failed at init email=a@example.com https://example.com/private\n'};
}
function sample(fn){fn('WOCA CTX TypeError: cannot open RHMI');return Promise.resolve({reason:'sample ended',matched:1});}
function cleanup(p){fs.readdirSync(p).forEach(n=>{const f=path.join(p,n);fs.lstatSync(f).isDirectory()?cleanup(f):fs.unlinkSync(f);});fs.rmdirSync(p);}
async function main(){
 let report=(await collect({root:temp,run,sample})).join('\n');
 assert(report.includes('Installed app: robertn_waze_cluster 0.4.123'));
 assert(report.includes('App process count: 1'));assert(report.includes('syntax: OK'));
 assert(report.includes('TypeError: screen initialization failed'));assert(report.includes('cannot open RHMI'));
 for(const value of ['NEVER_INCLUDE','PRIVATE','42.123','-83.123','WBA12345678901234','OTHER_APP_SECRET','a@example.com','https://example.com','THE_APP_MUST_NOT_BE_EXECUTED'])assert(!report.includes(value),value);
 assert(report.includes('rhmiLoadingEnabled: true'));assert(report.includes('HUD STARTUP REPORT END'));
 assert.equal(calls.filter(x=>x[0]===process.execPath).length,2);
 console.log('PASS installed package, UID process isolation, syntax-only commands, relevant logs and redaction');

 write(source+'/javascript/app.js','const = broken;');
 report=(await collect({root:temp,run,sample})).join('\n');assert(report.includes('syntax: FAILED'));assert(report.includes('SyntaxError:'));assert(!report.includes('const = broken'));
 console.log('PASS syntax failure reports the error without copying source code');

 write(source+'/package.json',{name:'robertn_waze_cluster',version:'0.4.123',main:'../../private/keys.js'});
 calls=[];report=(await collect({root:temp,run,sample})).join('\n');assert(report.includes('Unsafe or unexpected entry path'));assert(calls.filter(x=>x[0]===process.execPath).every(x=>x[1][1].endsWith('javascript/app.js')));
 assert(!safeMain('javascript/../../private.js'));assert(!safeMain('/root/secret.js'));
 fs.unlinkSync(path.join(temp,source+'/javascript/app.js'));fs.symlinkSync(path.join(temp,reg),path.join(temp,source+'/javascript/app.js'));
 report=(await collect({root:temp,run,sample})).join('\n');assert(report.includes('Not a bounded regular file: app.js'));
 console.log('PASS unexpected paths and symlink files are not read or executed');

 write(reg,{userId:'../../private'});calls=[];report=(await collect({root:temp,run,sample})).join('\n');assert(report.includes('No valid registered UID'));assert.equal(calls.length,0);
 write(reg,{userId:12226});write(source+'/package.json',{name:'other_app',version:'1.0.0'});calls=[];report=(await collect({root:temp,run,sample})).join('\n');assert(report.includes('another identity; stopped'));assert.equal(calls.length,0);
 console.log('PASS missing or mismatched identity stops collection before inspecting an app');

 const secrets='Bearer abc123 password="secret" github_pat_12345 a@foo.com WBA12345678901234 192.168.0.1 aa:bb:cc:dd:ee:ff';
 const clean=redact(secrets);for(const value of ['abc123','secret"','github_pat_12345','a@foo.com','WBA12345678901234','192.168.0.1','aa:bb:cc'])assert(!clean.includes(value));
 let killed=0,received=[];
 const spawn=(file,args)=>{assert.equal(file,'dlt-receive');assert.deepEqual(args,['-a','localhost']);const c=new EventEmitter();c.stdout=new PassThrough();c.stderr=new PassThrough();c.kill=()=>{killed++;};setImmediate(()=>{c.stdout.write('OTHER TypeError unrelated\nWOCA info unrelated\nWOCA error start');c.stdout.write('up failed\n');});return c;};
 const result=await dltSample(l=>received.push(l),spawn,25);assert.equal(result.matched,1);assert.equal(received[0],'WOCA error startup failed');assert.equal(killed,1);
 const missing=await dltSample(()=>{throw Error('must not receive');},()=>{throw Error('not installed');},25);assert.equal(missing.reason,'unavailable');
 const flood=await dltSample(()=>{},(file,args)=>{const c=new EventEmitter();c.stdout=new PassThrough();c.stderr=new PassThrough();c.kill=()=>{};setImmediate(()=>c.stdout.write('x'.repeat(5*1024*1024)));return c;},100);assert.equal(flood.reason,'input limit reached');
 console.log('PASS passive DLT framing, app filtering, timeout, missing receiver and flood limit');

 const component=require('./component.json');assert(!component.units);assert(!component.internet);assert(!component.restart);assert(!component.postInstall);assert.deepEqual(component.activate,['node','collect.js']);
 assert(!fs.readFileSync(path.join(__dirname,'collect.js'),'utf8').includes('execSync('));
 console.log('PASS diagnostic package has no persistent service, network access or vehicle restart');
 cleanup(temp);
}
main().catch(e=>{console.error(e.stack);process.exitCode=1;});
