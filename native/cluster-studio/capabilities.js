// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
// Discovery only: the presence of a field is NOT permission to invoke it.
const fs=require('fs'),crypto=require('crypto');
const CATALOG='/etc/oap/someip/someip-interfaces.json';
const LIGHT=/ambient|interior.?light|cabin.?light|contour.?light|footwell|innenlicht|ambiente/i;
const CLIMATE=/climate|aircondition|seatheat|seatvent|steeringwheelheat/i;
const MEDIA=/carplay|airplay|mediaengine|videoplayer|browser/i;
function inspect(db){
 if(!db||!db.interfaces||Array.isArray(db.interfaces)||typeof db.interfaces!=='object')throw Error('Unrecognized firmware interface catalog');
 const rows=[],types={},src=db.datatypes||{};
 function type(ref,depth){
  if(typeof ref!=='string'||types[ref]||!src[ref]||depth>5||Object.keys(types).length>=100)return;
  // Only schema fields, never a service's live values or credentials.
  const d=src[ref],out={type:d.type};types[ref]=out;
  for(const k of ['dataRef','baseType','elementDataRef','extends'])if(typeof d[k]==='string'){out[k]=d[k];type(d[k],depth+1);}
  if(d.items&&typeof d.items==='object')out.items=Object.keys(d.items).slice(0,100).reduce((a,k)=>{if(['string','number'].includes(typeof d.items[k]))a[k]=d.items[k];return a;},{});
  if(Array.isArray(d.members))out.members=d.members.slice(0,60).map(m=>{type(m.dataRef,depth+1);return {name:m.name,dataRef:m.dataRef};});
 }
 for(const name of Object.keys(db.interfaces).sort()){
  const i=db.interfaces[name];if(!i||typeof i!=='object')continue;
  for(const kind of ['fields','methods','events'])for(const member of Object.keys(i[kind]||{}).sort()){
   const text=name+'.'+member,category=LIGHT.test(text)?'lighting':MEDIA.test(text)?'media':CLIMATE.test(text)?'climate':null;
   if(!category||rows.filter(r=>r.category===category).length>=60)continue;
   const d=i[kind][member]||{};type(d.dataRef,0);
   rows.push({category,interface:name,serviceId:i.serviceId,kind,name:member,dataRef:d.dataRef,getter:!!d.getter,setter:!!d.setter,notifier:!!d.notifier});
  }
 }
 return {schema:1,readOnly:true,rows,types,lighting:rows.filter(x=>x.category==='lighting').length,climate:rows.filter(x=>x.category==='climate').length,media:rows.filter(x=>x.category==='media').length};
}
function scan(file){
 file=file||CATALOG;const stat=fs.statSync(file);if(!stat.isFile()||stat.size>64*1024*1024)throw Error('Firmware catalog is not a bounded regular file');
 const bytes=fs.readFileSync(file),r=inspect(JSON.parse(bytes.toString('utf8')));
 r.catalogSha256=crypto.createHash('sha256').update(bytes).digest('hex');r.scannedAt=new Date().toISOString();
 r.players=['/usr/bin/ffmpeg','/usr/bin/gst-launch-1.0','/usr/bin/chromium','/var/opt/mgu-ytplay/current/mgu-ytplay'].filter(p=>{try{return fs.statSync(p).isFile();}catch(e){return false;}});
 r.note='Candidates only. No lighting or climate writes, ECU coding, browser launch or playback capability inferred.';
 return r;
}
module.exports={inspect,scan,CATALOG};
