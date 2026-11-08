// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Robert Nisipeanu
/* Native CarPlay HUD settings. Each task has its own short page; the
 * existing tools own rendering, startup and driver profile persistence. */
'use strict';

const trace = require('./startup_trace.js');
trace.record('sdk-import-begin');
const OnlineApp = require('oap-sdk/src/core/OnlineApp.js');
const logging = require('oap-sdk/src/logging/logging');
const { MAX_LINES } = require('./waze_cluster_control.js');
const { SettingsControl } = require('./settings_control.js');
const { ProfileSync } = require('./profile_sync.js');
// Keep optional graphics out of the native screen's startup path.
const HOST = 'ST_WOC_Design', PROXIES = 24;

const logger = logging.getSDKLogger();
trace.record('sdk-import-complete');

const STATE_NAME = 'ST_OnlineApps_WazeCluster';
// Only the native home is needed before the modern cockpit can open. Do not
// fill thirteen hidden fallback pages (or their log rows) on the launch path.
const HOME_COMPONENTS = new Set(['wocStatus','wocDisplay','wocQuickStartup',
    'wocSizePage','wocPositionPage','wocAppearancePage','wocSupportPage','wocModern']);
const STATUS_NAME = 'wocStatus';
const SETUP_NAME = 'wocSetup';
const ENABLE_NAME = 'wocEnable';
const DISABLE_NAME = 'wocDisable';
const RESTART_NAME = 'wocRestart';
const DISPLAY_NAME = 'wocDisplay';
const HUD_SIZE_NAME = 'wocHudSize';         /* HUD map larger */
const HUD_SMALLER_NAME = 'wocHudSmaller';
/* Move HUD map left / right / up / down, and Centre HUD map */
const HUD_MOVE_NAMES = { left: 'wocHudLeft', right: 'wocHudRight', up: 'wocHudUp', down: 'wocHudDown' };
const HUD_CENTRE_NAME = 'wocHudCentre';
const CAPTURE_NAME = 'wocCapture';
const CAPTURE_STATUS = 'wocCaptureStatus';
const ROW_NAMES = Array.from({ length: MAX_LINES }, (_, i) => `wocRow${String(i + 1).padStart(2, '0')}`);
const LIST_RENDER_MS = 500;
const ROW_CHARS = 90;
const PRESS_DEDUPE_MS = 400;
/* in Map view the stock map is the fallback while CarPlay's cluster stream
 * is not live; the menu names are the HMI's en_GB ones */
const SETUP_TEXT = 'Cluster mode: choose Map view in BMW display settings';
const PAGES = { wocSizePage: 'ST_WOC_Size', wocPositionPage: 'ST_WOC_Position',
    wocSupportPage: 'ST_WOC_Support', wocSetupPage: 'ST_WOC_Setup',
    wocCapturePage: 'ST_WOC_Capture', wocLogPage: 'ST_WOC_Logs',
    wocDisplayPage: 'ST_WOC_Display', wocPresetsPage: 'ST_WOC_Presets',
    wocHorizontalPage: 'ST_WOC_Horizontal', wocVerticalPage: 'ST_WOC_Vertical',
    wocStartupPage: 'ST_WOC_Startup', wocAppearancePage: 'ST_WOC_Appearance', wocTroubleshootPage: 'ST_WOC_Troubleshoot' };
const EXTRA = ['wocModern','wocQuickStartup','startupStatus','startupResult','wocStartupOn','wocStartupOff','sizeStatus', 'sizeNotice', 'positionStatus', 'positionNotice',
    'supportStatus', 'setupStatus', 'setupHint', 'captureHint', 'wocSizeStandard',
    'displayStatus', 'displayHint', 'wocDisplayHud', 'wocDisplayCluster',
    'presetStatus', 'presetNotice', 'wocPresetCompact', 'wocPresetBalanced', 'wocPresetLarge',
    'wocMoveStep', 'horizontalStatus', 'verticalStatus', 'horizontalHint', 'verticalHint',
    'appearanceStatus', 'appearanceNotice', 'wocOriginalColors', 'wocClearBackground', 'wocCorners', 'wocMissingCapture'];

/* A line as one row: no line breaks, at most ROW_CHARS characters. */
function oneRow(line) {
    const flat = line.replace(/\s+/g, ' ');
    return flat.length > ROW_CHARS ? `${flat.slice(0, ROW_CHARS - 1)}…` : flat;
}

