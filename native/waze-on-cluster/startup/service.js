// SPDX-License-Identifier: MPL-2.0
'use strict';
// Listen from boot so enabling the trial does not discard an earlier CarPlay
// foreground event. The runner remains capture-idle until explicit opt-in.
const cp=require('child_process'), path=require('path');
const settings=require('./settings');
class Supervisor {
    constructor(o) { this.o=o; this.child=null; this.stopping=false; this.retryAt=0; this.killTimer=null; }
    tick() {
        if(this.stopping) { this.stopChild(); return; }
        if(this.child || this.o.now()<this.retryAt)return;
        this.o.status('Starting CarPlay listener');
        try {
            const child=this.o.spawn(); this.child=child;
            const exited=()=>{
                if(this.child!==child)return;
                clearTimeout(this.killTimer);this.killTimer=null;this.child=null;
                this.retryAt=this.o.now()+10000;
            };
            child.on('error',()=>{this.o.status('Startup helper unavailable');exited();});
            child.on('exit',exited);
        } catch(e) { this.retryAt=this.o.now()+10000; this.o.status('Startup helper unavailable'); }
    }
    stopChild() {
        if(!this.child || this.killTimer)return;
        const child=this.child;
        child.kill('SIGTERM');
        this.killTimer=setTimeout(()=>{if(this.child===child)child.kill('SIGKILL');},2000);
    }
    close() { this.stopping=true;this.stopChild(); }
}
if(require.main===module) {
    const s=new Supervisor({readMode:settings.readMode, now:Date.now, status:settings.writeStatus,
        spawn:()=>cp.spawn(process.execPath,[path.join(__dirname,'runner.js'),'--display'],{stdio:'inherit'})});
    const timer=setInterval(()=>s.tick(),500);s.tick();
    const stop=()=>{clearInterval(timer);s.close();};
    process.on('SIGTERM',stop);process.on('SIGINT',stop);
}
module.exports={Supervisor};
