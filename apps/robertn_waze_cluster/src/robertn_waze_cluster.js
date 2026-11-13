// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Robert Nisipeanu
'use strict';
const trace=require('./startup_trace.js');
trace.record('sdk-import-begin');
const OnlineApp=require('oap-sdk/src/core/OnlineApp.js');
const logging=require('oap-sdk/src/logging/logging');
const {SettingsControl}=require('./settings_control.js');
const {ProfileSync}=require('./profile_sync.js');
const HOST='ST_WOC_Design',PROXIES=24,logger=logging.getSDKLogger();
trace.record('sdk-import-complete');
const truth=v=>v===true||v==='true'||v===1||v==='1';
class WazeClusterApp extends OnlineApp {
 constructor(){
  super();trace.record('constructor-super-complete');
  this._components={};this._written={};this._actions={};this._lastPress={};this._visible=false;this._hostVisible=false;this._hostFocused=true;
  this._startupReady=false;this._entryUuid=null;this._pendingEntryUuid=null;this._entryOpen=null;this._resources=null;this._optionalStarted=false;
  this._control=new SettingsControl({log:logger});this._control.on('change',()=>{if(this._design)this._design.render();});
  this.on('initialized',()=>this._appInitialized().catch(e=>{trace.error('initialization-failed',e);logger.error('Settings initialization: '+e.message);}));
  this.on('entryPointExecute',uuid=>this._onEntryPointExecute(uuid));
  this.on('changeVisibility',v=>{if(v&&v.visible===false)this._setVisible(false);});
  this.on('error',e=>{trace.error('sdk-error',e);logger.warn('OnlineApp: '+e.message);});
  this.on('shutdown',reason=>this._handleShutdown(reason));
 }
 _rhmiRequest(label,request){
  return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error(label+' timed out')),4000);
   Promise.resolve().then(request).then(v=>{clearTimeout(timer);resolve(v);},e=>{clearTimeout(timer);reject(e);});});
 }
 _startedForeground(){const v=this.getVisibilityData&&this.getVisibilityData();return ['ENTRY_POINT','LUM','BOOKMARK','START_WIDGET','TRIGGER_HMI','SPEECH_COMMAND'].includes(v&&v.reason||this.startReason);}
 _ensureResources(){
  if(!this._resources)this._resources=this._rhmiRequest('Dashboard resources',()=>this._state.updateResources()).catch(e=>{this._resources=null;throw e;});
  return this._resources;
 }
 _setupRhmi(){
  const r=this.rhmiApplication;this._state=r.getByName(HOST);if(!this._state)throw Error('Missing dashboard host');
  ['designStatus','designRetry','designExit'].concat(Array.from({length:PROXIES},(_,i)=>'designProxy'+i)).forEach(n=>{const c=r.getByName(n);if(!c)throw Error('Missing '+n);this._components[n]=c;});
  this._bind('designRetry',()=>this._retryGraphics());this._bind('designExit',()=>this._exit());
  for(let i=0;i<PROXIES;i++){const n='designProxy'+i;this._bind(n,()=>{if(this._design)this._design.proxyPress(i);});this._components[n].on('focus',e=>{if(this._design)this._design.proxyFocus(i,truth(e&&e.value));});}
  this._state.on('visible',e=>{this._hostVisible=truth(e&&e.visible);if(this._hostVisible)this._setVisible(true);if(this._design)this._design.hostVisible(this._hostVisible&&this._visible);});
  this._state.on('focus',e=>{this._hostFocused=truth(e&&e.focus);if(this._design)this._design.hostFocus(this._hostFocused);});
  r.on('userEvent',e=>{const a=e&&e.eventType==='ACTION'&&this._actions[Number(e.sourceId)];if(a)this._press(a.name,a.handler);});
  r.on('applicationStackChanged',stack=>{const keys=stack&&typeof stack==='object'?Object.keys(stack):[];if(!keys.length)return;this._setVisible(Object.prototype.hasOwnProperty.call(stack,'ROOT_APP'));});
  r.on('restoreHmi',()=>{this._written={};this._renderStatus();if(this._design)this._design.render(true);});
  // One host only. No classic settings states or hidden legacy rows to load.
  return this._ensureResources();
 }
 _registerEntryPoints(){
  const descriptions=this.appDescription&&this.appDescription.application.entryPoints||[];
  const entry=this.getEntryPoints().find(e=>descriptions.some(d=>d.uuid===e.getDescription().uuid));
  if(!entry)throw Error('No dashboard entry point');this._entryUuid=entry.getDescription().uuid;
  const attempt=(label,fn)=>this._rhmiRequest(label,fn).catch(e=>{trace.error('entry-registration-degraded',e);logger.warn(label+': '+e.message);});
  return attempt('Initialize dashboard entry',()=>entry.init())
   .then(()=>attempt('Map dashboard',()=>this.rhmiApplication.mapEntryState(this._entryUuid,this._state)))
   .then(()=>attempt('Enable dashboard entry',()=>entry.setAvailability('ENABLED')));
 }
 _appInitialized(){
  trace.record('app-initializing',this._packageJson.version);
  if(!this.rhmiApplication)return this.initialized();
  const foreground=this._startedForeground();
  trace.record('rhmi-setup-begin');
  // A slow resource request must not prevent manager acknowledgement.
  return Promise.resolve().then(()=>this._setupRhmi()).catch(e=>{trace.error('dashboard-resources-failed',e);logger.warn(e.message);})
   .then(()=>this._registerEntryPoints()).then(()=>{trace.record('entry-registration-complete');if(foreground)this.registerActive();return this.initialized();})
   .then(()=>{
    trace.record('manager-initialized-ack');this._startupReady=true;
    if(foreground)this._setVisible(true);
    // Begin graphics without waiting for a possibly hung HMI open request.
    this._startOptional();
    const uuid=this._pendingEntryUuid||(this.getLastExecutedEntryPointUuid&&this.getLastExecutedEntryPointUuid())||(foreground?this._entryUuid:null);this._pendingEntryUuid=null;
    return uuid?this._onEntryPointExecute(uuid):null;
   });
 }
 _startOptional(){
  if(this._shutdownPromise||this._optionalStarted)return;this._optionalStarted=true;
  this._startGraphics();
  try{this._profiles=new ProfileSync({control:this._control,log:logger});this._profiles.start();}catch(e){logger.warn('Driver profiles: '+e.message);}
 }
 _startGraphics(){
  try{
   const {HudScreen}=require('./hud_screen.js');
   this._design=new HudScreen({control:this._control,log:logger,exit:()=>this._exit(),proxies:items=>{this._proxyItems=items;this._renderProxies();}});
   this._design.on('mode',()=>this._renderStatus());
   this._design.on('presentation',()=>{this._renderStatus();this._renderProxies();});
   this._design.connect();this._design.hostVisible(this._visible&&this._hostVisible);this._design.hostFocus(this._hostFocused);this._graphicsError=null;
  }catch(e){this._graphicsError=e.message;trace.error('graphics-init-failed',e);logger.warn('Dashboard graphics: '+e.message);}
  this._renderStatus();
 }
 _retryGraphics(){
  if(this._shutdownPromise||!this._visible)return;
  if(this._design&&typeof this._design.retry==='function')this._design.retry();else this._startGraphics();
  this._renderStatus();
 }
 _onEntryPointExecute(uuid){
  if(this._shutdownPromise||!this.rhmiApplication||!uuid)return Promise.resolve();
  if(!this._startupReady){this._pendingEntryUuid=uuid;return Promise.resolve();}
  this._setVisible(true);if(this._entryOpen)return this._entryOpen;
  if(this._design&&this._design.presentationFailed)this._retryGraphics();
  this._entryOpen=this._ensureResources().then(()=>{
   if(this._shutdownPromise||!this._visible)return;
   // Open the single host by name. Stale tile UUIDs and renderer reconnects
   // must never remap or send the user back into another menu.
   return this._rhmiRequest('Open dashboard',()=>this.rhmiApplication.openState(HOST));
  }).catch(e=>{trace.error('open-dashboard-failed',e);this._graphicsError='Dashboard could not open. Tap the app again.';this._renderStatus();})
   .then(()=>{this._entryOpen=null;});return this._entryOpen;
 }
 _setVisible(on){
  if(this._shutdownPromise||this._visible===!!on)return;this._visible=!!on;
  if(!on){this._hostVisible=false;if(this._design)this._design.hostVisible(false);}
  if(on)this._control.open();else this._control.close();
  if(this._initialized&&this._appStatusService){const reports=on?[this.registerActive(),this.registerHmiVisible()]:[this.unregisterHmiVisible(),this.registerInactive()];reports.forEach(p=>Promise.resolve(p).catch(e=>logger.warn('App status: '+e.message)));}
 }
 _write(name,method,value){
  const key=name+':'+method;if(this._written[key]===value)return;this._written[key]=value;
  Promise.resolve().then(()=>method==='text'?this._components[name].setValue(0,'Text',value,'Text'):this._components[name][method](value)).catch(e=>{delete this._written[key];logger.warn(name+': '+e.message);});
 }
 _renderStatus(){
  if(!this._startupReady||this._shutdownPromise)return;
  const d=this._design,shown=!!(d&&d.presented),failed=this._graphicsError||d&&d.failureReason;
  const retrying=!!(d&&d.presentationFailed&&d.autoRetries<3&&d.visible&&d.focused);
  const message=failed?'Dashboard unavailable: '+trace.redact(failed).slice(0,150)+'. '+(retrying?'Retrying…':'Select Retry dashboard.'):'Opening your dashboard…';
  this._write('designStatus','text',shown?'':message);
  this._write('designRetry','setVisible',!!failed&&!shown);this._write('designRetry','setEnabled',!!failed&&!shown);
  this._write('designExit','setVisible',!shown);this._write('designExit','setEnabled',!shown);
 }
 _renderProxies(){
  // No raw menu labels on screen while the graphics layer is missing.
  const shown=!!(this._design&&this._design.presented);
  for(let i=0;i<PROXIES;i++){const item=shown&&this._proxyItems&&this._proxyItems[i],n='designProxy'+i;this._write(n,'text',item?item.label:'');this._write(n,'setVisible',!!item);this._write(n,'setEnabled',!!(item&&item.enabled));}
 }
 _bind(name,handler){const c=this._components[name];this._actions[Number(c.getId())]={name,handler};c.on('action',()=>this._press(name,handler));}
 _press(name,handler){const now=Date.now();if(now-(this._lastPress[name]||0)<400)return;this._lastPress[name]=now;try{handler();}catch(e){logger.warn(name+': '+e.message);}}
 _exit(){this._setVisible(false);return this._rhmiRequest('Close dashboard',()=>this.rhmiApplication.closeState(HOST)).catch(e=>logger.warn(e.message));}
 _handleShutdown(reason){
  if(this._shutdownPromise)return this._shutdownPromise;trace.record('shutdown-requested');
  if(this._design)this._design.close();this._control.close();if(this._profiles)this._profiles.stop();
  this._shutdownPromise=Promise.resolve().then(()=>this.destroyBundles()).catch(e=>logger.warn(e.message)).then(()=>process.exit(0));return this._shutdownPromise;
 }
}
trace.record('constructor-begin');const app=new WazeClusterApp();trace.record('start-called');app.start().catch(e=>{trace.error('start-failed',e);logger.error(e.message);});
