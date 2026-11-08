// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
// Render real menu command streams and native panel composition, using explicit
// sample data. These images are offline QA artifacts, not vehicle screenshots.
const fs=require('fs'),path=require('path'),{Canvas}=require('../src/kit_canvas.js'),kit=require('../src/kit_record.js'),M=require('../src/studio_model.js'),D=require('../src/studio_draw.js'),V=require('../src/studio_view.js'),H=require('../src/hud_view.js'),{StudioScreen}=require('../src/studio_screen.js'),panel=require('../../../native/cluster-studio/panel_composition.js');
const out=path.resolve(process.argv[2]||'/tmp/bmw-all-previews');fs.mkdirSync(out,{recursive:true});
const s=new StudioScreen(()=>{}),rows=[],sheets={};
function small(src,w,h){const dst=new Canvas(w,h);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const from=(Math.min(src.h-1,Math.floor((y+.5)*src.h/h))*src.w+Math.min(src.w-1,Math.floor((x+.5)*src.w/w)))*4;dst.d.set(src.d.subarray(from,from+4),(y*w+x)*4);}return dst;}
function save(group,name,cv){const file=group+'-'+name+'.png';fs.writeFileSync(path.join(out,file),cv.png());rows.push({group,name,file,width:cv.w,height:cv.h});if(!sheets[group])sheets[group]=[];sheets[group].push({name,cv:small(cv,640,Math.round(640*cv.h/cv.w))});}
function frame(group,name,f){const cv=new Canvas(1600,580);kit.play(f.record.words(),cv);save(group,name,cv);}
const status={slots:[M.preset(0),M.idrivePreset(2),null,null,null],design:M.preset(0),parked:true,enabled:true,renderer:true,phoneDesigner:true,canPreview:true,canSelectPanel:true,panelClearance:'native-gear-v1',independentPanelHud:true,output:'parked-panel',displayVisible:true,displayTarget:'panel',state:'Sample status'};
for(const mode of ['connected','offline','saving']){
 s.client.status=mode==='offline'?null:status;s.client.pending=mode==='saving'?{}:null;s.client.statusAt=Date.now();
 for(const page of Object.keys(V.TITLES)){s.page=page;const focus=Math.max(0,V.items(s).findIndex(b=>b.x<250&&b.selected));frame('menu-'+mode,page,s.frame(focus,1));}
}
s.client.pending=null;s.client.status=status;
for(let group=0;group<M.GROUPS.length;group++)for(let page=0;page<Math.ceil(M.GROUPS[group][1].length/V.WIDGETS_PER_PAGE);page++){
 s.page='add';s.widgetGroup=group;s.widgetPage=page;frame('widgets','group-'+group+'-page-'+page,s.frame(4,1));
}
const hud={target:'hud',state:'showing',width:60,offset:[0,0],step:10,background:false,corners:true,startup:false,startupResult:'Separate map preference saved',notice:'Sample status — offline render',captureText:'No capture running',captureButton:'Capture logs (5 min)',logs:['Sample connection status','Output: windshield HUD','Width: 60%']};
for(const k of ['canDisplay','canSize','canLarger','canSmaller','canMove','canStyle','canCorners','canStartup','canDisable','canCapture','canRestore'])hud[k]=true;
for(const page of H.tabs.map(t=>t[0]).concat(['details']))frame('hud-menu',page,H.frame(hud,page,Math.max(0,H.tabs.findIndex(t=>t[0]===page)),0,1));
const CV=require('../src/cockpit_view.js');
for(const page of ['overview','vehicle'])frame('first-paint',page,CV.frame(Object.assign({},hud,{deferArtwork:true,cockpit:{},helperFresh:false}),page,0,1));
for(const mode of ['offline','fresh','pending','stale']){
 const helper=Object.assign({},status,{climateSupported:true,data:s.previewData(),climate:{pending:mode==='pending',message:mode==='pending'?'Waiting for BMW confirmation…':'Sample climate status · offline rendering',controls:['ac','maxAC','defrost','freshAir','autoDR','autoPS','airDR','airPS'].map((id,i)=>({id,value:i%2,available:true}))}});
 const base=Object.assign({},hud,{helper:mode==='offline'?null:helper,helperFresh:mode==='fresh'||mode==='pending'});
 for(const variant of [['overview',{homePage:0}],['overview',{homePage:1}],['apps',{category:'all',appPage:0}],['apps',{category:'all',appPage:1}],['apps',{category:'display'}],['apps',{category:'vehicle'}],['apps',{category:'comfort'}],['vehicle',{vehicleTab:'engine'}],['vehicle',{vehicleTab:'tires'}],['vehicle',{vehicleTab:'journey'}],['climate',{climateTab:0}],['climate',{climateTab:1}],['climate',{climateTab:2}]])frame('cockpit-'+mode,variant[0]+'-'+Object.values(variant[1]).join('-'),CV.frame(Object.assign({},base,{cockpit:variant[1]}),variant[0],5,1));
}
for(const width of [0,40,60,75,95])for(const offset of [[0,0],[400,-400],[-400,400]])frame('hud-layout',width+'-'+offset.join('_'),H.frame(Object.assign({},hud,{width,offset}),'layout',1,0,1));
const data=s.previewData();
for(let n=0;n<103;n++){
 const design=n<100?M.preset(n):M.idrivePreset(n-100),cv=new Canvas(1920,720);panel.draw(cv,design,data);save('cluster',n<100?String(n+1).padStart(3,'0'):design.template,cv);
}
for(const type of M.TYPES){const design=M.preset(0);design.widgets.forEach(w=>{w.on=w.type===type;if(w.on)Object.assign(w,{x:.28,y:.16,w:.44,h:.68});});const cv=new Canvas(960,360);D.draw(cv,design,{x:0,y:0,w:960,h:360},data);save('widget-detail',type,cv);}
for(const style of M.STYLES){const design=M.acceptedDesign();design.gauge=style[0];for(const values of [{speed:0,rpm:750,gear:'P'}, {speed:130,rpm:6500,gear:'D'}, {speed:null,rpm:null,gear:null}]){const cv=new Canvas(1920,720);panel.draw(cv,design,Object.assign({},data,values));save('dial-styles',style[0]+'-'+(values.rpm===null?'unavailable':values.rpm),cv);}}
for(const mode of ['slide','reveal','apple','welcome'])for(const progress of [0,.2,.5,.9,1]){const design=M.acceptedDesign();design.intro=mode;design.introDuration=mode==='apple'?5500:3000;const cv=new Canvas(1280,480);D.sequence(cv,design,{x:0,y:0,w:1280,h:480},data,design.introDuration*progress);save('welcome',mode+'-'+progress,cv);}
for(const group of Object.keys(sheets))for(let start=0;start<sheets[group].length;start+=12){const subset=sheets[group].slice(start,start+12),height=40+Math.max.apply(null,subset.map(a=>a.cv.h)),sheet=new Canvas(1920,Math.ceil(subset.length/3)*height);sheet.clear('#080d14');subset.forEach((a,i)=>{const x=i%3*640,y=Math.floor(i/3)*height;sheet.text(a.name,x+12,y+26,20,'#dceaff');sheet.blit(a.cv,x,y+40);});fs.writeFileSync(path.join(out,'sheet-'+group+'-'+Math.floor(start/12)+'.png'),sheet.png());}
fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify({sampleData:true,vehicleVerified:false,images:rows},null,2));
fs.writeFileSync(path.join(out,'index.html'),'<!doctype html><meta charset="utf-8"><title>BMW menus and displays — visual review</title><style>body{background:#080d14;color:#e5eef9;font:18px system-ui;margin:24px}nav{position:sticky;top:0;background:#080d14;padding:12px}a{color:#8ddcff}select{font:inherit;padding:8px;background:#18334a;color:white}figure{margin:28px 0}img{max-width:100%;border:1px solid #385069;border-radius:8px}figcaption{margin:8px 0;color:#afc4da}</style><h1>Menus, HUD layouts & cluster</h1><p>Actual app rendering and native panel composition. Sample readings; no live car connection. HUD images show placement previews, not a live Apple Maps feed.</p><nav><label>View <select id="group">'+Object.keys(sheets).map(g=>'<option>'+g+'</option>').join('')+'</select></label></nav><main></main><script>const rows='+JSON.stringify(rows)+';const group=document.querySelector("select"),main=document.querySelector("main");function show(){main.innerHTML=rows.filter(r=>r.group===group.value).map(r=>`<figure><figcaption>${r.name} · ${r.width} × ${r.height}</figcaption><a href="${r.file}"><img loading="lazy" src="${r.file}" alt="${r.name}"></a></figure>`).join("")}group.onchange=show;show();</script>');
s.close();console.log(JSON.stringify({images:rows.length,groups:Object.keys(sheets).length,out}));
