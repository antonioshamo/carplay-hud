// SPDX-License-Identifier: MPL-2.0
'use strict';
const assert=require('assert'),fs=require('fs'),os=require('os'),path=require('path'),EventEmitter=require('events');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'hud-startup-test-'));
process.env.WOC_STARTUP_MODE=path.join(dir,'mode');
process.env.WOC_STARTUP_STATUS=path.join(dir,'status.json');
const settings=require('../settings'),{Supervisor}=require('../service'),{readSource,geometry}=require('../runner');
let now=10000,spawned=0,child;
const s=new Supervisor({readMode:settings.readMode,now:()=>now,status:()=>{},spawn:()=>{
    spawned++;child=new EventEmitter();child.kills=[];child.kill=signal=>child.kills.push(signal);return child;
}});
try {
    assert.equal(settings.readMode(),'off');s.tick();assert.equal(spawned,0);
    settings.saveMode('dashboard');s.tick();s.tick();assert.equal(spawned,1);
    assert.throws(()=>settings.saveMode('shell:anything'));assert.equal(settings.readMode(),'dashboard');
    settings.saveMode('off');s.tick();assert.deepEqual(child.kills,['SIGTERM']);child.emit('exit',0);s.tick();assert.equal(spawned,1);
    settings.saveMode('dashboard');now+=10001;s.tick();assert.equal(spawned,2);child.emit('exit',1);s.tick();assert.equal(spawned,2);
    now+=10001;s.tick();assert.equal(spawned,3);
    child.emit('error',new Error('spawn failed'));assert.equal(s.child,null);now+=10001;s.tick();assert.equal(spawned,4);
    s.close();assert.deepEqual(child.kills,['SIGTERM']);child.emit('exit',0);now+=20000;s.tick();assert.equal(spawned,4);
    console.log('PASS default off, explicit opt-in, one child, stop, retry backoff, shutdown');
    settings.writeStatus('Waiting for CarPlay');assert.equal(settings.readStatus(Date.now()),'Waiting for CarPlay');
    assert.equal(settings.readStatus(Date.now()+5000),'Waiting for startup helper');
    settings.saveMode('off');assert.equal(settings.readStatus(Date.now()),'Off');
    console.log('PASS saved mode is independent of live readiness; stale helper is visible');
    const f=path.join(dir,'source');fs.writeFileSync(f,JSON.stringify({target:'hud',state:'idle',hud_width_pct:60,hud_x:40,hud_y:-20}));
    const at=fs.statSync(f).mtimeMs;
    assert.equal(readSource(f,at+1).hud_width_pct,60);assert.equal(readSource(f,at+3000),null);assert.equal(readSource(f,at-1),null);
    fs.writeFileSync(f,'{incomplete');assert.equal(readSource(f,Date.now()),null);
    console.log('PASS stale, future and malformed source status rejected');
    const small=geometry({hud_width_pct:30}),large=geometry({hud_width_pct:85,hud_x:400,hud_y:400});
    assert(small.w<large.w);assert.equal(large.x+large.w,800);assert.equal(large.y+large.h,480);
    assert.equal(geometry({hud_width_pct:NaN,hud_x:Infinity}).w,416);
    console.log('PASS HUD size and movement remain bounded to 800x480');
    const spec=JSON.parse(fs.readFileSync(path.join(__dirname,'../../component.json'),'utf8'));
    for(const file of ['startup/settings.js','startup/runner.js','startup/controller.js','startup/service.js','startup/vendor/capture_image.js','startup/vendor/cluster_render_client.js','startup/LICENSE'])
        assert(spec.files.some(f=>f.path===file),'packaged '+file);
    assert(spec.enable.some(e=>e.unit==='waze-on-cluster-startup.service'));
    console.log('PASS release includes runtime, vendor licenses and boot service');
} finally {
    s.close();if(s.child)s.child.emit('exit',0);
    fs.readdirSync(dir).forEach(f=>fs.unlinkSync(path.join(dir,f)));fs.rmdirSync(dir);
}
