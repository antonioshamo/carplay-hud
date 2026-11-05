// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const assert = require('assert');
const { SettingsControl } = require('../src/settings_control.js');
for (const order of ['render-first', 'patch-first']) {
    const c = new SettingsControl({pendingPath: '/nonexistent/hud-test'});
    c.connectedRender = () => true;
    c.connectedPatch = () => true;
    const render = {ev:'status', state:'showing', target:'hud', hud_width_pct:60,
        hud_x:0, hud_y:0, hud_style_available:true, hud_black_background:true};
    const patch = {ev:'status', state:'patched', hud_style:true, startup_mode:'off'};
    // The app re-renders synchronously on each helper event, including before
    // the second helper has supplied capabilities. Reproduce the real crash.
    c.on('change', () => {
        assert.doesNotThrow(() => c.canChangeStyle('hud_black_background'));
        if (!c.renderStatus || !c.patchStatus) {
            assert.strictEqual(c.canChangeDisplay(), false);
            assert.strictEqual(c.setDisplay('hud'), false);
            assert.strictEqual(c.setHudStyle('hud_black_background', false), false);
        }
    });
    if (order === 'render-first') { c._onRender(render); c._onPatch(patch); }
    else { c._onPatch(patch); c._onRender(render); }
    assert.strictEqual(c.canChangeStyle('hud_black_background'), true);
    c.patch.emit('close');
    c._onRender(render);
    assert.strictEqual(c.canChangeDisplay(), false);
    c.patch.emit('connect');
    c._onRender(render);
    c._onPatch(patch);
    assert.strictEqual(c.canChangeStyle('hud_black_background'), true);
    c.close();
    console.log('ok helper startup and reconnect: ' + order);
}
