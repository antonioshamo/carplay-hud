// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
// Small, private app-owned launch record. No SDK, DLT, network, process
// control or settings access. Logging failures never block the app.
const fs = require('fs');
const LIMIT = 65536;
function redact(value) {
    return String(value).replace(/\b(?:https?|wss?):\/\/[^\s<>"']+/gi, '[url]')
        .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[email]')
        .replace(/\b[A-HJ-NPR-Z0-9]{17}\b/gi, '[vehicle-id]')
        .replace(/\b(?:gh[pousr]_|github_pat_)[A-Za-z0-9_]+/g, '[token]')
        .replace(/\bBearer\s+\S+/gi, 'Bearer [redacted]')
        .replace(/\b(token|secret|password|authorization|latitude|longitude|lat|lon|vin)\b["']?\s*[:=]\s*["']?[^\s,;}]+/gi, '$1=[redacted]')
        .replace(/[\x00-\x1f\x7f]+/g, ' ').slice(0, 1000);
}
function create(file, io) {
    io = io || fs;
    let bytes = 0, lines = 0, enabled = false;
    function write(stage, detail) {
        if (!enabled || lines >= 64) return;
        let fd;
        try {
            const line = new Date().toISOString() + ' startup ' + stage +
                (detail === undefined ? '' : ': ' + redact(detail)) + '\n';
            const size = Buffer.byteLength(line);
            if (bytes + size > LIMIT) return;
            fd = io.openSync(file, fs.constants.O_WRONLY | fs.constants.O_APPEND | fs.constants.O_NOFOLLOW);
            const stat = io.fstatSync(fd);
            if (!stat.isFile() || stat.size + size > LIMIT) return;
            io.writeSync(fd, line); bytes += size; lines++;
        } catch (e) { enabled = false; }
        finally { if (fd !== undefined) { try { io.closeSync(fd); } catch (e) {} } }
    }
    function begin() {
        let fd;
        try {
            if (!file) return;
            fd = io.openSync(file, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_NOFOLLOW, 0o600);
            if (!io.fstatSync(fd).isFile()) return;
            io.fchmodSync(fd, 0o600);
            io.ftruncateSync(fd, 0);
            bytes = 0; lines = 0; enabled = true;
        } catch (e) { enabled = false; }
        finally { if (fd !== undefined) { try { io.closeSync(fd); } catch (e) {} } }
        write('bundle-entered', 'Node ' + process.version + '; pid ' + process.pid);
    }
    return {begin, record: write, error(stage, error) {
        try { write(stage, error && (error.stack || error.message) || String(error)); } catch (e) {}
    }};
}
const uid = process.getuid && process.getuid();
const file = process.platform === 'linux' && Number.isInteger(uid) && uid >= 12202 && uid <= 65534 ?
    '/var/opt/public/oap/oap_' + uid + '/data/hud-startup.log' : null;
const trace = create(file);
module.exports = trace;
module.exports.create = create;
module.exports.redact = redact;