/* RHMI event values arrive as booleans, or as 1/0 on some HMIs. */
function isTrue(raw) {
    return raw === true || raw === 'true' || raw === 1 || raw === '1';
}

class WazeClusterApp extends OnlineApp {
    constructor() {
        super();
        trace.record('constructor-super-complete');
        this._state = null;
        this._components = {};
        this._actionById = {};
        this._lastPress = {};
        this._written = {};
        this._visible = false;
        this._sawForeground = false;
        this._shutdownPromise = null;
        this._listTimer = null;
        this._control = new SettingsControl({ log: logger });
        this._control.on('change', () => {
            this._render();
            this._scheduleLists();
        });
        this._control.on('log', () => this._scheduleLists());
        this._modern = false;
        this._entryUuid = null;
        this._uiChange = Promise.resolve();
        this._startupReady = false;
        this._pendingEntryUuid = null;
        this._entryOpen = null;
        this._resources = {};
        this._optionalStarted = false;
        this._nativeDetailsReady = false;
        this._design = { ready:false, render(){}, close(){}, hostVisible(){}, hostFocus(){}, proxyPress(){}, proxyFocus(){} };
        this._profiles = null;

        this.on('initialized', () => {
            trace.record('sdk-initialized-event');
            try { this._appInitialized()
                .catch((err) => {
                    trace.error('initialization-failed', err);
                    logger.error(`robertn_waze_cluster init failed: ${err && err.message}`);
                });
            } catch (err) { trace.error('initialization-threw', err); throw err; }
        });
        this.on('shutdown', (reason) => this._handleShutdown(reason));
        this.on('error', (err) => {
            trace.error('sdk-error', err);
            logger.warn(`OnlineApp error: ${err && err.message}`);
        });
        this.on('entryPointExecute', (uuid) => this._onEntryPointExecute(uuid));
        this.on('changeVisibility', (data) => {
            if (data && data.visible === false) {
                this._setVisible(false);
            }
        });
    }

    _appInitialized() {
        trace.record('app-initializing', this._packageJson.version);
        logger.info(`robertn_waze_cluster ${this.getAppId()} v${this._packageJson.version} starting`);
        if (!this.rhmiApplication) {
            trace.record('rhmi-unavailable', this.startReason);
            logger.info('no RhmiApplication for this start reason; initializing without a screen');
            return this.initialized();
        }
        const foregroundStart = this._startedForeground();
        trace.record('rhmi-setup-begin', 'reason=' + this.startReason + '; foreground=' + foregroundStart);
        return this._setupRhmi()
            .then(() => {
                trace.record('rhmi-setup-complete');
                return this._registerEntryPoints();
            })
            .then(() => {
                trace.record('entry-registration-complete');
                // A foreground start declares itself ACTIVE before initialized()
                // reports the first app status, so the manager keeps it running.
                if (foregroundStart) {
                    this.registerActive();
                }
                return this.initialized();
            })
            .then(() => {
                trace.record('manager-initialized-ack');
                if (foregroundStart) {
                    this._sawForeground = true;
                    this._setVisible(true);
                }
                this._startupReady = true;
                this._render();
                this._renderLists();
                const lastUuid = this._pendingEntryUuid || (this.getLastExecutedEntryPointUuid &&
                    this.getLastExecutedEntryPointUuid()) || (foregroundStart ? this._entryUuid : null);
                this._pendingEntryUuid = null;
                // Some firmware does not replay the launch event after initialization.
                // Explicitly open the mapped native home before optional graphics.
                return (lastUuid ? this._onEntryPointExecute(lastUuid) : Promise.resolve())
                    .then(() => {
                        trace.record('native-entry-request-complete', lastUuid ? 'entry available' : 'no entry UUID');
                        this._optionalTimer = setImmediate(() => this._startOptional());
                    });
            });
    }

