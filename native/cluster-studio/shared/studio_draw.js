// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const M=require('./studio_model.js');
function draw(r,d,b,data,options){
 const o=options||{},t=M.THEMES[d.theme],sx=b.w/1920,sy=b.h/720,scale=Math.min(sx,sy);
 const rect=(x,y,w,h,c,rad)=>r.roundRect(b.x+x*sx,b.y+y*sy,w*sx,h*sy,(rad||0)*scale,c);
 const text=(s,x,y,size,c)=>r.text(String(s),b.x+x*sx,b.y+y*sy,size*scale,c||'#f3f5ff',{font:'bold'});
 const line=(x,y,xx,yy,n,c)=>r.line(b.x+x*sx,b.y+y*sy,b.x+xx*sx,b.y+yy*sy,n*scale,c);
 if(d.background==='gradient')r.gradientRect(b.x,b.y,b.w,b.h,[[0,t[3]],[.7,'#060a11'],[1,'#020408']]);
 else if(d.background==='black')r.fillRect(b.x,b.y,b.w,b.h,'#030507');
 function flag(x,y,w,h){const cell=Math.min(w/8,h/4);for(let row=0;row<4;row++)for(let col=0;col<8;col++)if((row+col)%2===0)rect(x+col*cell,y+row*cell,cell*.9,cell*.9,'#f2f6ff');}
 const now=data.now||new Date(),time=d.clock24?String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0'):(now.getHours()%12||12)+':'+String(now.getMinutes()).padStart(2,'0')+' '+(now.getHours()<12?'AM':'PM');
 const gauge=(w,val,max,label,unit)=>{
  const x=w.x*1920,y=w.y*720,ww=w.w*1920,hh=w.h*720,n=val==null?'—':String(Math.round(val));
  if(d.gauge==='ring'){
   const rad=Math.min(ww/2-12,hh/2-8),cx=x+ww/2,cy=y+hh/2;
   r.arc(b.x+cx*sx,b.y+cy*sy,(rad-11)*scale,rad*scale,220,500,'#253247');
   if(val!=null)r.arc(b.x+cx*sx,b.y+cy*sy,(rad-11)*scale,rad*scale,220,220+280*M.clamp(val/max,0,1),t[1]);
   for(let i=0;i<=10;i++){const a=(220+28*i)*Math.PI/180;line(cx+Math.sin(a)*(rad-23),cy-Math.cos(a)*(rad-23),cx+Math.sin(a)*(rad-32),cy-Math.cos(a)*(rad-32),2,'#71829b');}
   text(n,cx-(n.length*25),cy+25,86,t[1]);text(unit,cx-unit.length*10,cy+65,29,'#acb9ca');text(label,cx-label.length*9,cy-62,26,'#acb9ca');
  }else{
   if(d.borders)rect(x,y,ww,hh,'#141e2c',24);
   text(label,x+22,y+44,29,'#a9b7ca');text(n,x+22,y+hh*.62,Math.min(104,hh*.43),t[1]);text(unit,x+22,y+hh-22,26,'#acb9ca');
   if(d.gauge==='bar'){rect(x+22,y+hh-66,ww-44,12,'#283347',6);if(val!=null)rect(x+22,y+hh-66,(ww-44)*M.clamp(val/max,0,1),12,t[1],6);}
  }
 };
 for(const w of d.widgets){if(!w.on)continue;const x=w.x*1920,y=w.y*720,ww=w.w*1920,hh=w.h*720;
  const val=data[w.type];
  if(w.type==='speed')gauge(w,val==null?null:d.units==='mph'?val/1.609344:val,d.units==='mph'?160:260,'SPEED',d.units);
  else if(w.type==='rpm')gauge(w,val,8000,'ENGINE','RPM');
  else if(w.type==='gear'){if(d.borders)rect(x,y,ww,hh,'#1b273a',20);text(val==null?'—':val,x+ww*.28,y+hh*.72,hh*.62,t[1]);}
  else if(w.type==='clock')text(time,x+8,y+hh*.74,Math.min(hh*.68,ww/(time.length*.63)),t[1]);
  else if(w.type==='date'){const s=['SUN','MON','TUE','WED','THU','FRI','SAT'][now.getDay()]+' / '+(now.getMonth()+1)+'.'+now.getDate();text(s,x+8,y+hh*.73,Math.min(36,hh*.7),'#acb9ca');}
  else if(w.type==='badge'){text('X4 M',x+ww*.10,y+hh*.53,Math.min(ww*.25,hh*.6),t[1]);text('C O M P E T I T I O N',x+ww*.10,y+hh*.88,Math.min(ww*.047,hh*.21),'#d1d9e5');}
  else if(w.type==='flag')flag(x,y,ww,hh);
  else if(w.type==='accent'){['#53bdeb','#3457aa','#e5475b'].forEach((c,i)=>rect(x+i*ww/3,y,ww/3-6,hh,c,3));}
  else if(w.type==='signature')text(M.TITLES[d.title],x+5,y+hh*.75,Math.min(hh*.65,ww/(M.TITLES[d.title].length*.62)),t[1]);
  else if(w.type==='connection')text(data.connected?'VEHICLE DATA / LIVE':'VEHICLE DATA / UNAVAILABLE',x,y+hh*.75,Math.min(hh*.7,ww/18),'#acb9ca');
  else {const label=w.type==='oil'?'OIL':'COOLANT';text(label,x+6,y+hh*.29,Math.min(23,hh*.3),'#acb9ca');text(val==null?'— °C':Math.round(val)+' °C',x+6,y+hh*.85,Math.min(48,hh*.56),t[1]);}
  if(o.selected===w.type)r.strokeRoundRect(b.x+x*sx,b.y+y*sy,ww*sx,hh*sy,8*scale,2,'#56bdff');
 }
 if(o.grid){for(let i=1;i<10;i++){r.line(b.x+b.w*i/10,b.y,b.x+b.w*i/10,b.y+b.h,.5,'#253347');r.line(b.x,b.y+b.h*i/10,b.x+b.w,b.y+b.h*i/10,.5,'#253347');}}
}
function intro(r,d,b,progress){
 const p=M.clamp(progress,0,1),t=M.THEMES[d.theme],offset=d.intro==='slide'?Math.pow(1-Math.min(1,p*4),3)*b.w*.7:0;
 const x=b.x+offset,y=b.y,w=b.w,h=b.h;
 r.roundRect(x+w*.07,y+h*.13,w*.86,h*.74,18,'#0b1421');
 r.text('X4 M',x+w*.20,y+h*.48,h*.29,t[1],{font:'bold'});
 r.text('C O M P E T I T I O N',x+w*.20,y+h*.68,h*.067,'#eef4ff',{font:'bold'});
 const cw=w*.022;for(let a=0;a<4;a++)for(let z=0;z<7;z++)if((a+z)%2===0)r.fillRect(x+w*.65+z*cw,y+h*.32+a*cw,cw*.9,cw*.9,'#f0f5ff');
 ['#53bdeb','#3457aa','#e5475b'].forEach((c,i)=>r.fillRect(x+w*(.2+i*.12),y+h*.77,w*.11*Math.min(1,p*3),h*.016,c));
}
module.exports={draw,intro};
