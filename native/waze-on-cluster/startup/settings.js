// SPDX-License-Identifier: MPL-2.0
'use strict';
const fs = require('fs');
const path = require('path');
const FILE = process.env.WOC_STARTUP_MODE || path.join(path.dirname(process.env.WOC_LOCAL_CONF ||
    '/var/opt/waze-on-cluster/waze-on-cluster.local.conf'), 'startup-mode');
const STATUS = process.env.WOC_STARTUP_STATUS || '/run/waze-on-cluster/startup.json';
function readMode() {
    try { return fs.readFileSync(FILE, 'utf8').trim() === 'dashboard' ? 'dashboard' : 'off'; }
    catch (e) { return 'off'; }
}
function saveMode(mode) {
    if (mode !== 'off' && mode !== 'dashboard') throw new Error('Unknown startup mode');
    fs.writeFileSync(FILE + '.tmp', mode + '\n', {mode:420});
    fs.renameSync(FILE + '.tmp', FILE);
}
function writeStatus(state) {
    try {
        fs.writeFileSync(STATUS + '.tmp', JSON.stringify({state:state, at:Date.now()}) + '\n', {mode:420});
        fs.renameSync(STATUS + '.tmp', STATUS);
    } catch (e) {} // The map tool may not have created its runtime directory yet.
}
function readStatus(now) {
    if (readMode() === 'off') return 'Off';
    try {
        const s = JSON.parse(fs.readFileSync(STATUS, 'utf8'));
        if (Number.isFinite(s.at) && now >= s.at && now - s.at < 4000 && typeof s.state === 'string')
            return s.state.slice(0,90);
    } catch (e) {}
    return 'Waiting for startup helper';
}
module.exports = {readMode, saveMode, writeStatus, readStatus};