    _startOptional() {
        if (this._shutdownPromise || this._optionalStarted) return;
        this._optionalStarted = true;
        try {
            const { HudScreen } = require('./hud_screen.js');
            this._design = new HudScreen({control:this._control,log:logger,
                classic:()=>this._useModern(false),
                exit:()=>this.rhmiApplication.closeState(HOST).catch(e=>logger.warn('Close settings: '+e.message)),
                proxies:items=>{
                    for(let i=0;i<PROXIES;i++){
                        const name='designProxy'+i,item=items[i];
                        this._write(name,item?item.label:'');
                        this._setVisibleComp(name,!!item);
                        this._setEnabled(name,!!(item&&item.enabled));
                    }
                }});
            this._design.on('mode',ready=>this._useModern(ready));
            this._design.connect();
        } catch (err) {
            logger.warn('Optional graphics unavailable; native HUD controls remain: '+err.message);
        }
        try {
            this._profiles = new ProfileSync({control:this._control,log:logger});
            this._profiles.start();
        } catch (err) { logger.warn('Driver profiles unavailable: '+err.message); }
        this._render();
    }

    // BMW can reject a stale tile UUID or leave an HMI request unanswered.
    // Bound each request so neither launch nor the serialized screen queue can
    // get stuck forever. The SDK has no cancellation API; late settlements
    // cannot resume our timed-out promise chain.
    _rhmiRequest(label, request) {
        return new Promise((resolve,reject) => {
            const timer=setTimeout(()=>reject(new Error(label+' timed out')),4000);
            Promise.resolve().then(request).then(value=>{
                clearTimeout(timer);resolve(value);
            },err=>{clearTimeout(timer);reject(err);});
        });
    }

    _ensureResources(name) {
        if (this._resources[name]) return this._resources[name];
        const state = this.rhmiApplication.getByName(name);
        if (!state) return Promise.reject(new Error('Missing screen '+name));
        this._resources[name] = this._rhmiRequest('Screen resources',()=>state.updateResources())
            .catch(err=>{delete this._resources[name];throw err;});
        return this._resources[name];
    }

    _openState(name) {
        if (this._shutdownPromise || !this._visible) return Promise.resolve();
        return this._rhmiRequest('Open screen '+name,()=>this.rhmiApplication.openState(name));
    }

    _restoreNativeHome() {
        this._modern=false;
        this._design.hostVisible(false);
        this._render();
        // A failed tile mapping must not prevent direct navigation to the
        // already registered home. Never retry the rejected entry UUID here.
        return this._rhmiRequest('Restore home mapping',()=>this.rhmiApplication.mapEntryState(this._entryUuid,this._state))
            .catch(err=>{trace.error('home-map-failed',err);logger.warn('Home mapping: '+err.message);})
            .then(()=>this._ensureResources(STATE_NAME))
            .then(()=>this._openState(STATE_NAME))
            .catch(err=>{trace.error('home-restore-failed',err);logger.warn('Classic settings restore: '+err.message);});
    }

    _startedForeground() {
        const FOREGROUND_REASONS = ['ENTRY_POINT', 'LUM', 'BOOKMARK',
            'START_WIDGET', 'TRIGGER_HMI', 'SPEECH_COMMAND'];
        const data = this.getVisibilityData && this.getVisibilityData();
        const reason = (data && data.reason) || this.startReason;
        return FOREGROUND_REASONS.includes(reason);
    }

