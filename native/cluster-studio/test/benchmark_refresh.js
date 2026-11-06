// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
// Host benchmark, not a claim about the vehicle's compositor or bus cadence.
const M=require('../shared/studio_model'),{FrameCache}=require('../frame_cache'),{delta}=require('../image_delta');
const designs=M.STYLES.map(style=>{const d=M.acceptedDesign();d.gauge=style[0];return [style[0],d];}).concat(M.IDRIVE_TEMPLATES.map((t,i)=>[t[0],M.idrivePreset(i)]));
const rows=[];
for(const pair of designs){
 const cache=new FrameCache(1920,720,true),times=[],sizes=[];let previous;
 for(let i=0;i<45;i++){
  const data={now:new Date(0),speed:35+i/4,rpm:700+i*37,gear:'P',oil:90+Math.floor(i/10),coolant:98+Math.floor(i/10)};
  const start=process.hrtime(),cv=cache.render(pair[1],data),change=cv&&delta(previous,cv.d,1920,720),elapsed=process.hrtime(start);
  if(cv)previous=cv.d;if(i>=10){times.push(elapsed[0]*1000+elapsed[1]/1e6);sizes.push(change?change.pixels.length:0);}
 }
 times.sort((a,b)=>a-b);rows.push({design:pair[0],medianMs:+times[Math.floor(times.length/2)].toFixed(3),p95Ms:+times[Math.floor(times.length*.95)].toFixed(3),meanBytes:Math.round(sizes.reduce((a,b)=>a+b,0)/sizes.length)});
}
console.log(JSON.stringify({runtime:process.version,platform:process.platform+' '+process.arch,rows},null,2));
