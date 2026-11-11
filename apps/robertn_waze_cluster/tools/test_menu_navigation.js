// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const assert=require('assert'),EventEmitter=require('events'),M=require('../src/studio_model'),V=require('../src/studio_view'),{StudioScreen}=require('../src/studio_screen');
const c=new EventEmitter();c.connect=()=>{};c.close=()=>{};const s=new StudioScreen(()=>{},{client:c});
try{
 for(let pass=0;pass<3;pass++)for(const connected of [false,true]){
  c.status=connected?{generation:'source-cluster-v2',design:M.defaultDesign(),slots:[null,null,null,null,null],enabled:true,renderer:true,parked:false,canSelectPanel:true}:null;c.statusAt=Date.now();
  for(const page of Object.keys(V.TITLES)){s.page=page;const f=s.frame(0,1),b=f.items;assert(b.length<=24,page+' proxy budget');assert.equal(new Set(b.map(x=>x.id)).size,b.length);for(let i=0;i<b.length;i++){const a=b[i];assert(a.x>=0&&a.y>=0&&a.x+a.w<=1600&&a.y+a.h<=580,page+' bounds '+a.id);for(const q of b.slice(i+1))assert(!(a.x<q.x+q.w&&a.x+a.w>q.x&&a.y<q.y+q.h&&a.y+a.h>q.y),page+' overlapping controls '+a.id+'/'+q.id);}for(const id of ['navigate-back','live-toggle','apply'])assert(b.some(x=>x.id===id));}
 }
 s.page='gallery';const seen=new Set();for(s.galleryPage=0;s.galleryPage<Math.ceil(M.THEMES.length/3);s.galleryPage++)V.items(s).filter(b=>b.theme).forEach(b=>seen.add(b.theme.id));assert.equal(seen.size,M.THEMES.length);
 s.page='metric';const metrics=new Set();for(s.metricPage=0;s.metricPage<Math.ceil(M.METRICS.length/12);s.metricPage++)V.items(s).filter(b=>b.id.startsWith('metric:')).forEach(b=>metrics.add(b.id.slice(7)));assert.equal(metrics.size,M.METRICS.length);
 assert(!s.press('pick-factory'));assert(!s.press('pick-idrive:0'));assert(!s.press('pick-layout:4'),'old layout activation removed');
 console.log('ok every menu rendered in three offline/connected passes, 24-proxy ceiling, no overlapping controls, all themes and metrics reachable, legacy actions absent');
}finally{s.close();}