    /* ---- RHMI ---- */
    _setupRhmi() {
        const rhmi = this.rhmiApplication;
        this._state = rhmi.getByName(STATE_NAME);
        if (!this._state) {
            return Promise.reject(new Error(`uiDescription has no ${STATE_NAME}`));
        }
        const names = [STATUS_NAME, SETUP_NAME, DISPLAY_NAME, HUD_SIZE_NAME, HUD_SMALLER_NAME]
            .concat(Object.values(HUD_MOVE_NAMES), [HUD_CENTRE_NAME, ENABLE_NAME, DISABLE_NAME, RESTART_NAME, CAPTURE_NAME, CAPTURE_STATUS])
            .concat(ROW_NAMES, Object.keys(PAGES), EXTRA, Array.from({length:PROXIES},(_,i)=>'designProxy'+i));
        names.forEach((name) => { this._components[name] = rhmi.getByName(name); });
        const missing = names.filter((name) => !this._components[name]);
        if (missing.length) {
            return Promise.reject(new Error(`uiDescription lacks ${missing.join(', ')}`));
        }
        Object.keys(PAGES).forEach(name => this._bind(name, () => this._openPage(PAGES[name])));
        this._bind('wocModern', () => this._useModern(true));
        for(let i=0;i<PROXIES;i++){
            const name='designProxy'+i;
            this._bind(name,()=>this._design.proxyPress(i));
            this._components[name].on('focus',e=>this._design.proxyFocus(i,isTrue(e&&e.value)));
        }
        const designHost=rhmi.getByName(HOST);
        designHost.on('visible',e=>{
            const on=isTrue(e&&e.visible);
            if(on){this._sawForeground=true;this._setVisible(true);}
            this._design.hostVisible(on&&this._modern);
        });
        designHost.on('focus',e=>this._design.hostFocus(isTrue(e&&e.focus)));
        this._bind(DISPLAY_NAME, () => this._control.cycleDisplay());
        this._bind('wocQuickStartup', () => this._control.patchStatus && this._control.patchStatus.startup_mode === 'dashboard' ?
            this._control.setStartup('off') : this._control.startHudAutomatically());
        this._bind('wocStartupOn', () => this._control.startHudAutomatically());
        this._bind('wocStartupOff', () => this._control.setStartup('off'));
        this._bind('wocSizeStandard', () => this._control.setHudSize(0));
        this._bind(ENABLE_NAME, () => { if (this._control.canEnable()) this._control.enableMap(); });
        this._bind(DISABLE_NAME, () => { if (this._control.canDisable()) this._control.disableMap(); });
        this._bind(RESTART_NAME, () => this._control.requestRestart());
        this._bind('wocDisplayHud', () => this._control.setDisplay('hud'));
        this._bind('wocDisplayCluster', () => this._control.setDisplay('map'));
        this._bind('wocPresetCompact', () => this._control.setHudSize(40));
        this._bind('wocPresetBalanced', () => this._control.setHudSize(60));
        this._bind('wocPresetLarge', () => this._control.setHudSize(75));
        this._bind('wocMoveStep', () => this._control.cycleMoveStep());
        this._bind('wocOriginalColors', () => this._control.setHudStyle('hud_black_background', false));
        this._bind('wocClearBackground', () => this._control.setHudStyle('hud_black_background', true));
        this._bind('wocCorners', () => this._control.setHudStyle('hud_round_corners', !this._control.hudStyle('hud_round_corners')));
        this._bind('wocMissingCapture', () => this._openPage('ST_WOC_Capture'));
        this._bind(HUD_SIZE_NAME, () => this._control.stepHudSize(1));
        this._bind(HUD_SMALLER_NAME, () => this._control.stepHudSize(-1));
        Object.keys(HUD_MOVE_NAMES).forEach((dir) => this._bind(HUD_MOVE_NAMES[dir], () => this._control.moveHud(dir)));
        this._bind(HUD_CENTRE_NAME, () => this._control.centreHud());
        this._bind(CAPTURE_NAME, () => this._control.capture());
        // Presses also arrive as the application's raw 'userEvent'; both paths
        // land in _press, which keeps a press delivered twice to one.
        rhmi.on('userEvent', (ev) => {
            const entry = ev && ev.eventType === 'ACTION' && this._actionById[Number(ev.sourceId)];
            if (entry) {
                this._press(entry.name, entry.handler);
            }
        });
        rhmi.on('applicationStackChanged', (stack) => {
            // The app holds the foreground while the stack has a ROOT_APP slot;
            // the empty stack seen during startup is ignored.
            const keys = stack && typeof stack === 'object' ? Object.keys(stack) : [];
            if (!keys.length) {
                return;
            }
            if (Object.prototype.hasOwnProperty.call(stack, 'ROOT_APP')) {
                this._sawForeground = true;
                this._setVisible(true);
            } else if (this._sawForeground) {
                this._setVisible(false);
            }
        });
        rhmi.on('restoreHmi', () => {
            logger.info('RESTORE_HMI: re-pushing page content');
            this._written = {};
            this._render();
            this._renderLists();
        });
        const states = [this._state,designHost].concat(Object.values(PAGES).map(name => rhmi.getByName(name)));
        if (states.some(state => !state)) return Promise.reject(new Error('missing settings page'));
        states.forEach(state => state.on('visible', event => {
            if (isTrue(event && event.visible)) {
                this._sawForeground = true;
                this._setVisible(true);
                if (state !== this._state && state !== designHost) {
                    this._nativeDetailsReady = true;
                    this._render();
                    this._renderLists();
                }
            }
        }));
        return this._ensureResources(STATE_NAME).then(() => {
            logger.info(`page ready: ${names.length} components found`);
            this._render();
            this._renderLists();
        });
    }

