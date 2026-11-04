// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const assert = require('assert');
const { SettingsControl } = require('../src/settings_control.js');
const { FakeRender, FakePatch } = require('./fakes.js');
const render = new FakeRender(`/tmp/hud-r-${process.pid}`);
const patch = new FakePatch(`/tmp/hud-p-${process.pid}`);
const c = new SettingsControl({renderPath: render.path, patchPath: patch.path,
    pendingPath: '/nonexistent/hud-test', ackMs: 120, retryMs: 20});
const wait = ms => new Promise(r => setTimeout(r, ms));
async function until(fn) {
    for (let n = 0; n < 150; n++) { if (fn()) return; await wait(10); }
    throw new Error('condition timed out');
}
let reply = true, reject = false;
patch.on('command', m => {
    if (!reply) return;
    const ev = {target:'target-reply', 'hud-size':'hud-size-reply', 'hud-pos':'hud-pos-reply', 'hud-style':'hud-style-reply'}[m.cmd];
    if (ev) patch._broadcast(Object.assign({}, m, {ev, ok: !reject}));
});
(async () => {
    try {
        await render.listen(); await patch.listen();
        patch.announce('patched', 'high', null); render.stream(true);
        await until(() => render.state === 'showing');
        c.open(); await until(() => c.canChangeDisplay());
        assert(c.setDisplay('hud'));
        await until(() => !c._busy());
        assert.equal(c.displayTarget(), 'hud');
        assert.equal(c.settingsNotice(), 'Applied and saved');
        assert(patch.received.some(m => m.cmd === 'target' && m.target === 'hud'));
        console.log('ok HUD selection updates renderer and requests persistent startup choice');

        reply = false;
        assert(c.setHudSize(65));
        assert.notEqual(c.hudWidth(), 65, 'writing to socket is not confirmation');
        assert(!c.setHudSize(70), 'no overlapping setting requests');
        await until(() => c.hudWidth() === 65 && !c._busy());
        assert.match(c.settingsNotice(), /saving was not confirmed/);
        console.log('ok live success without save acknowledgement is not called saved');

        reply = true; reject = true;
        assert(c.setHudSize(70)); await until(() => !c._busy());
        assert.match(c.settingsNotice(), /Could not save/);
        reject = false;
        assert(c.setHudSize(75)); await until(() => !c._busy());
        assert.equal(c.hudWidth(), 75);
        assert.equal(c.settingsNotice(), 'Applied and saved');
        console.log('ok failed save is visible; a later successful retry clears it');

        const realCommand = render._onCommand.bind(render);
        render._onCommand = () => {}; // older tool silently ignores HUD control
        assert(c.setHudSize(30)); await until(() => !c._busy());
        assert.equal(c.hudWidth(), 75, 'never display an unconfirmed 30%');
        assert.match(c.settingsNotice(), /did not confirm applying/);
        render._onCommand = realCommand;
        console.log('ok saved-only change times out and keeps the actual reported size');

        c.moveHud('left'); await until(() => !c._busy());
        assert.deepEqual(c.hudOffset(), [-10,0]);
        c.centreHud(); await until(() => !c._busy());
        assert.deepEqual(c.hudOffset(), [0,0]);
        assert.equal(c.setHudSize(86), false);
        assert.equal(c.setHudSize(NaN), false);
        assert.equal(c.setDisplay('map+hud'), false);
        console.log('ok movement, centering, limits and single-display choices');
        c.cycleMoveStep(); assert.equal(c.moveStep,40);
        c.moveHud('right'); await until(() => !c._busy());
        assert.deepEqual(c.hudOffset(),[40,0]);
        c.cycleMoveStep();c.moveHud('up');await until(() => !c._busy());
        assert.deepEqual(c.hudOffset(),[40,-10]);
        assert.equal(c.moveHud('unknown'),false);
        console.log('ok fine/coarse movement changes real offsets without inventing zoom');

        assert.equal(c.setHudStyle('hud_black_background',false),false);
        render.styleSupported=true;patch.styleSupported=true;
        render._broadcast(render._status());patch._broadcast(patch._status());
        await until(() => c.canChangeStyle('hud_black_background'));
        assert(c.setHudStyle('hud_black_background',false));
        await until(() => !c._busy());
        assert.equal(c.hudStyle('hud_black_background'),false);
        assert.equal(c.settingsNotice(),'Applied and saved');
        assert(c.setHudStyle('hud_round_corners',false));await until(() => !c._busy());
        assert.equal(c.hudStyle('hud_round_corners'),false);
        assert.equal(c.setHudStyle('unknown',true),false);
        assert.equal(c.setHudStyle('hud_round_corners','false'),false);
        reply=false;
        assert(c.setHudStyle('hud_black_background',true));await until(() => !c._busy());
        assert.match(c.settingsNotice(),/saving was not confirmed/);
        reply=true;
        console.log('ok appearance requires compatible tool, live status and save acknowledgement');
        c._onRender(Object.assign({},render._status(),{hud_style_available:false}));
        assert.equal(c.canChangeStyle('hud_black_background'),false);
        assert.equal(c.setHudStyle('hud_round_corners',true),false);
        console.log('ok disabled HUD processing cannot expose ineffective appearance buttons');

        c._onRender({ev:'status', state:'showing', target:'hud'});
        assert.equal(c.canChangeHudSize(), false);
        assert.equal(c.canMoveHud(), false);
        console.log('ok tools without HUD status fields cannot show pretend adjustments');
        assert.equal(c.setStartup('dashboard'),false);
        c._onPatch({ev:'status',state:'patched',startup_trial:true,startup_mode:'off',startup_state:'Off'});
        assert(c.setStartup('dashboard'));assert(!c.setStartup('off'));
        await until(()=>!c._startupPending);
        assert.match(c.startupResult(),/No save confirmation/);
        assert(c.setStartup('dashboard'));
        c._onPatch({ev:'startup-mode-reply',ok:false,mode:'off'});
        assert.match(c.startupResult(),/Could not save/);
        assert(c.setStartup('dashboard'));
        c._onPatch({ev:'startup-mode-reply',ok:true,mode:'off'});assert(c._startupPending);
        c._onPatch({ev:'startup-mode-reply',ok:true,mode:'dashboard'});assert(!c._startupPending);
        c._onPatch({ev:'status',state:'patched',startup_trial:true,startup_mode:'dashboard',startup_state:'Waiting for CarPlay ownership'});
        assert.match(c.startupText(),/enabled/);assert.match(c.startupResult(),/Waiting for CarPlay/);
        assert(!c.setStartup('anything'));
        console.log('ok startup capability, timeout, failed save, mismatched reply and waiting status');
        // A real socket exercise: shortcut starts from cluster and only enables
        // startup after both live HUD and persistence have acknowledged.
        const oldStatus=patch._status.bind(patch);
        patch._status=()=>Object.assign(oldStatus(),{startup_trial:true,startup_mode:'off',startup_state:'Off'});
        await wait(30); // Drain earlier intentionally unmatched command/reply cases.
        c._onPatch(patch._status());
        c._onRender(Object.assign({},render._status(),{target:'map'}));
        const starts=()=>patch.received.filter(m=>m.cmd==='startup-mode').length;
        let before=starts();reply=false;
        assert(c.startHudAutomatically());
        await until(()=>!c._busy());assert.equal(starts(),before,'unconfirmed target must not enable startup');
        reply=true;reject=true;
        assert(c.startHudAutomatically());await until(()=>!c._busy());assert.equal(starts(),before);
        reject=false;
        assert(c.startHudAutomatically());assert.equal(starts(),before);
        await until(()=>starts()===before+1);
        assert.equal(c.displayTarget(),'hud');assert(c._startupPending);
        c._onPatch({ev:'startup-mode-reply',ok:true,mode:'dashboard'});
        assert(!c._startupPending);
        console.log('ok one-press HUD startup waits for saved/live target; failed saves cannot enable it');
        patch._status=()=>Object.assign(oldStatus(),{restore_defaults:true,startup_trial:true});
        c._onPatch(patch._status());
        let restoreResult={ok:true},studioCalls=0;
        patch.on('command',m=>{if(m.cmd==='restore-defaults'){c._onRender(Object.assign({},render._status(),{bmw_defaults:true}));patch._broadcast(Object.assign({ev:'restore-defaults-reply'},restoreResult));}});
        const studio={ready:()=>Promise.resolve(),send:async cmd=>{assert.equal(cmd,'off');studioCalls++;}};
        assert(await c.restoreDefaults(studio));assert.equal(studioCalls,1);assert.match(c.settingsNotice(),/software remains installed/);
        restoreResult={ok:true,pending:'revert'};assert(await c.restoreDefaults(studio));assert.match(c.settingsNotice(),/Restart head unit/);
        restoreResult={ok:false,reason:'Patch backup mismatch'};assert(!await c.restoreDefaults(studio));assert.match(c.settingsNotice(),/incomplete.*backup mismatch/);assert.equal(studioCalls,3,'cluster off attempted even when map restore fails');
        restoreResult={ok:true};assert(!await c.restoreDefaults({ready:()=>Promise.reject(Error('Cluster offline'))}));assert.match(c.settingsNotice(),/incomplete.*Cluster offline/);
        c._onPatch(Object.assign(patch._status(),{restore_defaults:false}));assert(!c.canRestoreDefaults());
        console.log('ok global restore awaits both helpers, handles deferred restart and partial failure, and gates old tools');
        c.close(); assert.equal(c._busy(), false);
        console.log('all settings checks passed');
    } finally { c.close(); await render.close(); await patch.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
