// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const fs=require('fs'),path=require('path'),C=require('./composition'),{Canvas}=require('../../shared/kit_canvas');
const out=path.resolve(process.argv[2]||'/tmp/assistance-window-preview');fs.mkdirSync(out,{recursive:true});
const data={now:new Date(2026,10,7,18,58),speed:0,rpm:736,gear:'P',fuel:32,oil:102,coolant:104};
for(const style of ['id8-slim','ring']){
 const design=C.sampleDesign(style),overlay=new Canvas(C.WIDTH,C.HEIGHT);C.draw(overlay,design,data);
 fs.writeFileSync(path.join(out,style+'-transparent.png'),overlay.png());
 // The checkerboard is an offline transparency key, not simulated car data.
 const combined=new Canvas(C.WIDTH,C.HEIGHT);
 for(let y=0;y<C.HEIGHT;y+=24)for(let x=0;x<C.WIDTH;x+=24)combined.fillRect(x,y,24,24,((x+y)/24)%2?'#18212b':'#121922');
 combined.blit(overlay,0,0);
 const label=(text,x,y,size,color)=>combined.text(text,x-combined.textWidth(text,size)/2,y,size,color);
 label('BMW DISPLAY UNDERNEATH',960,310,25,'#c2d0de');
 label('Native lanes, vehicle and distance graphics',960,352,19,'#8297aa');
 label('Transparent opening',960,391,19,'#8297aa');
 label('Native assistance icons',435,520,19,'#9cb1c4');
 label('BMW warning and status strip stays visible',960,690,22,'#b1c2d2');
 fs.writeFileSync(path.join(out,style+'-preview.png'),combined.png());
 fs.writeFileSync(path.join(out,style+'-design.json'),JSON.stringify(design,null,2)+'\n');
}
fs.writeFileSync(path.join(out,'index.html'),`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BMW assistance window study</title><style>body{margin:0;background:#080d14;color:#edf5ff;font:16px system-ui;padding:28px}main{max-width:1300px;margin:auto}h1{font-size:28px}p{color:#a6b8ca;line-height:1.5}button{font:inherit;background:#163653;border:1px solid #6a9abc;color:white;padding:12px 20px;border-radius:9px;margin:0 10px 18px 0;cursor:pointer}button[aria-pressed=true]{background:#235e87}img{width:100%;border-radius:18px;display:block}.note{padding:16px 20px;border:1px solid #2a435b;border-radius:12px;margin-top:20px}</style><main><p>OFFLINE COMPOSITION PREVIEW · SAMPLE READINGS</p><h1>Custom side gauges. BMW assistance in the center.</h1><p>The checkerboard represents a transparent opening. On the car, the original BMW display would remain underneath it. No photo or live warning feed is reproduced here.</p><button id="angular" aria-pressed="true">iDrive 8 inspired</button><button id="rings" aria-pressed="false">Round gauges</button><img id="preview" src="id8-slim-preview.png" alt="Custom side gauges with a transparent center, native assistance icon area and bottom status strip"><p class="note">Candidate geometry only. It is not installed and does not enable Drive. Automatic cruise switching requires a verified active-state signal. Native warning visibility and these boundaries must be checked on the car.</p></main><script>const a=document.getElementById('angular'),r=document.getElementById('rings'),i=document.getElementById('preview');function select(ring){i.src=(ring?'ring':'id8-slim')+'-preview.png';a.setAttribute('aria-pressed',String(!ring));r.setAttribute('aria-pressed',String(ring));}a.onclick=()=>select(false);r.onclick=()=>select(true);</script></html>`);
console.log(out);