    _useModern(wanted) {
        const on=!!wanted&&this._design.ready;
        trace.record('graphics-mode-request', 'wanted='+wanted+'; ready='+this._design.ready+'; visible='+this._visible);
        if(!this._entryUuid)return Promise.resolve();
        this._uiChange=this._uiChange.catch(()=>{}).then(()=>{
            if(this._modern===on)return this._openState(on?HOST:STATE_NAME);
            this._design.hostVisible(false);
            // Map the tile for future launches, but navigate within this running
            // app by state. Reopening its entry UUID here is rejected by the
            // affected ID7 unit after remapping (INVALID_UUID).
            const state=this.rhmiApplication.getByName(on?HOST:STATE_NAME);
            return this._ensureResources(on?HOST:STATE_NAME)
                .then(()=>{this._modern=on;this._design.proxyKey=null;return this._rhmiRequest('Map settings entry',()=>this.rhmiApplication.mapEntryState(this._entryUuid,state));})
                .then(()=>{this._render();return this._openState(on?HOST:STATE_NAME);});
        }).catch(err=>{
            trace.error('graphics-mode-failed',err);logger.warn(`modern settings: ${err&&err.message}`);
            return this._restoreNativeHome();
        });
        this._render();return this._uiChange;
    }

    _openPage(name) {
        this._render();
        return this._ensureResources(name).then(() => {
            this._nativeDetailsReady = true;
            this._written={};this._render();this._renderLists();
            return this._openState(name);
        })
            .catch(err => {
                logger.warn(`open page ${name}: ${err && err.message}`);
                this._write(STATUS_NAME, 'Page could not open; HUD and startup switches are on Home');
            });
    }

    _bind(name, handler) {
        const comp = this._components[name];
        let id = null;
        try {
            id = comp.getId();
        } catch (e) {
            id = null;
        }
        if (id !== null) {
            this._actionById[Number(id)] = { name, handler };
        }
        logger.info(`BIND OK: ${name} (id ${id})`);
        comp.on('action', () => this._press(name, handler));
    }

    _press(name, handler) {
        const now = Date.now();
        if (now - (this._lastPress[name] || 0) < PRESS_DEDUPE_MS) {
            return;
        }
        this._lastPress[name] = now;
        logger.info(`BUTTON ACTION ${name}`);
        try {
            handler();
        } catch (err) {
            logger.warn(`${name} failed: ${err && err.message}`);
        }
    }

    /* The app manager inserts the public tile from application.json and hands
     * it to the app at start; the SDK emits 'entryPointExecute' on a tap. */
    _registerEntryPoints() {
        const descriptions = (this.appDescription &&
            this.appDescription.application.entryPoints) || [];
        const ours = this.getEntryPoints().find(
            (ep) => descriptions.some((d) => d.uuid === ep.getDescription().uuid));
        if (!ours) {
            return Promise.reject(new Error('no entry point handed over by the manager'));
        }
        const description = ours.getDescription();
        this._entryUuid=description.uuid;
        // The manager already registered the tile's label/icon from application.json.
        // Redecorating it here can wait forever on older firmware.
        const attempt=(label,request)=>this._rhmiRequest(label,request).catch(err=>{
            trace.error('entry-registration-degraded',err);
            logger.warn(label+': '+err.message);
        });
        return attempt('Initialize settings entry',()=>ours.init())
            .then(()=>attempt('Map settings home',()=>this.rhmiApplication.mapEntryState(description.uuid,this._state)))
            .then(()=>attempt('Enable settings entry',()=>ours.setAvailability('ENABLED')))
            .then(()=>logger.info(`entry point ${description.name} registration attempted`));
    }

