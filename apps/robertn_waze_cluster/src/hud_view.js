// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const kit=require('./kit_record.js');
const fonts=require('./kit_fonts.js');
const W=1600,H=580;
const C={bg:'#080c13',nav:'#101620',panel:'#151e2b',edge:'#2a3a4f',text:'#f4f7fc',dim:'#a9b7c9',blue:'#4bb6ff',deep:'#123b64',muted:'#587089',green:'#71ddb7',amber:'#efc684'};
const tabs=[['overview','My cockpit','hud'],['layout','Map layout','layout'],['appearance','Appearance','sun'],['startup','Startup','power'],['support','Help & setup','help']];
function model(c) {
 const r=c.renderStatus||{},p=c.patchStatus||{},target=c.displayTarget();
 return {target,bmwDefaults:p.bmw_defaults===true,state:r.state||'offline',width:c.hudWidth(),offset:c.hudOffset(),step:c.moveStep,
  background:c.hudStyle('hud_black_background'),corners:c.hudStyle('hud_round_corners'),startup:p.startup_mode==='dashboard',
  startupSupported:p.startup_trial===true,startupText:c.startupText(),startupResult:c.startupResult(),
  notice:c.settingsNotice(),busy:c._busy()||!!c._startupPending,canDisplay:c.canChangeDisplay(),canSize:c.canChangeHudSize(),
  canLarger:c.canHudLarger(),canSmaller:c.canHudSmaller(),canMove:c.canMoveHud(),canStyle:c.canChangeStyle('hud_black_background'),
  canCorners:c.canChangeStyle('hud_round_corners'),canStartup:c.canChangeStartup(),canEnable:c.canEnable(),canDisable:c.canDisable(),
  canRestore:typeof c.canRestoreDefaults==='function'&&c.canRestoreDefaults(),canRestart:c.restartNeeded()&&c.connectedPatch()&&!c.restartRequested(),captureText:c.captureText(),captureButton:c.captureButtonText(),
  canCapture:c.connectedPatch()&&!c.restartRequested()&&c.captureState.state!=='closing',logs:c.rows()};
}
function status(m) {
 if(m.busy)return 'Saving changes';
 if(m.bmwDefaults&&!m.canRestart)return 'BMW defaults active';
 if(m.canRestart)return 'Restart needed';
 if(m.state==='showing')return m.target==='hud'?'Map active on HUD':'Map active on cluster';
 if(m.startup&&m.state==='idle')return 'Auto-start enabled';
 if(m.state==='frozen')return 'Map paused';
 return m.state==='offline'?'Connecting to map tool':'Waiting for map';
}
function layout(m,page,logPage) {
 const items=[];
 function add(id,label,x,y,w,h,enabled,selected,sub,icon){items.push({id,label,x,y,w,h,enabled:enabled!==false,selected:!!selected,sub,icon});}
 tabs.forEach((t,i)=>add('nav:'+t[0],t[1],18,116+i*78,224,66,true,page===t[0]||(page==='details'&&t[0]==='support'),'',t[2]));
 add('navigate-back','Back',18,24,224,55,true);
 add('apply-current','Apply settings',1310,24,268,55,m.canDisplay);
 if(page==='overview') {
  add('hud','Windshield HUD',998,178,270,80,m.canDisplay,m.target==='hud','','hud');
  add('cluster','Cluster',1280,178,278,80,m.canDisplay,m.target==='map','','cluster');
  add('open-studio','Cluster designer',998,308,270,86,true,false,'Templates & widgets','cluster');
  add('studio:intro','Welcome',1280,308,278,86,true,false,'Choose your startup','power');
  add('studio:library','My saved designs',998,412,270,78,true,false,'Personal collection');
  add('nav:layout','HUD map layout',1280,412,278,78,true,false,'Size & position');
  add('studio:features','Lighting',310,422,196,68,true,false,'Support & scan');
  add('studio:assistance','Driving assistance',310,497,654,38,true,false);
  add('studio:media','Parked media',520,422,218,68,true,false,'Clips & movie view');
  add('nav:support','BMW defaults',752,422,212,68,true,false,'Restore controls');
 } else if(page==='layout') {
  add('size:40','Small',800,180,115,64,m.canSize,m.width===40);
  add('size:60','Medium',923,180,115,64,m.canSize,m.width===60);
  add('size:75','Large',1046,180,115,64,m.canSize,m.width===75);
  add('smaller','Smaller',800,264,174,78,m.canSmaller,false,'-5%');
  add('larger','Larger',987,264,174,78,m.canLarger,false,'+5%');
  add('standard','Standard size',800,366,361,70,m.canSize,m.width===0);
  add('up','Up',1324,178,86,72,m.canMove,false,'','up');
  add('left','Left',1228,260,86,72,m.canMove,false,'','left');
  add('center','Center',1324,260,86,72,m.canMove,false,'','center');
  add('right','Right',1420,260,86,72,m.canMove,false,'','right');
  add('down','Down',1324,342,86,72,m.canMove,false,'','down');
  add('step',m.step===10?'Fine / 10 px':'Coarse / 40 px',1228,436,278,60,m.canMove,false);
 } else if(page==='appearance') {
  add('original','Original map colors',310,132,590,154,m.canStyle,m.background===false,'Preserve faint streets and map detail','sun');
  add('clear','Clear dark background',924,132,636,154,m.canStyle,m.background===true,'Let the road show through dark map areas','contrast');
  add('rounded','Rounded',1016,350,246,92,m.canCorners,m.corners===true,'','round');
  add('square','Square',1280,350,246,92,m.canCorners,m.corners===false,'','square');
 } else if(page==='startup') {
  add('route-free-hud','Apple Maps on HUD',310,142,700,124,m.canStartup&&m.canDisplay,!m.startup&&m.target==='hud','Use the separate map at CarPlay connection','hud');
  add('startup-off','Separate map stream',310,286,700,124,m.canStartup,!m.startup,'Keep dashboard mirroring off','map');
 } else if(page==='support') {
  add(m.canEnable?'enable':'disable',m.canEnable?'Enable map':'Disable map',310,144,390,98,m.canEnable||m.canDisable,false,m.canEnable?'Activate the map tool':'Restore normal map behavior','map');
  add('capture',m.captureButton,718,144,418,98,m.canCapture,false,'Record the map connection','record');
  add('nav:details','Connection details',1154,144,406,98,true,false,'Read the latest tool messages','info');
  add('restore-defaults','Restore BMW defaults',1154,362,406,86,m.canRestore,false,'HUD, cluster and startup effects','power');
  add('classic','Classic settings',310,362,390,86,true,false,'Use the standard BMW list controls','layout');
  if(m.canRestart)add('restart','Restart head unit',718,362,418,86,true,false,'Required to apply pending setup','power');
 } else if(page==='details') {
  add('logs-prev','Previous',310,450,210,66,logPage>0);
  add('logs-next','Next',538,450,210,66,(logPage+1)*8<m.logs.length);
 }
 return items;
}
function fit(text,size,max,font) {
 const f=fonts.get(font||'label',size),measure=s=>fonts.measure(f,s)*size/f.size;
 let s=String(text||'').replace(/\s+/g,' ');
 if(measure(s)<=max)return s;
 while(s.length&&measure(s+'…')>max)s=s.slice(0,-1);
 return s+'…';
}
function frame(m,page,focus,logPage,textScale) {
 const r=new kit.Recorder(W,H,{textScale:textScale||1}),items=layout(m,page,logPage||0);
 const text=(s,x,y,size,color,max,font)=>r.text(fit(s,size,max||1300,font),x,y,size,color||C.text,{font:font||'label'});
 r.clear(C.bg);r.gradientRect(260,0,W-260,H,[[0,'#15253a'],[.6,C.bg],[1,'#070a10']]);
 r.fillRect(0,0,260,H,C.nav);r.line(260,22,260,H-26,1,C.edge);
 // Small motorsport accents; no claim of BMW authorship or proprietary assets.
 ['#55c3f1','#3659ba','#e34e59'].forEach((c,i)=>r.fillRect(30+i*17,542,12,20,c));
 text('CARPLAY HUD',96,558,16,C.dim,145,'bold');
 const title={overview:'Your cockpit. Your choice.',layout:'Map layout',appearance:'Map appearance',startup:'CarPlay startup',support:'Help & setup',details:'Connection details'}[page]||'CarPlay HUD';
 text(title,304,56,30,C.text,646,'bold');
 const st=status(m);r.roundRect(970,28,322,42,21,'#132a3c');r.circle(990,49,5,m.state==='showing'?C.green:m.state==='frozen'?C.amber:C.blue);text(st,1006,56,18,C.text,267);
 text({overview:'Everything you need, one touch away.',layout:'Set the map size and position on your windshield.',appearance:'Choose the look that is easiest to read.',startup:'A saved preference for your next connection.',support:'One action restores BMW displays; your saved designs are kept.',details:'Live messages from the installed map tool.'}[page],304,91,21,C.dim,1180);
 function panel(x,y,w,h){r.card(x,y,w,h,12,[[0,'#1a2738'],[1,'#101924']]);r.strokeRoundRect(x,y,w,h,12,1,C.edge);}
 function preview(x,y,w,h){
  panel(x,y,w,h);text('LAYOUT PREVIEW',x+24,y+32,16,C.dim,w-40,'bold');
  const bx=x+32,by=y+57,bw=w-64,bh=h-89;
  r.strokeRoundRect(bx,by,bw,bh,28,2,'#466078');
  r.line(bx+22,by+bh-30,bx+bw-22,by+bh-30,2,'#33495f');
  const width=m.width===null?52:m.width===0?57:m.width;
  const mw=bw*width/100,mh=Math.min(bh*.65,mw*480/1088);
  const dx=(m.offset?m.offset[0]:0)*bw/800,dy=(m.offset?m.offset[1]:0)*bh/480;
  const mx=Math.max(bx+6,Math.min(bx+bw-mw-6,bx+(bw-mw)/2+dx));
  const my=Math.max(by+6,Math.min(by+bh-mh-40,by+(bh-mh)/2-10+dy));
  r.roundRect(mx,my,mw,mh,7,'#16486b');r.strokeRoundRect(mx,my,mw,mh,7,2,C.blue);
  r.line(mx+mw*.18,my+mh*.8,mx+mw*.43,my+mh*.4,3,'#98cce9');r.line(mx+mw*.43,my+mh*.4,mx+mw*.85,my+mh*.4,3,'#98cce9');
  r.line(mx+mw*.6,my+mh*.1,mx+mw*.6,my+mh*.88,1,'#4c7c9b');
  text('MAP',mx+Math.max(8,mw*.18),my+mh*.33,Math.min(19,mh*.22),C.text,mw*.7,'bold');
  text('BMW speed & signs',bx+Math.max(12,bw*.28),by+bh-10,15,C.muted,bw*.65);
 }
 if(page==='overview') {
  preview(310,112,654,294);panel(980,112,596,168);text('DISPLAY OUTPUT',998,148,18,C.dim,540,'bold');
  text('PERSONALIZE YOUR COCKPIT',998,297,17,C.dim,540,'bold');
 } else if(page==='layout') {
  preview(310,112,462,328);text(m.width===null?'Waiting for tool':m.width===0?'Standard width':m.width+'% map width',338,478,30,C.text,420,'bold');
  text(m.offset?'Position  '+m.offset[0]+' / '+m.offset[1]+' px':'Waiting for position',338,509,19,C.dim,420);
  panel(784,112,393,394);text('SIZE',800,149,18,C.dim,360,'bold');panel(1196,112,380,394);text('POSITION',1228,149,18,C.dim,320,'bold');
  text('Changes rectangle size, not street zoom.',800,477,16,C.dim,361);
 } else if(page==='appearance') {
  panel(310,310,1250,188);text('MAP CORNERS',338,351,18,C.dim,600,'bold');text('A shape that suits your view.',338,392,29,C.text,650);text('Clear background may hide faint roads.',338,454,21,C.amber,620);
 } else if(page==='startup') {
  panel(1034,142,526,354);text('SECOND MAP STARTUP',1064,180,19,C.dim,455,'bold');
  text('Install Waze on cluster 0.7.115 or newer.',1064,229,22,C.text,455);
  text('Route-free startup: verified CarPlay build only.',1064,270,20,C.amber,455);
  text('Your normal secondary map stays separate',1064,336,19,C.dim,455);
  text('from calls and the main CarPlay screen.',1064,370,19,C.dim,455);
  text('No destination or active route is required.',1064,447,19,C.dim,455);
  text(m.startupResult,328,457,22,C.dim,670);
 } else if(page==='support') {
  text(m.captureText,326,288,22,C.dim,1180);text('Map settings are saved automatically after confirmation.',326,325,21,C.dim,1180);
  text('Need help? Share the status shown above or a diagnostic capture.',310,504,21,C.dim,1230);
 } else if(page==='details') {
  panel(310,118,1250,316);m.logs.slice((logPage||0)*8,(logPage||0)*8+8).forEach((s,i)=>text(s,332,151+i*37,20,C.dim,1204));
  text('Page '+((logPage||0)+1),1350,491,22,C.dim,180);
 }
 function icon(name,x,y,col){
  const line=(a,b,c,d)=>r.line(x+a,y+b,x+c,y+d,2.3,col);
  if(['up','down','left','right','arrow'].indexOf(name)>=0){
   if(name==='up'){line(-9,5,0,-5);line(0,-5,9,5);}else if(name==='down'){line(-9,-5,0,5);line(0,5,9,-5);}else if(name==='left'){line(5,-9,-5,0);line(-5,0,5,9);}else{line(-5,-9,5,0);line(5,0,-5,9);}return;
  }
  if(name==='power'){r.arc(x,y,10,12,35,325,col);line(0,-16,0,0);}
  else if(name==='sun'||name==='contrast'){r.circle(x,y,8,col);for(let i=0;i<8;i++){const a=i*Math.PI/4;line(Math.cos(a)*12,Math.sin(a)*12,Math.cos(a)*16,Math.sin(a)*16);}}
  else if(name==='hud'||name==='cluster'){r.strokeRoundRect(x-17,y-10,34,23,name==='hud'?7:3,2,col);line(-9,5,9,5);}
  else if(name==='layout'){[-9,4].forEach(a=>[-10,3].forEach(b=>r.strokeRoundRect(x+a,y+b,10,10,1,1.5,col)));}
  else if(name==='round'||name==='square')r.strokeRoundRect(x-12,y-12,24,24,name==='round'?7:0,2,col);
  else if(name==='center'){r.circle(x,y,4,col);r.strokeRoundRect(x-13,y-13,26,26,3,2,col);}
  else if(name==='record'){r.circle(x,y,11,col);r.circle(x,y,5,C.panel);}
  else {r.strokeRoundRect(x-13,y-13,26,26,13,2,col);text(name==='help'?'?':'i',x-4,y+7,20,col,16,'bold');}
 }
 for(let i=0;i<items.length;i++){
  const b=items[i],nav=b.id.indexOf('nav:')===0&&b.x<260,focused=i===focus,col=b.enabled?C.text:C.muted;
  const bg=b.id==='apply-current'?'#156498':b.selected?C.deep:nav?C.nav:C.panel;
  r.roundRect(b.x,b.y,b.w,b.h,nav?7:10,bg);
  if(focused&&b.enabled)r.strokeRoundRect(b.x+1,b.y+1,b.w-2,b.h-2,nav?7:10,3,C.blue);
  else if(!nav)r.strokeRoundRect(b.x,b.y,b.w,b.h,10,1,b.selected?C.blue:C.edge);
  if(nav&&b.selected)r.fillRect(b.x,b.y+14,3,b.h-28,C.blue);
  const iconOnly=['up','down','left','right','center'].indexOf(b.id)>=0;
  if(iconOnly){icon(b.icon,b.x+b.w/2,b.y+b.h/2,col);continue;}
  if(b.icon)icon(b.icon,b.x+30,b.y+(b.sub?34:b.h/2),b.selected?C.blue:col);
  const tx=b.x+(b.icon?58:18),size=nav?23:b.w<140?19:b.h>120?30:b.w<300?23:27;
  text(b.label,tx,b.y+(b.sub?b.h>120?54:b.h<=80?29:38:b.h/2+size*.34),size,col,b.w-(b.icon?78:34),'bold');
  if(b.sub)text(b.sub,tx,b.y+(b.h>120?94:b.h>90?70:b.h-14),b.h>120?22:18,b.enabled?C.dim:C.muted,b.w-(b.icon?78:34));
  if(b.selected&&!nav&&b.h>120){r.circle(b.x+b.w-27,b.y+26,7,C.blue);}
 }
 r.line(284,535,1576,535,1,C.edge);
 const note=m.busy?'Applying and saving your changes…':m.target!=='hud'&&['layout','appearance'].indexOf(page)>=0?'Select Windshield HUD in Overview to use these controls.':page==='appearance'&&!m.canStyle?'Appearance changes apply to the normal HUD map stream.':m.notice;
 text(note,306,565,19,m.busy?C.blue:/fail|not confirm|could not|unavailable/i.test(note)?C.amber:C.dim,1240);
 text('LIVE CHANGES',1050,89,16,C.green,210,'bold');
 return {record:r,items};
}
module.exports={W,H,C,tabs,model,status,layout,frame};
