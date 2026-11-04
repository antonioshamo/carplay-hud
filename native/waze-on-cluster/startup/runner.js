#!/usr/bin/env node
// SPDX-License-Identifier: MPL-2.0
'use strict';
// Experimental adapter: private capture -> checked Dashboard crop -> HUD.
// No changes to firmware, navigation, the existing map tool, or BMW settings.
const fs = require('fs');
const os = require('os');
const path = require('path');
const cp = require('child_process');
const {MirrorController} = require('./controller');
const image = require('./vendor/capture_image');
const settings = require('./settings');
const {ClusterRender} = require('./vendor/cluster_render_client');
const FORMAT = {mapX0:.10,mapY0:.12,mapX1:.58,mapY1:.88,rX0:.645,rY0:.06,rX1:.985,rY1:.95,
    satTh:40,tMap:5,tCells:7,cellTh:15,cols:4,rows:4,step:70};
const SOURCE = '/run/waze-on-cluster/status.json';
const CPM = {name:'CarPlayManager',serviceId:64353,version:{major:0,minor:5},
    instances:{CarPlayManagerInst1:128},methods:{},fields:{},
    events:{onScreenChange:{id:32773,groups:[5],schema:{t:'Enum',e:{PROJECTED:0,NATIVE:1}}}},
    eventGroups:{fields:{},events:{'32773':[5]}}};