    _onEntryPointExecute(uuid) {
        trace.record('entry-event', this._startupReady ? 'ready' : 'waiting for initialization');
        if (this._shutdownPromise || !this.rhmiApplication || !uuid) {
            return Promise.resolve();
        }
        if (!this._startupReady) {
            this._pendingEntryUuid = uuid;
            return Promise.resolve();
        }
        // Some units send the same launch event twice. Share the in-flight
        // request instead of queuing another timeout for every tap/event.
        this._sawForeground = true;
        this._setVisible(true);
        if (this._entryOpen) return this._entryOpen;
        this._entryOpen = Promise.resolve().then(()=>this._design.ready ?
            this._useModern(true) : this._rhmiRequest('Open settings entry',()=>this.rhmiApplication.openEntryState(uuid)))
            .catch((err) => {
                trace.error('open-entry-failed', err);
                logger.warn(`openEntryState failed: ${err && err.message}`);
                return this._restoreNativeHome();
            }).then(()=>{this._entryOpen=null;},err=>{
                this._entryOpen=null;
                trace.error('entry-recovery-failed',err);
                logger.warn('Settings entry recovery: '+err.message);
            });
        return this._entryOpen;
    }

    /* ---- visibility ---- */
    _setVisible(visible) {
        if (this._shutdownPromise || this._visible === visible) {
            return;
        }
        this._visible = visible;
        if(!visible)this._design.hostVisible(false);
        logger.info(`page ${visible ? 'visible' : 'hidden'}`);
        this._reportVisibilityStatus(visible);
        if (visible) {
            this._control.open();
        } else {
            this._control.close();
        }
    }

    _reportVisibilityStatus(visible) {
        if (!this._initialized || !this._appStatusService) {
            return;
        }
        const reports = visible ?
            [this.registerActive(), this.registerHmiVisible()] :
            [this.unregisterHmiVisible(), this.registerInactive()];
        reports.forEach((report) => Promise.resolve(report).catch((err) =>
            logger.warn(`app status report failed: ${err && err.message}`)));
    }

    /* ---- rendering ---- */
    /* Writes text into a component's row unless it already shows it. */
    _write(name, text) {
        if (!this._nativeDetailsReady && !HOME_COMPONENTS.has(name) && !/^designProxy\d+$/.test(name)) return;
        if (this._written[name] !== text) {
            this._written[name] = text;
            Promise.resolve().then(()=>this._components[name].setValue(0, 'Text', text, 'Text'))
                .catch((err) => logger.warn(`${name} render failed: ${err && err.message}`));
        }
    }

    /* Enables a button unless it already holds that state. */
    _setEnabled(name, enabled) {
        if (!this._nativeDetailsReady && !HOME_COMPONENTS.has(name) && !/^designProxy\d+$/.test(name)) return;
        const key = `enabled:${name}`;
        if (this._written[key] !== enabled) {
            this._written[key] = enabled;
            Promise.resolve().then(()=>this._components[name].setEnabled(enabled))
                .catch((err) => logger.warn(`${name} enable failed: ${err && err.message}`));
        }
    }

    /* Shows or hides a component unless it already holds that state. */
    _setVisibleComp(name, visible) {
        if (!this._nativeDetailsReady && !HOME_COMPONENTS.has(name) && !/^designProxy\d+$/.test(name)) return;
        const key = `visible:${name}`;
        if (this._written[key] !== visible) {
            this._written[key] = visible;
            Promise.resolve().then(()=>this._components[name].setVisible(visible))
                .catch((err) => logger.warn(`${name} visibility failed: ${err && err.message}`));
        }
    }

