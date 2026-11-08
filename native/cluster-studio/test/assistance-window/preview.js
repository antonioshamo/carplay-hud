// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const fs=require('fs'),path=require('path'),C=require('./composition'),M=require('../../shared/studio_model'),{Canvas}=require('../../shared/kit_canvas');
const out=path.resolve(process.argv[2]||'/tmp/assistance-window-preview');fs.mkdirSync(out,{recursive:true});
const data={now:new Date(2026,10,7,18,58),speed:0,rpm:736,gear:'P',fuel:32,oil:102,coolant:104};
function label(c,s,x,y,size,color){c.text(s,x,y,size,color||'#ebf1f8',{font:'bold',align:'center'});}
// An original vector illustration for the offline preview, not a captured or
// reconstructed live BMW feed. The actual candidate layer contains NONE of
// the car, lanes, assistance symbols or native status elements drawn here.
function nativeIllustration(c,active){
 c.fillRect(0,0,C.WIDTH,C.HEIGHT,'#030507');
 if(active){
  label(c,'X4 M',960,100,34,'#b7c5d2');
  c.fillRect(922,116,24,4,'#52bfe7');c.fillRect(949,116,24,4,'#2378cb');c.fillRect(976,116,24,4,'#ed486c');
  // Road perspective stays muted, matching the low-glare side gauges.
  c.convex([[900,193],[1020,193],[1200,620],[720,620]],'#0c1118');
  for(let i=0;i<8;i++){const t=(i+1)/8,y=193+427*t*t,half=60+180*t*t;c.line(960-half,y,960+half,y,1,'#202b37');}
  c.convex([[912,193],[1008,193],[1096,620],[824,620]],'#293440');
  c.line(912,193,824,620,2,'#8094a6');c.line(1008,193,1096,620,2,'#8094a6');
  // Generic rear vehicle silhouette, drawn entirely with code.
  c.roundRect(886,414,148,125,29,'#000204');
  c.convex([[904,413],[921,378],[999,378],[1016,413]],'#8194a5');
  c.convex([[916,411],[929,387],[991,387],[1004,411]],'#15222d');
  c.roundRect(899,413,122,97,23,'#9cabb7');
  c.roundRect(906,426,108,47,13,'#5a6b7b');
  c.line(905,452,930,458,6,'#f34f68');c.line(990,458,1015,452,6,'#f34f68');
  c.roundRect(938,474,44,13,3,'#b7c1ca');c.roundRect(902,500,116,18,7,'#23303c');
  c.line(916,510,937,510,3,'#9eafbd');c.line(983,510,1004,510,3,'#9eafbd');
  // Native assistance symbols are deliberately outside the custom alpha.
  c.arc(366,512,16,19,215,505,'#7e91a5');c.line(366,512,379,502,3,'#7e91a5');
  c.arc(470,511,18,21,0,360,'#7e91a5');c.line(450,511,490,511,3,'#7e91a5');c.line(470,511,470,530,3,'#7e91a5');
  label(c,'ASSISTED VIEW',960,170,17,'#8395a8');
  label(c,'6:58 PM',180,697,24,'#c7d2dc');label(c,'46 °F',1770,697,24,'#c7d2dc');
 }
 label(c,'P',1450,703,36,'#ffffff');
}
for(const style of ['id8-slim','ring']){
 const assistance=C.sampleDesign(style),normal=M.idrivePreset(0);normal.gauge=style;normal.background='black';
 for(const mode of ['normal','assistance']){
  const overlay=new Canvas(C.WIDTH,C.HEIGHT);C.drawMode(overlay,normal,assistance,data,mode);
  const name=style+'-'+mode;
  fs.writeFileSync(path.join(out,name+'-transparent.png'),overlay.png());
  const combined=new Canvas(C.WIDTH,C.HEIGHT);nativeIllustration(combined,mode==='assistance');combined.blit(overlay,0,0);
  fs.writeFileSync(path.join(out,name+'-preview.png'),combined.png());
 }
 fs.writeFileSync(path.join(out,style+'-designs.json'),JSON.stringify({normal,assistance},null,2)+'\n');
}
fs.writeFileSync(path.join(out,'index.html'),`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Antonio · Assistance layout</title><style>*{box-sizing:border-box}body{margin:0;background:#080b10;color:#eff5fb;font:16px system-ui;padding:32px}main{max-width:1320px;margin:auto}.eyebrow{font-size:11px;letter-spacing:.18em;color:#7f9db7}h1{font-size:32px;font-weight:550;letter-spacing:-.025em;margin:14px 0 12px}p{color:#a8b6c7;line-height:1.6;max-width:800px}.controls{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;margin:24px 0 20px}.group{display:flex;background:#111a25;padding:4px;border-radius:10px;gap:4px}button{font:inherit;font-size:14px;background:transparent;border:0;color:#90a7bc;padding:11px 18px;border-radius:7px;cursor:pointer}button[aria-pressed=true]{background:#294561;color:#f4f8ff}button:focus-visible{outline:2px solid #7fdcff}.cluster{border:1px solid #243244;background:#030507;border-radius:30px;overflow:hidden;box-shadow:0 30px 90px #0007}img{width:100%;display:block}.caption{display:flex;justify-content:space-between;gap:20px;margin-top:16px;color:#8294a7;font-size:13px}.details{border-top:1px solid #263241;margin-top:28px;padding-top:18px;font-size:14px}.details strong{color:#d8e4ee}@media(max-width:700px){body{padding:18px}h1{font-size:26px}.caption{display:block}.cluster{border-radius:15px}button{padding:10px 12px}}</style><main><div class="eyebrow">ANTONIO'S X4 M · DESIGN STUDY</div><h1>One cluster. Two focused views.</h1><p id="description">When BMW's assistance view is active, the center opens for its car and lanes. Matching side gauges stay balanced and fade into the native display.</p><div class="controls"><div class="group"><button data-mode="normal" aria-pressed="false">Normal layout</button><button data-mode="assistance" aria-pressed="true">Assistance active</button></div><div class="group"><button data-style="id8-slim" aria-pressed="true">iDrive 8</button><button data-style="ring" aria-pressed="false">Round</button></div></div><div class="cluster"><img id="preview" src="id8-slim-assistance-preview.png" alt="Sample custom gauges surrounding an illustrated BMW assistance center"></div><div class="caption"><span id="caption">Transparent center · aligned side gauges · native status strip</span><span>Offline concept · sample readings · illustrated native area</span></div><p class="details"><strong>Only for assistance.</strong> Turning assistance off restores the saved normal layout unchanged. This preview switches manually: automatic operation still requires a verified active-state signal and in-car checks of native warnings. Nothing here is installed in the car.</p></main><script>let mode='assistance',style='id8-slim';function draw(){document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));document.querySelectorAll('[data-style]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.style===style)));document.getElementById('preview').src=style+'-'+mode+'-preview.png';document.getElementById('description').textContent=mode==='assistance'?"When BMW's assistance view is active, the center opens for its car and lanes. Matching side gauges stay balanced and fade into the native display.":'With assistance off, your normal custom layout returns, including its center widgets and saved positions.';document.getElementById('caption').textContent=mode==='assistance'?'Transparent center · aligned side gauges · native status strip':'Normal layout · center widgets restored · original positions preserved';}document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{mode=b.dataset.mode;draw();});document.querySelectorAll('[data-style]').forEach(b=>b.onclick=()=>{style=b.dataset.style;draw();});</script></html>`);
console.log(out);
