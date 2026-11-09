// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const THEMES=[
 ['Alpine','#f3f5ff','#9bbcfb','#141c2c'],['M Sport','#57c5fa','#e64a64','#0d1725'],
 ['Amber','#ffb85c','#f5724e','#261b16'],['Glacier','#83f0ec','#449bee','#10212b'],
 ['Violet','#c6a4ff','#7467e6','#1d1930'],['Emerald','#89e0b3','#39aeb2','#10251e'],
 ['Crimson','#ff6b78','#ffab86','#28151f'],['Champagne','#e5d4ae','#bda782','#25221c'],
 ['Electric','#c8f760','#71d9bf','#1a2419'],['Monochrome','#ffffff','#a3adbb','#171b22']
];
const LAYOUTS=['Ultra / blue rings','M Competition','Grand touring','Minimal','Panorama','Driver focus','Technical','Night drive','Symmetry','Track paddock'];
const IDRIVE_TEMPLATES=[['id8-sport','iDrive 8 Sport','Angular rails / M colors'],['id8-classic','iDrive 8 Classic','Silver rails / warm accents'],['id8-minimal','iDrive 8 Minimal','Open rails / calm layout']];
const LEGACY_TYPES=['speed','rpm','gear','clock','date','badge','flag','coolant','oil','accent','signature','connection'];
const LABELS={speed:'Speed',rpm:'Engine RPM',gear:'Gear',clock:'Clock',date:'Date',badge:'X4 M badge',flag:'Racing flag',coolant:'Coolant',oil:'Oil temperature',accent:'M stripes',signature:'Signature',connection:'Data status'};
const METRICS={
 fuel:['Gas / fuel percentage','FUEL','fuel'],range:['Fuel range','RANGE','distance'],fuelWarning:['Fuel reserve','FUEL RESERVE','text'],odometer:['Odometer','ODOMETER','distance'],tripTime:['Driving time','DRIVING TIME','duration'],
 outside:['Outside temperature','OUTSIDE','temperature'],battery:['12V battery charge','BATTERY CHARGE','percent'],torque:['Engine torque','ENGINE TORQUE','torque'],power:['Calculated engine power','POWER / CALCULATED','power'],engineState:['Engine status','ENGINE','text'],driveMode:['Driving mode','DRIVING MODE','text'],powerPercent:['Sport power level','SPORT POWER','percent'],torquePercent:['Sport torque level','SPORT TORQUE','percent']
};
for(const pair of [['FL','Front left'],['FR','Front right'],['RL','Rear left'],['RR','Rear right']]){
 METRICS['pressure'+pair[0]]=[pair[1]+' tire pressure',pair[0]+' TIRE','pressure'];
 METRICS['target'+pair[0]]=[pair[1]+' target pressure',pair[0]+' TARGET','pressure'];
 METRICS['tireTemp'+pair[0]]=[pair[1]+' tire temperature',pair[0]+' TIRE','temperature'];
}
const TYPES=LEGACY_TYPES.concat(Object.keys(METRICS));
Object.keys(METRICS).forEach(k=>LABELS[k]=METRICS[k][0]);
const GROUPS=[['Fuel & trip',['fuel','range','fuelWarning','odometer','tripTime','clock','date']],['Engine',['speed','rpm','gear','oil','coolant','torque','power','engineState','powerPercent','torquePercent','driveMode']],['Tires',Object.keys(METRICS).filter(k=>/^(pressure|target|tireTemp)/.test(k))],['Vehicle & style',['outside','battery','badge','flag','accent','signature','connection']]];
function newWidget(type){return {type,x:.40,y:.52,w:.20,h:.13,on:false,locked:false,color:'theme',gauge:'inherit'};}
function placeFuel(d){
 const f=d.widgets.find(w=>w.type==='fuel');if(!f)return d;
 f.on=true;f.w=.18;f.h=.115;
 const occupied=d.widgets.filter(w=>w!==f&&w.on).concat([{x:.35,y:0,w:.30,h:.17},{x:.70,y:.90,w:.10,h:.10}]),candidates=[[.41,.52],[.41,.72],[.04,.02],[.76,.02],[.04,.87],[.76,.85],[.41,.02]];
 const overlap=(a,b)=>Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));
 let best=null,score=Infinity;
 for(const xy of candidates){const box={x:xy[0],y:xy[1],w:f.w,h:f.h},cost=occupied.reduce((n,w)=>n+overlap(box,w),0);if(cost<score){score=cost;best=box;}}
 if(score>1e-8){
  for(const width of [.18,.16]){
   for(let yy=1;yy<=44&&score>1e-8;yy++)for(let xx=1;xx<=Math.floor((.99-width)/.02)&&score>1e-8;xx++){
    const box={x:xx*.02,y:yy*.02,w:width,h:.115},cost=occupied.reduce((n,w)=>n+overlap(box,w),0);if(cost<score){score=cost;best=box;}
   }
   if(score<1e-8)break;
  }
 }
 Object.assign(f,best);return d;
}
function reading(type,d,data){
 const meta=METRICS[type],v=data[type],imperial=d.units==='mph';if(!meta)return null;
 let value=v,unit='',digits=0;
 if(meta[2]==='temperature'){unit='°'+(d.temperatureUnit||'C');if(v!=null&&d.temperatureUnit==='F')value=v*1.8+32;}
 // X4 M's nominal tank is 65 L (BMW technical data). Capacity is saved in
 // the design and editable for a different car. Stale/missing fuel stays unknown.
 if(meta[2]==='fuel'){unit='%';const capacity=d.fuelCapacityLitres;value=Number.isFinite(v)&&v>=0&&v<255&&Number.isFinite(capacity)&&capacity>=10&&capacity<=150?clamp(v/capacity*100,0,100):null;}
 if(meta[2]==='distance'){unit=imperial?'mi':'km';value=v==null?null:imperial?v/1.609344:v;}
 if(meta[2]==='pressure'){unit=imperial?'psi':'bar';value=v==null?null:imperial?v*14.5037738:v;digits=1;}
 if(meta[2]==='percent')unit='%';
 if(meta[2]==='torque'){unit=imperial?'lb-ft':'Nm';value=v==null?null:imperial?v*.737562149:v;}
 if(meta[2]==='power'){unit=imperial?'hp':'kW';value=v==null?null:imperial?v*1.34102209:v;}
 if(meta[2]==='duration'){unit='h:mm';value=v==null?null:Math.floor(v/60)+':'+String(v%60).padStart(2,'0');}
 const valid=typeof value==='string'||Number.isFinite(value);
 return {label:meta[1],value:valid?(typeof value==='number'?value.toFixed(digits):value):'—',unit,available:valid,alert:type==='fuelWarning'&&v==='LOW FUEL'};
}
const ACCENTS=['theme','#ffffff','#57c5fa','#e64a64','#ffb85c','#83f0ec','#c6a4ff','#89e0b3','#e5d4ae','#c8f760'];
const STYLES=[['bmw','BMW original style'],['ring','Sport rings'],['digital','Digital cards'],['bar','Horizontal bars'],['ultra','Ultra rings'],['needle','Classic needles'],['segments','Segmented rings'],['sweep','Racing sweep'],['vertical','Vertical rails'],['minimal','Minimal arc'],['dots','Dot matrix dial'],['id8','iDrive 8 angular'],['id8-slim','iDrive 8 minimal']];
const GAUGES=['inherit'].concat(STYLES.map(s=>s[0]));
const gaugeLabel=id=>id==='inherit'?'Use design style':(STYLES.find(s=>s[0]===id)||[id,id])[1];
const TITLES=['X4 M COMPETITION','ANTONIO / X4 M','BUILT FOR THE DRIVE','MY COMPETITION','MOTORSPORT'];
const minimum=type=>type==='speed'||type==='rpm'?[.18,.36]:type==='accent'?[.04,.02]:[.04,.03];
const clone=v=>JSON.parse(JSON.stringify(v));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function widget(type,x,y,w,h,on){return {type,x,y,w,h,on:on!==false};}
function preset(n){
 n=clamp(Number.isInteger(n)?n:0,0,99);const l=n%10;
 let ws=[widget('speed',.055,.14,.27,.64),widget('rpm',.675,.14,.27,.64),widget('gear',.445,.66,.11,.20),widget('badge',.36,.25,.28,.16),widget('clock',.37,.06,.26,.14),widget('date',.37,.86,.26,.09),widget('flag',.44,.44,.12,.13),widget('coolant',.09,.84,.20,.11,false),widget('oil',.71,.84,.20,.11,false),widget('accent',.36,.95,.28,.025),widget('signature',.34,.48,.32,.10,false),widget('connection',.36,.57,.28,.075,false)];
 const p=(t,x,y,w,h,on)=>{ws[ws.findIndex(a=>a.type===t)]=widget(t,x,y,w,h,on);};
 if(l===0){p('speed',.035,.10,.31,.78);p('rpm',.655,.10,.31,.78);p('badge',.375,.33,.25,.22);p('clock',.40,.02,.20,.09);p('gear',.44,.65,.12,.20,false);p('flag',.44,.44,.12,.13,false);p('accent',.36,.95,.28,.025,false);p('date',.40,.89,.20,.07);}
 if(l===1){p('speed',.05,.23,.32,.56);p('rpm',.51,.08,.44,.68);p('badge',.06,.06,.34,.13);p('gear',.41,.64,.12,.23);p('clock',.06,.84,.24,.12);p('oil',.72,.82,.21,.13,true);p('date',.38,.88,.25,.09,false);}
 if(l===2){p('speed',.08,.20,.28,.59);p('rpm',.64,.20,.28,.59);p('badge',.35,.33,.30,.17);p('coolant',.34,.76,.15,.14,true);p('oil',.51,.76,.15,.14,true);p('gear',.44,.53,.12,.21);p('flag',.45,.18,.1,.10);}
 if(l===3){ws.forEach(a=>a.on=['speed','clock','badge','accent','gear'].includes(a.type));p('speed',.36,.22,.28,.52);p('badge',.31,.78,.38,.13);p('gear',.73,.37,.15,.24);p('clock',.07,.38,.22,.20);}
 if(l===4){p('speed',.02,.20,.27,.58);p('rpm',.71,.20,.27,.58);p('badge',.35,.08,.30,.17);p('flag',.44,.38,.12,.14);p('gear',.445,.65,.11,.20);}
 if(l===5){p('speed',.06,.10,.42,.77);p('rpm',.56,.13,.37,.50);p('gear',.65,.65,.13,.23);p('badge',.52,.83,.42,.12);p('clock',.49,.02,.23,.11);p('date',.72,.04,.22,.09);p('flag',.49,.67,.12,.14);}
 if(l===6){p('speed',.05,.16,.28,.56);p('rpm',.37,.16,.28,.56);p('gear',.75,.13,.17,.25);p('oil',.71,.46,.24,.15,true);p('coolant',.71,.67,.24,.15,true);p('badge',.05,.04,.45,.12);p('clock',.55,.83,.34,.12);p('flag',.30,.82,.12,.13);p('date',.04,.83,.23,.10);}
 if(l===7){ws.forEach(a=>a.on=['speed','rpm','gear','clock','accent'].includes(a.type));p('speed',.10,.28,.32,.43);p('rpm',.58,.28,.32,.43);p('gear',.44,.57,.12,.20);}
 if(l===8){p('speed',.05,.19,.30,.59);p('rpm',.65,.19,.30,.59);p('gear',.44,.46,.12,.23);p('badge',.33,.27,.34,.14);p('flag',.44,.76,.12,.13);p('date',.37,.90,.26,.08);}
 if(l===9){p('rpm',.05,.18,.56,.58);p('speed',.67,.18,.27,.52);p('gear',.68,.70,.12,.20);p('badge',.05,.04,.46,.12);p('clock',.69,.03,.25,.11);p('oil',.43,.81,.20,.13,true);p('coolant',.18,.81,.20,.13,true);p('date',.70,.91,.25,.075,false);p('flag',.81,.77,.12,.13);}
 // Keep starter layouts readable at native size. These positions only affect
 // newly chosen templates; validation leaves the owner's custom moves intact.
 if(l===0)p('clock',.055,.02,.27,.075);
 if(l===1){p('rpm',.59,.12,.36,.65);p('gear',.415,.65,.13,.22);p('badge',.06,.06,.28,.13);p('oil',.81,.82,.17,.13);}
 if(l===2){p('speed',.055,.22,.28,.56);p('rpm',.665,.22,.28,.56);p('badge',.355,.32,.29,.16);p('clock',.075,.045,.25,.11);p('coolant',.34,.77,.15,.12);p('oil',.51,.77,.15,.12);p('date',.37,.90,.26,.045);p('accent',.36,.965,.28,.02);}
 if(l===4){p('clock',.055,.045,.27,.11);p('badge',.35,.20,.30,.16);}
 if(l===5){p('speed',.06,.14,.38,.70);p('rpm',.58,.19,.34,.58);p('gear',.655,.79,.13,.11);p('badge',.46,.22,.12,.15);p('clock',.06,.02,.28,.10);p('flag',.46,.44,.10,.12);}
 if(l===6){p('badge',.05,.04,.28,.12);p('clock',.67,.835,.26,.075);}
 if(l===7)p('clock',.055,.06,.27,.12);
 if(l===8){p('clock',.055,.045,.27,.11);p('badge',.35,.27,.30,.14);p('date',.37,.90,.26,.045);p('accent',.36,.965,.28,.02);}
 if(l===9)p('badge',.05,.04,.28,.12);
 return placeFuel(validate({schema:1,preset:n,theme:Math.floor(n/10),gauge:l===0?'ultra':l===6||l===9?'bar':l===3||l===7?'digital':'ring',background:l===7?'black':'gradient',units:'mph',clock24:false,borders:true,snap:true,title:0,intro:'slide',introEnabled:false,introDuration:3000,introShine:true,introLight:'white',widgets:ws}));
}
function validate(v){
 if(!v||v.schema!==1||!Number.isInteger(v.theme)||v.theme<0||v.theme>=10||!Number.isInteger(v.preset)||v.preset<0||v.preset>=100)throw Error('Invalid design');
 for(const k of ['clock24','borders','snap','introEnabled'])if(typeof v[k]!=='boolean')throw Error('Invalid '+k);
 for(const pair of [['gauge',GAUGES.slice(1)],['background',['gradient','black','transparent']],['units',['mph','km/h']],['intro',['slide','reveal','apple','welcome','none']]])if(!pair[1].includes(v[pair[0]]))throw Error('Invalid '+pair[0]);
 if(!Number.isInteger(v.title)||v.title<0||v.title>=TITLES.length||!Array.isArray(v.widgets)||v.widgets.length<LEGACY_TYPES.length||v.widgets.length>TYPES.length)throw Error('Invalid widgets');
 const seen=new Set();
 v.widgets.forEach(w=>{if(!w||!TYPES.includes(w.type)||seen.has(w.type)||typeof w.on!=='boolean')throw Error('Invalid widget');seen.add(w.type);
 for(const k of ['x','y','w','h'])if(!Number.isFinite(w[k]))throw Error('Invalid position');
 if(w.x<0||w.y<0||w.w<minimum(w.type)[0]-1e-8||w.h<minimum(w.type)[1]-1e-8||w.x+w.w>1.00001||w.y+w.h>1.00001)throw Error('Widget out of bounds');});
 if(LEGACY_TYPES.some(type=>!seen.has(type)))throw Error('Missing base widget');
 const out={};['schema','preset','theme','gauge','background','units','clock24','borders','snap','title','intro','introEnabled'].forEach(k=>out[k]=v[k]);
 out.template=v.template===undefined?'standard':v.template;
 if(!['standard','bmw-factory'].concat(IDRIVE_TEMPLATES.map(a=>a[0])).includes(out.template))throw Error('Invalid template');
 out.introDuration=v.introDuration===undefined?3000:v.introDuration;
 if(![3000,4500,5500,7000].includes(out.introDuration))throw Error('Invalid welcome duration');
 out.introShine=v.introShine===undefined?true:v.introShine;if(typeof out.introShine!=='boolean')throw Error('Invalid shine');
 out.introLight=v.introLight===undefined?'white':v.introLight;if(!['white','blue','red','theme'].includes(out.introLight))throw Error('Invalid light color');
 out.name=cleanText(v.name===undefined?'My design':v.name,28);
 out.welcomeName=cleanText(v.welcomeName===undefined?'Antonio Shamo':v.welcomeName,28);
 out.signature=cleanText(v.signature===undefined?TITLES[v.title]:v.signature,36);
 out.temperatureUnit=v.temperatureUnit===undefined?'C':v.temperatureUnit;
 if(!['C','F'].includes(out.temperatureUnit))throw Error('Invalid temperature unit');
 out.fuelCapacityLitres=v.fuelCapacityLitres===undefined?65:v.fuelCapacityLitres;
 if(!Number.isFinite(out.fuelCapacityLitres)||out.fuelCapacityLitres<10||out.fuelCapacityLitres>150)throw Error('Tank capacity must be 10 to 150 litres');
 out.widgets=v.widgets.map(w=>{
  const locked=w.locked===undefined?false:w.locked,color=w.color===undefined?'theme':w.color,gauge=w.gauge===undefined?'inherit':w.gauge;
  if(typeof locked!=='boolean'||!(color==='theme'||/^#[0-9a-fA-F]{6}$/.test(color))||!GAUGES.includes(gauge))throw Error('Invalid widget style');
  return {type:w.type,x:w.x,y:w.y,w:w.w,h:w.h,on:w.on,locked,color,gauge};
 });
 // Correct only untouched iDrive 8 factory positions; preserve custom moves.
 if(['id8-sport','id8-classic'].includes(out.template)){
  const c=out.widgets.find(w=>w.type==='coolant'),o=out.widgets.find(w=>w.type==='oil');
  if(c&&o&&c.x===.40&&o.x===.54&&c.w===.12&&o.w===.12&&c.y===o.y&&[.66,.68].includes(c.y)){c.x=.37;o.x=.51;}
  const a=out.widgets.find(w=>w.type==='accent');if(a&&a.x===.40&&a.w===.22&&a.y===.86)a.x=.39;
 }
 const missingFuel=!seen.has('fuel');
 for(const type of TYPES)if(!seen.has(type))out.widgets.push(newWidget(type));
 if(missingFuel)placeFuel(out);
 // Retire only the previous default badge that duplicated BMW's native logo.
 if(out.template==='bmw-factory'){const w=out.widgets.find(a=>a.type==='badge');if(w&&w.x===.405&&w.y===.105&&w.w===.19&&w.h===.11){w.on=false;w.x=.205;w.y=.51;w.w=.15;w.h=.13;}}
 if(out.template==='bmw-factory')out.background=out.background==='transparent'?'transparent':'black';
 if(out.template==='bmw-factory')for(const type of Object.keys(FACTORY_LAYOUT)){
  const w=out.widgets.find(a=>a.type===type),old=FACTORY_PREVIOUS[type];
  if(w&&old&&['x','y','w','h'].every((k,i)=>w[k]===old[i]))['x','y','w','h'].forEach((k,i)=>w[k]=FACTORY_LAYOUT[type][i]);
 }
 out.widgets.forEach(w=>keepInFactorySide(out,w));
 return out;
}
function cleanText(v,max){if(typeof v!=='string'||!v.trim()||v.length>max||/[^\x20-\x7e]/.test(v))throw Error('Use 1-'+max+' printable characters');return v.trim();}
function keepInFactorySide(d,w){
 // Centered custom badges sit below the physical top-center housing.
 if(w.type==='badge'&&w.on&&w.x+w.w/2>.40&&w.x+w.w/2<.60&&w.y<.22){w.y=.22;w.h=Math.min(w.h,.78);}
 if(d.template!=='bmw-factory')return;
 const dial=['speed','rpm'].includes(w.type),edge=dial?.42:.40;
 const right=w.x+w.w/2>=.5;w.w=Math.min(w.w,edge);
 w.x=clamp(w.x,right?1-edge:0,right?1-w.w:edge-w.w);
}
function move(d,type,dx,dy){const w=d.widgets.find(a=>a.type===type);if(!w||w.locked)return;const snap=v=>d.snap?Math.round(v*100)/100:v;w.x=clamp(snap(w.x+dx),0,1-w.w);w.y=clamp(snap(w.y+dy),0,1-w.h);keepInFactorySide(d,w);}
function resize(d,type,f){const w=d.widgets.find(a=>a.type===type);if(!w||w.locked)return;w.w=clamp(w.w*f,minimum(type)[0],1-w.x);w.h=clamp(w.h*f,minimum(type)[1],1-w.y);keepInFactorySide(d,w);}
function dimension(d,type,axis,delta){const w=d.widgets.find(a=>a.type===type);if(!w||w.locked)return;const index=axis==='w'?0:1;if(!['w','h'].includes(axis))return;w[axis]=clamp(w[axis]+delta,minimum(type)[index],1-w[axis==='w'?'x':'y']);keepInFactorySide(d,w);}
function align(d,type,axis){const w=d.widgets.find(a=>a.type===type);if(!w||w.locked)return;if(axis==='x')w.x=(1-w.w)/2;if(axis==='y')w.y=(1-w.h)/2;keepInFactorySide(d,w);}
function acceptedDesign(){
const config=preset(11);config.temperatureUnit='F';config.introEnabled=false;
for(const w of config.widgets){
 if(w.type==='speed')Object.assign(w,{x:.06,y:.19,w:.34,h:.63});
 if(w.type==='rpm')Object.assign(w,{x:.60,y:.19,w:.34,h:.63});
 if(w.type==='badge')Object.assign(w,{x:.405,y:.23,w:.19,h:.18});
 if(w.type==='flag')Object.assign(w,{x:.455,y:.45,w:.09,h:.1});
 if(w.type==='oil')Object.assign(w,{x:.84,y:.81,w:.13,h:.13,on:true});
 if(w.type==='coolant')Object.assign(w,{x:.055,y:.81,w:.18,h:.13,on:true});
 if(w.type==='accent')Object.assign(w,{x:.38,y:.89,w:.24,h:.022});
 if(['clock','date','gear','signature','connection'].includes(w.type))w.on=false;
}
config.name='Antonio M Competition';return placeFuel(validate(config));
}
function idrivePreset(index){
 if(!Number.isInteger(index)||index<0||index>=IDRIVE_TEMPLATES.length)throw Error('Invalid iDrive template');
 const d=preset(index===1?72:11);d.template=IDRIVE_TEMPLATES[index][0];d.name=IDRIVE_TEMPLATES[index][1];
 d.gauge=index===2?'id8-slim':'id8';d.background=index===2?'black':'gradient';d.borders=false;d.temperatureUnit='F';
 d.widgets.forEach(w=>w.on=false);
 const put=(type,x,y,w,h)=>Object.assign(d.widgets.find(a=>a.type===type),{x,y,w,h,on:true});
 put('speed',.045,.12,.35,.70);put('rpm',.605,.12,.35,.70);
 put('badge',.42,.28,.16,.15);put('clock',.08,.86,.20,.09);
 put('coolant',.37,.66,.12,.12);put('oil',.51,.66,.12,.12);put('accent',.39,.86,.22,.023);
 if(index===1){put('badge',.40,.22,.20,.18);put('date',.43,.49,.18,.09);put('coolant',.37,.68,.12,.12);put('oil',.51,.68,.12,.12);d.widgets.find(w=>w.type==='accent').on=false;}
 if(index===2){put('speed',.08,.20,.34,.61);put('rpm',.58,.20,.34,.61);put('badge',.42,.35,.16,.15);put('oil',.58,.85,.13,.10);d.widgets.find(w=>w.type==='coolant').on=false;d.widgets.find(w=>w.type==='accent').on=false;}
 return placeFuel(validate(d));
}
// Separate identifier: legacy preset numbers and saved designs remain unchanged.
// The middle is reserved for native BMW content, including when widgets are moved.
// Paint the large side faces first, followed by only their small upper tips.
// A changing needle in a tip must not invalidate the cached lower dial faces.
const FACTORY_REGIONS=Object.freeze([[0,0,.40,1],[.60,0,.40,1],[.40,0,.02,.24],[.58,0,.02,.24]].map(Object.freeze));
const FACTORY_LAYOUT={speed:[.035,.02,.37,.90],rpm:[.595,.02,.37,.90],fuel:[.01,.63,.075,.24],range:[.085,.90,.145,.07],coolant:[.655,.55,.18,.105],oil:[.915,.63,.075,.24],clock:[.235,.90,.13,.07],outside:[.84,.90,.15,.075]};
const FACTORY_PREVIOUS={speed:[.015,.06,.35,.80],rpm:[.635,.06,.35,.80],fuel:[.125,.625,.115,.105],range:[.245,.625,.115,.105],coolant:[.64,.625,.115,.105],oil:[.76,.625,.115,.105],clock:[.075,.89,.20,.075],outside:[.815,.88,.14,.095]};
function factoryPreset(){
 const d=preset(0);d.template='bmw-factory';d.name='BMW original style';d.gauge='bmw';
 d.background='black';d.borders=false;d.temperatureUnit='F';d.widgets.forEach(w=>w.on=false);
 const put=(type,x,y,w,h)=>Object.assign(d.widgets.find(a=>a.type===type),{x,y,w,h,on:true});
 for(const type of Object.keys(FACTORY_LAYOUT))put(type,...FACTORY_LAYOUT[type]);
 // Hidden widgets start in a side slot, where adding one can actually show it.
 d.widgets.filter(w=>!w.on).forEach(w=>Object.assign(w,{x:.205,y:.51,w:.15,h:.13}));
 return validate(d);
}
function defaultDesign(){return factoryPreset();}
function baseDesign(d){if(d.template==='bmw-factory')return factoryPreset();const i=IDRIVE_TEMPLATES.findIndex(a=>a[0]===d.template);return i<0?preset(d.preset):idrivePreset(i);}
module.exports={FACTORY_REGIONS,factoryPreset,defaultDesign,METRICS,GROUPS,LEGACY_TYPES,reading,placeFuel,newWidget,IDRIVE_TEMPLATES,idrivePreset,baseDesign,STYLES,gaugeLabel,acceptedDesign,ACCENTS,GAUGES,dimension,align,cleanText,THEMES,LAYOUTS,TYPES,LABELS,TITLES,preset,validate,clone,clamp,move,resize};
