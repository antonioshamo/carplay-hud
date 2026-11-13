// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),EventEmitter=require('events'),Module=require('module');
const root=path.resolve(__dirname,'../../..'),base=path.join(root,'apps/robertn_waze_cluster'),spec=require(path.join(base,'mgu-app.json'));
const tree=path.join(base,spec.tree),ui=require(path.join(tree,'rhmiData/uiDescriptions/ID7/uiDescription.json'));
// Real Node 8 runtime; SDK/HMI are controlled fixtures, not a BMW emulator.
if(!process.argv[2]){
 const cp=require('child_process');
 ['linked','sdk27-rhmi-disabled','sdk27-entry-disabled','foreground','early-entry','graphics-throw','icon-hang','profile-throw','graphics-timeout','modern-reopen','modern-invalid-entry','startup-budget','modern-map-timeout','modern-open-timeout','entry-init-timeout','availability-reject','native-hidden-timeout'].forEach(s=>{
  const r=cp.spawnSync(process.execPath,[__filename,s],{encoding:'utf8',timeout:9000});
  process.stdout.write(r.stdout||'');process.stderr.write(r.stderr||'');if(r.status!==0)process.exit(1);
 });
 console.log('All startup failure-injection checks passed');process.exit(0);
}
const scenario=process.argv[2];let app,opened=0,modernOpened=0,invalidEntryCalls=0,nativeNamedOpened=0,entryOpenCalls=0,modernMapAttempts=0,initialized=false,profileStarts=0;const updated=[],logs=[],nativeWrites=[];let firstGraphicsWrites=null;
// SDK 27.x may inherit either loading flag as false from its stock donor.
// Model the documented conditionalLoading contract, not BMW implementation:
// https://github.com/cauliflowermossgrape/idrive7-apps/issues/39
let appConfig=JSON.parse(fs.readFileSync(path.join(tree,'config/base.json'),'utf8'));
function configuredApp(value){
 const defaults={rhmiLoadingEnabled:true,entryPointLoadingEnabled:true};
 if(scenario==='sdk27-rhmi-disabled')defaults.rhmiLoadingEnabled=false;
 if(scenario==='sdk27-entry-disabled')defaults.entryPointLoadingEnabled=false;
 const config=Object.assign(defaults,appConfig);
 if(!config.rhmiLoadingEnabled)value.rhmiApplication=undefined;
 if(!config.entryPointLoadingEnabled)value.entries=[];
 return value;
}
const log={};['info','warn','error','debug','verbose'].forEach(k=>log[k]=s=>logs.push(k+': '+s));
class Component extends EventEmitter{constructor(id,desc){super();this.id=+id;this.desc=desc;}getId(){return this.id;}setValue(){nativeWrites.push(this.desc.name);return Promise.resolve();}setEnabled(){nativeWrites.push(this.desc.name);return Promise.resolve();}setVisible(){nativeWrites.push(this.desc.name);return Promise.resolve();}updateResources(){updated.push(this.desc.name);if((scenario==='child-hang'||scenario==='page-timeout')&&this.id!==1||scenario==='graphics-timeout'&&this.id===20)return new Promise(()=>{});if(scenario==='child-reject'&&this.id!==1)return Promise.reject(Error('optional screen refused'));return Promise.resolve();}}
const names={};Object.keys(ui.containers).forEach(id=>{const c=ui.containers[id];names[c.name]=new Component(id,c);Object.keys(c.components).forEach(k=>names[c.components[k].name]=new Component(k,c.components[k]));});
const rhmi=new EventEmitter();rhmi.getByName=n=>names[n];rhmi.mapEntryState=(uuid,state)=>{
 if(state===names.ST_WOC_Design){modernMapAttempts++;if(scenario==='modern-map-timeout'&&modernMapAttempts===1)return new Promise(()=>{});}
 if(scenario==='restore-map-reject'&&initialized&&state===names.ST_OnlineApps_WazeCluster)return Promise.reject(Error('restore mapping refused'));
 rhmi.mapped=state;return Promise.resolve();};rhmi.openEntryState=uuid=>{entryOpenCalls++;assert(initialized,'first screen must open after app-manager acknowledgement');assert(rhmi.mapped,'entry mapped');if(scenario==='native-invalid-entry')return Promise.reject(Error('INVALID_UUID'));if(scenario==='native-entry-timeout'||scenario==='native-hidden-timeout')return new Promise(()=>{});if(scenario==='modern-invalid-entry'&&rhmi.mapped===names.ST_WOC_Design){invalidEntryCalls++;return Promise.reject(Error('INVALID_UUID'));}opened++;rhmi.mapped.emit('visible',{visible:true});return Promise.resolve();};rhmi.openState=name=>{const state=typeof name==='string'?names[name]:name;assert(initialized,'openState before initialization');assert(state,'named state exists');
 if(state===names.ST_WOC_Design&&scenario==='modern-open-timeout'&&opened===0){opened++;return new Promise(()=>{});}
 if(state===names.ST_WOC_Design&&scenario==='restore-map-reject')return Promise.reject(Error('graphics state refused'));
 if(state===names.ST_OnlineApps_WazeCluster)nativeNamedOpened++;
 opened++;if(state===names.ST_WOC_Design)modernOpened++;state.emit('visible',{visible:true});return Promise.resolve();};
