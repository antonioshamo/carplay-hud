// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const M=FactoryPersonal,key='factory-personal-preview-v1';let config=M.defaults(),center='assistance',dragSlot=null;
try{const saved=localStorage.getItem(key);if(saved)config=M.validate(JSON.parse(saved));}catch(e){}
const data={fuel:32,range:402.336,oil:102,coolant:105,outside:7,battery:78,odometer:68500,tripTime:42,torque:82,power:6.3,engineState:'RUNNING',driveMode:'SPORT PLUS',powerPercent:12,torquePercent:18,fuelWarning:'NORMAL',pressureFL:2.4,pressureFR:2.4,pressureRL:2.6,pressureRR:2.6,targetFL:2.4,targetFR:2.4,targetRL:2.6,targetRR:2.6,tireTempFL:27,tireTempFR:27,tireTempRL:29,tireTempRR:29};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const text=(s,x,y,size=26,color='#ecf0f6',anchor='middle')=>`<text x="${x}" y="${y}" font-size="${size}" fill="${color}" text-anchor="${anchor}">${esc(s)}</text>`;
function gauges(){
 let s='';const left=[[425,569],[265,521],[170,448],[145,360],[185,270],[280,191],[410,133],[560,101],[708,88]];
 left.forEach((p,i)=>{s+=`<path d="M${p[0]},${p[1]} l${i<3?18:12},${i<3?-9:12}" stroke="#d9e0e8" stroke-width="3"/>`+text(i*25,p[0]+30,p[1]+(i<3?10:38),24);});
 left.forEach((p,i)=>{const x=1920-p[0];s+=`<path d="M${x},${p[1]} l${i<3?-18:-12},${i<3?-9:12}" stroke="#d9e0e8" stroke-width="3"/>`+text(i,x-30,p[1]+(i<3?10:38),24);});
 return s;
}
function nativeCenter(){
 if(center==='normal')return text('BMW M',960,350,42,'#485664')+text('The original center remains visible',960,400,21,'#627487');
 let s='<path d="M925 230 L995 230 L1155 590 L765 590Z" fill="#18212a"/>';
 for(let n=1;n<9;n++){const t=n/9,y=230+360*t*t,w=35+160*t*t;s+=`<path d="M${960-w} ${y} H${960+w}" stroke="#34404b" stroke-width="1"/>`;}
 s+='<path d="M945 230H975L1052 590H868Z" fill="url(#lane)"/><path d="M915 439L930 410H990L1005 439Z" fill="#b3bec7"/><path d="M928 437L940 419H980L992 437Z" fill="#18232d"/><rect x="905" y="437" width="110" height="83" rx="20" fill="#a6b4c1"/><rect x="916" y="445" width="88" height="31" rx="12" fill="#415363"/><path d="M912 475l22 5m52 0l22-5" stroke="#fc445d" stroke-width="6"/><rect x="945" y="490" width="30" height="8" fill="#e0e5eb"/><path d="M914 512H1006" stroke="#13212b" stroke-width="8"/>';
 if(center==='warning')s+='<rect x="730" y="515" width="460" height="76" rx="9" fill="#202329" stroke="#e7b251"/>'+text('Native BMW alert area',960,562,26,'#f4c164');
 return s;
}
function draw(){
 document.querySelectorAll('[data-color]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.color===config.accent)));
 M.SLOTS.forEach(s=>document.getElementById(s.id).value=config.slots[s.id]);
 document.getElementById('units').value=config.units;document.getElementById('temp').value=config.temperatureUnit;
 let widgets='';
 M.SLOTS.forEach(s=>{const type=config.slots[s.id];if(!config.enabled||type==='none')return;const r=M.reading(type,config,data),[x,y,x1,y1]=s.rect;
  const label=r.label.toUpperCase(),value=r.value+' '+r.unit;
  widgets+=`<defs><clipPath id="clip-${s.id}"><rect x="${x}" y="${y}" width="${x1-x}" height="${y1-y}"/></clipPath></defs><g clip-path="url(#clip-${s.id})" class="slot-target" data-slot="${s.id}" tabindex="0" role="img" aria-label="${esc(s.label+' '+r.label)}"><rect x="${x}" y="${y}" width="${x1-x}" height="${y1-y}" rx="3" fill="#10151d"/>`+text(label,x+12,y+24,Math.min(15,(x1-x-24)/(label.length*.65)),'#a5b3c3','start')+text(value,x+12,y+55,Math.min(27,(x1-x-24)/(value.length*.65)),'#f4f8fc','start')+`<path d="M${x+12} ${y1-4}H${x1-12}" stroke="${config.accent}" stroke-width="2"/></g>`;
 });
 document.getElementById('preview').innerHTML=`<svg viewBox="0 0 1920 720" xmlns="http://www.w3.org/2000/svg" style="font-family:Arial,sans-serif;font-weight:600"><defs><radialGradient id="bg"><stop stop-color="#1a2330"/><stop offset="1" stop-color="#080c13"/></radialGradient><linearGradient id="lane" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#929c9f"/><stop offset="1" stop-color="#5b6771"/></linearGradient><linearGradient id="dial"><stop stop-color="#505661"/><stop offset="1" stop-color="#1b222c"/></linearGradient></defs><rect width="1920" height="720" fill="url(#bg)"/><path d="M768 70L463 90Q141 166 120 350Q105 485 420 590L612 590L530 460L700 210Z" fill="url(#dial)"/><path d="M1152 70L1457 90Q1779 166 1800 350Q1815 485 1500 590L1308 590L1390 460L1220 210Z" fill="url(#dial)"/><path d="M768 70L463 90Q141 166 120 350Q105 485 420 590M1152 70L1457 90Q1779 166 1800 350Q1815 485 1500 590" fill="none" stroke="#d3dce7" stroke-width="5"/>${gauges()}<path d="M260 556L425 571L450 592Z" fill="#ed334c"/><path d="M1659 529L1495 570L1470 590Z" fill="#ed334c"/><path d="M1190 76L1280 80" stroke="#ed334c" stroke-width="8"/>${text('X4 M',960,153,45)}${text('COMPETITION',960,180,12,'#a5b8c9')}${text('0',550,410,72)}${text(config.units,640,409,23)}<path d="M300 426H710" stroke="#b2bdca" stroke-width="2"/>${text('mph',450,621,20,'#a7b2c1')}${text('1/min × 1000',1500,621,20,'#a7b2c1')}<g fill="none" stroke="#b4c4cd" stroke-width="3"><circle cx="594" cy="475" r="18"/><path d="M576 475H612M594 475V492M496 488Q498 458 526 465M508 480L523 471"/></g>${text('SPORT PLUS',1390,262,24)}${text('SPORT PLUS',1390,352,24)}${text('SPORT PLUS',1390,442,24)}<path d="M1290 282H1520M1290 372H1520M1290 462H1520" stroke="#c4ceda" stroke-width="4"/><path d="M1480 282H1570M1480 372H1570M1480 462H1570" stroke="#ed334c" stroke-width="5"/>${nativeCenter()}<path d="M140 625H615L668 603H730M1190 603H1252L1305 625H1775" stroke="#9caab8" stroke-width="3" fill="none"/>${text('250 mi',170,672,28)}${text('8:54 pm',430,672,28)}${text('BMW native center',960,672,27,'#b3c2d1')}${text('P',1450,672,34)}${text('+44 °F',1720,672,27)}${text('F',83,491,19)}${text('E',83,580,19)}<path d="M105 488V583" stroke="#9da9b7" stroke-width="5"/><path d="M105 525V583" stroke="#ed334c" stroke-width="6"/>${text('210',1818,507,19)}${text('120',1818,583,19)}<path d="M1787 493V580" stroke="#c0cbd7" stroke-width="5"/><path d="M1776 537H1800" stroke="#ed334c" stroke-width="6"/>${widgets}</svg>`;
 document.querySelectorAll('[data-slot]').forEach(el=>{el.addEventListener('pointerdown',e=>{dragSlot=el.dataset.slot;el.setPointerCapture(e.pointerId);});el.addEventListener('pointerup',e=>{const end=document.elementFromPoint(e.clientX,e.clientY),target=end&&end.closest('[data-slot]');if(dragSlot&&target){config=M.swap(config,dragSlot,target.dataset.slot);save();}dragSlot=null;});});
}
function save(){config=M.validate(config);try{localStorage.setItem(key,JSON.stringify(config));document.getElementById('saved').textContent='Saved in this preview only';}catch(e){document.getElementById('saved').textContent='Preview changed; browser storage unavailable';}draw();}
document.getElementById('colors').innerHTML=M.COLORS.map(c=>`<button class="swatch" data-color="${c}" style="background:${c}" aria-label="${c} widget accent"></button>`).join('');
document.querySelectorAll('[data-color]').forEach(b=>b.onclick=()=>{config.accent=b.dataset.color;save();});
M.SLOTS.forEach(s=>{const row=document.createElement('div');row.className='field';const l=document.createElement('label');l.htmlFor=s.id;l.textContent=s.label;const select=document.createElement('select');select.id=s.id;M.METRICS.forEach(m=>{const o=document.createElement('option');o.value=m[0];o.textContent=m[1];select.appendChild(o);});select.onchange=()=>{config=M.setWidget(config,s.id,select.value);config.enabled=true;save();};row.append(l,select);document.getElementById('slots').appendChild(row);});
document.getElementById('units').onchange=e=>{config.units=e.target.value;save();};document.getElementById('temp').onchange=e=>{config.temperatureUnit=e.target.value;save();};
document.getElementById('center').onchange=e=>{center=e.target.value;draw();};
document.getElementById('restore').onclick=()=>{config.enabled=false;save();};document.getElementById('enable').onclick=()=>{config.enabled=true;save();};
document.getElementById('reset').onclick=()=>{config=M.defaults();save();};draw();