function captureRaw(file,onChild) {
    return new Promise((resolve,reject) => {
        try { fs.unlinkSync(file); } catch(e) { if(e.code!=='ENOENT') return reject(e); }
        const child=cp.execFile('/usr/bin/winston-grabber',['-s','center','-n','1',file],
            {timeout:1200,maxBuffer:16384,env:Object.assign({},process.env,
                {WAYLAND_DISPLAY:'wayland-0',XDG_RUNTIME_DIR:'/run/wayland'})}, err => {
                try {
                    if(err) throw err;
                    const stat=fs.lstatSync(file);
                    if(!stat.isFile() || stat.isSymbolicLink() || stat.size!==1920*720*4) throw new Error('Unsupported capture geometry');
                    const bytes=fs.readFileSync(file);
                    if(bytes.length!==1920*720*4) throw new Error('Incomplete capture');
                    resolve(image.readRaw(bytes,1920,720,'bgra'));
                } catch(e) { reject(e); }
                finally { try {fs.unlinkSync(file);} catch(e) {} }
            });
        if(onChild)onChild(child);
    });
}
function readSource(file,now) {
    try {
        const stat=fs.statSync(file);
        if(!stat.isFile() || stat.size>65536 || stat.mtimeMs>now || now-stat.mtimeMs>2500) return null;
        const s=JSON.parse(fs.readFileSync(file,'utf8'));
        return {state:s.state,target:s.target,at:stat.mtimeMs,
            hud_width_pct:s.hud_width_pct,hud_x:s.hud_x,hud_y:s.hud_y};
    } catch(e) {return null;}
}
function geometry(s) {
    const pct=s && Number.isInteger(s.hud_width_pct) && s.hud_width_pct>=30 && s.hud_width_pct<=85 ? s.hud_width_pct : 52;
    let w=Math.round(800*pct/100),h=Math.round(w*720/1020);
    if(h>480){h=480;w=Math.round(h*1020/720);}
    const offset=k=>s && Number.isInteger(s[k]) ? Math.max(-400,Math.min(400,s[k])) : 0;
    return {x:Math.max(0,Math.min(800-w,Math.round((800-w)/2)+offset('hud_x'))),
        y:Math.max(0,Math.min(480-h,Math.round((480-h)/2)+offset('hud_y'))),w:w,h:h};
}
async function main() {
    const display=process.argv.slice(2).includes('--display');
    if(process.argv.slice(2).some(a=>a!=='--display')) throw new Error('Only --display is supported; default is observation only');
    if(process.platform!=='linux') throw new Error('This adapter needs the BMW head-unit Linux runtime');
    // Unknown/missing SOME/IP runtime must never be treated as CarPlay active.
    const someip=require('/usr/lib/someip.node');
    const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'shamo-hud-capture-'));
    fs.chmodSync(tmp,448); // private 0700; screenshots are deleted after each read
    const file=path.join(tmp,'frame.rgb');
    const cr=new ClusterRender('shamo_hud_dashboard');
    let ref=null,layerReady=false,stopped=false,timer=null,watch=null,lastReason='';
    let captureChild=null,capturePending=null,cleanupPending=null,statusTimer=null;
    let source=null;
    const options={outW:416,outH:292,crop:{x:160,y:0,w:1020,h:720},fit:'contain',scale:'nearest'};
    const control=new MirrorController({now:Date.now,capture:()=>{
        const pending=captureRaw(file,child=>{captureChild=child;});
        capturePending=pending;
        const clear=()=>{captureChild=null;capturePending=null;};
        pending.then(clear,clear);
        return pending;
    },
        isDashboard:frame=>image.detectDashboard(frame,FORMAT).dashboard,
        convert:frame=>image.processImage(frame,options).rgba,
        present:pixels=>{
            if(!display) return true; // observes eligibility; never claims physical output
            if(!cr.ready||!layerReady||!ref) return false;
            if(!cr.pixels(ref,null,pixels)) return false;
            cr.set(ref,Object.assign({visible:true},geometry(source))); return true;
        },
        hide:()=>{if(ref)cr.set(ref,{visible:false});}
    });
    function cleanup() {
        if(cleanupPending)return cleanupPending;
        stopped=true;clearTimeout(timer);clearInterval(watch);clearInterval(statusTimer);control.close();cr.close();
        // Reap the grabber before removing its output directory. Otherwise a
        // late child could leave a private screenshot after our shutdown.
        if(captureChild)captureChild.kill('SIGKILL');
        cleanupPending=Promise.resolve(capturePending).catch(()=>{}).then(()=>{
            try{fs.unlinkSync(file);}catch(e){}try{fs.rmdirSync(tmp);}catch(e){}
        });
        return cleanupPending;
    }
    process.on('SIGTERM',()=>{cleanup().then(()=>process.exit(0));});
    process.on('SIGINT',()=>{cleanup().then(()=>process.exit(0));});
    cr.on('ready',()=>{
        // Reconnect must not replay an old capture as visible.
        layerReady=false;control.rendererChanged(false);
        if(ref)cr.drop(ref);
        if(!/(^|,)hud:800x480(,|$)/.test(cr.targets || '')){settings.writeStatus('Unsupported HUD geometry');return;}
        ref=cr.image({target:'hud',klass:'ambient',z:0,x:192,y:48,w:416,h:292,
            iw:416,ih:292,visible:false,exclusive:false,prewarm:false,contend:true,fps:3,sampling:'bilinear'});
    });
    cr.on('layer',(r,state)=>{
        if(r!==ref)return;
        if(state==='error'){layerReady=false;control.rendererChanged(false);return;}
        if(!layerReady && ['hidden','waiting','shown'].includes(state)){
            layerReady=true;control.rendererChanged(true);
        }
    });
    cr.on('refused',()=>{layerReady=false;control.rendererChanged(false);});
    cr.on('disconnected',()=>{layerReady=false;control.rendererChanged(false);});
    try {
        const proxy=await someip.buildProxy(CPM,'CarPlayManagerInst1');
        await proxy.init();
        if(stopped)return;
        await proxy.subscribe({name:'onScreenChange',onReceive:v=>{
            const owner=v&&typeof v==='object'?v.screenOwner:v;
            control.ownerChanged(owner===0||owner==='PROJECTED'?'PROJECTED':owner===1||owner==='NATIVE'?'NATIVE':null);
        }});
        if(stopped)return;
        if(display)cr.connect();else control.rendererChanged(true);
        const refresh=()=>{
            const s=readSource(SOURCE,Date.now()); source=s;
            control.setEnabled(settings.readMode()==='dashboard');
            control.sourceChanged(s,s?s.at:0);control.watchdog();
        };
        watch=setInterval(refresh,100);refresh();
        statusTimer=setInterval(()=>settings.writeStatus(control.visible ? 'Sending Dashboard frames (experimental)' : control.reason),1000);
        const tick=async()=>{
            if(stopped)return;
            await control.tick();
            if(control.reason!==lastReason){lastReason=control.reason;console.log((display?'display candidate: ':'observation only: ')+lastReason);}
            if(!stopped)timer=setTimeout(tick,333);
        };
        tick();
    } catch(e){await cleanup();throw e;}
}
if(require.main===module)main().catch(e=>{settings.writeStatus('Startup unavailable; see Technical details');console.error('HUD mirror unavailable: '+e.message);process.exitCode=1;});
module.exports={readSource,geometry,CPM,FORMAT};
