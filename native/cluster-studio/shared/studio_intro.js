// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const M=require('./studio_model.js'),A=require('./studio_assets.js'),{Canvas}=require('./kit_canvas.js'),kit=require('./kit_record.js');
const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*x*(x*(x*6-15)+10);};
let badge=null,shine=[],shineColor=null;
function badgeFrame(n,color){
 if(!badge){const source=A.badge(),cv=new Canvas(1024,Math.round(1024*source.h/source.w));cv.image(source,0,0,cv.w,cv.h);badge=kit.makeImage(cv.w,cv.h,cv.d);}
 if(n<0)return badge;
 if(color!==shineColor){shine.forEach(img=>kit.dropImage(img));shine=[];shineColor=color;}
 const key=n;if(shine[key])return shine[key];
 const pixels=Buffer.from(badge.data),rgb=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16));
 for(let y=0;y<badge.h;y++)for(let x=0;x<badge.w;x++){const i=(y*badge.w+x)*4,k=Math.max(0,1-Math.abs(x/badge.w-y/badge.h*.12-(n/11*1.4-.2))/.11)*.85;for(let c=0;c<3;c++)pixels[i+c]+=Math.round((rgb[c]-pixels[i+c])*k);}
 return shine[key]=kit.makeImage(badge.w,badge.h,pixels);
}
// Rasterize the native vector outline as one mask. Shared interior edges must
// not be anti-aliased independently (that would leave triangulation seams).
function appleMask(){
 const w=256,h=292,ss=4,coverage=new Uint8Array(w*h);
 for(let y=0;y<h*ss;y++)for(const poly of A.apple){
  const yy=(y+.5)/(h*ss),xs=[];
  for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length];if((a[1]>yy)!==(b[1]>yy))xs.push(a[0]+(yy-a[1])*(b[0]-a[0])/(b[1]-a[1]));}
  xs.sort((a,b)=>a-b);
  for(let i=0;i+1<xs.length;i+=2)for(let x=Math.max(0,Math.ceil(xs[i]*w*ss-.5));x<Math.min(w*ss,xs[i+1]*w*ss-.5);x++)coverage[Math.floor(y/ss)*w+Math.floor(x/ss)]++;
 }
 const data=Buffer.alloc(w*h*4);for(let i=0;i<coverage.length;i++){data[i*4]=data[i*4+1]=data[i*4+2]=255;data[i*4+3]=Math.round(coverage[i]*255/(ss*ss));}
 return kit.makeImage(w,h,data);
}
const apple=appleMask();
function duration(d){return d.intro==='none'?0:d.introDuration||3000;}
function timeline(d,ms){
 const total=duration(d),p=total?clamp(ms/total):1,appleMode=d.intro==='apple';
 return {total,p,done:!total||ms>=total,entrance:ease(p/(appleMode?.1:.24)),slide:ease((p-.28)/.12),shine:clamp((p-.24)/.42),fade:clamp((p-.80)/.12),reveal:clamp((p-.94)/.06)};
}
function intro(r,d,b,ms){
 const a=timeline(d,ms);if(a.done)return false;
 r.fillRect(b.x,b.y,b.w,b.h,'#000000');
 const color=d.introLight==='blue'?'#75cfff':d.introLight==='red'?'#ff697e':d.introLight==='theme'?M.THEMES[d.theme][1]:'#ffffff';
 if(d.intro==='apple'){
  const h=b.h*.42,w=h*14/16,x=b.x+b.w*.5-w/2-a.slide*b.w*.22,y=b.y+b.h*.28;
  r.image(apple,x,y,w,h);
  if(a.slide>.01)r.text('CarPlay Ultra',b.x+b.w*.41,b.y+b.h*.57,b.h*.125,[255,255,255,Math.round(a.slide*255)],{font:'label'});
 }else if(d.intro==='welcome'){
  const x=b.x+(1-a.entrance)*b.w*.12;
  r.text('Welcome',x+b.w*.5,b.y+b.h*.38,b.h*.10,color,{font:'label',align:'center'});
  r.text(d.welcomeName||'Antonio Shamo',x+b.w*.5,b.y+b.h*.62,Math.min(b.h*.15,b.w*.8/((d.welcomeName||'Antonio Shamo').length*.65)),'#ffffff',{font:'bold',align:'center'});
  r.fillRect(b.x+b.w*.35,b.y+b.h*.72,b.w*.30*a.entrance,b.h*.006,color);
 }else {
  const sweep=d.introShine&&a.p>.24&&a.p<.72?a.shine*11:-1,lo=sweep<0?-1:Math.floor(sweep),img=badgeFrame(lo,color),next=sweep>=0&&lo<11?badgeFrame(lo+1,color):null,w=b.w*.85,h=w*img.h/img.w;
  const x=b.x+(b.w-w)/2+(d.intro==='reveal'?0:(1-a.entrance)*b.w*1.02),y=b.y+(b.h-h)/2;
  const k=d.intro==='reveal'?.65+.35*a.entrance:1,xx=x+w*(1-k)/2,yy=y+h*(1-k)/2;
  r.image(img,xx,yy,w*k,h*k);
  if(next){const opacity=sweep-lo;if(r.alpha){r.alpha(opacity);r.image(next,xx,yy,w*k,h*k);r.alpha(1);}else r.image(next,xx,yy,w*k,h*k,0,opacity);}
 }
 if(a.fade>0)r.fillRect(b.x,b.y,b.w,b.h,[0,0,0,Math.round(a.fade*255)]);
 return true;
}
function prepare(d){if(d.intro==='slide'||d.intro==='reveal'){badgeFrame(-1);if(d.introShine){const color=d.introLight==='blue'?'#75cfff':d.introLight==='red'?'#ff697e':d.introLight==='theme'?M.THEMES[d.theme][1]:'#ffffff';for(let n=0;n<12;n++)badgeFrame(n,color);}}}
module.exports={intro,duration,timeline,prepare,artwork:()=>({badge:badgeFrame(-1),apple})};
