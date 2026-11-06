// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const kit=require('./kit_record.js'),M=require('./studio_model.js'),D=require('./studio_draw.js'),fonts=require('./kit_fonts.js');
const BOX={x:274,y:153,w:976,h:366};
const QR=require('./qrcodegen.js'),{videoOp}=require('./mgu_render_client.js');
const PAGES=[['gallery','Templates'],['edit','Arrange'],['style','Style'],['intro','Welcome'],['library','My designs'],['output','In the car'],['tools','More options']];
let qrText=null,qrCode=null;
function items(s){
 const out=[],add=(id,label,x,y,w,h,enabled,selected)=>out.push({id,label,x,y,w,h,enabled:enabled!==false,selected:!!selected});
 const live=s.client.status&&s.client.status.media;
 if(s.page==='media'&&s.videoFull&&live&&live.playing&&live.target==='center'&&Date.now()-(s.client.statusAt||0)<2000){add('navigate-back','Back',18,476,222,54);add('live-toggle','Live changes: '+(s.liveChanges?'On':'Off'),258,476,300,54);add('apply','Apply design',1000,476,270,54,!s.client.pending);add('media-stop','Stop session',1290,476,290,54,!s.client.pending);return out;}
 add('navigate-back','Back',18,24,222,55);
 add('live-toggle','Live changes: '+(s.liveChanges?'On':'Off'),1050,24,244,55,true,s.liveChanges);
 const ready=!!s.client.status&&!s.client.pending&&!s.liveSending;
 add('apply','Apply',1310,24,268,55,ready&&(!(s.client.status.output==='parked-panel')||s.client.status.parked));
 PAGES.forEach((p,i)=>add('page:'+p[0],p[1],18,110+i*57,222,48,true,s.page===p[0]||(p[0]==='edit'&&['widgets','properties'].includes(s.page))||(p[0]==='gallery'&&['layouts','idrive'].includes(s.page))||(p[0]==='style'&&['themes','gauges'].includes(s.page))||(p[0]==='library'&&s.page==='phone')||(p[0]==='tools'&&['assistance','features','media'].includes(s.page))));
 const d=s.design,connected=!!s.client.status,busy=!!s.client.pending;
 if(s.page==='gallery'){
  add('previous','Previous',274,427,170,62);add('next','Next',458,427,170,62);add('shuffle','Surprise me',642,427,220,62);add('edit','Customize',876,427,374,62);
  add('page:idrive','iDrive 8 templates',1282,153,290,62);add('page:themes','Color: '+M.THEMES[d.theme][0],1282,229,290,62);add('page:layouts','Choose a layout',1282,305,290,62);add('tested-layout','Tested M Competition',1282,381,290,62);add('go:output','Choose display output',1282,457,290,62);
 }else if(s.page==='idrive'){
  M.IDRIVE_TEMPLATES.forEach((a,i)=>add('pick-idrive:'+i,'Use '+a[1],286+i*432,437,410,65,true,d.template===a[0]));
 }else if(s.page==='gauges'){
  M.STYLES.forEach((style,i)=>add('pick-gauge:'+style[0],style[1],286+(i%3)*432,156+Math.floor(i/3)*89,410,72,true,style[0]===(s.styleTarget==='design'?d.gauge:d.widgets.find(w=>w.type===s.styleTarget).gauge)));
 }else if(s.page==='layouts'||s.page==='themes'){
  const themes=s.page==='themes',rows=themes?M.THEMES.map(t=>t[0]):M.LAYOUTS;
  rows.forEach((name,i)=>add((themes?'pick-theme:':'pick-layout:')+i,name,286+(i%2)*640,146+Math.floor(i/2)*73,614,61,true,i===(themes?d.theme:d.preset%10)));
 }else if(s.page==='widgets'){
  M.TYPES.forEach((type,i)=>{const w=d.widgets.find(w=>w.type===type);add('widget:'+type,M.LABELS[type]+' / '+(w.on?'Visible':'Hidden'),286+(i%3)*425,154+Math.floor(i/3)*89,402,72,true,s.selected===type);});
 }else if(s.page==='edit'){
  const free=!s.widget().locked;
  add('select','Choose widget: '+M.LABELS[s.selected],1282,126,296,57);
  add('toggle',s.widget().on?'Hide':'Show',1282,194,142,53,free);add('lock',free?'Lock':'Unlock',1434,194,144,53);
  add('left','Left',1282,262,90,53,free);add('up','Up',1385,262,90,53,free);add('right','Right',1488,262,90,53,free);
  add('precision',s.moveStep===.01?'Fine':'Coarse',1282,327,90,53,free);add('down','Down',1385,327,90,53,free);add('page:properties','More',1488,327,90,53);
  add('smaller','Smaller',1282,394,142,53,free);add('larger','Larger',1434,394,144,53,free);
  add('undo','Undo',1282,462,142,53,s.history.length>0);add('redo','Redo',1434,462,144,53,s.redo.length>0);
 }else if(s.page==='properties'){
  const w=s.widget(),free=!w.locked;
  [['width-less','Narrower'],['width-more','Wider'],['height-less','Shorter'],['height-more','Taller'],['align-x','Center X'],['align-y','Center Y'],['front','To front'],['back','To back'],['widget-color','Color: '+(w.color||'theme')],['widget-gauge','Dial: '+(!w.gauge||w.gauge==='inherit'?'Theme':w.gauge)],['snap',d.snap?'Grid: On':'Grid: Off'],['reset-widget','Reset widget'],['go:edit','Arrange'],['lock',free?'Lock widget':'Unlock widget']].forEach((a,i)=>add(a[0],a[1],1282+(i%2)*152,126+Math.floor(i/2)*56,144,47,['go:edit','lock','snap'].includes(a[0])||free));
 }else if(s.page==='style'){
  [['page:themes','Color: '+M.THEMES[d.theme][0]],['gauge','Gauges: '+M.gaugeLabel(d.gauge)],['background','Backdrop: '+d.background],['units','Speed: '+d.units],['borders',d.borders?'Widget cards: On':'Widget cards: Off'],['clock',d.clock24?'Clock: 24 hour':'Clock: 12 hour'],['temperature','Temperature: °'+(d.temperatureUnit||'C')]].forEach((a,i)=>add(a[0],a[1],1282,128+i*56,296,47));
 }else if(s.page==='intro'){
  [['animation',({slide:'X4 M / fly-in',reveal:'X4 M / reveal',apple:'Apple / CarPlay Ultra',welcome:'Welcome Antonio',none:'No animation'})[d.intro]],['duration','Length: '+(d.introDuration/1000)+' seconds'],['shine','Badge shine: '+(d.introShine?'On':'Off')],['light','Light: '+d.introLight],['intro-toggle',d.introEnabled?'At startup: On':'At startup: Off'],['play','Preview sequence'],['save','Save startup choice']].forEach((a,i)=>add(a[0],a[1],1282,128+i*56,296,47,a[0]==='save'?connected&&!busy:a[0]==='shine'?['slide','reveal'].includes(d.intro):a[0]==='light'?['slide','reveal','welcome'].includes(d.intro):a[0]==='duration'||a[0]==='intro-toggle'?d.intro!=='none':true));
 }else if(s.page==='phone'){
  add('editor-start','Start phone designer',1040,170,520,74,connected&&!busy&&s.client.status.parked===true&&s.client.status.phoneDesigner===true);
  add('media-stop','End phone session',1040,268,520,64,connected&&!busy&&s.client.status.media&&s.client.status.media.active);
  add('go:library','Back to My designs',1040,424,520,64);
 }else if(s.page==='library'){
  add('page:phone','Name, import & edit on phone',286,138,680,50);
  for(let i=0;i<5;i++){const full=s.client.status&&s.client.status.slots[i];add('load:'+i,'Load '+(i+1),1034,139+i*70,160,54,!!full);add('save-slot:'+i,'Save '+(i+1),1208,139+i*70,160,54,connected&&!busy);}
  add('title','Signature: '+(d.signature||M.TITLES[d.title]),286,427,680,62);
 }else if(s.page==='output'){
  const fixed=connected&&s.client.status.panelClearance==='native-gear-v1'&&Date.now()-(s.client.statusAt||0)<2000;
  add('apply-panel','Use full cluster in Park',1034,139,520,58,fixed&&!busy&&s.client.status.canPreview);
  add('apply-center','Use center layout',1034,207,520,58,connected&&!busy);
  add('off','Restore BMW display',1034,275,520,58,connected&&!busy);
  add('test-length','Test length: '+s.testSeconds+' seconds',1034,343,520,48);
  add('preview','Try full cluster',1034,401,520,48,fixed&&!busy&&s.client.status.canPreview);
  add('stop-preview','End timed test',1034,459,520,48,connected&&!busy&&s.client.status.panelRemaining>0);
 }else if(s.page==='tools'){
  [['assistance','Driving assistance'],['features','Lighting & feature scan'],['media','Parked video'],['phone','Phone designer']].forEach((a,i)=>add('page:'+a[0],a[1],286+(i%2)*646,174+Math.floor(i/2)*140,622,112));
 }else if(s.page==='features'){
  add('scan','Scan this car',1050,146,500,65,connected&&!busy&&s.client.status.parked===true);
  add('page:media','Get report on phone',1050,227,500,65,connected&&!busy);
 }else if(s.page==='media'){
  const media=connected&&s.client.status.media;
  add('media-target','Display: '+({center:'Center screen',map:'Cluster center',panel:'Full cluster',hud:'Head-up display'})[s.mediaTarget],1040,138,524,58,!busy&&!(media&&media.active));
  add('media-start','Start phone session',1040,209,254,58,connected&&!busy&&s.client.status.parked===true&&!(media&&media.active)&&s.mediaTarget!=='panel'&&(s.mediaTarget!=='center'||s.videoSupported));
  add('media-stop','Stop session',1310,209,254,58,connected&&!busy&&media&&media.active);
  ['left','up','right','down','size','reset'].forEach((a,i)=>add('video:'+a,{left:'Left',right:'Right',up:'Up',down:'Down',size:'Size',reset:'Center'}[a],1040+(i%3)*178,285+Math.floor(i/3)*65,166,54,connected&&!busy&&media&&media.active&&media.target!=='center'&&media.target!=='design'));
  add('video-full','Full-screen movie view',1040,464,524,54,!!(media&&media.playing&&media.target==='center'&&s.videoSupported));
 }
 return out;
}
function frame(s,focus,scale){
 const r=new kit.Recorder(1600,580,{textScale:scale||1}),buttons=items(s),d=s.design,t=M.THEMES[d.theme];
 function text(str,x,y,size,col,max){str=String(str||'');const font=fonts.get('bold',size);while(max&&fonts.measure(font,str)*size/font.size>max&&str.length)str=str.slice(0,-2)+'…';r.text(str,x,y,size,col||'#f0f5ff',{font:'bold'});}
 const live=s.client.status&&s.client.status.media;
 if(s.page==='media'&&s.videoFull&&live&&live.playing&&live.target==='center'&&Date.now()-(s.client.statusAt||0)<2000){r.clear('#000000');const op=videoOp(9001,0,0,1600,460,0);r._grow(op.length);r.u.set(op,r.n);r.n+=op.length;buttons.forEach(b=>{r.roundRect(b.x,b.y,b.w,b.h,8,'#183858');text(b.label,b.x+15,b.y+35,23);});return {record:r,items:buttons};}
 r.clear('#060a11');r.gradientRect(252,0,1348,580,[[0,'#172438'],[.7,'#080d17'],[1,'#060a11']]);r.fillRect(0,0,252,580,'#0c131f');
 text('CLUSTER STUDIO',276,49,26,'#f0f5ff');text('X4 M COMPETITION',276,84,17,'#89a1bd');
 text(s.editStatus(),610,48,18,s.dirty?'#ffcc87':'#93c5e9',420);
 const subtitle={idrive:'Three iDrive 8-inspired designs. Every widget can be moved, resized and recolored.',gallery:'Choose a template. Arrange, style and apply it to your car.',layouts:'Choose your layout. Your colors and welcome are kept.',gauges:'Choose a dial style. Speed and RPM can each use a different design.',themes:'Choose your color palette. Your widget positions are kept.',widgets:'Choose any widget, including hidden ones. Arrange it with touch or the dial.',properties:'Independent width, height, alignment, layer order and widget styling.',edit:'Touch and drag a widget. Use the dial buttons for precise adjustments.',style:'A different character, down to the last detail.',intro:'Choose your welcome. It plays once, then returns to your saved layout.',library:'Five personal designs, stored in your car.',phone:'Name your design and welcome, choose exact colors, import or export. Parked setup.',output:'Choose how to use your design.',assistance:'Your BMW assistance preferences. Read-only; these are not live warning indicators.',tools:'More ways to personalize your cockpit.',features:'Find the interfaces this firmware actually exposes. Read-only.',media:'Experimental video from saved phone clips. Parked use only.'}[s.page];text(subtitle,276,119,21,'#acbad0',1290);
 const preview=['gallery','edit','properties','style','intro'].includes(s.page);
 if(preview){
  const b=s.page==='gallery'?{x:274,y:153,w:976,h:256}:BOX;
  r.roundRect(b.x-2,b.y-2,b.w+4,b.h+4,12,'#2a3d55');r.fillRect(b.x,b.y,b.w,b.h,'#050910');
  const inner=s.page==='gallery'?{x:b.x+147,y:b.y,w:682,h:256}:b;
  if(s.page==='intro')D.sequence(r,d,inner,s.previewData(),s.animationAt?Date.now()-s.animationAt:d.introDuration*.55);
  else D.draw(r,d,inner,s.previewData(),{selected:['edit','properties'].includes(s.page)?s.selected:null,grid:['edit','properties'].includes(s.page)&&s.design.snap});
  if(s.page==='gallery'){text(d.template&&d.template!=='standard'?d.name:M.LAYOUTS[d.preset%10],b.x+18,b.y+30,20,'#d2e1f5',240);text(d.template&&d.template!=='standard'?'iDrive 8 inspired':String(d.preset+1).padStart(3,'0')+' / 100',b.x+18,b.y+59,16,'#8199b5',160);}
  if(['edit','properties'].includes(s.page))text(M.LABELS[s.selected]+' / '+Math.round(s.widget().w*100)+'% × '+Math.round(s.widget().h*100)+'%'+(s.widget().locked?' / LOCKED':'')+' / SAMPLE READINGS',284,548,18,'#a4c4e4',850);
  else if(s.page==='intro')text('Welcome follows your output choice. Full-cluster output requires Park and fresh vehicle data.',284,544,18,'#a4c4e4',1230);
  else text('FULL-CLUSTER DESIGN PREVIEW / sample readings / not CarPlay Ultra software',284,548,17,'#8299b4',1220);
 }else if(s.page==='idrive'){
  M.IDRIVE_TEMPLATES.forEach((a,i)=>{const x=286+i*432;r.roundRect(x,153,410,267,12,'#101d2d');text(a[1],x+18,190,25,'#f0f5ff',374);text(a[2],x+18,219,17,'#9db5d1',374);D.draw(r,M.idrivePreset(i),{x:x+12,y:246,w:386,h:145},s.previewData());});
  text('DESIGN PREVIEWS / SAMPLE READINGS / your units and welcome preferences are kept',286,542,17,'#91acc8',1260);
 }else if(s.page==='phone'){
  const m=s.client.status&&s.client.status.media,url=m&&m.target==='design'&&m.urls&&m.urls[0];
  if(url){
   if(qrText!==url){qrText=url;qrCode=QR.QrCode.encodeText(url,QR.QrCode.Ecc.MEDIUM);}
   const step=Math.floor(310/(qrCode.size+8)),x=310,y=164;r.fillRect(x,y,step*(qrCode.size+8),step*(qrCode.size+8),'#ffffff');
   for(let row=0;row<qrCode.size;row++)for(let col=0;col<qrCode.size;col++)if(qrCode.getModule(col,row))r.fillRect(x+(col+4)*step,y+(row+4)*step,step,step,'#000000');
   text('Scan with your phone',650,230,26,'#d6e1ef',350);text('Same car Wi-Fi',650,277,23,'#a4c4e4',350);text('Five-minute session',650,324,21,'#a4c4e4',350);
  }else {text('Your design. Your name.',310,235,32,t[1],690);text('Start a phone session, then scan the code.',310,288,24,'#a4c4e4',700);}
  text('Saves are confirmed by the car. Existing display output stays active.',286,524,21,'#a4c4e4',1250);
 }else if(s.page==='library'){
  D.draw(r,d,{x:286,y:196,w:600,h:225},s.previewData());text('DESIGN PREVIEW / SAMPLE READINGS',286,515,17,'#8299b4',690);
  for(let i=0;i<5;i++){const a=s.client.status&&s.client.status.slots[i];text(a?(a.name||M.LAYOUTS[a.preset%10]):'Empty design slot',1384,173+i*70,16,'#a8bbd0',185);}
 }else if(s.page==='output'){
  text('Your design. Three ways to view it.',286,170,27,t[1],710);
  const rows=[['DESIGN PREVIEW','Edit the whole cluster here with sample values.'],['CENTER LAYOUT','Persistent widgets under the factory gauges.'],['FULL CLUSTER IN PARK','Saved design returns in Park; BMW gauges in motion.'],['NATIVE GEAR INDICATOR','P stays visible. Active HUD pauses full-cluster output.']];
  rows.forEach((a,i)=>{text(a[0],286,225+i*72,17,'#7b9cbc',710);text(a[1],286,254+i*72,22,'#d6e1ef',710);});
  text(s.client.status?s.client.status.testReason:'Install Cluster Studio to check vehicle data.',286,506,19,'#a4c4e4',1250);
  text('BMW gauges remain responsible for cruise, lane alerts and warnings.',286,532,18,'#e6ba82',1250);
 }else if(s.page==='assistance'){
  const fresh=Date.now()-(s.client.statusAt||0)<2000;
  const a=fresh&&s.client.status&&s.client.status.assistance;
  text('Configured in BMW',286,168,27,t[1],1200);
  const rows=a&&a.preferences||[
   {label:'Lane departure warning'},{label:'Lane change warning'},
   {label:'Forward collision warning'},{label:'Pedestrian warning'},
   {label:'Lane departure steering intervention'},{label:'Lane change assistant'},
   {label:'Situational distance selection'},{label:'Steering wheel light indicators'}];
  rows.slice(0,8).forEach((p,i)=>{
   const x=286+(i%2)*646,y=188+Math.floor(i/2)*77;
   r.roundRect(x,y,622,65,9,'#142235');
   text(p.label,x+16,y+23,18,'#b7c9de',590);
   text(({on:'On in BMW settings',off:'Off in BMW settings',unavailable:'Not available'})[p.value]||'Waiting for fresh data',x+16,y+50,20,p.value==='on'?'#91c8fa':'#b7c9de',590);
  });
  text('Active cruise, set speed, following distance and lane alerts: use BMW gauges.',286,525,21,'#e6ba82',1270);
  text('These preferences do not show whether assistance is currently engaged.',286,550,18,'#a4c4e4',1270);
 }else if(s.page==='tools'){
  text('Use the phone designer for names, exact colors, import and export.',286,487,22,'#a4c4e4',1260);
 }else if(s.page==='features'){
  const f=s.client.status&&s.client.status.features;
  text('Interior lighting & playback',286,173,28,t[1],740);
  text(f?'Lighting candidates: '+f.lighting+' / media candidates: '+f.media:'Run a scan while parked.',286,218,23,'#d6e1ef',740);
  (f?f.rows:[]).slice(0,5).forEach((a,i)=>{text(a.name+(a.setter?' · setter declared':''),286,263+i*40,19,'#a4c4e4',740);});
  text('A candidate is not a verified control. No light settings are changed.',286,491,19,'#e6ba82',1200);
  text('The phone report includes field types for a supported lighting adapter.',286,523,19,'#a4c4e4',1200);
 }else if(s.page==='media'){
  const m=s.client.status&&s.client.status.media,url=m&&m.target!=='design'&&m.urls&&m.urls[0],fresh=Date.now()-(s.client.statusAt||0)<2000;
  r.fillRect(286,145,720,360,'#030609');
  if(m&&m.target==='center'&&m.playing&&fresh&&s.videoSupported){const op=videoOp(9001,286,145,720,360,0);r._grow(op.length);r.u.set(op,r.n);r.n+=op.length;}
  else if(url){
   if(qrText!==url){qrText=url;qrCode=QR.QrCode.encodeText(url,QR.QrCode.Ecc.MEDIUM);}
   const step=Math.floor(310/(qrCode.size+8)),side=step*(qrCode.size+8),x=310,y=164;r.fillRect(x,y,side,side,'#ffffff');
   for(let row=0;row<qrCode.size;row++)for(let col=0;col<qrCode.size;col++)if(qrCode.getModule(col,row))r.fillRect(x+(col+4)*step,y+(row+4)*step,step,step,'#000000');
   text('Scan with your phone',638,222,24,'#d6e1ef',350);text('Same car Wi-Fi network',638,263,20,'#a4c4e4',350);text('Choose a saved video',638,299,20,'#a4c4e4',350);text('Session: '+m.remaining+' seconds',638,349,20,'#a4c4e4',350);
  }else{ text(m&&m.active&&m.target==='design'?'Phone designer session is open':'Your phone supplies the picture',310,234,25,'#d6e1ef',650);text(m&&m.active&&m.target==='design'?'Stop that session here to switch to video.':'Select a display, then Start phone session.',310,279,20,'#a4c4e4',650);text('640 × 360 / up to 15 fps / no car-side audio',310,324,19,'#a4c4e4',650);}
  text('Native YouTube / TikTok / Instagram apps are not enabled.',1040,440,18,'#e6ba82',530);
  text(m?m.note:'Install Cluster Studio 0.1.4.',286,533,19,'#a4c4e4',1270);
 }
 buttons.forEach((b,i)=>{r.roundRect(b.x,b.y,b.w,b.h,9,b.id==='apply'?'#156498':b.selected?'#16436a':'#172335');r.strokeRoundRect(b.x,b.y,b.w,b.h,9,i===focus?3:1,i===focus?'#64c2ff':'#30435d');if(b.selected)r.fillRect(b.x,b.y+11,3,b.h-22,'#62c1ff');if(s.page==='themes'&&b.id.startsWith('pick-theme:'))r.fillRect(b.x+2,b.y+2,6,b.h-4,M.THEMES[Number(b.id.split(':')[1])][1]);text(b.label,b.x+14,b.y+b.h/2+7,b.x<250?21:b.w<160?17:20,b.enabled?'#f1f6ff':'#617590',b.w-26);});
 const status=s.notice||s.editStatus()||(s.client.status?s.client.status.state:'Install Cluster Studio to save and display layouts');
 text(s.client.status?'Helper connected':'Helper offline',18,558,16,'#aec5df',225);text(status,276,572,16,'#aec5df',1290);
 return {record:r,items:buttons};
}
module.exports={frame,items,BOX};
