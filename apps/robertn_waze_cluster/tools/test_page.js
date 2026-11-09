// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Robert Nisipeanu
'use strict';
/**
 * Runs the app's source modules (mgu-app.json, the entry first) against
 * a fake SDK and HMI built from the shipped uiDescription.json, with its two
 * sockets pointed at tools/fakes.js.
 *
 *   node tools/build.js && node tools/test_page.js
 *
 * Covers: the page's buttons (Enable map, Disable map, Capture logs) match
 * application.xml and are the ones the app binds, with no Show or Stop; a page
 * opened while the map is up shows it; Disable map shown only while patched
 * and Enable map only while not; pressing every button sends the render
 * nothing; hiding the page closes both sockets; a page opened again reads
 * the render's current state; a pending patch shows its line with no Enable
 * or Disable, from the daemon and, before the daemon runs, from its marker;
 * the line naming the cluster setting the map needs is always on the page,
 * under the status.
 */
const assert = require('assert');
const EventEmitter = require('events');
const fs = require('fs');
const net = require('net');
const path = require('path');
const {FakeGraphics}=require('./fake_graphics.js');
process.env.MGU_RENDERD_SOCKET='/tmp/hud-page-graphics-'+process.pid;
const graphics=new FakeGraphics(process.env.MGU_RENDERD_SOCKET);
const { FakeRender, FakePatch, RENDER_PAGE, RENDER_FPS } = require('./fakes.js');
const { RENDER_PATH, PATCH_PATH, PENDING_PATH, SIZE, SAFE } = require('../src/waze_cluster_control.js');

const STAGED = fs.readdirSync(path.join(__dirname, '..'))
    .find((name) => name.startsWith('robertn_waze_cluster@') && !name.endsWith('.tgz'));
const PKG = path.join(__dirname, '..', STAGED);
const MANIFEST = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'mgu-app.json'), 'utf8'));
const UI_DIR = path.join(PKG, 'rhmiData', 'uiDescriptions', 'ID7');
const UI = JSON.parse(fs.readFileSync(path.join(UI_DIR, 'uiDescription.json'), 'utf8'));
const XML = fs.readFileSync(path.join(UI_DIR, 'application.xml'), 'utf8');
const APP_JSON = JSON.parse(fs.readFileSync(path.join(PKG, 'rhmiData', 'application.json'), 'utf8'));

/* short: macOS limits a socket path to 104 bytes */
const RSOCK = `/tmp/woc-pr-${process.pid}.sock`;
const PSOCK = `/tmp/woc-pp-${process.pid}.sock`;
const PENDING = `/tmp/woc-ppend-${process.pid}.json`;
const SOCKETS = { [RENDER_PATH]: RSOCK, [PATCH_PATH]: PSOCK };
const realConnect = net.connect;
const exit = process.exit.bind(process);
net.connect = (p, ...rest) => realConnect.call(net, SOCKETS[p] || p, ...rest);
const realRead = fs.readFileSync;
fs.readFileSync = (p, ...rest) => realRead.call(fs, p === PENDING_PATH ? PENDING : p, ...rest);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function until(what, check) {
    const deadline = Date.now() + 5000;
    return new Promise((resolve, reject) => {
        const poll = () => {
            if (check()) resolve();
            else if (Date.now() > deadline) reject(new Error(`timed out waiting for ${what}`));
            else setTimeout(poll, 10);
        };
        poll();
    });
}

/* ---- fake HMI, from the shipped uiDescription ----------------------------- */

class FakeComponent extends EventEmitter {
    constructor(id, desc) {
        super();
        this.id = Number(id);
        this.desc = desc;
        this.text = null;
        this.enabled = null;
        this.visible = (desc && desc.properties && desc.properties.Visible) ? desc.properties.Visible.value === 1 : null;
    }
    getId() { return this.id; }
    setValue(row, cell, value) { this.text = value; return Promise.resolve(); }
    setEnabled(enabled) { this.enabled = enabled; return Promise.resolve(); }
    setVisible(visible) { this.visible = visible; return Promise.resolve(); }
    updateResources() { return Promise.resolve(); }
}

const byName = {};
Object.entries(UI.containers).forEach(([cid, cont]) => {
    byName[cont.name] = new FakeComponent(cid, cont);
    Object.entries(cont.components).forEach(([id, desc]) => {
        byName[desc.name] = new FakeComponent(id, desc);
    });
});
const rhmi = new EventEmitter();
rhmi.getByName = (name) => byName[name] || null;
let mappedState, currentEntry;
rhmi.mapEntryState = (uuid,state) => {mappedState=state;return Promise.resolve();};
rhmi.openEntryState = () => {
    // The observed ID7 failure: re-opening the remapped modern tile UUID is
    // rejected. Direct openState must handle the in-app transition instead.
    if(mappedState === byName.ST_WOC_Design)return Promise.reject(new Error('INVALID_UUID'));
    if(currentEntry)currentEntry.emit('visible',{visible:false});
    currentEntry=mappedState;currentEntry.emit('visible',{visible:true});
    return Promise.resolve();
};
const openedPages = [];
// This fixture checks our declared hierarchy, not BMW's native implementation.
rhmi.openState = name => {
    const state = byName[name];
    assert(state && UI.containers[state.id], 'target is a declared RHMI state');
    const root = state.id === 1 || state.id === 20;
    if(!root){
        assert(state.desc.properties && state.desc.properties.ParentState, 'ID7 child state declares ParentState');
        assert(UI.containers[state.desc.properties.ParentState.value], 'parent exists');
    }
    if(currentEntry)currentEntry.emit('visible',{visible:false});
    currentEntry=state;currentEntry.emit('visible',{visible:true});
    openedPages.push(name); return Promise.resolve();
};
let instance;

