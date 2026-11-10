// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const kit=require('./kit_record.js'),T=require('./cockpit_theme.js'),Car=require('./car_model.js');
const APPS=[
 ['open-studio','My gauges','gauge','display'],['go:layout','HUD layout','hud','display'],['go:startup','CarPlay startup','power','display'],
 ['studio:edit','Arrange widgets','widgets','display'],['studio:style','Colors & dials','sun','display'],['studio:intro','Welcome','play','display'],
 ['studio:library','My designs','save','display'],['studio:phone','Phone designer','phone','display'],['studio:output','Display output','gauge','display'],
 ['go:vehicle','Live vehicle','car','vehicle'],['vehicle:tires','Tire pressure','tire','vehicle'],['vehicle:journey','Fuel & journey','fuel','vehicle'],
 ['go:climate','Climate','fan','comfort'],['studio:features','Lighting & scan','sun','comfort'],['studio:assistance','Assistance settings','car','vehicle'],
 ['studio:media','Phone video','play','comfort'],['go:appearance','Map appearance','sun','display'],['go:support','Help & restore','info','vehicle']
];
const CLIMATE=[
 ['Air conditioning',['Driver temperature','Passenger temperature','Fan speed','AUTO mode','A/C','MAX A/C','Recirculation','Airflow direction','Front defrost','Rear window heat','Temperature sync','Vent temperature']],
 ['Seats & comfort',['Driver seat heating','Passenger seat heating','Driver ventilation','Passenger ventilation','Steering-wheel heat','Seat heat balance','Automatic seat heating','Automatic seat cooling','Armrest heating','Air quality','Automatic recirculation','Cabin temperature']],
 ['Rear climate',['Rear climate on / off','Rear driver temperature','Rear passenger temperature','Rear fan speed','Rear AUTO','Rear seat heating left','Rear seat heating right','Rear airflow','Rear A/C','Rear control lock','Parked ventilation','Residual heat']]
];
const AIR_NAMES=['Footwell','Face vents','Face + footwell','Windshield','Screen + footwell','Screen + face','All vents','AUTO'];
const CONTROL_IDS=['ac','maxAC','defrost','freshAir','autoDR','autoPS','airDR','airPS'];
function control(m,id){const c=m.helper&&m.helper.climate;return m.helperFresh&&c&&c.controls&&c.controls.find(v=>v.id===id);}
function climateLabel(c){if(!c||c.value==null)return c&&c.reason||'Waiting for car';if(c.choices&&c.choices[c.value])return c.choices[c.value];return c.id==='freshAir'?['Fresh air','Automatic','Recirculate'][c.value]:/^air/.test(c.id)?AIR_NAMES[c.value]:c.value?'On':'Off';}
function state(m){return m.cockpit||{};}
function appList(m){const s=state(m);return APPS.filter(a=>!s.category||s.category==='all'||a[3]===s.category);}
function items(m,page){
 const s=state(m),a=[],add=(id,label,x,y,w,h,enabled,extra)=>a.push(Object.assign({id,label,x,y,w,h,enabled:enabled!==false},extra));
 add('navigate-back','Back',16,10,164,48,true,{icon:'back'});T.dock(a,page);
 if(page==='overview'){
  const set=s.homePage||0;
  const rows=set===0?[['open-studio','MY GAUGES','gauge'],['car:surface','MY BMW','car'],['go:layout','HEAD-UP DISPLAY','hud']]:[['go:climate','CLIMATE & COMFORT','fan'],['studio:library','MY DESIGNS','save'],['studio:features','LIGHTING & FEATURES','sun']];
  rows.forEach((v,i)=>add(v[0],v[1],set?198+i*454:[198,514,1260][i],104,set?438:[296,730,302][i],344,true,{hero:true,icon:v[2],index:i}));
  if(!set)[['left','Left'],['right','Right'],['mode',s.car&&s.car.mode==='move'?'Rotate':'Move'],['out','-'],['in','+'],['reset','Reset'],['readings','Data']].forEach((v,i)=>add(v[0]==='readings'?'go:vehicle':'car:'+v[0],v[1],514+i*105,458,97,44,true,{selected:v[0]==='mode'&&s.car&&s.car.mode==='move'}));
  add('home-prev','Previous',206,458,148,44,set>0);add('home-next','Next',1390,458,148,44,set<1);
 }else if(page==='apps'){
  [['all','All apps'],['display','Displays'],['vehicle','Vehicle'],['comfort','Comfort']].forEach((v,i)=>add('category:'+v[0],v[1],18,102+i*94,152,80,true,{chrome:'rail',icon:['apps','gauge','car','fan'][i],selected:(s.category||'all')===v[0]}));
  const list=appList(m),p=Math.min(s.appPage||0,Math.max(0,Math.ceil(list.length/12)-1));
  list.slice(p*12,p*12+12).forEach((v,i)=>add(v[0],v[1],214+i%6*224,114+Math.floor(i/6)*164,210,146,true,{app:true,icon:v[2]}));
  add('apps-prev','Previous',1204,458,158,44,p>0);add('apps-next','Next',1378,458,158,44,(p+1)*12<list.length);
 }else if(page==='vehicle'){
  ['engine','tires','journey'].forEach((v,i)=>add('vtab:'+v,{engine:'Engine',tires:'Tires',journey:'Fuel & journey'}[v],20,114+i*108,164,90,true,{chrome:'rail',icon:{engine:'car',tires:'tire',journey:'fuel'}[v],selected:(s.vehicleTab||'engine')===v}));
  add('studio:edit','Customize gauges',238,451,266,50,true);add('studio:output','Display output',520,451,266,50,true);
 }else if(page==='climate'){
  CLIMATE.forEach((v,i)=>add('ctab:'+i,['Air & temperature','Seats & comfort','Rear climate'][i],18,114+i*108,170,90,true,{chrome:'rail',icon:i===1?'seat':'fan',selected:(s.climateTab||0)===i}));
  if(!(s.climateTab||0)){
   const labels=['A/C','MAX A/C','Front defrost','Cabin air','Driver AUTO','Passenger AUTO','Driver airflow','Passenger airflow'];
   CONTROL_IDS.forEach((id,i)=>{const c=control(m,id),pending=s.climateBusy||m.helper&&m.helper.climate&&m.helper.climate.pending;add('climate-set:'+id,labels[i],222+i%4*340,169+Math.floor(i/4)*100,324,86,!!(c&&c.available&&!pending),{climate:true,value:climateLabel(c),selected:!!(c&&c.value>0),controlId:id});});
   ['Driver temperature','Passenger temperature','Fan speed','Temperature sync'].forEach((v,i)=>add('climate-unverified:'+i,v,222+i*340,369,324,62,false,{climate:true,value:'Command mapping pending'}));
  }else {
   const ids=s.climateTab===1?['heatDR','heatPS','ventDR','ventPS','heatDRR','heatPSR']:['rearPower','rearAuto','rearFan','rearAir','rearAC','rearLock','heatDRR','heatPSR'];
   const pending=s.climateBusy||m.helper&&m.helper.climate&&m.helper.climate.pending;
   ids.forEach((id,i)=>{const c=control(m,id);add('climate-set:'+id,(c&&c.label)||({heatDR:'Driver seat heating',heatPS:'Passenger seat heating',ventDR:'Driver ventilation',ventPS:'Passenger ventilation',heatDRR:'Rear left seat heating',heatPSR:'Rear right seat heating',rearPower:'Rear climate',rearAuto:'Rear AUTO',rearFan:'Rear fan speed',rearAir:'Rear airflow',rearAC:'Rear A/C',rearLock:'Rear control lock'}[id]),222+i%4*340,169+Math.floor(i/4)*92,324,78,!!(c&&c.available&&!pending),{climate:true,value:climateLabel(c),selected:!!(c&&c.value>0),controlId:id});});
   const planned=s.climateTab===1?['Steering-wheel heat','Seat heat balance','Automatic seat heating','Automatic seat cooling','Armrest heating','Air quality']:['Rear driver temperature','Rear passenger temperature','Parked ventilation','Residual heat'];
   planned.forEach((v,j)=>{const i=ids.length+j;add('climate-unverified:'+i,v,222+i%4*340,169+Math.floor(i/4)*92,324,78,false,{climate:true,value:'Command mapping pending'});});
  }
  add('studio:features','Check car capabilities',1100,458,442,46,true);
 }
 return a;
}
function frame(m,page,focus,scale){
 const r=new kit.Recorder(1600,580,{textScale:scale||1}),s=state(m),buttons=items(m,page),C=T.C;
 const txt=(v,x,y,z,c,w,center)=>T.text(r,v,x,y,z,c,w,center);
 // First paint contains working controls and a vector car. Upload the detailed
 // artwork after the renderer has acknowledged that first frame.
 const car=(area)=>{
  const p=s.car||Car.pose(),w=area.w*p.zoom,h=w/2,x=area.x+(area.w-w)/2+p.x,y=area.y+(area.h-h)/2+p.y;
  r.clip(area.x,area.y,area.w,area.h);
  if(m.deferArtwork)T.icon(r,'car',area.x+area.w/2,area.y+area.h/2,T.C.active,60);
  else r.image(m.carImage||require('./cockpit_car.js')(),x,y,w,h);
  r.noclip();
 };
 T.background(r);
 txt({overview:'MY COCKPIT',apps:'ALL APPS',vehicle:'LIVE VEHICLE',climate:'CLIMATE & COMFORT'}[page],214,41,23,C.text,650);
 const connected=!!m.helperFresh,raw=connected&&m.helper&&m.helper.data||{};
 txt(connected?'HELPER ONLINE':'OFFLINE',1428,40,17,connected?'#a5dbcf':C.dim,250,true);
 txt('X4 M  /  COMPETITION',25,550,18,C.muted,350);
 txt('Your personal cockpit',1368,550,17,C.dim,218);
 function value(key,unit,precision){let n=raw[key];const d=m.helper&&m.helper.design||{};if(unit==='km'&&d.units==='mph'){n=n==null?n:n/1.609344;unit='mi';}if(unit==='°C'&&d.temperatureUnit==='F'){n=n==null?n:n*1.8+32;unit='°F';}if(unit==='bar'&&['psi','kPa'].includes(raw.pressureUnit)){n=n==null?n:n*(raw.pressureUnit==='psi'?14.5037738:100);unit=raw.pressureUnit;}return Number.isFinite(n)?(precision?n.toFixed(precision):String(Math.round(n)))+(unit?' '+unit:''):'—';}
 if(page==='overview'){
  buttons.filter(b=>b.hero).forEach((b,i)=>{
   T.slant(r,b.x-20,b.y,b.w+20,b.h,i===1?'#405587':'#253753',62);
   T.slant(r,b.x+b.w-65,b.y,30,b.h,'#687fae',62);
   if(!s.homePage&&i===1){
    txt('MY BMW',b.x+30,b.y+34,24,C.text,220);txt('X4 M COMPETITION',b.x+b.w-270,b.y+34,17,C.muted,250);
    car(Car.rect(page,s));
    txt(m.carError?'Update Cluster Studio to load all angles':(s.car&&s.car.mode==='move'?'Drag to move · Rotate switches back':'Drag the car to rotate · 360°'),b.x+b.w/2,b.y+327,17,m.carError?C.amber:C.muted,b.w-36,true);
   }
   else if(!s.homePage&&i===0){
    r.arc(b.x+b.w/2,b.y+143,70,73,145,395,'#89a7eb');r.arc(b.x+b.w/2,b.y+143,64,66,145,325,'#4e689e');txt('PERSONAL',b.x+b.w/2,b.y+129,16,C.muted,220,true);txt('STUDIO',b.x+b.w/2,b.y+166,29,C.text,250,true);txt('Your gauges. Your layout.',b.x+24,b.y+292,17,C.muted,b.w-40);
   }else if(!s.homePage){r.strokeRoundRect(b.x+34,b.y+65,b.w-68,150,15,2,'#9cb7dd');r.polyline([[b.x+64,b.y+184],[b.x+130,b.y+111],[b.x+225,b.y+111]],5,'#8fbbff');T.icon(r,'hud',b.x+b.w/2,b.y+251,C.active,25);txt('Apple Maps, independently.',b.x+20,b.y+292,17,C.muted,b.w-30);}
   else{T.icon(r,b.icon,b.x+210,b.y+142,C.active,85);txt(['Air, seats and cabin features','Keep five personal layouts','See what your car supports'][i],b.x+36,b.y+292,20,C.muted,370);}
   if(s.homePage||i!==1)txt(b.label,b.x+24,b.y+326,s.homePage?23:20,C.text,b.w-40);
   if(buttons.indexOf(b)===focus)r.line(b.x+24,b.y+b.h,b.x+b.w-40,b.y+b.h,3,C.active);
  });
  if(s.homePage){[0,1].forEach(i=>r.circle(796+i*20,480,4,i===(s.homePage||0)?C.active:C.dim));txt('Choose a card or open All apps',800,500,17,C.dim,700,true);}
 }else if(page==='apps'){
  txt('Everything in one place',220,91,20,C.muted,1000);
  const count=appList(m).length;txt(count+' features  ·  Page '+((s.appPage||0)+1)+' / '+Math.ceil(count/12),224,486,19,C.muted,850);
 }else if(page==='vehicle'){
  const tab=s.vehicleTab||'engine';
  txt('Your BMW. At a glance.',238,107,31,C.text,600);txt('Your X4 M model · Drag to rotate',238,139,18,C.dim,600);
  T.slant(r,213,168,602,244,'#293d64',110);car(Car.rect(page,s));
  const rows=tab==='tires'?[['Front left',value('pressureFL','bar',1)],['Front right',value('pressureFR','bar',1)],['Rear left',value('pressureRL','bar',1)],['Rear right',value('pressureRR','bar',1)],['Front tire temp.',value('tireTempFL','°C')],['Rear tire temp.',value('tireTempRL','°C')]]:tab==='journey'?[['Fuel level',value('fuel','L')],['Range',value('range','km')],['Odometer',value('odometer','km')],['Journey time',value('tripTime','min')],['Outside',value('outside','°C')],['Fuel warning',raw.fuelWarning||'—']]:[['Engine speed',value('rpm','RPM')],['Drive mode',raw.driveMode||'—'],['Oil',value('oil','°C')],['Coolant',value('coolant','°C')],['Fuel level',value('fuel','L')],['Range',value('range','km')]];
  rows.forEach((v,i)=>{const x=860+i%2*336,y=126+Math.floor(i/2)*108;r.line(x,y+87,x+300,y+87,1,C.line);txt(v[0],x,y+23,19,C.muted,300);txt(v[1],x,y+65,34,C.text,300);});
  txt(connected?'Fresh readings from the car. Unavailable signals show —.':'Connect the car to see live readings. No sample values are shown.',860,490,17,C.muted,680);
 }else if(page==='climate'){
  txt(CLIMATE[s.climateTab||0][0],226,104,31,C.text,850);
  txt(!(s.climateTab||0)?'Tap a control to change it. BMW status confirms each change.':'NOT YET VERIFIED IN CAR · Tap to change a level; BMW must confirm it.',226,139,20,C.muted,1300);
  const climate=connected&&m.helper.climate;txt(s.climateNotice||(climate&&climate.message)||(connected&&!m.helper.climateSupported?'Update Cluster Studio to 0.1.24 for climate controls.':'Connect the car to check available climate controls.'),226,488,18,C.muted,860);txt(s.climateTab?'New seat and rear controls: ready for testing when valid car data is available.':'Front A/C and airflow: confirmed working by owner.',226,451,17,C.amber,850);
 }
 buttons.forEach((b,i)=>{
  if(b.hero)return;
  if(b.app){
   if(i===focus)T.slant(r,b.x,b.y,b.w,b.h,'#344c78',25);
   const colors={gauge:'#737fa4',hud:'#638bb6',fan:'#7d8eb8',sun:'#b28a69',phone:'#9c82aa',play:'#ad7387',car:'#6d99a8',fuel:'#9b9671'};
   T.slant(r,b.x+68,b.y+15,76,72,colors[b.icon]||'#7d80ac',12);T.icon(r,b.icon,b.x+106,b.y+51,C.text,34);
   txt(b.label,b.x+b.w/2,b.y+117,20,C.text,b.w-12,true);
  }else if(b.climate){
   r.fillRect(b.x,b.y,b.w,b.h,b.selected&&b.enabled?'#374d75':'#1b293d');txt(b.label,b.x+16,b.y+27,20,b.enabled?C.text:C.muted,b.w-32);txt(b.value,b.x+16,b.y+b.h-13,b.h<70?16:21,b.enabled?C.active:C.dim,b.w-32);if(i===focus&&b.enabled)r.line(b.x+12,b.y+b.h-2,b.x+b.w-12,b.y+b.h-2,3,C.active);
  }else T.button(r,b,i===focus);
 });
 return {record:r,items:buttons};
}
module.exports={frame,items,APPS,CLIMATE,appList,control,climateLabel};
