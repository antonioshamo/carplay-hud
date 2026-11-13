// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const EventEmitter=require('events'),M=require('../shared/studio_model'),{Engine}=require('../engine');
class RecordingRenderer extends EventEmitter {
 constructor(){super();this.ready=true;this.independentPanelHud=true;this.panelFocusVideo=true;this.targets='panel:1920x720,map:1088x480,hud:800x480';this.layers=new Map();this.next=1;this.maxLayers=0;this.ops=[];}
 add(kind,o){if(o.target!=='panel')throw Error('Cluster requested another display');const layers=Array.from(this.layers.values()).filter(l=>l.kind!=='asset').length;if(kind!=='asset'&&layers>=8)throw Error('Native per-client layer limit exceeded');const ref=this.next++;this.layers.set(ref,{kind,opts:o,parts:new Map()});this.ops.push([kind,ref]);this.maxLayers=Math.max(this.maxLayers,layers+(kind==='asset'?0:1));return ref;}
 mesh(o){return this.add('mesh',o);}
 asset(o){return this.add('asset',o);}
 part(ref,n,o){const l=this.layers.get(ref);if(l.parts.size>=16||l.parts.has(n))throw Error('Native mesh part limit exceeded');l.parts.set(n,{opts:o,uniforms:{},binds:{}});return true;}
 geometry(ref,n,g){this.layers.get(ref).parts.get(n).geometry=g;return true;}
 pixels(ref,rect,px){this.layers.get(ref).pixels=Buffer.from(px);this.ops.push(['pixels',ref,px.length]);}
 uniform(ref,n,v,o){if(v.some(x=>!Number.isFinite(x)))throw Error('Non-finite uniform '+n);const p=this.layers.get(ref).parts.get(o.part);p.uniforms[n]={v:v.slice(),type:o.type||null};this.ops.push(['uniform',ref,n]);}
 bind(ref,n,asset,part){this.layers.get(ref).parts.get(part).binds[n]=asset;}
 animate(ref,opts){const l=this.layers.get(ref);if(!l)throw Error('Unknown animated layer');if(!l.animations)l.animations=new Map();if(l.animations.size>=16)throw Error('Native per-layer animation limit exceeded');const id=this.next++;l.animations.set(id,opts);return id;}
 stop(ref,id){const l=this.layers.get(ref);if(l&&l.animations)l.animations.delete(id);}
 set(ref,o){const l=this.layers.get(ref);if(l)Object.assign(l.opts,o);}
 drop(ref){const l=this.layers.get(ref);if(l&&l.kind==='asset')for(const layer of this.layers.values())for(const p of layer.parts.values())if(Object.values(p.binds).includes(ref))throw Error('Asset still sampled by a native mesh');this.layers.delete(ref);this.ops.push(['drop',ref]);}
 close(){this.layers.clear();}
 status(){}
 scene(){const assets={},parts=[];this.layers.forEach((l,ref)=>{if(l.kind==='asset')assets[ref]={w:l.opts.w,h:l.opts.h,format:l.opts.format,px:l.pixels.toString('base64')};});Array.from(this.layers.values()).filter(l=>l.kind==='mesh'&&l.opts.visible!==false).sort((a,b)=>a.opts.z-b.opts.z).forEach(l=>l.parts.forEach(p=>parts.push(p)));return {w:1920,h:720,parts,assets};}
}
const sample=()=>({speed:62*1.609344,rpm:3200,gear:'D',oil:96,coolant:90,fuel:32,range:310,outside:13,torque:280,power:94,battery:82,driveMode:'COMFORT',pressureFL:2.4,pressureFR:2.4,pressureRL:2.6,pressureRR:2.6,tireTempFL:28,tireTempFR:29,tireTempRL:30,tireTempRR:31});
async function scene(theme,palette,options){
 const now=Date.now;let at=100000,raw=Object.assign(sample(),options&&options.data);Date.now=()=>at;
 const cr=new RecordingRenderer(),telemetry={snapshot:()=>raw,parked:()=>raw.gear==='P'&&raw.speed===0},e=new Engine(cr,telemetry,{now:()=>at,mapRequest:{update(){},release(){}}});
 const d=Object.assign(M.defaultDesign(),options&&options.design,{theme,palette});
 try{e.configure(d,true,'panel');for(let i=0;i<70;i++){at+=20;e.tick();e.source._tick();await new Promise(resolve=>setImmediate(resolve));}const out=cr.scene();out.theme=theme;out.palette=palette;out.reservedWindow=e.window();out.stats={parts:out.parts.length,meshes:cr.layers.size-Object.keys(out.assets).length,maxLayers:cr.maxLayers};return out;}finally{e.close();Date.now=now;}
}
module.exports={RecordingRenderer,sample,scene};
