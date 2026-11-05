// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
// Keep the stock donor runner intact. Record entry into our bundle before
// loading SDK modules, so an SDK/import/constructor failure leaves evidence.
const trace = require('./startup_trace.js');
trace.begin();
// Record asynchronous failures before the stock SDK's existing exit handler.
process.prependListener('uncaughtException', error => trace.error('uncaught-exception', error));
process.prependListener('unhandledRejection', error => trace.error('unhandled-rejection', error));
process.once('exit', code => trace.record('process-exit', code));
try {
    require('./robertn_waze_cluster.js');
    trace.record('entry-loaded');
} catch (error) {
    trace.error('entry-failed', error);
    throw error;
}
