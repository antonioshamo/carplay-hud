// SPDX-License-Identifier: OFL-1.1
// Original square numerals, with unmodified Russo One for non-digit glyphs.
// Regenerates a renamed derivative atlas; see the packaged licenses/LICENSE-RussoOne.txt.
'use strict';
const fs=require('fs'),path=require('path'),zlib=require('zlib');
const source=require('../src/font_cluster');
const box=(x,y,w,h)=>[[x,y],[x+w,y],[x+w,y+h],[x,y+h]];
const outer=[[3,0],[61,0],[64,3],[64,61],[61,64],[3,64],[0,61],[0,3]];
const shapes=[
 [outer,box(13,12,38,40)],
 [[[12,0],[39,0],[39,64],[26,64],[26,12],[12,12]]],
 [[[0,0],[61,0],[64,3],[64,32],[60,37],[13,43],[13,52],[64,52],[64,64],[0,64],[0,35],[51,28],[51,12],[0,12]]],
 [[[0,0],[61,0],[64,3],[64,61],[61,64],[0,64],[0,52],[51,52],[51,38],[15,38],[15,26],[51,26],[51,12],[0,12]]],
 [[[0,0],[13,0],[13,27],[45,27],[45,0],[58,0],[58,64],[45,64],[45,39],[0,39]]],
 [[[0,0],[64,0],[64,12],[13,12],[13,26],[61,26],[64,29],[64,61],[61,64],[0,64],[0,52],[51,52],[51,38],[0,38]]],
 [[[0,3],[3,0],[64,0],[64,12],[13,12],[13,26],[61,26],[64,29],[64,61],[61,64],[3,64],[0,61]],box(13,38,38,14)],
 [[[0,0],[64,0],[64,12],[29,64],[13,64],[49,12],[0,12]]],
 [outer,box(13,12,38,14),box(13,38,38,14)],
 [[[3,0],[61,0],[64,3],[64,61],[61,64],[0,64],[0,52],[51,52],[51,38],[3,38],[0,35],[0,3]],box(13,12,38,14)]
];
function inside(poly,x,y){let inShape=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inShape=!inShape;}return inShape;}
const sizes=source.sizes.map(s=>{
 const src=zlib.inflateSync(Buffer.from(s.alpha,'base64')),items=[],glyphs={};let x=0,y=0,row=0;
 for(const key of Object.keys(s.glyphs)){
  const code=Number(key),g=s.glyphs[key].slice(),digit=code>=48&&code<=57,shape=shapes[code-48];
  const height=digit?Math.round(s.size*.71):g[3],width=digit?Math.ceil(height*(code===49?.61:code===52?.91:1)):g[2];
  if(x+width>1024){x=0;y+=row+1;row=0;}
  const pixels=Buffer.alloc(width*height);
  for(let yy=0;yy<height;yy++)for(let xx=0;xx<width;xx++){
   if(!digit){pixels[yy*width+xx]=src[(g[1]+yy)*s.atlasW+g[0]+xx];continue;}
   let count=0;for(let sy=0;sy<4;sy++)for(let sx=0;sx<4;sx++){
    const u=(xx+(sx+.5)/4)/height*64,v=(yy+(sy+.5)/4)/height*64;
    if(inside(shape[0],u,v)&&!shape.slice(1).some(h=>inside(h,u,v)))count++;
   }
   pixels[yy*width+xx]=Math.round(count*255/16);
  }
  items.push({x,y,width,height,pixels});
  glyphs[key]=[x,y,width,height,digit?0:g[4],digit?-height:g[5],digit?width+s.size*.065:g[6]];
  x+=width+1;row=Math.max(row,height);
 }
 const height=y+row+1,atlas=Buffer.alloc(1024*height);
 for(const item of items)for(let yy=0;yy<item.height;yy++)item.pixels.copy(atlas,(item.y+yy)*1024+item.x,yy*item.width,(yy+1)*item.width);
 return {size:s.size,ascent:s.ascent,descent:s.descent,atlasW:1024,atlasH:height,alpha:zlib.deflateSync(atlas,{level:9}).toString('base64'),glyphs,key:'ClusterSquare-v1@'+s.size};
});
const out={family:'Cluster Square',baseFamily:'Russo One',baseSourceSha256:source.sourceSha256,sizes};
fs.writeFileSync(process.argv[2]||path.join(__dirname,'../src/font_cluster_square.js'),'// SPDX-License-Identifier: OFL-1.1\n// Cluster Square: original numerals and Russo One non-digit glyphs. See LICENSE-RussoOne.txt.\nmodule.exports = '+JSON.stringify(out)+';\n');
