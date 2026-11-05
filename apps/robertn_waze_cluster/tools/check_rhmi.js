// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
// Static compatibility contract for this app's ID7 widgets. This does not
// emulate BMW RemoteHmi. In particular, passing cannot prove vehicle startup.
const assert=require('assert'),fs=require('fs'),path=require('path');
function check(xml,ui){
 const ids=new Set(),names=new Set(),states={};
 const unique=(set,id,label)=>{assert(!set.has(id),'duplicate '+label+' '+id);set.add(id);};
 assert.equal(ui.schemaVersion,'1.3.0');
 assert(!/<property\s+id="1"/.test(xml),'startup XML must not declare Enabled; use SDK setEnabled at runtime');
 const blocks=xml.match(/<container\b[^>]*>[\s\S]*?<\/container>/g)||[];
 assert(blocks.length>0,'no RHMI states');
 blocks.forEach(block=>{
  const head=/<container id="(\d+)" type="state" widget="LT_State_Wide">/.exec(block);
  assert(head,'unexpected ID7 state widget');
  const id=head[1],state=ui.containers[id];
  assert(state,'XML state absent from JSON: '+id);states[id]=true;
  unique(ids,id,'ID');unique(names,state.name,'name');
  const groups=matches(/<layoutGroup id="(\d+)" name="(\w+)">/g,block);
  assert.equal(groups.map(g=>g[2]).join(','),'Titlebar,List');
  groups.forEach(g=>unique(ids,g[1],'ID'));
  const parent=/<property id="9" value="(\d+)"\/>\s*<layoutGroup/.exec(block);
  assert.equal(parent&&parent[1],state.properties&&state.properties.ParentState?String(state.properties.ParentState.value):null,'parent mismatch');
  const seen=[];
  matches(/<component id="(\d+)" type="(\w+)"(?: widget="(\w+)")?>([\s\S]*?)<\/component>/g,block).forEach(m=>{
   const cid=m[1],c=state.components[cid];assert(c,'missing JSON component '+cid);
   unique(ids,cid,'ID');unique(names,c.name,'name');seen.push(cid);
   assert.equal(c.type,m[2],'component type mismatch');
   assert(['title','label','button'].indexOf(c.type)>=0,'unexpected component type');
   assert.equal(m[3],c.type==='title'?undefined:'LT_'+(c.type==='button'?'Button':'Label')+'_1Row','widget mismatch');
   const expected=c.type==='title'?['Visible']:['Focusable','Visible'];
   assert.deepEqual(Object.keys(c.properties).sort(),expected,'startup properties for '+c.name);
   const props={};matches(/<property id="(\d+)" value="(\d+)"\/>/g,m[4]).forEach(p=>{assert(!Object.prototype.hasOwnProperty.call(props,p[1]),'duplicate property');props[p[1]]=+p[2];});
   assert.deepEqual(Object.keys(props).sort(),c.type==='title'?['2']:['2','3']);
   assert.equal(c.properties.Visible.type,'UInt');assert.equal(c.properties.Visible.value,props[2]);
   assert(props[2]===0||props[2]===1,'visibility range');
   if(c.type!=='title'){assert.equal(c.properties.Focusable.type,'UInt');assert.equal(c.properties.Focusable.value,props[3]);assert(props[3]===0||props[3]===3,'focus range');}
   assert.equal(c.rows.length,1);assert.deepEqual(Object.keys(c.rows[0]),['Text']);assert.equal(c.rows[0].Text.type,'Text');
   assert.equal(typeof c.rows[0].Text.value,'string');
  });
  assert.deepEqual(seen.sort(),Object.keys(state.components).sort(),'component set mismatch');
 });
 assert.deepEqual(Object.keys(states).sort(),Object.keys(ui.containers).sort());
 Object.keys(states).forEach(id=>{const seen=new Set();let at=id;while(at){assert(states[at],'missing parent '+at);assert(!seen.has(at),'parent cycle');seen.add(at);const p=ui.containers[at].properties;at=p&&p.ParentState?String(p.ParentState.value):null;}});
 return {states:blocks.length,ids:ids.size};
}
function matches(re,text){const out=[];let m;while((m=re.exec(text)))out.push(m);return out;}
function checkTree(tree){const dir=path.join(tree,'rhmiData/uiDescriptions/ID7');return check(fs.readFileSync(path.join(dir,'application.xml'),'utf8'),JSON.parse(fs.readFileSync(path.join(dir,'uiDescription.json'),'utf8')));}
module.exports={check,checkTree};
if(require.main===module){const spec=require('../mgu-app.json');console.log('RHMI static contract:',checkTree(path.join(__dirname,'..',spec.tree)));}
