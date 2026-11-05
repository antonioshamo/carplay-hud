// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),os=require('os'),cp=require('child_process');
const trace=require('../src/startup_trace.js');
if(process.argv[2]==='child'){
    const scenario=process.argv[3],file=process.argv[4],Module=require('module'),EventEmitter=require('events');
    const writer=trace.create(file),load=Module._load;
    class SDK extends EventEmitter {
        constructor(){super();if(scenario==='constructor')throw Error('constructor rejected token=PRIVATE');this._packageJson={version:'fixture'};this.rhmiApplication={getByName:()=>null};}
        getAppId(){return 'robertn_waze_cluster';}
        start(){if(scenario==='start')return Promise.reject(Error('start rejected token=PRIVATE'));setImmediate(()=>this.emit('initialized'));return Promise.resolve();}
    }
    const logger={info(){},warn(){},error(){}};
    Module._load=function(name,parent,main){
        if(name==='./startup_trace.js')return writer;
        if(name==='oap-sdk/src/core/OnlineApp.js'){if(scenario==='import')throw Error('SDK import failed token=PRIVATE');return SDK;}
        if(name==='oap-sdk/src/logging/logging')return {getSDKLogger:()=>logger};
        return load.call(this,name,parent,main);
    };
    if (scenario === 'sdk-exit') process.on('uncaughtException', () => process.exit(23));
    require('../src/startup.js');
    if (scenario === 'async' || scenario === 'sdk-exit') setImmediate(() => { throw Error('async failure token=PRIVATE'); });
}else{
    const dir=fs.mkdtempSync(path.join(os.tmpdir(),'hud-trace-'));
    try{
        const file=path.join(dir,'launch.log'),writer=trace.create(file);
        writer.begin();writer.error('test-failure',Error('failure token=PRIVATE https://example.com/private'));
        assert.equal(fs.statSync(file).mode&0o777,0o600);
        assert(!fs.readFileSync(file,'utf8').includes('PRIVATE'));
        for(let i=0;i<1000;i++)writer.record('bounded','x'.repeat(5000));
        assert(fs.statSync(file).size<=65536);
        writer.begin();assert(fs.readFileSync(file,'utf8').split('\n').length===2,'fresh launch resets prior report');
        const target=path.join(dir,'untouched');fs.writeFileSync(target,'preserve');fs.unlinkSync(file);fs.symlinkSync(target,file);
        const bad=trace.create(file);bad.begin();bad.record('test');assert.equal(fs.readFileSync(target,'utf8'),'preserve');fs.unlinkSync(file);
        const denied=trace.create('/missing-parent/hud-startup.log');assert.doesNotThrow(()=>{denied.begin();denied.error('failed',Error('ignored'));});
        console.log('PASS bounded private log, redaction, reset, symlink refusal and unwritable-path tolerance');
        for(const scenario of ['import','constructor','start','initialization','async','sdk-exit']){
            const r=cp.spawnSync(process.execPath,[__filename,'child',scenario,file],{encoding:'utf8',timeout:5000});
            assert(!r.error,String(r.error));assert.equal(r.status,scenario==='sdk-exit'?23:['import','constructor','async'].includes(scenario)?1:0);
            const log=fs.readFileSync(file,'utf8');
            assert(log.includes('bundle-entered'));assert(log.includes('process-exit'));
            assert(log.includes({import:'entry-failed',constructor:'entry-failed',start:'start-failed',initialization:'initialization-failed',async:'uncaught-exception','sdk-exit':'uncaught-exception'}[scenario]),log);
            assert(!log.includes('PRIVATE'));
            console.log('PASS actual app '+scenario+' failure persists after child exit; original exit behavior preserved');
        }
    }finally{fs.readdirSync(dir).forEach(n=>fs.unlinkSync(path.join(dir,n)));fs.rmdirSync(dir);}
}
