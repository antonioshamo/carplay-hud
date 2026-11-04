// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const kit=require('./kit_record.js'),M=require('./studio_model.js'),D=require('./studio_draw.js'),fonts=require('./kit_fonts.js');
const BOX={x:274,y:153,w:976,h:366};
const PAGES=[['gallery','Templates'],['edit','Arrange'],['style','Style'],['intro','Welcome'],['library','My designs'],['output','In the car']];
function items(s){
 const out=[],add=(id,label,x,y,w,h,enabled,selected)=>out.push({id,label,x,y,w,h,enabled:enabled!==false,selected:!!selected});
 add('exit','CarPlay HUD',18,24,222,55);
 PAGES.forEach((p,i)=>add('page:'+p[0],p[1],18,112+i*63,222,53,true,s.page===p[0]));
 const d=s.design,connected=!!s.client.status,busy=!!s.client.pending;
 if(s.page==='gallery'){
  add('previous','Previous',274,427,170,62);add('next','Next',458,427,170,62);add('shuffle','Surprise me',642,427,220,62);add('edit','Customize',876,427,374,62);
  add('theme','Color: '+M.THEMES[d.theme][0],1282,153,290,74);add('layout','Layout '+(d.preset%10+1)+' / 10',1282,246,290,74);add('apply','Apply center layout',1282,427,290,62,connected&&!busy);
 }else if(s.page==='edit'){
  add('select','Select: '+M.LABELS[s.selected],1282,126,296,57);add('toggle',s.widget().on?'Hide widget':'Show widget',1282,194,142,53);add('front','Bring forward',1434,194,144,53);
  add('left','Left',1282,262,90,53);add('up','Up',1385,262,90,53);add('right','Right',1488,262,90,53);add('down','Down',1385,327,90,53);
  add('smaller','Smaller',1282,394,142,53);add('larger','Larger',1434,394,144,53);
  add('undo','Undo',1282,462,142,53,s.history.length>0);add('snap',d.snap?'Snap: On':'Snap: Off',1434,462,144,53);
 }else if(s.page==='style'){
  [['theme','Color: '+M.THEMES[d.theme][0]],['gauge','Gauges: '+d.gauge],['background','Backdrop: '+d.background],['units','Speed: '+d.units],['borders',d.borders?'Widget cards: On':'Widget cards: Off'],['clock',d.clock24?'Clock: 24 hour':'Clock: 12 hour']].forEach((a,i)=>add(a[0],a[1],1282,128+i*66,296,55));
 }else if(s.page==='intro'){
  add('play','Play welcome',1282,153,290,72);add('animation','Animation: '+d.intro,1282,241,290,72);add('intro-toggle',d.introEnabled?'On ready: Enabled':'On ready: Disabled',1282,329,290,72);add('save','Save welcome choice',1282,427,290,62,connected&&!busy);
 }else if(s.page==='library'){
  for(let i=0;i<5;i++){const full=s.client.status&&s.client.status.slots[i];add('load:'+i,'Load '+(i+1),1034,139+i*70,160,54,!!full);add('save-slot:'+i,'Save '+(i+1),1208,139+i*70,160,54,connected&&!busy);}
  add('title','Signature: '+M.TITLES[d.title],286,427,680,62);
 }else if(s.page==='output'){
  add('apply','Use center layout',1034,139,520,72,connected&&!busy);add('off','Restore standard map area',1034,227,520,72,connected&&!busy);
  add('preview','10-second full-cluster test',1034,315,520,72,connected&&!busy&&s.client.status.canPreview);
  add('stop-preview','End full-cluster test',1034,403,520,72,connected&&!busy&&s.client.status.panel);
 }
 return out;
}
function frame(s,focus,scale){
 const r=new kit.Recorder(1600,580,{textScale:scale||1}),buttons=items(s),d=s.design,t=M.THEMES[d.theme];
 function text(str,x,y,size,col,max){str=String(str||'');const font=fonts.get('bold',size);while(max&&fonts.measure(font,str)*size/font.size>max&&str.length)str=str.slice(0,-2)+'…';r.text(str,x,y,size,col||'#f0f5ff',{font:'bold'});}
 r.clear('#060a11');r.gradientRect(252,0,1348,580,[[0,'#172438'],[.7,'#080d17'],[1,'#060a11']]);r.fillRect(0,0,252,580,'#0c131f');
 text('CLUSTER STUDIO',276,51,32,'#f0f5ff');text('X4 M COMPETITION',276,84,17,'#89a1bd');
 r.roundRect(1290,25,280,42,21,'#17283a');text(s.dirty?'Unsaved design':'Personal collection',1310,53,19,s.dirty?'#ffcc87':'#93c5e9',245);
 const subtitle={gallery:'100 curated combinations. Make any of them yours.',edit:'Touch and drag a widget. Use the dial buttons for precise adjustments.',style:'A different character, down to the last detail.',intro:'A motorsport welcome when the vehicle reports ready and parked.',library:'Five personal designs, stored in your car.',output:'Choose how to use your design.'}[s.page];text(subtitle,276,119,21,'#acbad0',1290);
 const preview=['gallery','edit','style','intro'].includes(s.page);
 if(preview){
  const b=s.page==='gallery'?{x:274,y:153,w:976,h:256}:BOX;
  r.roundRect(b.x-2,b.y-2,b.w+4,b.h+4,12,'#2a3d55');r.fillRect(b.x,b.y,b.w,b.h,'#050910');
  const inner=s.page==='gallery'?{x:b.x+147,y:b.y,w:682,h:256}:b;
  if(s.page==='intro')D.intro(r,d,inner,s.animationAt?Math.min(1,(Date.now()-s.animationAt)/3000):1);
  else D.draw(r,d,inner,s.previewData(),{selected:s.page==='edit'?s.selected:null,grid:s.page==='edit'&&s.design.snap});
  if(s.page==='gallery'){text(M.LAYOUTS[d.preset%10],b.x+18,b.y+30,20,'#d2e1f5',240);text(String(d.preset+1).padStart(3,'0')+' / 100',b.x+18,b.y+59,16,'#8199b5',160);}
  if(s.page==='edit')text(M.LABELS[s.selected]+' / '+Math.round(s.widget().w*100)+'% wide / SAMPLE READINGS',284,548,18,'#a4c4e4',850);
  else if(s.page==='intro')text('Center-area welcome only. Requires live vehicle data; never covers factory gauges.',284,544,18,'#a4c4e4',1230);
  else text('FULL-CLUSTER DESIGN PREVIEW / sample readings / not CarPlay Ultra software',284,548,17,'#8299b4',1220);
 }else if(s.page==='library'){
  D.draw(r,d,{x:286,y:176,w:680,h:255},s.previewData());text('DESIGN PREVIEW / SAMPLE READINGS',286,515,17,'#8299b4',690);
  for(let i=0;i<5;i++){const a=s.client.status&&s.client.status.slots[i];text(a?M.LAYOUTS[a.preset%10]+' / '+M.THEMES[a.theme][0]:'Empty design slot',1384,173+i*70,16,'#a8bbd0',185);}
 }else if(s.page==='output'){
  text('Your design. Three ways to view it.',286,170,27,t[1],710);
  const rows=[['DESIGN PREVIEW','Edit the whole cluster here with sample values.'],['CENTER LAYOUT','Persistent widgets under the factory gauges.'],['FULL-CLUSTER TEST','Parked, fresh vehicle data, 10 seconds only.'],['HUD COMPATIBILITY','Full-cluster tests cannot run with active HUD.']];
  rows.forEach((a,i)=>{text(a[0],286,225+i*72,17,'#7b9cbc',710);text(a[1],286,254+i*72,22,'#d6e1ef',710);});
  text(s.client.status?s.client.status.testReason:'Install Cluster Studio to check vehicle data.',286,506,19,'#a4c4e4',1250);
  text('A road-ready gauge replacement still needs in-car warning validation.',286,532,18,'#e6ba82',1250);
 }
 buttons.forEach((b,i)=>{r.roundRect(b.x,b.y,b.w,b.h,9,b.selected?'#16436a':'#172335');r.strokeRoundRect(b.x,b.y,b.w,b.h,9,i===focus?3:1,i===focus?'#64c2ff':'#30435d');if(b.selected)r.fillRect(b.x,b.y+11,3,b.h-22,'#62c1ff');text(b.label,b.x+14,b.y+b.h/2+7,b.x<250?21:b.w<160?17:20,b.enabled?'#f1f6ff':'#617590',b.w-26);});
 const status=s.notice||(s.client.status?s.client.status.state:'Install Cluster Studio to save and display layouts');
 text(s.client.status?'Helper connected':'Helper offline',18,558,16,'#aec5df',225);text(status,276,572,16,'#aec5df',1290);
 return {record:r,items:buttons};
}
module.exports={frame,items,BOX};
