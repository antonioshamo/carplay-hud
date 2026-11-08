// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const { WazeClusterControl } = require('./waze_cluster_control.js');

/* A setting is confirmed in two places: the live renderer and the saved
 * preference. A socket write alone proves neither. Keep the shown values
 * authoritative, and bound the wait so an incompatible tool is visible. */
class SettingsControl extends WazeClusterControl {
    constructor(options) {
        super(options);
        this._changes = {};
        this._notice = '';
        this._ackMs = (options && options.ackMs) || 4000;
        this.moveStep = 10;
        this._startupPending = null;
        this._startupNote = '';
        this._profileSync = null;
    }
    beginProfileSync() {
        if(this._profileSync || this._restoring || this._busy() || this._startupPending || this.pending() || this.restartRequested() || (this.patchStatus && this.patchStatus.state === 'busy'))return null;
        const token={};this._profileSync=token;this.emit('change');return token;
    }
    endProfileSync(token) {
        if(this._profileSync!==token)return;
        this._profileSync=null;this.emit('change');
    }
    canRestoreDefaults() { return this.connectedPatch() && this.patchStatus && this.patchStatus.restore_defaults === true && !this._profileSync && !this._restoring && !this._busy() && !this._startupPending && !this.pending() && this.patchStatus.state !== 'busy'; }
    async restoreDefaults(studio) {
        if(!this.canRestoreDefaults())return false;
        this._restoring=true;this._notice='Restoring HUD, cluster and startup effects...';this.emit('change');
        const map=new Promise((resolve,reject)=>{
            const timer=setTimeout(()=>{this._restoreReply=null;reject(Error('Map restore timed out; result unknown'));},60000);
            this._restoreReply=m=>{clearTimeout(timer);this._restoreReply=null;m.ok?resolve(m):reject(Error(m.reason||'Map restore failed'));};
            this.patch.send({cmd:'restore-defaults'});
        });
        const tasks=[map.then(async result=>{await this._waitForDefaults();return result;}),studio.ready().then(()=>studio.send('off',{}))];
        const results=await Promise.all(tasks.map(p=>p.then(value=>({ok:true,value}),error=>({ok:false,error}))));
        this._restoring=false;
        const errors=results.filter(r=>!r.ok).map(r=>r.error.message);
        this._notice=errors.length?'Restore incomplete: '+errors.join(' / '):results[0].value.pending?
            'Custom displays off. Restart head unit to finish BMW defaults.':'BMW displays restored. Custom software remains installed.';
        this.emit('change');return errors.length===0;
    }
    _waitForDefaults() {
        const confirmed=()=>this.connectedRender()&&this.renderStatus&&this.renderStatus.bmw_defaults===true;
        if(confirmed())return Promise.resolve();
        return new Promise((resolve,reject)=>{
            const done=()=>{if(confirmed()){clearTimeout(timer);this.removeListener('change',done);resolve();}};
            const timer=setTimeout(()=>{this.removeListener('change',done);reject(Error('Restore saved; live map shutdown not confirmed'));},5000);
            this.on('change',done);done();
        });
    }
    canEnable() { return !this._profileSync && !this._restoring && super.canEnable(); }
    canDisable() { return !this._profileSync && !this._restoring && super.canDisable(); }
    canChangeStartup() {
        return this.connectedPatch() && this.patchStatus && this.patchStatus.startup_trial === true &&
            !this._profileSync && !this._restoring && !this._busy() && !this._startupPending && !this.pending() && this.patchStatus.state !== 'busy' && !this.restartRequested();
    }
    setStartup(mode) {
        if(!this.canChangeStartup() || !['off','dashboard'].includes(mode))return false;
        this._startupNote='Saving startup preference...';
        const pending={mode:mode};
        pending.timer=setTimeout(()=>{
            if(this._startupPending!==pending)return;
            this._startupPending=null;this._startupNote='No save confirmation; check the tool';this.emit('change');
        },this._ackMs);
        this._startupPending=pending;
        this.patch.send({cmd:'startup-mode',mode:mode});this.emit('change');return true;
    }
    // One press selects AND confirms the saved HUD target before enabling capture.
    startHudAutomatically() {
        if (!this.canChangeStartup() || !this.canChangeDisplay()) return false;
        return this._request('target', 'hud', {cmd:'start', target:'hud'}, {cmd:'target', target:'hud'},
            () => this.setStartup('dashboard'));
    }
    startupText() {
        if(!this.patchStatus || !this.patchStatus.startup_trial)return 'Needs the updated map tool';
        return this.patchStatus.startup_mode==='dashboard' ? 'Dashboard experiment: enabled' : 'Dashboard experiment: off';
    }
    startupResult() {
        return this._startupNote || (this.patchStatus && this.patchStatus.startup_state) || 'Waiting for startup helper';
    }
    displayTarget() {
        const t = this.renderStatus && this.renderStatus.target;
        return t === 'sail' ? 'map' : t || null;
    }
    hudWidth() {
        const n = this.renderStatus && this.renderStatus.hud_width_pct;
        return typeof n === 'number' && isFinite(n) ? n : null;
    }
    hudOffset() {
        const s = this.renderStatus;
        return s && Number.isFinite(s.hud_x) && Number.isFinite(s.hud_y) ? [s.hud_x, s.hud_y] : null;
    }
    canChangeDisplay() {
        // Both sockets can connect before either helper sends its first status.
        // Do not render enabled settings against an unknown patch capability.
        return this.connectedRender() && this.connectedPatch() && !!this.renderStatus && !!this.patchStatus && !this.patchStatus.bmw_defaults &&
            !this._profileSync && !this._restoring && !this.restartRequested() && !this.pending() &&
            !(this.patchStatus && this.patchStatus.state === 'busy') && !this._busy();
    }
    _busy() { return !!(this._changes && Object.keys(this._changes).length); }
    canChangeHudSize() {
        return this.canChangeDisplay() && this.displayTarget() === 'hud' && this.hudWidth() !== null;
    }
    canMoveHud() { return this.canChangeHudSize() && this.hudOffset() !== null; }
    setDisplay(target) {
        if (!this.canChangeDisplay() || !['hud', 'map'].includes(target)) return false;
        return this._request('target', target, {cmd: 'start', target}, {cmd: 'target', target});
    }
    // Reconfirm the displayed settings without re-acquiring or switching scenes.
    applyCurrent() {
        if (!this.canChangeDisplay()) return false;
        const target=this.displayTarget(),size=this.hudWidth(),pos=this.hudOffset();
        const styles=['hud_black_background','hud_round_corners'].filter(k=>this.canChangeStyle(k)).map(k=>[k,this.hudStyle(k)]);
        if(!['hud','map'].includes(target))return false;
        const queue=[['target',target,null,{cmd:'target',target}]];
        if(target==='hud'){
            if(size!==null)queue.push(['size',size,{cmd:'hud',hud_width_pct:String(size)},{cmd:'hud-size',hud_width_pct:size}]);
            if(pos)queue.push(['position',pos,{cmd:'hud',hud_x:String(pos[0]),hud_y:String(pos[1])},{cmd:'hud-pos',hud_x:pos[0],hud_y:pos[1]}]);
            styles.forEach(p=>queue.push([p[0],p[1],{cmd:'hud-style',setting:p[0],value:p[1]?'1':'0'},{cmd:'hud-style',setting:p[0],value:p[1]}]));
        }
        const next=()=>{const a=queue.shift();if(a)this._request(a[0],a[1],a[2],a[3],next);};next();
        return true;
    }
    useIndependentHud() {
        if(!this.canChangeStartup()||!this.canChangeDisplay())return false;
        return this._request('target','hud',{cmd:'start',target:'hud'},{cmd:'target',target:'hud'},()=>this.setStartup('off'));
    }
    cycleDisplay() { return this.setDisplay(this.displayTarget() === 'hud' ? 'map' : 'hud'); }
    setHudSize(pct) {
        if (!this.canChangeHudSize() || !Number.isInteger(pct) || (pct !== 0 && (pct < 30 || pct > 85))) return false;
        return this._request('size', pct, {cmd: 'hud', hud_width_pct: String(pct)}, {cmd: 'hud-size', hud_width_pct: pct});
    }
    _setHudSize(pct) { return this.setHudSize(pct); }
    cycleHudSize() { return this.setHudSize(0); }
    cycleMoveStep() {
        this.moveStep = this.moveStep === 10 ? 40 : 10;
        this.emit('change');
    }
    moveHud(dir) {
        if (!this.canMoveHud()) return false;
        const delta = {left: [-1,0], right: [1,0], up: [0,-1], down: [0,1]}[dir];
        if (!delta) return false;
        const p = this.hudOffset();
        return this._setHudPos(Math.max(-400, Math.min(400, p[0] + delta[0] * this.moveStep)),
            Math.max(-400, Math.min(400, p[1] + delta[1] * this.moveStep)));
    }
    hudStyle(setting) {
        if (!['hud_black_background', 'hud_round_corners'].includes(setting)) return null;
        const value = this.renderStatus && this.renderStatus[setting];
        return typeof value === 'boolean' ? value : null;
    }
    canChangeStyle(setting) {
        return this.canChangeDisplay() && this.displayTarget() === 'hud' &&
            !(this.patchStatus.startup_mode === 'dashboard' && this.renderStatus.state === 'idle') &&
            this.patchStatus.hud_style === true && this.renderStatus.hud_style_available === true && this.hudStyle(setting) !== null;
    }
    setHudStyle(setting, value) {
        if (!this.canChangeStyle(setting) || typeof value !== 'boolean') return false;
        return this._request(setting, value, {cmd:'hud-style', setting, value:value ? '1':'0'},
            {cmd:'hud-style', setting, value});
    }
    centreHud() { if (this.canMoveHud()) this._setHudPos(0, 0); }
    _setHudPos(x, y) {
        if (!this.canMoveHud() || ![x,y].every(n => Number.isInteger(n) && Math.abs(n) <= 400)) return false;
        return this._request('position', [x,y], {cmd: 'hud', hud_x: String(x), hud_y: String(y)}, {cmd: 'hud-pos', hud_x: x, hud_y: y});
    }
    settingsNotice() {
        if (this._restoring) return 'Restoring HUD, cluster and startup effects...';
        if (this._profileSync) return 'Loading driver display preferences...';
        if (this._busy()) return 'Applying and saving...';
        return this._notice || 'Changes are saved for the next start';
    }
    _request(key, value, live, saved, onSaved) {
        const current={target:this.displayTarget(),size:this.hudWidth(),position:this.hudOffset(),hud_black_background:this.hudStyle('hud_black_background'),hud_round_corners:this.hudStyle('hud_round_corners')};
        const c = {value, live:this.connectedRender()&&JSON.stringify(current[key])===JSON.stringify(value), saved: false, onSaved};
        this._changes[key] = c;
        this._notice = '';
        c.timer = setTimeout(() => {
            if (this._changes[key] !== c) return;
            delete this._changes[key];
            this._notice = c.live ? 'Applied; saving was not confirmed. Try again.' :
                c.saved ? 'Saved; the map tool did not confirm applying it.' : 'No confirmation. Check the installed map tool.';
            this.emit('change');
        }, this._ackMs);
        if(live)this.render.send(live);
        this.patch.send(saved);
        this.emit('change');
        return true;
    }
    _finish(key) {
        const c = this._changes[key];
        if (c && c.live && c.saved) {
            clearTimeout(c.timer);
            delete this._changes[key];
            this._notice = 'Applied and saved';
            if (c.onSaved) c.onSaved();
        }
    }
    _onRender(msg) {
        super._onRender(msg);
        if (msg.ev !== 'status' || !this._changes) return;
        const actual = {target: this.displayTarget(), size: this.hudWidth(), position: this.hudOffset(),
            hud_black_background: this.hudStyle('hud_black_background'), hud_round_corners: this.hudStyle('hud_round_corners')};
        Object.keys(this._changes).forEach(key => {
            const c = this._changes[key];
            c.live = JSON.stringify(actual[key]) === JSON.stringify(c.value);
            this._finish(key);
        });
        this.emit('change');
    }
    _onPatch(msg) {
        super._onPatch(msg);
        if(msg.ev==='restore-defaults-reply' && this._restoreReply)this._restoreReply(msg);
        if(msg.ev==='status' && !this._startupPending)this._startupNote='';
        if(msg.ev==='startup-mode-reply' && this._startupPending) {
            const p=this._startupPending;
            if(msg.ok && msg.mode!==p.mode)return;
            clearTimeout(p.timer);this._startupPending=null;
            this._startupNote=msg.ok ? 'Preference saved; waiting for helper status' : 'Could not save startup preference';
            this.patch.send({cmd:'status'});this.emit('change');return;
        }
        const key = msg.ev === 'hud-style-reply' && ['hud_black_background', 'hud_round_corners'].includes(msg.setting) ?
            msg.setting : {'target-reply': 'target', 'hud-size-reply': 'size', 'hud-pos-reply': 'position'}[msg.ev];
        const c = key && this._changes && this._changes[key];
        if (!c) return;
        const actual = key === 'target' ? msg.target : key === 'size' ? msg.hud_width_pct :
            key === 'position' ? [msg.hud_x, msg.hud_y] : msg.value;
        if (msg.ok && JSON.stringify(actual) !== JSON.stringify(c.value)) return;
        if (!msg.ok) {
            clearTimeout(c.timer);
            delete this._changes[key];
            this._notice = 'Could not save. Check Technical details.';
        } else {
            c.saved = true;
            this._finish(key);
        }
        this.emit('change');
    }
    close() {
        if(this._restoreReply)this._restoreReply({ok:false,reason:'Settings closed before restore confirmation'});
        if(this._startupPending)clearTimeout(this._startupPending.timer);
        this._startupPending=null;this._startupNote='';
        Object.keys(this._changes).forEach(key => clearTimeout(this._changes[key].timer));
        this._changes = {};
        this._notice = '';
        super.close();
    }
}
module.exports = { SettingsControl };