    _render() {
        if (!this._state || !this._initialized || this._shutdownPromise) {
            return;
        }
        if(this._design)this._design.render();
        if(this._modern)return;
        this._setEnabled('wocModern',this._design.ready);
        this._write('wocModern',this._design.failureReason?'Retry graphical menu':this._design.ready?'Open modern settings':'Modern settings: MGU Renderer unavailable');
        Object.keys(PAGES).forEach(name => this._setEnabled(name, true));
        this._setEnabled('wocMissingCapture', true);
        const c = this._control;
        const target = c.displayTarget();
        this._write('startupStatus', c.startupText());
        this._write('startupResult', c.startupResult());
        this._setEnabled('wocStartupOn', c.canChangeDisplay() && c.canChangeStartup());
        const startupOn = c.patchStatus && c.patchStatus.startup_mode === 'dashboard';
        this._write('wocQuickStartup', startupOn ? 'HUD auto-start trial: ON (press to turn off)' : 'Enable HUD auto-start (trial)');
        this._setEnabled('wocQuickStartup', c.canChangeStartup() && (startupOn || c.canChangeDisplay()));
        this._setEnabled('wocStartupOff', c.canChangeStartup());
        const width = c.hudWidth();
        const size = width === null ? 'Waiting for tool' : width === 0 ? 'Standard' : `${width}%`;
        const pos = c.hudOffset();
        const position = !pos ? 'Waiting for tool' : !pos[0] && !pos[1] ? 'Centered' :
            [pos[0] ? `${Math.abs(pos[0])} px ${pos[0] > 0 ? 'right' : 'left'}` : '',
                pos[1] ? `${Math.abs(pos[1])} px ${pos[1] > 0 ? 'down' : 'up'}` : ''].filter(Boolean).join(' / ');
        const rs = c.renderStatus;
        const concise = c.patchStatus && c.patchStatus.state === 'patched' && !c.pending() ?
            rs && rs.state === 'showing' ? `Map active on ${target === 'hud' ? 'HUD' : 'cluster'}` :
                rs && rs.state === 'frozen' ? 'Map paused — reconnect CarPlay' : 'Waiting for a CarPlay map' : c.statusText();
        this._write(STATUS_NAME, this._design.failureReason ? 'Graphical menu unavailable. Select Retry graphical menu.' : c._busy() ? c.settingsNotice() : c._startupPending ? c.startupResult() :
            startupOn && rs && rs.state === 'idle' ? c.startupResult() : concise);
        this._write('supportStatus', c.statusText());
        this._write('setupStatus', c.statusText());
        this._write(SETUP_NAME, target === 'hud' ? 'HUD selected; the tools run when this app is closed' : SETUP_TEXT);
        const display = target === 'hud' ? 'Windshield HUD' : target === 'map' ? 'Instrument cluster' : 'Waiting for tool';
        this._write(DISPLAY_NAME, target === 'hud' ? 'HUD selected — switch to instrument cluster' : 'Use windshield HUD');
        this._setEnabled(DISPLAY_NAME, c.canChangeDisplay());
        this._write('displayStatus', `Selected: ${display}`);
        this._write('displayHint', c.settingsNotice());
        this._setEnabled('wocDisplayHud', c.canChangeDisplay());
        this._setEnabled('wocDisplayCluster', c.canChangeDisplay());
        this._write('wocSizePage', `Map size: ${size}`);
        this._write('wocPositionPage', `Map position: ${position}`);
        this._write('sizeStatus', `Current map width: ${size}`);
        this._write('positionStatus', position);
        this._write('horizontalStatus', position);
        this._write('verticalStatus', position);
        this._write('presetStatus', `Current map width: ${size}`);
        const hint = target !== 'hud' ? 'Select HUD on the main page to adjust the map' :
            width === null ? 'This map tool does not report HUD size' : c.settingsNotice();
        this._write('sizeNotice', target === 'hud' && width !== null && !c._busy() && !c._notice ?
            'Changes the map rectangle, not street zoom' : hint);
        this._write('positionNotice', target === 'hud' && !pos ? 'This map tool does not report HUD position' :
            target === 'hud' && !c._busy() && !c._notice ? 'Moves the map; BMW gauges stay in place' : hint);
        this._write('horizontalHint', hint);
        this._write('verticalHint', hint);
        this._write('presetNotice', c._busy() || c._notice ? c.settingsNotice() : 'Map size changes the rectangle, not street zoom');
        this._write('wocMoveStep', `Adjustment: ${c.moveStep === 10 ? 'Fine (10 px)' : 'Coarse (40 px)'}`);
        Object.keys(HUD_MOVE_NAMES).forEach(dir => this._write(HUD_MOVE_NAMES[dir], `Move ${dir}  ${c.moveStep} px`));
        ['wocPresetCompact', 'wocPresetBalanced', 'wocPresetLarge'].forEach(n => this._setEnabled(n, c.canChangeHudSize()));
        const background = c.hudStyle('hud_black_background'), corners = c.hudStyle('hud_round_corners');
        this._write('appearanceStatus', c.patchStatus && c.patchStatus.startup_mode === 'dashboard' && rs && rs.state === 'idle' ? 'Dashboard trial uses original colors and square corners' :
            rs && rs.hud_style_available === false ? 'Appearance unavailable: HUD scaling is off' :
            background === null || !(c.patchStatus && c.patchStatus.hud_style) ? 'Appearance needs the updated map tool' :
            background ? 'Background: clear dark areas' : 'Background: original map colors');
        this._write('wocCorners', corners === null ? 'Corners: unavailable' : `Corners: ${corners ? 'Rounded' : 'Square'}`);
        this._setEnabled('wocOriginalColors', c.canChangeStyle('hud_black_background'));
        this._setEnabled('wocClearBackground', c.canChangeStyle('hud_black_background'));
        this._setEnabled('wocCorners', c.canChangeStyle('hud_round_corners'));
        this._write('appearanceNotice', target !== 'hud' ? 'Select HUD to change its appearance' :
            c._busy() || c._notice ? c.settingsNotice() : 'Clear background can hide faint roads');
        this._write(HUD_SIZE_NAME, 'Larger  +5%');
        this._write(HUD_SMALLER_NAME, 'Smaller  -5%');
        this._setEnabled(HUD_SIZE_NAME, c.canHudLarger());
        this._setEnabled(HUD_SMALLER_NAME, c.canHudSmaller());
        this._setEnabled('wocSizeStandard', c.canChangeHudSize());
        Object.values(HUD_MOVE_NAMES).forEach(n => this._setEnabled(n, c.canMoveHud()));
        this._write(HUD_CENTRE_NAME, 'Center map');
        this._setEnabled(HUD_CENTRE_NAME, c.canMoveHud());
        this._write(CAPTURE_NAME, this._control.captureButtonText());
        this._write(CAPTURE_STATUS, this._control.captureText());
        const patch = this._control.connectedPatch();
        /* While a reboot is underway no patch operation should start. */
        const restarting = this._control.restartRequested();
        const enable = this._control.canEnable();
        const disable = this._control.canDisable();
        this._setVisibleComp(ENABLE_NAME, enable);
        this._setEnabled(ENABLE_NAME, enable);
        this._setVisibleComp(DISABLE_NAME, disable);
        this._setEnabled(DISABLE_NAME, disable);
        this._setEnabled(CAPTURE_NAME, patch && !restarting && this._control.captureState.state !== 'closing');
        /* The restart button appears only while a patch is written and waiting
         * for a head-unit start; it is disabled once pressed so one press does
         * one reboot. On units where carplay restarts at once it never shows. */
        const needsRestart = this._control.restartNeeded();
        this._setVisibleComp(RESTART_NAME, needsRestart);
        this._setEnabled(RESTART_NAME, needsRestart && patch && !restarting);
    }

