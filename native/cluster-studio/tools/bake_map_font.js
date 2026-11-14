// SPDX-License-Identifier: GPL-3.0-or-later
// Reuse the dashboard's licensed Inter bitmap atlas. Build-time only.
'use strict';
const fs=require('fs'),path=require('path'),zlib=require('zlib'),vm=require('vm');
const dir=path.join(__dirname,'../vendor/cluster-layouts');
const source=require('../../../apps/robertn_waze_cluster/src/font_semibold').sizes.slice(-1)[0];
const alpha=zlib.inflateSync(Buffer.from(source.alpha,'base64'));
// Reuse the source renderer's exact distance-transform implementation.
const code=fs.readFileSync(path.join(dir,'font.js'),'utf8');const ctx={};vm.runInNewContext(code.slice(code.indexOf('function edt1('),code.indexOf('/** One glyph')),ctx);
const meta=require(path.join(dir,'font_baked')),chars=meta.bold.chars,cellW=64,cellH=64,cols=32,rows=Math.ceil(chars.length/cols),up=2,W=cellW*up,H=cellH*up,scale=cellH*.98*up/source.size;
const px=Buffer.alloc(cellW*cols*cellH*rows),adv=[];
Array.from(chars).forEach((ch,k)=>{const g=source.glyphs[ch.codePointAt(0)]||source.glyphs[63];adv.push(Math.round(g[6]*scale/(cellH*up)*10000)/10000);if(ch===' ')return;const mask=new Uint8Array(W*H),ox=W*.5-g[6]*scale*.5+g[4]*scale,oy=H*.86+g[5]*scale;
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){const fx=(x-ox)/scale,fy=(y-oy)/scale,sx=Math.floor(fx),sy=Math.floor(fy),dx=fx-sx,dy=fy-sy;const a=(xx,yy)=>xx>=0&&yy>=0&&xx<g[2]&&yy<g[3]?alpha[(g[1]+yy)*source.atlasW+g[0]+xx]:0;mask[y*W+x]=a(sx,sy)*(1-dx)*(1-dy)+a(sx+1,sy)*dx*(1-dy)+a(sx,sy+1)*(1-dx)*dy+a(sx+1,sy+1)*dx*dy;}
 const inside=i=>mask[i]>=128,toIn=ctx.edt(W,H,inside),toOut=ctx.edt(W,H,i=>!inside(i));for(let y=0;y<cellH;y++)for(let x=0;x<cellW;x++){const i=(y*up+1)*W+x*up+1,sd=(inside(i)?Math.sqrt(toOut[i])-.5:-(Math.sqrt(toIn[i])-.5))/up;px[(Math.floor(k/cols)*cellH+y)*(cellW*cols)+(k%cols)*cellW+x]=Math.max(0,Math.min(255,Math.round((.5+sd/16)*255)));}
});
meta.ui={font:'Inter semibold (dashboard atlas, SIL OFL 1.1)',chars,cellW,cellH,cols,rows,spread:8,adv};fs.writeFileSync(path.join(dir,'font_ui.wad'),px);fs.writeFileSync(path.join(dir,'font_baked.js'),"'use strict';\n/* Baked source fonts and map-only Inter UI atlas; see NOTICE. */\nmodule.exports = "+JSON.stringify(meta)+';\n');console.log('Inter UI atlas',px.length,'bytes');
