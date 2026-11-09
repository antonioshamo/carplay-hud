// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
// Offline candidate: caller supplies an explicit observed mode. A saved BMW
// assistance preference must never be used as this live activation signal.
const {Canvas}=require('../../shared/kit_canvas'),D=require('../../shared/studio_draw'),M=require('../../shared/studio_model'),Panel=require('../../panel_composition');
const W=1920,H=720,X0=768,X1=1152,FEATHER=48;
function sample(){
 const d=M.defaultDesign();d.widgets.find(w=>w.type==='badge').on=true;
 Object.assign(d.widgets.find(w=>w.type==='badge'),{x:.425,y:.24,w:.15,h:.1});
 Object.assign(d.widgets.find(w=>w.type==='date'),{on:true,x:.425,y:.49,w:.15,h:.08});
 return d;
}
function draw(cv,design,data,mode,progress){
 cv.d.fill(0);if(mode!=='normal'&&mode!=='assistance')return cv;
 // Reuse real drawing code; full center is editable in the normal candidate.
 cv.fillRect(0,0,W,H,'#000000');
 D.draw(cv,Object.assign({},design,{background:'transparent'}),{x:0,y:0,w:W,h:H},data,{factoryPass:true});
 Panel.reserve(cv.d,W,H);
 const amount=mode==='normal'?0:Math.max(0,Math.min(1,progress===undefined?1:progress));
 if(amount)for(let y=0;y<H;y++)for(let x=X0;x<X1;x++){
  // Fade only inside the center. Do not expose old OEM side numerals.
  const dist=Math.min(x-X0+.5,X1-x-.5),t=Math.min(1,dist/FEATHER),feather=t*t*(3-2*t);
  const i=(y*W+x)*4,a=Math.round(cv.d[i+3]*(1-amount*feather));cv.d[i+3]=a;if(!a)cv.d.fill(0,i,i+4);
 }
 return cv;
}
module.exports={W,H,X0,X1,FEATHER,sample,draw};
if(require.main===module){
 const assert=require('assert'),fs=require('fs'),path=require('path'),out=path.resolve(process.argv[2]||'/tmp/bmw-center-transition');fs.mkdirSync(out,{recursive:true});
 const d=sample(),saved=JSON.stringify(d),values={now:new Date(2026,10,8,17,59),speed:0,rpm:748,fuel:32,oil:92,coolant:91,outside:13,range:270};
 const normal=new Canvas(W,H),cv=new Canvas(W,H);draw(normal,d,values,'normal');
 for(const mode of ['normal','assistance','normal','unknown','assistance','normal']){
  draw(cv,d,values,mode);assert.equal(JSON.stringify(d),saved);
  if(mode==='normal')assert(Buffer.from(cv.d).equals(Buffer.from(normal.d)),'saved normal center restored without residual cutout');
  else if(mode==='unknown')assert(cv.d.every(n=>n===0));
  else for(let y=0;y<H;y+=7){for(let x=0;x<W;x+=7){const i=(y*W+x)*4;if(x<X0||x>=X1)assert.deepEqual(cv.d.slice(i,i+4),normal.d.slice(i,i+4),'side gauges never fade');else if(x>=X0+FEATHER&&x<X1-FEATHER)assert.equal(cv.d[i+3],0,'native assistance center clear');}}
 }
 for(const pair of [['normal',0],['transition',.5],['assistance',1]]){
  draw(cv,d,values,pair[0]==='normal'?'normal':'assistance',pair[1]);const composed=new Canvas(W,H+80);composed.fillRect(0,0,W,H+80,'#000000');
  if(pair[0]!=='normal'){
   composed.fillRect(X0,0,X1-X0,H,'#101318');
   composed.line(930,280,825,630,4,'#78858d');composed.line(990,280,1095,630,4,'#78858d');
   composed.roundRect(918,456,84,110,16,'#8e989e');composed.roundRect(931,470,58,40,8,'#27323d');
  }
  composed.image({w:W,h:H,data:cv.d},0,0,W,H);composed.text('P',1450,698,38,'#f1f3f5',{font:'cluster',align:'center'});
  composed.text('OFFLINE '+pair[0].toUpperCase()+' PREVIEW',42,756,20,'#b6c0c8',{font:'bold'});composed.text('Sample readings; assistance artwork illustrated. Automatic vehicle activation is not verified.',42,784,17,'#8b949f');fs.writeFileSync(path.join(out,pair[0]+'.png'),composed.png());
 }
 const manifest=require('../../component.json');assert(!manifest.files.some(f=>/bmw_transition/.test(f.path)));
 console.log('PASS center normal/assistance/unknown transitions, exact restore, fixed opaque sides, saved-layout immutability; offline only');
}
