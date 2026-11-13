// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const {THEMES,PALETTES}=require('./cluster_catalog.js');
const ACCENTS=['source','#ffffff','#e2242c','#57c5fa','#ffb85c','#83f0ec','#c6a4ff','#89e0b3'];
const METRICS=['oil','coolant','fuel','range','outside','torque','power','pressureFL','pressureFR','pressureRL','pressureRR','tireTempFL','tireTempFR','tireTempRL','tireTempRR','battery','targetFL','targetFR','targetRL','targetRR','odometer','tripTime','powerPercent','torquePercent','driveMode','engineState','fuelWarning'];
const LABELS={oil:'Oil temperature',coolant:'Coolant',fuel:'Fuel percentage',range:'Range',outside:'Outside',torque:'Torque',power:'Power (calculated)',pressureFL:'Front left tire',pressureFR:'Front right tire',pressureRL:'Rear left tire',pressureRR:'Rear right tire',tireTempFL:'Front left tire temperature',tireTempFR:'Front right tire temperature',tireTempRL:'Rear left tire temperature',tireTempRR:'Rear right tire temperature',battery:'Battery charge'};
Object.assign(LABELS,{targetFL:'Front left target pressure',targetFR:'Front right target pressure',targetRL:'Rear left target pressure',targetRR:'Rear right target pressure',odometer:'Odometer',tripTime:'Journey duration',powerPercent:'Sport power percentage',torquePercent:'Sport torque percentage',driveMode:'Driving mode',engineState:'Engine state',fuelWarning:'Fuel reserve status'});
function clone(d){return JSON.parse(JSON.stringify(d));}
function defaultDesign(){return {schema:2,theme:'m',palette:'comfort',accent:'source',units:'mph',temperatureUnit:'F',fuelCapacityLitres:65,clock24:false,name:'My cluster',startup:false,rpmMax:8000,redline:7000,widgets:['fuel','oil','coolant','range'],background:'black',center:'bmw',introDuration:0};}
function validate(d){
 if(!d||d.schema!==2)throw Error('Old custom cluster designs are retired; choose a source theme');
 if(!THEMES.some(t=>t.id===d.theme)||!PALETTES.includes(d.palette)||!ACCENTS.includes(d.accent))throw Error('Unknown source theme or color');
 if(!['mph','km/h'].includes(d.units)||!['C','F'].includes(d.temperatureUnit)||typeof d.clock24!=='boolean'||typeof d.startup!=='boolean')throw Error('Invalid cluster preferences');
 if(!Number.isFinite(d.fuelCapacityLitres)||d.fuelCapacityLitres<10||d.fuelCapacityLitres>150)throw Error('Invalid fuel tank capacity');
 if(!Number.isInteger(d.rpmMax)||d.rpmMax<5000||d.rpmMax>10000||!Number.isInteger(d.redline)||d.redline<3000||d.redline>d.rpmMax)throw Error('Invalid RPM scale');
 if(!Array.isArray(d.widgets)||d.widgets.length!==4||d.widgets.some(k=>!METRICS.includes(k)))throw Error('Choose four supported widget readings');
 if(d.background!=='black'||!['bmw','map'].includes(d.center))throw Error('BMW warning and assistance space must remain clear');
 return {schema:2,theme:d.theme,palette:d.palette,accent:d.accent,units:d.units,temperatureUnit:d.temperatureUnit,fuelCapacityLitres:d.fuelCapacityLitres,clock24:d.clock24,name:String(d.name||'My cluster').replace(/[\x00-\x1f<>]/g,'').slice(0,28),startup:d.startup,rpmMax:d.rpmMax,redline:d.redline,widgets:d.widgets.slice(),background:'black',center:d.theme==='map_focus'?'map':'bmw',introDuration:0};
}
module.exports={THEMES,PALETTES,ACCENTS,METRICS,LABELS,clone,defaultDesign,validate};
