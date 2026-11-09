// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
// Single layout definition for the genuine BMW RHMI XML and resource JSON.
const fs=require('fs'),path=require('path');
const L=(name,text)=>({name,text,type:'label'});
const B=(name,text)=>({name,text,type:'button'});
const {HOST,PROXIES}=require('../src/hud_screen.js');
// The graphical dashboard is the sole entry; the old native menus are removed.
const parents={};
const pages=[[20,HOST,'CarPlay HUD',[
 L('designStatus','Opening your dashboard…'),
 Object.assign(B('designRetry','Retry dashboard'),{visible:0}),
 B('designExit','Close'),
 ...Array.from({length:PROXIES},(_,i)=>Object.assign(B('designProxy'+i,''),{visible:0}))
]]];
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
   // Keep the startup properties used by the working upstream ID7 layout.
   // Enabled is set through the SDK at runtime, not declared on every label
   // and button while RemoteHmi initializes the application's resources.
   components[cid]={type:row.type,name:row.name,properties:{Visible:prop(visible),Focusable:prop(focus)},rows:[{Text:{value:row.text,type:'Text'}}]};
   xml.push(`      <component id="${cid}" type="${row.type}" widget="LT_${row.type==='button'?'Button':'Label'}_1Row"><property id="2" value="${visible}"/><property id="3" value="${focus}"/></component>`);
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
