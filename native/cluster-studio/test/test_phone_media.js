// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const assert=require('assert'),fs=require('fs'),vm=require('vm'),path=require('path');
const html=fs.readFileSync(path.join(__dirname,'../phone_media.html'),'utf8'),code=html.match(/<script>([\s\S]*?)<\/script>/)[1];
function setup(){
 const nodes={},timers=new Map(),requests=[];let timer=0,tainted=false;
 const context={fillRect(){},drawImage(){},getImageData(){if(tainted)throw Error('CORS');return {data:new Uint8Array(640*360*4)};}};
 function element(id){return nodes[id]||(nodes[id]={disabled:id==='start',hidden:true,textContent:'',value:'',videoWidth:640,videoHeight:360,readyState:2,paused:true,ended:false,handlers:{},getContext:()=>context,pause(){this.paused=true;},play(){this.paused=false;return Promise.resolve();},load(){},removeAttribute(k){delete this[k];},addEventListener(k,f){this.handlers[k]=f;},click(){}});}
 class TestURL extends URL {} TestURL.createObjectURL=()=> 'blob:test';TestURL.revokeObjectURL=()=>{};
 const sandbox={URL:TestURL,console,Uint8Array,Blob,location:{hash:'#test-token',pathname:'/'},sessionStorage:{getItem(){return '';},setItem(){}},history:{replaceState(){}},document:{hidden:false,getElementById:element,addEventListener(){},createElement:element},setTimeout(f,ms){timers.set(++timer,{f,ms});return timer;},clearTimeout(id){timers.delete(id);},setInterval(){},fetch:async(route)=>{requests.push(route);return {ok:true,json:async()=>({})};}};
 element('link');vm.runInNewContext(code,sandbox);return {nodes,requests,timers,taint(){tainted=true;},load(link){nodes.link.value=link;nodes.load.onclick();},decoded(){nodes.video.onloadeddata();}};
}
(async()=>{
 const s=setup();await Promise.resolve();
 for(const link of ['https://m.youtube.com/watch?v=abc','https://youtu.be/abc','https://www.primevideo.com/detail/a','https://netflix.com/watch/123','https://www.disneyplus.com/video/a','https://www.tiktok.com/@a/video/123','https://www.instagram.com/reel/abc']){
  s.load(link);assert(s.nodes.start.disabled);assert(s.nodes.video.hidden);assert(!s.nodes.website.hidden);assert.equal(s.nodes.open.href,link);assert(s.nodes.explanation.textContent.includes('cannot be sent to the car'));
 }
 for(const link of ['javascript:alert(1)','http://example.com/a.mp4','https://name:secret@example.com/a.mp4','not a url']){s.load(link);assert(s.nodes.start.disabled);assert(s.nodes.website.hidden);assert(!s.nodes.open.href);assert(!s.nodes.video.src);}
 for(const link of ['https://example.com/movie.mp4','https://cdn.example.com/watch?token=a','https://example.com/stream.m3u8']){
  s.load(link);assert(s.nodes.start.disabled,'not ready before decoding');assert.equal(s.nodes.video.src,link);s.decoded();assert(!s.nodes.start.disabled);await s.nodes.start.onclick();assert(!s.nodes.video.paused);
 }
 s.load('https://example.com/page');s.nodes.video.onerror();assert(s.nodes.start.disabled);assert(s.nodes.video.hidden);assert(!s.nodes.website.hidden);
 s.load('https://example.com/slow');[...s.timers.values()].find(t=>t.ms===15000).f();assert(s.nodes.start.disabled);assert(s.nodes.status.textContent.includes('did not load'));
 s.load('https://example.com/drm');s.nodes.video.handlers.encrypted();assert(s.nodes.start.disabled);assert(s.nodes.status.textContent.includes('protected'));
 s.nodes.file.onchange({target:{files:[{name:'movie.mp4'}]}});assert.equal(s.nodes.video.src,'blob:test');s.decoded();assert(!s.nodes.start.disabled);
 s.load('https://example.com/blocked.mp4');s.taint();s.decoded();assert(s.nodes.start.disabled);assert(s.nodes.status.textContent.includes('blocks picture sharing'));
 // Replacing a source must invalidate an in-flight Start so an old click cannot send the next movie.
 const race=setup();race.load('https://example.com/one.mp4');race.decoded();const start=race.nodes.start.onclick();race.load('https://youtube.com/watch?v=two');await start;assert(race.nodes.video.paused);assert(race.nodes.start.disabled);
 assert(!html.includes('<iframe'),'no false iframe-to-car capture');
 console.log('ok media links: 7 website services, unsafe URLs, files, extensionless/HLS probes, readiness, decode errors, timeout, DRM, CORS and source-switch race');
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
