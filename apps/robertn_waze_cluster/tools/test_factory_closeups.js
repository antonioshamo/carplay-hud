// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),cp=require('child_process');
const M=require('../src/studio_model'),D=require('../src/studio_draw'),fonts=require('../src/kit_fonts');
const {Canvas}=require('../src/kit_canvas');
const source=path.join(__dirname,'../src/font_cluster_square.js'),before=fs.readFileSync(source);
cp.execFileSync(process.execPath,[path.join(__dirname,'bake_cluster_square.js')]);
assert.deepEqual(fs.readFileSync(source),before,'the original numeral atlas rebuilds exactly');
for(const name of ['studio_draw.js','studio_model.js','kit_fonts.js','font_cluster_square.js'])assert.deepEqual(fs.readFileSync(path.join(__dirname,'../src',name)),fs.readFileSync(path.join(__dirname,'../../../native/cluster-studio/shared',name)),'app and physical cluster ship identical '+name);
const manifest=require('../mgu-app.json'),helper=require('../../../native/cluster-studio/component.json');
assert(manifest.modules.includes('src/font_cluster_square.js'),'the on-car app linker includes the new font');
assert(helper.files.some(f=>f.path==='shared/font_cluster_square.js'),'the helper installer includes the new font');
for(const theme of [0,6])for(const fuel of [0,27,65,null]){
 const cv=new Canvas(1920,720),d=M.defaultDesign(),labels=[],needles=[],text=cv.text.bind(cv),line=cv.line.bind(cv);d.theme=theme;
 cv.text=(s,x,y,size,c,o)=>{const f=fonts.get(o.font,size),width=fonts.measure(f,String(s))*size/f.size;labels.push({s:String(s),x,y,size,left:x-width/2,right:x+width/2,top:y-size*.73});return text(s,x,y,size,c,o);};
 cv.line=(x,y,xx,yy,n,c)=>{if(c==='#f51b35')needles.push({x,y,xx,yy,n});return line(x,y,xx,yy,n,c);};
 D.draw(cv,d,{x:0,y:0,w:1920,h:720},{speed:321.8688,rpm:8000,fuel,range:310,oil:92,coolant:88,now:new Date(2026,10,9,9,20)});
 for(const t of labels.filter(t=>t.size>80||t.s==='mph'||t.s==='RPM'))assert((t.left>=14&&t.right<=1920*.40-14)||(t.left>=1920*.60+14&&t.right<=1906),'complete wide readout and unit stay clear of the native middle: '+t.s);
 const ticks=labels.filter(t=>t.size===41),unique=Array.from(new Map(ticks.map(t=>[t.s+':'+t.x+':'+t.y,t])).values());
 assert(unique.length===20,'11 speed and 9 RPM scale labels');
 for(let i=0;i<unique.length;i++)for(const b of unique.slice(i+1)){const a=unique[i];assert(!(a.left<b.right+5&&a.right+5>b.left&&a.top<b.y&&a.y>b.top),'scale numerals have room between them: '+a.s+'/'+b.s);}
 for(const type of ['fuel','oil']){
  const w=d.widgets.find(w=>w.type===type),center=(w.x+w.w/2)*1920,value=labels.find(t=>Math.abs(t.x-center)<.001&&t.s!==(type==='fuel'?'FUEL':'OIL'));
  assert(value&&value.left>=w.x*1920&&value.right<=(w.x+w.w)*1920,'auxiliary value fits its own widget');
  for(const n of needles){const left=Math.min(n.x,n.xx)-n.n/2,right=Math.max(n.x,n.xx)+n.n/2,top=Math.min(n.y,n.yy)-n.n/2,bottom=Math.max(n.y,n.yy)+n.n/2;assert(!(left<value.right&&right>value.left&&top<value.y&&bottom>value.top),'needle does not cross the '+type+' reading');}
 }
 for(const [x,y] of [[360,250],[1560,250]]){const i=(y*1920+x)*4;assert(cv.d[i]<30&&cv.d[i+1]<30&&cv.d[i+2]<30,'factory faces remain dark, not oversized gray panels');assert.equal(cv.d[i+3],255);}
}
// Migrate untouched old auxiliary defaults, while retaining the owner's edits.
const saved=M.defaultDesign(),fuel=saved.widgets.find(w=>w.type==='fuel'),oil=saved.widgets.find(w=>w.type==='oil');
Object.assign(fuel,{x:.01,y:.63,w:.075,h:.24,color:'#aabbcc',on:false,locked:true});
Object.assign(oil,{x:.72,y:.4,w:.12,h:.11});
const migrated=M.validate(saved),f=migrated.widgets.find(w=>w.type==='fuel');
assert.equal(f.x,0);assert.equal(f.color,'#aabbcc');assert(!f.on);assert(f.locked);
assert.deepEqual(migrated.widgets.find(w=>w.type==='oil'),oil,'custom positions are not reset');
console.log('ok factory close-ups: packaged/reproducible square font, readable scales, bounded auxiliary values, dark faces, saved customization');
