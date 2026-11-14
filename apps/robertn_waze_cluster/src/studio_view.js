// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const kit=require('./kit_record.js'),M=require('./studio_model.js'),T=require('./cockpit_theme.js'),P=require('./cluster_previews.js');
const QR=require('./qrcodegen.js'),{videoOp}=require('./mgu_render_client.js');
const PAGES=[['gallery','Themes'],['edit','Widgets'],['style','Colors & units'],['intro','Startup'],['library','Saved designs'],['output','Cluster output']];
const TITLES={gallery:'Choose your cluster',edit:'Your side widgets',metric:'Choose a reading',style:'Make it yours',intro:'Startup',library:'Your saved designs',phone:'Your saved designs',output:'Cluster output',tools:'More features',features:'Vehicle interfaces',assistance:'BMW assistance preferences',media:'Phone video'};
function items(s){
 const a=[],add=(id,label,x,y,w,h,enabled,extra)=>a.push(Object.assign({id,label,x,y,w,h,enabled:enabled!==false},extra||{}));
 const status=s.client.status,ready=s.ready(),d=s.design,media=status&&status.media;
 add('navigate-back','Back',18,20,202,58);
 add('live-toggle','Live changes: '+(s.liveChanges?'On':'Off'),1060,20,252,58,true,{selected:s.liveChanges});
 add('apply','Save changes',1328,20,254,58,ready);
 if(s.page==='media'&&s.videoFull&&media&&media.playing&&media.target==='center'&&s.videoSupported){add('media-stop','Stop video',18,510,202,48,!!media.active&&!s.client.pending);return a;}
 PAGES.forEach((p,i)=>add('page:'+p[0],p[1],18,100+i*66,202,56,true,{selected:s.page===p[0]}));
 add('page:tools','More features',18,510,202,48);
 if(s.page==='gallery'){
  M.THEMES.slice(s.galleryPage*3,s.galleryPage*3+3).forEach((t,i)=>add('theme:'+t.id,t.name,248+i*446,146,426,290,true,{theme:t,selected:d.theme===t.id}));
  add('gallery-prev','Previous',248,464,220,56,s.galleryPage>0);add('gallery-next','Next',484,464,220,56,(s.galleryPage+1)*3<M.THEMES.length);add('go:output','Use this cluster',1222,464,360,56,ready);
 }else if(s.page==='edit'){
  d.widgets.forEach((k,i)=>add('widget:'+i,(i<2?'Left ':'Right ')+(i%2+1)+' · '+M.LABELS[k],248+(i%2)*670,170+Math.floor(i/2)*114,650,90,d.theme!=='map_focus'));
  add('undo','Undo',248,438,210,58,s.history.length>0);add('redo','Redo',476,438,210,58,s.redo.length>0);
 }else if(s.page==='metric'){
  M.METRICS.slice((s.metricPage||0)*12,(s.metricPage||0)*12+12).forEach((k,i)=>add('metric:'+k,M.LABELS[k],248+(i%3)*446,154+Math.floor(i/3)*77,426,64,true,{selected:d.widgets[s.widgetSlot]===k}));
  add('metric-prev','Previous',248,474,220,52,(s.metricPage||0)>0);add('metric-next','Next',486,474,220,52,((s.metricPage||0)+1)*12<M.METRICS.length);
 }
 else if(s.page==='style'){
  [['palette','Palette: '+d.palette],['accent','Accent: '+(d.accent==='source'?'Original theme':d.accent)],['units','Speed & distance: '+d.units],['temperature','Temperature: °'+d.temperatureUnit]].forEach((b,i)=>add(b[0],b[1],930,158+i*83,650,66));
 }else if(s.page==='intro')add('intro-toggle','Needle sweep: '+(d.startup?'On':'Off'),280,340,900,78,d.theme!=='map_focus',{selected:d.startup});
 else if(s.page==='library'||s.page==='phone')for(let i=0;i<5;i++){const d=status&&status.slots&&status.slots[i],theme=d&&M.THEMES.find(t=>t.id===d.theme);add('save-slot:'+i,'Save '+(i+1),248,152+i*70,210,56,ready);add('load:'+i,theme?theme.name+' · '+d.palette:'Empty slot',480,152+i*70,1094,56,!!theme&&ready);}
 else if(s.page==='output'){
  add('enable','Enable selected source cluster',280,292,820,70,ready&&status.canSelectPanel,{primary:true});
  add('off','Restore BMW gauges',280,380,820,70,!!status&&!s.client.pending);
  add('retry','Retry source cluster',1120,292,450,70,ready&&status.canRetry);
 }else if(s.page==='tools'){
  [['page:features','Vehicle feature scan'],['page:assistance','BMW assistance preferences'],['page:media','Phone video'],['go:output','Restore BMW / cluster output']].forEach((b,i)=>add(b[0],b[1],280,160+i*82,1280,66));
 }else if(s.page==='features')add('scan','Scan vehicle interfaces',1110,158,440,68,!!status&&status.parked&&!s.client.pending);
 else if(s.page==='media'){
  add('media-target','Display: '+s.mediaTarget,1040,150,514,58,!media||!media.active);
  add('media-start','Start session',1040,223,246,58,!!status&&status.parked&&!s.client.pending&&!(media&&media.active)&&s.mediaTarget!=='panel'&&(s.mediaTarget!=='center'||s.videoSupported));
  add('media-stop','Stop',1302,223,252,58,!!media&&media.active&&!s.client.pending);
  ['left','up','right','down','size','reset'].forEach((k,i)=>add('video:'+k,k,1040+(i%3)*176,300+Math.floor(i/3)*66,164,54,media&&media.active&&!['center','design'].includes(media.target)));
  add('video-full','Full-screen movie',1040,450,514,58,!!(media&&media.playing&&media.target==='center'&&s.videoSupported));
 }
 return a;
}
function frame(s,focus,scale){
 const r=new kit.Recorder(1600,580,{textScale:scale||1}),buttons=items(s),d=s.design,status=s.client.status;
 const text=(a,x,y,z,c,w,center)=>T.text(r,String(a||''),x,y,z,c||'#eef4ff',w||1260,!!center);
 T.background(r);text('SOURCE CLUSTER / X4 M',248,35,15,'#9cb9db',760);text(TITLES[s.page]||'Cluster Studio',248,74,32,'#f0f5ff',760);
 text(d.theme==='map_focus'?'Full-screen CarPlay map. Factory warning strip retained. Vehicle verification pending.':'BMW center and warning areas kept clear. X4 M vehicle verification pending.',248,118,19,'#c4b897',1320);
 buttons.forEach((b,i)=>T.button(r,Object.assign({},b,{label:b.theme?'':b.label}),i===focus));
 const preview=(theme,palette,x,y,w,h)=>{r.fillRect(x,y,w,h,'#000000');const img=P.get(theme,palette);if(img)r.image(img,x,y,w,h,6);else{text('Theme picture unavailable',x+w/2,y+h/2,20,'#9eafc8',w-20,true);text('Update Cluster Studio',x+w/2,y+h/2+30,16,'#9eafc8',w-20,true);}};
 if(s.page==='gallery'){
  buttons.filter(b=>b.theme).forEach(b=>{preview(b.theme.id,d.palette,b.x+12,b.y+14,b.w-24,151);text(b.theme.name,b.x+20,b.y+205,28,'#ffffff',b.w-40);text(b.theme.source,b.x+20,b.y+239,17,'#aec5df',b.w-40);text(b.selected?'SELECTED':'Select theme',b.x+20,b.y+273,16,b.selected?'#83cfb6':'#bdcbe0',b.w-40);});
  text('Page '+(s.galleryPage+1)+' of '+Math.ceil(M.THEMES.length/3)+' · '+M.THEMES.length+' source themes',756,500,20,'#b7c8e1',450);
 }else if(s.page==='style'){
  preview(d.theme,d.palette,270,195,625,234);text('Palette preview · sample readings',270,461,19,'#9eb6d5',620);text('Custom accents apply to the cluster.',270,491,18,'#9eb6d5',620);
 }else if(s.page==='edit'){
  text(d.theme==='map_focus'?'Map layout: RPM bottom left, oil temperature bottom right.':'Four side readings. Fuel percentage is included by default in every theme.',250,146,20,'#b8cbe2',1320);
  text('Unknown or stale readings show --. No inferred safety or warning states.',250,528,18,'#b8cbe2',1320);
 }else if(s.page==='intro'){
  text(d.theme==='map_focus'?'The map opens with live readings. No needle sweep.':'Optional needle sweep, once at startup.',280,206,30,'#edf4ff',1260);
  text(d.theme==='map_focus'?'Works in Drive. Cruise control does not switch this layout.':'Skipped outside Park. Leaving Park cancels the sweep and shows live readings.',280,260,21,'#b7cae3',1260);
  text('Custom gauges themselves do not require Park.',280,304,21,'#b7cae3',1260);
 }else if(s.page==='output'){
  text(status&&status.enabled?'Source cluster enabled':'BMW gauges active',280,190,32,'#edf4ff',1200);
  text(status&&status.state||'Waiting for Cluster Studio',280,242,21,'#b7cae3',1270);
  text('Saved themes resume when fresh vehicle readings and the renderer are ready.',280,490,20,'#b7cae3',1270);
  text('This changes the instrument cluster only.',280,524,19,'#b7cae3',1270);
 }else if(s.page==='features'){
  const f=status&&status.features;text('Read-only interface scan',280,190,28,'#edf4ff',800);
  (f&&f.rows||[]).slice(0,6).forEach((v,i)=>text(v.name+(v.setter?' · setter declared':''),280,252+i*38,20,'#b7cae3',1260));
  text('NOT VERIFIED · An interface declaration does not prove a vehicle control works.',280,526,19,'#dec59c',1280);
 }else if(s.page==='assistance'){
  const fresh=status&&Date.now()-(s.client.statusAt||0)<2000,a=fresh&&status.assistance;
  (a&&a.preferences||[{label:'Waiting for BMW assistance preferences'}]).slice(0,8).forEach((p,i)=>{const x=268+(i%2)*660,y=165+Math.floor(i/2)*84;r.roundRect(x,y,638,70,9,'#16243b');text(p.label,x+18,y+28,20,'#b7cae3',600);text(({on:'On in BMW settings',off:'Off in BMW settings',unavailable:'Unavailable'})[p.value]||'Waiting for fresh data',x+18,y+56,18,'#b7cae3',600);});
  text('Preferences only. Live assistance and warnings remain on BMW display.',280,526,19,'#dec59c',1280);
 }else if(s.page==='media'){
  const m=status&&status.media,url=m&&m.urls&&m.urls[0];
  if(url){const q=QR.QrCode.encodeText(url,QR.QrCode.Ecc.MEDIUM),cell=Math.floor(300/(q.size+8)),x=280,y=170;r.fillRect(x,y,cell*(q.size+8),cell*(q.size+8),'#ffffff');for(let yy=0;yy<q.size;yy++)for(let xx=0;xx<q.size;xx++)if(q.getModule(xx,yy))r.fillRect(x+(xx+4)*cell,y+(yy+4)*cell,cell,cell,'#000000');text('Scan with the phone connected to car Wi-Fi',610,230,22,'#b7cae3',390);}
  else{text('Saved clips and direct video links',280,215,28,'#edf4ff',740);text('Start a supervised parked session, then scan the code.',280,270,21,'#b7cae3',740);}
  text(m&&m.note||'No video session',280,505,20,'#b7cae3',730);
  if(s.videoFull&&m&&m.playing&&m.target==='center'&&s.videoSupported){r.fillRect(248,140,1328,375,'#000000');const op=videoOp(9001,248,140,1328,375,0);r._grow(op.length);r.u.set(op,r.n);r.n+=op.length;}
 }
 text(s.editStatus(),248,563,17,s.dirty?'#f0c58b':'#abc5df',1310);
 return {record:r,items:buttons};
}
module.exports={frame,items,TITLES};
