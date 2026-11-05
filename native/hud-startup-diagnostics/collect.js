// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
// Install hook, Node 8. Read-only vehicle inspection; stdout is relayed by
// mgu-deploy -> mgu-updater -> the existing authenticated Store phone log.
// No service, listener, shell, signal to a vehicle process, or app mutation.
const fs=require('fs'),path=require('path'),cp=require('child_process'),crypto=require('crypto');
const ID='robertn_waze_cluster',LIMIT=1024*1024;
const STARTUP=/error|fail|exception|reject|start|initializ|entry.?point|rhmi|resource|bundle|cannot find module|conditionalLoading/i;
function redact(value){
 return String(value).replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g,'')
  .replace(/\b(?:https?|wss?):\/\/[^\s<>"']+/gi,'[url]')
  .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,'[email]')
  .replace(/\b[A-HJ-NPR-Z0-9]{17}\b/gi,'[vehicle-id]')
  .replace(/\b(?:gh[pousr]_|github_pat_)[A-Za-z0-9_]+/g,'[token]')
  .replace(/\bBearer\s+\S+/gi,'Bearer [redacted]')
  .replace(/\b(token|secret|password|authorization|latitude|longitude|lat|lon|vin)\b["']?\s*[:=]\s*["']?[^\s,;}]+/gi,'$1=[redacted]')
  .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g,'[ip]')
  .replace(/\b(?:[a-f0-9]{2}:){5}[a-f0-9]{2}\b/gi,'[mac]');
}
function read(file,limit){
 const stat=fs.lstatSync(file);
 if(!stat.isFile()||stat.isSymbolicLink()||stat.size>(limit||LIMIT))throw Error('Not a bounded regular file: '+path.basename(file));
 return fs.readFileSync(file);
}
function json(file){return JSON.parse(read(file).toString('utf8'));}
function safeMain(value){return typeof value==='string'&&/^javascript\/[A-Za-z0-9_.-]+\.js$/.test(value)&&value.indexOf('..')<0;}
function run(file,args){
 const r=cp.spawnSync(file,args,{encoding:'utf8',timeout:5000,killSignal:'SIGKILL',maxBuffer:LIMIT});
 return {status:r.status,stdout:r.stdout||'',stderr:r.stderr||'',error:r.error?String(r.error.code||r.error.message):null};
}
function dltSample(onLine,spawn,milliseconds){
 return new Promise(resolve=>{
  let child,buffer='',lines=0,bytes=0,done=false,timer;
  const finish=reason=>{if(done)return;done=true;clearTimeout(timer);if(child){child.stdout.removeAllListeners('data');child.stderr.removeAllListeners('data');child.stdout.resume();child.stderr.resume();try{child.kill('SIGKILL');}catch(e){}}resolve({reason,matched:lines});};
  try{child=spawn('dlt-receive',['-a','localhost'],{stdio:['ignore','pipe','pipe']});}catch(e){finish('unavailable');return;}
  timer=setTimeout(()=>finish('sample ended'),milliseconds);
  child.on('error',()=>finish('unavailable'));child.on('close',()=>finish('receiver closed'));
  child.stderr.on('data',()=>{});
  child.stdout.setEncoding('utf8');child.stdout.on('data',chunk=>{
   bytes+=Buffer.byteLength(chunk);if(bytes>4*LIMIT){finish('input limit reached');return;}
   buffer+=chunk;if(buffer.length>65536){buffer='';return;}
   let i;while((i=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,i);buffer=buffer.slice(i+1);
    if((/\bWOCA\b/.test(line)||line.indexOf(ID)>=0)&&STARTUP.test(line)){onLine(line);lines++;if(lines>=20){finish('line limit reached');return;}}
   }
  });
 });
}
async function collect(options){
 const o=options||{},root=o.root||'',exec=o.run||run,output=[];
 const at=p=>path.join(root,p),put=(k,v)=>output.push(k+': '+redact(v).replace(/\s+/g,' ').slice(0,700));
 const attempt=(name,fn)=>{try{return fn();}catch(e){put(name,e.code||e.message);return null;}};
 output.push('=== HUD STARTUP REPORT 0.1.0 BEGIN ===');put('Captured',new Date().toISOString());put('Collector Node',process.version);
 const reg=attempt('Registry',()=>json(at('/var/opt/public/oap/oap_12201/data/apps/'+ID+'.json')));
 const uid=reg&&Number(reg.userId);
 if(!Number.isInteger(uid)||uid<12202||uid>65534){put('App','No valid registered UID; no app directories or app logs inspected');output.push('=== HUD STARTUP REPORT END ===');return output;}
 put('App UID',uid);
 // Read only selected non-personal registry fields, never provisioning data.
 ['version','state','installationState'].forEach(k=>{if(reg[k]!==undefined&&['string','number'].indexOf(typeof reg[k])>=0)put('Registry '+k,reg[k]);});
 const home='/var/opt/public/oap/oap_'+uid,source=home+'/source';
 const pkg=attempt('Package',()=>json(at(source+'/package.json')));
 if(!pkg||pkg.name!==ID){put('App','Registered source is missing or has another identity; stopped');output.push('=== HUD STARTUP REPORT END ===');return output;}
 put('Installed app',pkg.name+' '+pkg.version);put('Main',pkg.main);
 const config=attempt('Configuration',()=>json(at(source+'/config/base.json')));
 if(config)for(const k of ['rhmiLoadingEnabled','entryPointLoadingEnabled'])put(k,config[k]===undefined?'unset':config[k]===true?'true':config[k]===false?'false':'unexpected type');
 const build=attempt('Linked build',()=>json(at(source+'/javascript/build.json')));
 if(build){put('Linked version',build.version);put('SDK donor',build.bundle&&build.bundle.sdkModulesFrom);put('Runner supplied by',build.main&&build.main.from);}
 const runnerConfig=attempt('Runner configuration',()=>json(at(source+'/javascript/runnerConfig.json')));
 if(runnerConfig){['JS_RELATIVE_PATH','DATA_RELATIVE_PATH'].forEach(k=>put('Runner '+k,runnerConfig[k]));}
 const inspect=(relative)=>{
  const bytes=attempt(relative,()=>read(at(source+'/'+relative),32*LIMIT));if(!bytes)return;
  put(relative,bytes.length+' bytes sha256='+crypto.createHash('sha256').update(bytes).digest('hex'));
  if(/\.js$/.test(relative)){
   const result=exec(process.execPath,['--check',at(source+'/'+relative)]);
   put(relative+' syntax',result.status===0?'OK':result.error||'FAILED');
   if(result.status!==0)(result.stderr||'').split('\n').filter(l=>/^(?:SyntaxError|ReferenceError|TypeError|Error):/.test(l)).slice(0,2).forEach(l=>put('Syntax error',l));
  }
 };
 if(safeMain(pkg.main))inspect(pkg.main);else put('Main','Unsafe or unexpected entry path; not inspected');
 if(pkg.main!=='javascript/app.js')inspect('javascript/app.js');
 const uiPaths=[source+'/rhmiData/uiDescriptions/ID7/uiDescription.json',home+'/rhmiData/uiDescriptions/ID7/uiDescription.json',home+'/rhmiData/uiDescription/uiDescription.json'];
 const uiPath=uiPaths.find(p=>fs.existsSync(at(p)));
 const ui=uiPath?attempt('UI description',()=>json(at(uiPath))):null;
 if(!uiPath)put('UI description','not found in standard source or installed resource locations');
 if(ui)put('UI containers',Object.keys(ui.containers||{}).length);
 let processes=0;
 attempt('Process inspection',()=>fs.readdirSync(at('/proc')).filter(n=>/^\d+$/.test(n)).slice(0,4096).forEach(pid=>{
  try{
   const s=read(at('/proc/'+pid+'/status'),65536).toString('utf8'),u=/^Uid:\s+(\d+)/m.exec(s);
   if(!u||Number(u[1])!==uid)return;processes++;
   const state=/^State:\s+(.+)$/m.exec(s),rss=/^VmRSS:\s+(.+)$/m.exec(s);
   if(processes<=16)put('App process',pid+' state='+(state?state[1]:'unknown')+' RSS='+(rss?rss[1]:'unknown'));
  }catch(e){}
 }));put('App process count',processes);
 let errors=0;
 const log=(label,text,own)=>String(text).split('\n').filter(l=>STARTUP.test(l)&&(own||l.indexOf(ID)>=0||new RegExp('\\b'+uid+'\\b').test(l))).slice(-25).forEach(l=>{put(label,l);errors++;});
 for(const item of [['App journal',['_UID='+uid],true],['Manager journal',['-u','oapcontroller.service'],false]]){
  const result=exec('journalctl',['-b','--since','-20min','-n','500','--no-pager','-o','cat'].concat(item[1]));
  put(item[0]+' read',result.status===0?'OK':result.error||'unavailable');log(item[0],result.stdout,item[2]);
 }
 // This file is optional: this app currently uses SDK logging; some runners
 // also retain a local log. Never read the rest of the app's private data.
 try{log('App file log',read(at(home+'/data/'+ID+'.log'),LIMIT).toString('utf8'),true);}catch(e){put('App file log','not available');}
 const dlt=await(o.sample||((fn)=>dltSample(fn,cp.spawn,4000)))(line=>{put('App DLT',line);errors++;});put('DLT',dlt.reason+'; '+dlt.matched+' matching lines');
 put('Startup lines collected',errors);put('Result',errors?'Startup evidence collected; diagnosis still required':'No matching startup lines found; this is not evidence of a successful launch');
 output.push('=== HUD STARTUP REPORT END ===');return output;
}
if(require.main===module){
 collect().then(lines=>{lines.forEach(l=>console.log(l));console.log(JSON.stringify({status:'Read-only HUD report collected. Store phone access > Logs > mgu-updater.log. App unchanged.'}));},e=>{
  console.log('HUD diagnostics could not finish: '+redact(e.message));console.log(JSON.stringify({status:'Diagnostics incomplete; app unchanged. See Store updater log.'}));
 });
}
module.exports={collect,redact,dltSample,safeMain};