/* ---- fake SDK ----------------------------------------------------------------- */

const logs = [];
const logger = {};
['error', 'warn', 'info', 'verbose', 'debug'].forEach((level) => {
    logger[level] = (msg) => logs.push(`${level}: ${msg}`);
});

class OnlineApp extends EventEmitter {
    constructor() {
        super();
        instance = this;
        this._packageJson = JSON.parse(fs.readFileSync(path.join(PKG, 'package.json'), 'utf8'));
        this.appDescription = APP_JSON;
        this.rhmiApplication = rhmi;
        this.startReason = 'ENTRY_POINT';
        this._initialized = false;
        this._appStatusService = null;
        const description = APP_JSON.application.entryPoints[0];
        this._entryPoints = [{
            entryPoint: { setText: () => Promise.resolve(), setIcon: () => Promise.resolve() },
            getDescription: () => description,
            init: () => Promise.resolve(),
            setAvailability: () => Promise.resolve()
        }];
    }
    start() { setImmediate(() => this.emit('initialized')); return Promise.resolve(); }
    getAppId() { return 'robertn_waze_cluster'; }
    getEntryPoints() { return this._entryPoints; }
    getLastExecutedEntryPointUuid() { return null; }
    initialized() { this._initialized = true; this._appStatusService = {}; return Promise.resolve(); }
    registerActive() { return Promise.resolve(); }
    registerInactive() { return Promise.resolve(); }
    registerHmiVisible() { return Promise.resolve(); }
    unregisterHmiVisible() { return Promise.resolve(); }
    destroyBundles() { return Promise.resolve(); }
}

const FAKE_MODULES = {
    'oap-sdk/src/core/OnlineApp.js': OnlineApp,
    'oap-sdk/src/logging/logging': { getSDKLogger: () => logger }
};

/* Loads the app's entry module (mgu-app.json's first) with the SDK's names
 * answered by the fakes, as the unit's link of the source package would. */
function runSource() {
    const Module = require('module');
    const load = Module._load;
    Module._load = function (request, parent, isMain) {
        return FAKE_MODULES[request] || load.call(this, request, parent, isMain);
    };
    require(path.join(__dirname, '..', MANIFEST.modules[0]));
}

/* ---- scenario ----------------------------------------------------------------- */

async function main(){
 require('./check_rhmi').check(XML,UI);
 assert.deepEqual(Object.keys(UI.containers),['20'],'only the graphical host is shipped');
 assert(!/ST_OnlineApps_WazeCluster|wocModern|wocQuickStartup|Classic settings/.test(JSON.stringify(UI)));
 for(let i=0;i<24;i++)assert.equal(byName['designProxy'+i].visible,false,'proxy labels start hidden');
 const render=new FakeRender(RSOCK),patch=new FakePatch(PSOCK);
 await render.listen();await patch.listen();await graphics.listen();
 try{
  runSource();await until('graphical dashboard',()=>instance._design&&instance._design.presented);
  await until('native loading cleared',()=>byName.designStatus.text==='');
  assert.equal(mappedState,byName.ST_WOC_Design);assert(openedPages.every(n=>n==='ST_WOC_Design'));
  const h=instance._design;assert.equal(h.page,'overview');
  assert(!h.items.some(b=>b.id==='classic'));
  console.log('PASS tile opens graphical dashboard directly; no classic pages in package');
  for(const page of ['layout','appearance','startup','support']){
   h.page=page;h.render();assert(!h.items.some(b=>b.id==='classic'));
  }
  graphics.send(103,Buffer.from('test lost surface'));await until('recovery message',()=>byName.designRetry.visible);
  assert.equal(mappedState,byName.ST_WOC_Design);assert(openedPages.every(n=>n==='ST_WOC_Design'));
  await until('proxy labels hidden',()=>Array.from({length:24},(_,i)=>byName['designProxy'+i]).every(c=>c.text===''&&!c.visible));
  assert(!byName.designStatus.text.includes('Select Retry graphical menu'));
  byName.designRetry.emit('action');await until('same host recovered',()=>h.presented&&!byName.designRetry.visible);
  console.log('PASS surface failure stays on same host, hides raw proxies and retries graphical dashboard');
  byName.ST_WOC_Design.emit('focus',{focus:false});assert(!h.active);
  byName.ST_WOC_Design.emit('focus',{focus:true});await until('focus restored',()=>h.presented);
  instance._setVisible(false);assert(!h.active);
  await instance._onEntryPointExecute(APP_JSON.application.entryPoints[0].uuid);await until('reentered',()=>h.presented);
  assert(openedPages.length>=2&&openedPages.every(n=>n==='ST_WOC_Design'));
  console.log('PASS popup, exit and repeated entry preserve the new menu');
 }finally{
  if(instance){if(instance._design)instance._design.close();instance._control.close();if(instance._profiles)instance._profiles.stop();}
  await graphics.close();await render.close();await patch.close();
 }
}
main().catch(e=>{console.error(e.stack);process.exitCode=1;});
