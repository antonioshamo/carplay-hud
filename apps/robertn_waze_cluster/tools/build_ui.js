// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
// Single layout definition for the genuine BMW RHMI XML and resource JSON.
const fs=require('fs'),path=require('path');
const L=(name,text)=>({name,text,type:'label'});
const B=(name,text)=>({name,text,type:'button'});
const pages=[
 [1,'ST_OnlineApps_WazeCluster','CarPlay HUD',[
  L('wocStatus','Connecting...'),B('wocDisplay','Use windshield HUD'),B('wocQuickStartup','Enable HUD auto-start (trial)'),B('wocSizePage','Map size'),
  B('wocPositionPage','Map position'),B('wocAppearancePage','Map appearance'),B('wocSupportPage','Help & setup')]],
 [8,'ST_WOC_Display','Choose a display',[
  L('displayStatus','Reading display...'),B('wocDisplayHud','Windshield HUD'),B('wocDisplayCluster','Instrument cluster'),
  B('wocStartupPage','Startup experiment'),L('displayHint','Your choice is saved for the next start')]],
 [14,'ST_WOC_Startup','CarPlay startup experiment',[
  L('startupStatus','Reading startup mode...'),B('wocStartupOn','Try Dashboard auto-start'),
  B('wocStartupOff','Off: use normal map stream'),L('startupHint','Reconnect CarPlay with Dashboard visible'),
  L('startupLimit','Experimental: center-screen map must stay visible'),L('startupResult','')]],
 [2,'ST_WOC_Size','HUD map size',[
  L('sizeStatus','Reading map width...'),B('wocHudSize','Larger  +5%'),B('wocHudSmaller','Smaller  -5%'),
  B('wocPresetsPage','Size presets'),B('wocSizeStandard','Restore standard size'),L('sizeNotice','Changes the map rectangle, not street zoom')]],
 [9,'ST_WOC_Presets','Choose a map size',[
  L('presetStatus','Reading map width...'),B('wocPresetCompact','Compact  40%'),B('wocPresetBalanced','Balanced  60%'),
  B('wocPresetLarge','Large  75%'),L('presetNotice','Changes the map rectangle, not street zoom')]],
 [3,'ST_WOC_Position','HUD map position',[
  L('positionStatus','Reading map position...'),B('wocHorizontalPage','Move left / right'),B('wocVerticalPage','Move up / down'),
  B('wocMoveStep','Adjustment: fine'),B('wocHudCentre','Center map'),L('positionNotice','Moves the map; BMW gauges stay in place')]],
 [10,'ST_WOC_Horizontal','Move left / right',[
  L('horizontalStatus','Reading map position...'),B('wocHudLeft','Move left'),B('wocHudRight','Move right'),
  L('horizontalHint','Changes are saved for the next start')]],
 [11,'ST_WOC_Vertical','Move up / down',[
  L('verticalStatus','Reading map position...'),B('wocHudUp','Move up'),B('wocHudDown','Move down'),
  L('verticalHint','Changes are saved for the next start')]],
 [12,'ST_WOC_Appearance','HUD map appearance',[
  L('appearanceStatus','Reading map appearance...'),B('wocOriginalColors','Original colors: keep dim map detail'),
  B('wocClearBackground','Clear dark background'),B('wocCorners','Corners'),L('appearanceNotice','Clear background can hide faint roads')]],
 [4,'ST_WOC_Support','Help & setup',[
  L('supportStatus','Connecting...'),B('wocDisplayPage','Display & startup'),L('wocSetup',''),B('wocSetupPage','Map setup'),B('wocTroubleshootPage','Streets disappear / map zooms out'),
  B('wocCapturePage','Record diagnostics'),B('wocLogPage','Technical details')]],
 [13,'ST_WOC_Troubleshoot','Missing streets',[
  L('missingHint1','Apple Maps controls the street detail and zoom'),
  L('missingHint2','HUD: try Original colors in Map appearance'),
  L('missingHint3','Cluster too? We need a capture to identify why'),
  B('wocMissingCapture','Record diagnostics'),L('missingHint4','Larger map size cannot restore missing streets')]],
 [5,'ST_WOC_Setup','Map setup',[
  L('setupStatus','Connecting...'),B('wocEnable','Enable map'),B('wocDisable','Disable map'),
  Object.assign(B('wocRestart','Restart head unit'),{visible:0}),L('setupHint','Setup changes may require a head-unit restart')]],
 [6,'ST_WOC_Capture','Record diagnostics',[
  L('wocCaptureStatus','Reading capture status...'),B('wocCapture','Capture logs (5 min)'),
  L('captureHint','Start recording before reconnecting CarPlay')]],
 [7,'ST_WOC_Logs','Technical details',Array.from({length:30},(_,i)=>Object.assign(L('wocRow'+String(i+1).padStart(2,'0'),''),{focus:3}))]
];
// ID7 child states need their parent in both descriptions, as in Store's ID7 layout.
const parents={2:1,3:1,4:1,5:4,6:4,7:4,8:4,9:2,10:3,11:3,12:1,13:4,14:8};
function build(){
 const spec=JSON.parse(fs.readFileSync(path.join(__dirname,'../mgu-app.json'),'utf8'));
 const dest=path.join(__dirname,'..',spec.tree,'rhmiData/uiDescriptions/ID7');
 const ui={schemaVersion:'1.3.0',containers:{}};
 let id=2000;const xml=['<?xml version="1.0" encoding="UTF-8"?>','<!-- SPDX-License-Identifier: GPL-3.0-or-later -->','<application>'];
 for(const [sid,name,title,rows] of pages){
  const components={};const titleId=id++;
  const prop=(value)=>({value,type:'UInt'});
  components[titleId]={type:'title',name:'title'+sid,properties:{Visible:prop(1)},rows:[{Text:{value:title,type:'Text'}}]};
  xml.push(`  <container id="${sid}" type="state" widget="LT_State_Wide">`);
  if(parents[sid])xml.push(`    <property id="9" value="${parents[sid]}"/>`);
  xml.push(
   `    <layoutGroup id="${1000+sid*2}" name="Titlebar"><component id="${titleId}" type="title"><property id="2" value="1"/></component></layoutGroup>`,
   `    <layoutGroup id="${1001+sid*2}" name="List"><property id="3" value="1"/>`);
  for(const row of rows){
   const cid=id++,visible=row.visible===0?0:1,focus=row.focus===3||row.type==='button'?3:0;
   components[cid]={type:row.type,name:row.name,properties:{Enabled:prop(1),Visible:prop(visible),Focusable:prop(focus)},rows:[{Text:{value:row.text,type:'Text'}}]};
   xml.push(`      <component id="${cid}" type="${row.type}" widget="LT_${row.type==='button'?'Button':'Label'}_1Row"><property id="1" value="1"/><property id="2" value="${visible}"/><property id="3" value="${focus}"/></component>`);
  }
  ui.containers[sid]={type:'state',name,components};
  if(parents[sid])ui.containers[sid].properties={ParentState:prop(parents[sid])};
  xml.push('    </layoutGroup>','  </container>');
 }
 xml.push('</application>');fs.writeFileSync(path.join(dest,'application.xml'),xml.join('\n')+'\n');
 fs.writeFileSync(path.join(dest,'uiDescription.json'),JSON.stringify(ui,null,2)+'\n');
}
if(require.main===module)build();
module.exports={pages,build};
