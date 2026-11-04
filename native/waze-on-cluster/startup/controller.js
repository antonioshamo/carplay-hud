// SPDX-License-Identifier: MPL-2.0
'use strict';
/* Route-free mirroring is conditional on a positively identified foreground
 * CarPlay Dashboard. Navigation state is deliberately not an input. No output
 * on missing ownership data, stale source state, failed capture or handoff.
 * The physical Dashboard classifier still requires calibration on the car. */
class MirrorController {
    constructor(o) {
        this.o = o;
        this.enabled = false;
        this.owner = null;
        this.source = null;
        this.sourceAt = 0;
        this.rendererReady = false;
        this.visible = false;
        this.epoch = 0;
        this.lastFrame = 0;
        this.inFlight = false;
        this.closed = false;
        this.reason = 'Waiting for CarPlay ownership';
    }
    ownerChanged(owner) {
        const next = owner === 'PROJECTED' ? owner : owner === 'NATIVE' ? owner : null;
        if(this.owner === next)return;
        this.owner = next;
        this.invalidate('CarPlay screen changed');
    }
    sourceChanged(status, at) {
        const before = this.allowed();
        this.source = status;
        this.sourceAt = at;
        if (!this.allowed()) this.invalidate(this.blockReason());
        else if (!before) this.epoch++;
    }
    rendererChanged(ready) {
        this.rendererReady = ready === true;
        this.invalidate(ready ? 'Waiting for a fresh map frame' : 'Renderer disconnected');
    }
    setEnabled(enabled) {
        if(this.enabled === (enabled === true))return;
        this.enabled = enabled === true;
        this.invalidate(enabled ? 'Waiting for a fresh map frame' : 'Mirror off');
    }
    blockReason() {
        const now = this.o.now();
        if (this.closed) return 'Mirror stopped';
        if (!this.enabled) return 'Mirror off';
        if (this.owner === null) return 'Waiting for CarPlay event; reopen CarPlay';
        if (this.owner !== 'PROJECTED') return 'Open CarPlay Dashboard on the center screen';
        if (!this.rendererReady) return 'Waiting for HUD renderer';
        if (!this.source || !Number.isFinite(this.sourceAt) || now < this.sourceAt || now - this.sourceAt > 2500)
            return 'Waiting for fresh map-tool status';
        if (this.source.target !== 'hud') return 'Select windshield HUD in CarPlay HUD';
        if (this.source.state !== 'idle') return 'Normal map stream: ' + this.source.state;
        return '';
    }
    allowed() { return !this.blockReason(); }
    hide(reason) {
        this.reason = reason;
        if (this.visible) this.o.hide();
        this.visible = false;
        this.lastFrame = 0;
    }
    invalidate(reason) { this.epoch++; this.hide(reason); }
    watchdog() {
        const blocked = this.blockReason();
        if (blocked) this.invalidate(blocked);
        else if (this.visible && this.o.now() - this.lastFrame > 750) this.invalidate('Waiting for a fresh map frame');
    }
    async tick() {
        if (this.inFlight || !this.allowed()) return false;
        const token = this.epoch;
        this.inFlight = true;
        try {
            const frame = await this.o.capture();
            if (this.closed || token !== this.epoch || !this.allowed()) return false;
            if (!this.o.isDashboard(frame)) { this.hide('CarPlay Dashboard map is not visible'); return false; }
            const pixels = this.o.convert(frame);
            if (token !== this.epoch || !this.allowed()) return false;
            // A rejected write never makes a stale or empty layer visible.
            if (this.o.present(pixels) !== true) { this.hide('Renderer did not accept the frame'); return false; }
            this.lastFrame = this.o.now();
            this.visible = true;
            this.reason = 'Mirroring CarPlay Dashboard';
            return true;
        } catch (e) {
            if (!this.closed) this.invalidate('Capture unavailable');
            return false;
        } finally { this.inFlight = false; }
    }
    close() { this.closed = true; this.invalidate('Mirror stopped'); }
}
module.exports = { MirrorController };