const description=require(path.join(tree,'rhmiData/application.json'));
class OnlineApp extends EventEmitter{constructor(){super();app=this;this.rhmiApplication=rhmi;this._packageJson=require(path.join(tree,'package.json'));this.appDescription=description;this.startReason='ENTRY_POINT';const d=description.application.entryPoints[0];this.entries=[{getDescription:()=>d,init:()=>scenario==='entry-init-timeout'?new Promise(()=>{}):Promise.resolve(),setAvailability:()=>scenario==='availability-reject'?Promise.reject(Error('availability refused')):Promise.resolve(),entryPoint:{setText:()=>scenario==='icon-hang'?new Promise(()=>{}):Promise.resolve(),setIcon:()=>Promise.resolve()}}];configuredApp(this);}getAppId(){return spec.id;}getEntryPoints(){return this.entries;}getLastExecutedEntryPointUuid(){return null;}start(){if(scenario==='early-entry')this.emit('entryPointExecute',description.application.entryPoints[0].uuid);setImmediate(()=>this.emit('initialized'));return Promise.resolve();}initialized(){initialized=true;this._initialized=true;return Promise.resolve();}registerActive(){return Promise.resolve();}registerInactive(){return Promise.resolve();}registerHmiVisible(){return Promise.resolve();}unregisterHmiVisible(){return Promise.resolve();}}
class Profile{start(){assert(initialized,'profiles must start after app initialization');if(scenario==='profile-throw')throw Error('No profile service');profileStarts++;}stop(){}}
class Graphics extends EventEmitter{constructor(){super();this.ready=false;}connect(){firstGraphicsWrites=nativeWrites.slice();this.ready=true;this.emit('mode',true);}render(){}close(){}hostVisible(){}hostFocus(){}proxyPress(){}proxyFocus(){}}
const orig=Module._load;Module._load=function(req,parent,main){if(req==='startup-test-sdk')return {OnlineApp,logging:{getSDKLogger:()=>log}};if(req==='oap-sdk/src/core/OnlineApp.js')return OnlineApp;if(req==='oap-sdk/src/logging/logging')return {getSDKLogger:()=>log};if(req==='./profile_sync.js')return {ProfileSync:Profile};if(req==='./hud_screen.js'&&(scenario==='graphics-timeout'||scenario==='modern-reopen'||scenario==='modern-invalid-entry'||scenario==='startup-budget'||scenario==='modern-map-timeout'||scenario==='modern-open-timeout'||scenario==='restore-map-reject'))return {HudScreen:Graphics};if(req==='./hud_screen.js'&&scenario==='graphics-throw')throw Error('optional graphics unavailable');return orig.call(this,req,parent,main);};
let linkedDir=null;
function loadApp(){
 if(scenario!=='linked'&&scenario.indexOf('sdk27-')!==0)return require(path.join(base,spec.modules[0]));
 // Minimal dependency-table loader implementing the bundle contract used by the linker.
 const prelude=`(function(){function r(modules,cache,entries){
  function load(id){
   if(!modules[id])return require(id);
   if(!cache[id]){
    var current={exports:{}};cache[id]=current;
    modules[id][0](function(name){var target=modules[id][1][name];return load(target===undefined?name:target);},current,current.exports);
   }
   return cache[id].exports;
  }
  entries.forEach(load);return load;
 }return r})()`;
 const donor=prelude+'({1:[function(require,module,exports){require("oap-sdk/src/core/OnlineApp.js");require("oap-sdk/src/logging/logging");},{"oap-sdk/src/core/OnlineApp.js":2,"oap-sdk/src/logging/logging":3}],2:[function(require,module,exports){module.exports=require("startup-test-sdk").OnlineApp;},{}],3:[function(require,module,exports){module.exports=require("startup-test-sdk").logging;},{}]},{},[1]);';
 linkedDir=fs.mkdtempSync(path.join(require('os').tmpdir(),'hud-linked-'));
 const donorPath=path.join(linkedDir,'donor.js'),output=path.join(linkedDir,'app.tgz');fs.writeFileSync(donorPath,donor);
 const link=require(path.join(root,'tools/oap_link.js'));link.build(base,output,{donors:[donorPath],epoch:1700000000});
 const members=link.untar(fs.readFileSync(output));
 appConfig=JSON.parse(members.find(f=>f.name==='config/base.json').data.toString('utf8'));
 const bundle=members.find(f=>f.name==='javascript/app.js');assert(bundle,'linked package contains app.js');
 const runner=members.find(f=>f.name==='javascript/runner.js');assert(runner,'linked package contains its declared entry point');
 fs.writeFileSync(path.join(linkedDir,'app.js'),bundle.data);
 const entry=path.join(linkedDir,'runner.js');fs.writeFileSync(entry,runner.data);return require(entry);
}
try{loadApp();}catch(e){console.error('FAIL '+scenario+': '+e.stack);process.exit(1);}
if(scenario==='modern-reopen')setTimeout(()=>{app._setVisible(false);app._onEntryPointExecute(description.application.entryPoints[0].uuid);},500);
if(scenario==='modern-invalid-entry')[350,550,750].forEach(ms=>setTimeout(()=>{app._setVisible(false);app._onEntryPointExecute(description.application.entryPoints[0].uuid);},ms));
if(scenario==='modern-map-timeout'||scenario==='modern-open-timeout')setTimeout(()=>app._onEntryPointExecute(description.application.entryPoints[0].uuid),4400);
if(scenario==='native-hidden-timeout')setTimeout(()=>app._setVisible(false),100);
if(scenario==='native-entry-timeout')setTimeout(()=>app._setVisible(false),150);
if(scenario==='native-entry-timeout')[100,200].forEach(ms=>setTimeout(()=>app._onEntryPointExecute(description.application.entryPoints[0].uuid),ms));
if(scenario==='page-timeout')setTimeout(()=>app._openPage('ST_WOC_Size'),100);
setTimeout(()=>{try{
 assert(initialized,'app manager acknowledged');assert(app._optionalStarted,'graphics startup not blocked by HMI open');
 assert.equal(entryOpenCalls,0,'never open a stale tile UUID');
 assert.equal(nativeNamedOpened,0,'no old menu navigation');
 assert(updated.every(n=>n==='ST_WOC_Design'),'only dashboard resources loaded');
 assert(nativeWrites.every(n=>/^design(Status|Retry|Exit|Proxy\d+)$/.test(n)),'no legacy row writes');
 if(!/graphics-timeout|native-hidden-timeout/.test(scenario))assert(modernOpened>0,'graphical host opened');
 if(scenario==='modern-map-timeout')assert(modernOpened>0,'named host opens despite mapping timeout');
 if(scenario==='modern-open-timeout')assert(modernOpened>0,'later tap recovers from hung open');
 if(scenario==='modern-invalid-entry')assert(modernOpened>=4,'every re-entry opens dashboard by name');
 if(scenario==='startup-budget')assert(firstGraphicsWrites.length<10,'start graphics before proxy writes');
 if(scenario==='foreground'){
  const writes=[];app._write=(name,method,value)=>writes.push({name,method,value});
  app._graphicsError=null;app._design={presented:false,presentationFailed:true,failureReason:'Renderer dashboard mode unavailable',autoRetries:0,visible:true,focused:true};
  app._renderStatus();assert(writes.some(w=>w.name==='designStatus'&&/dashboard mode unavailable.*Retrying/.test(w.value)),'native status shows exact cause while a retry is scheduled');
  app._design.autoRetries=3;writes.length=0;app._renderStatus();
  assert(writes.some(w=>w.name==='designStatus'&&/Select Retry dashboard/.test(w.value)&&!/Retrying/.test(w.value)),'exhausted retries do not claim automatic progress');
  app._design.presented=true;writes.length=0;app._renderStatus();assert(writes.some(w=>w.name==='designStatus'&&w.value===''),'successful presentation clears failure text');
 }
 assert(!logs.some(s=>s.indexOf('init failed')>=0),logs.join('\n'));
 console.log('PASS '+scenario+'; single dashboard host, no legacy fallback');
 if(linkedDir){fs.readdirSync(linkedDir).forEach(n=>fs.unlinkSync(path.join(linkedDir,n)));fs.rmdirSync(linkedDir);}process.exit(0);
 }catch(e){console.error('FAIL '+scenario+': '+e.stack+'\n'+logs.join('\n'));process.exit(1);}},/timeout/.test(scenario)?5500:1200);