    _scheduleLists() {
        if (!this._listTimer) {
            this._listTimer = setTimeout(() => {
                this._listTimer = null;
                this._renderLists();
            }, LIST_RENDER_MS);
        }
    }

    _renderLists() {
        if (!this._state || !this._initialized || this._shutdownPromise || this._modern || !this._nativeDetailsReady) {
            return;
        }
        /* Rows are only written, never hidden: on this HMI a row hidden at
         * run time leaves the page without its other rows (mgu-emulator). */
        const rows = this._control.rows();
        ROW_NAMES.forEach((name, i) => this._write(name, oneRow(rows[i] || '')));
    }

    /* ---- shutdown ---- */
    _handleShutdown(reason) {
        trace.record('shutdown-requested');
        if (this._shutdownPromise) {
            return this._shutdownPromise;
        }
        logger.info(`robertn_waze_cluster shutdown: ${JSON.stringify(reason)}`);
        clearTimeout(this._listTimer);
        this._design.close();
        this._control.close();
        clearImmediate(this._optionalTimer);
        if(this._profiles)this._profiles.stop();
        this._shutdownPromise = Promise.resolve()
            .then(() => this.destroyBundles().catch((err) =>
                logger.info(`destroyBundles: ${err && err.message}`)))
            .then(() => process.exit(0));
        return this._shutdownPromise;
    }
}

trace.record('constructor-begin');
const app = new WazeClusterApp();
trace.record('start-called');
app.start().catch((err) => {
    trace.error('start-failed', err);
    /* Stays resident so the manager can stop or restart it. */
    logger.error(`robertn_waze_cluster failed to start: ${err && err.message}`);
});
