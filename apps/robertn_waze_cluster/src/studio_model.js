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
const TYPES=['speed','rpm','gear','clock','date','badge','flag','coolant','oil','accent','signature','connection'];
const LABELS={speed:'Speed',rpm:'Engine RPM',gear:'Gear',clock:'Clock',date:'Date',badge:'X4 M badge',flag:'Racing flag',coolant:'Coolant',oil:'Oil temperature',accent:'M stripes',signature:'Signature',connection:'Data status'};
const ACCENTS=['theme','#ffffff','#57c5fa','#e64a64','#ffb85c','#83f0ec','#c6a4ff','#89e0b3','#e5d4ae','#c8f760'];
const STYLES=[['ring','Sport rings'],['digital','Digital cards'],['bar','Horizontal bars'],['ultra','Ultra rings'],['needle','Classic needles'],['segments','Segmented rings'],['sweep','Racing sweep'],['vertical','Vertical rails'],['minimal','Minimal arc'],['dots','Dot matrix dial'],['id8','iDrive 8 angular'],['id8-slim','iDrive 8 minimal']];
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
 return validate({schema:1,preset:n,theme:Math.floor(n/10),gauge:l===0?'ultra':l===6||l===9?'bar':l===3||l===7?'digital':'ring',background:l===7?'black':'gradient',units:'mph',clock24:false,borders:true,snap:true,title:0,intro:'slide',introEnabled:false,introDuration:3000,introShine:true,introLight:'white',widgets:ws});
}
function validate(v){
 if(!v||v.schema!==1||!Number.isInteger(v.theme)||v.theme<0||v.theme>=10||!Number.isInteger(v.preset)||v.preset<0||v.preset>=100)throw Error('Invalid design');
 for(const k of ['clock24','borders','snap','introEnabled'])if(typeof v[k]!=='boolean')throw Error('Invalid '+k);
 for(const pair of [['gauge',GAUGES.slice(1)],['background',['gradient','black','transparent']],['units',['mph','km/h']],['intro',['slide','reveal','apple','welcome','none']]])if(!pair[1].includes(v[pair[0]]))throw Error('Invalid '+pair[0]);
 if(!Number.isInteger(v.title)||v.title<0||v.title>=TITLES.length||!Array.isArray(v.widgets)||v.widgets.length!==TYPES.length)throw Error('Invalid widgets');
 const seen=new Set();
 v.widgets.forEach(w=>{if(!w||!TYPES.includes(w.type)||seen.has(w.type)||typeof w.on!=='boolean')throw Error('Invalid widget');seen.add(w.type);
 for(const k of ['x','y','w','h'])if(!Number.isFinite(w[k]))throw Error('Invalid position');
 if(w.x<0||w.y<0||w.w<minimum(w.type)[0]-1e-8||w.h<minimum(w.type)[1]-1e-8||w.x+w.w>1.00001||w.y+w.h>1.00001)throw Error('Widget out of bounds');});
 const out={};['schema','preset','theme','gauge','background','units','clock24','borders','snap','title','intro','introEnabled'].forEach(k=>out[k]=v[k]);
 out.template=v.template===undefined?'standard':v.template;
 if(!['standard'].concat(IDRIVE_TEMPLATES.map(a=>a[0])).includes(out.template))throw Error('Invalid template');
 out.introDuration=v.introDuration===undefined?3000:v.introDuration;
 if(![3000,4500,5500,7000].includes(out.introDuration))throw Error('Invalid welcome duration');
 out.introShine=v.introShine===undefined?true:v.introShine;if(typeof out.introShine!=='boolean')throw Error('Invalid shine');
 out.introLight=v.introLight===undefined?'white':v.introLight;if(!['white','blue','red','theme'].includes(out.introLight))throw Error('Invalid light color');
 out.name=cleanText(v.name===undefined?'My design':v.name,28);
 out.welcomeName=cleanText(v.welcomeName===undefined?'Antonio Shamo':v.welcomeName,28);
 out.signature=cleanText(v.signature===undefined?TITLES[v.title]:v.signature,36);
 out.temperatureUnit=v.temperatureUnit===undefined?'C':v.temperatureUnit;
 if(!['C','F'].includes(out.temperatureUnit))throw Error('Invalid temperature unit');
 out.widgets=v.widgets.map(w=>{
  const locked=w.locked===undefined?false:w.locked,color=w.color===undefined?'theme':w.color,gauge=w.gauge===undefined?'inherit':w.gauge;
  if(typeof locked!=='boolean'||!(color==='theme'||/^#[0-9a-fA-F]{6}$/.test(color))||!GAUGES.includes(gauge))throw Error('Invalid widget style');
  return {type:w.type,x:w.x,y:w.y,w:w.w,h:w.h,on:w.on,locked,color,gauge};
 });return out;
}
function cleanText(v,max){if(typeof v!=='string'||!v.trim()||v.length>max||/[^\x20-\x7e]/.test(v))throw Error('Use 1-'+max+' printable characters');return v.trim();}
function move(d,type,dx,dy){const w=d.widgets.find(a=>a.type===type);if(!w||w.locked)return;const snap=v=>d.snap?Math.round(v*100)/100:v;w.x=clamp(snap(w.x+dx),0,1-w.w);w.y=clamp(snap(w.y+dy),0,1-w.h);}
function resize(d,type,f){const w=d.widgets.find(a=>a.type===type);if(!w||w.locked)return;w.w=clamp(w.w*f,minimum(type)[0],1-w.x);w.h=clamp(w.h*f,minimum(type)[1],1-w.y);}
function dimension(d,type,axis,delta){const w=d.widgets.find(a=>a.type===type);if(!w||w.locked)return;const index=axis==='w'?0:1;if(!['w','h'].includes(axis))return;w[axis]=clamp(w[axis]+delta,minimum(type)[index],1-w[axis==='w'?'x':'y']);}
function align(d,type,axis){const w=d.widgets.find(a=>a.type===type);if(!w||w.locked)return;if(axis==='x')w.x=(1-w.w)/2;if(axis==='y')w.y=(1-w.h)/2;}
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
config.name='Antonio M Competition';return validate(config);
}
function idrivePreset(index){
 if(!Number.isInteger(index)||index<0||index>=IDRIVE_TEMPLATES.length)throw Error('Invalid iDrive template');
 const d=preset(index===1?72:11);d.template=IDRIVE_TEMPLATES[index][0];d.name=IDRIVE_TEMPLATES[index][1];
 d.gauge=index===2?'id8-slim':'id8';d.background=index===2?'black':'gradient';d.borders=false;d.temperatureUnit='F';
 d.widgets.forEach(w=>w.on=false);
 const put=(type,x,y,w,h)=>Object.assign(d.widgets.find(a=>a.type===type),{x,y,w,h,on:true});
 put('speed',.045,.12,.35,.70);put('rpm',.605,.12,.35,.70);
 put('badge',.42,.28,.16,.15);put('clock',.08,.86,.20,.09);
 put('coolant',.40,.66,.12,.12);put('oil',.54,.66,.12,.12);put('accent',.40,.86,.22,.023);
 if(index===1){put('badge',.40,.22,.20,.18);put('date',.43,.49,.18,.09);put('coolant',.40,.68,.12,.12);put('oil',.54,.68,.12,.12);d.widgets.find(w=>w.type==='accent').on=false;}
 if(index===2){put('speed',.08,.20,.34,.61);put('rpm',.58,.20,.34,.61);put('badge',.42,.35,.16,.15);put('oil',.58,.85,.13,.10);d.widgets.find(w=>w.type==='coolant').on=false;d.widgets.find(w=>w.type==='accent').on=false;}
 return validate(d);
}
function baseDesign(d){const i=IDRIVE_TEMPLATES.findIndex(a=>a[0]===d.template);return i<0?preset(d.preset):idrivePreset(i);}
module.exports={IDRIVE_TEMPLATES,idrivePreset,baseDesign,STYLES,gaugeLabel,acceptedDesign,ACCENTS,GAUGES,dimension,align,cleanText,THEMES,LAYOUTS,TYPES,LABELS,TITLES,preset,validate,clone,clamp,move,resize};
