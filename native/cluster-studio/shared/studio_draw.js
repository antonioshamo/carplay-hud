// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const M=require('./studio_model.js');
function draw(r,d,b,data,options){
 const o=options||{},t=M.THEMES[d.theme],sx=b.w/1920,sy=b.h/720,scale=Math.min(sx,sy);
 const rect=(x,y,w,h,c,rad)=>r.roundRect(b.x+x*sx,b.y+y*sy,w*sx,h*sy,(rad||0)*scale,c);
 const text=(s,x,y,size,c)=>r.text(String(s),b.x+x*sx,b.y+y*sy,size*scale,c||'#f3f5ff',{font:'bold'});
 const line=(x,y,xx,yy,n,c)=>r.line(b.x+x*sx,b.y+y*sy,b.x+xx*sx,b.y+yy*sy,n*scale,c);
 if(d.gauge==='ultra'&&d.background==='gradient')r.gradientRect(b.x,b.y,b.w,b.h,[[0,'#062c3a'],[.7,'#07151b'],[1,'#000000']]);
 else if(d.background==='gradient')r.gradientRect(b.x,b.y,b.w,b.h,[[0,t[3]],[.7,'#060a11'],[1,'#020408']]);
 else if(d.background==='black')r.fillRect(b.x,b.y,b.w,b.h,'#030507');
 function flag(x,y,w,h){const cell=Math.min(w/8,h/4);for(let row=0;row<4;row++)for(let col=0;col<8;col++)if((row+col)%2===0)rect(x+col*cell,y+row*cell,cell*.9,cell*.9,'#f2f6ff');}
 const now=data.now||new Date(),time=d.clock24?String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0'):(now.getHours()%12||12)+':'+String(now.getMinutes()).padStart(2,'0')+' '+(now.getHours()<12?'AM':'PM');
 const gauge=(w,val,max,label,unit)=>{
  const mode=!w.gauge||w.gauge==='inherit'?d.gauge:w.gauge,accent=w.color&&w.color!=='theme'?w.color:t[1];
  const x=w.x*1920,y=w.y*720,ww=w.w*1920,hh=w.h*720,n=val==null?'—':String(Math.round(val));
  if(mode==='ultra'){
   const rad=Math.min(ww/2-10,hh/2-10),cx=x+ww/2,cy=y+hh/2,col=w.color&&w.color!=='theme'?w.color:d.theme===0?'#08b5db':t[1];
   r.arc(b.x+cx*sx,b.y+cy*sy,(rad-20)*scale,rad*scale,222,498,'#103c49');
   if(val!=null)r.arc(b.x+cx*sx,b.y+cy*sy,(rad-20)*scale,rad*scale,222,222+276*M.clamp(val/max,0,1),col);
   const value=w.type==='rpm'?(data.gear==null?'—':data.gear):n,unitText=w.type==='rpm'?(val==null?'RPM unavailable':Math.round(val)+' RPM'):unit;
   text(value,cx-value.length*34,cy+34,120,'#ffffff');text(unitText,cx-unitText.length*9,cy+78,29,'#d1dde1');
   r.arc(b.x+cx*sx,b.y+cy*sy,(rad-4)*scale,rad*scale,145,215,col);
   if(w.type==='rpm')text(data.coolant==null?'— °'+(d.temperatureUnit||'C'):Math.round(d.temperatureUnit==='F'?data.coolant*1.8+32:data.coolant)+' °'+(d.temperatureUnit||'C'),cx-44,cy+rad-34,28,'#ffffff');
  }else if(mode==='ring'){
   const rad=Math.min(ww/2-12,hh/2-8),cx=x+ww/2,cy=y+hh/2;
   const centered=(str,xx,yy,size,color)=>r.text(String(str),b.x+xx*sx,b.y+yy*sy,size*scale,color,{font:'bold',align:'center'});
   r.arc(b.x+cx*sx,b.y+cy*sy,(rad-8)*scale,rad*scale,220,500,'#28374b');
   if(w.type==='rpm')r.arc(b.x+cx*sx,b.y+cy*sy,(rad-8)*scale,rad*scale,220+280*.875,500,'#ed4961');
   if(val!=null)r.arc(b.x+cx*sx,b.y+cy*sy,(rad-8)*scale,rad*scale,220,220+280*M.clamp(val/max,0,1),accent);
   const steps=w.type==='rpm'?8:d.units==='mph'?8:13;
   for(let i=0;i<=steps*2;i++){
    const major=i%2===0,angle=220+280*i/(steps*2),a=angle*Math.PI/180;
    const point=radius=>[cx+Math.sin(a)*radius,cy-Math.cos(a)*radius];
    const outer=point(rad-17),inner=point(rad-(major?32:25));line(outer[0],outer[1],inner[0],inner[1],major?2.4:1.3,major?'#c4d2e3':'#6c809a');
    if(major){const pos=point(rad-52),tick=w.type==='rpm'?i/2:Math.round(max*i/(steps*2));centered(tick,pos[0],pos[1]+7,21,'#b4c7dd');}
   }
   if(val!=null){const a=(220+280*M.clamp(val/max,0,1))*Math.PI/180;line(cx+Math.sin(a)*(rad-35),cy-Math.cos(a)*(rad-35),cx+Math.sin(a)*(rad+3),cy-Math.cos(a)*(rad+3),5,accent);}
   centered(label,cx,cy-46,23,'#90a8c3');centered(n,cx,cy+31,Math.min(86,ww/(Math.max(n.length,3)*.76)),accent);centered(unit,cx,cy+65,25,'#c2d1e2');
  }else{
   if(d.borders)rect(x,y,ww,hh,'#141e2c',24);
   text(label,x+22,y+44,29,'#a9b7ca');text(n,x+22,y+hh*.62,Math.min(104,hh*.43),accent);text(unit,x+22,y+hh-22,26,'#acb9ca');
   if(mode==='bar'){rect(x+22,y+hh-66,ww-44,12,'#283347',6);if(val!=null)rect(x+22,y+hh-66,(ww-44)*M.clamp(val/max,0,1),12,accent,6);}
  }
 };
 for(const w of d.widgets){if(!w.on)continue;const x=w.x*1920,y=w.y*720,ww=w.w*1920,hh=w.h*720;
  const val=data[w.type],accent=w.color&&w.color!=='theme'?w.color:t[1];
  if(w.type==='speed')gauge(w,val==null?null:d.units==='mph'?val/1.609344:val,d.units==='mph'?160:260,'SPEED',d.units);
  else if(w.type==='rpm')gauge(w,val,8000,'ENGINE','RPM');
  else if(w.type==='gear'){if(d.borders)rect(x,y,ww,hh,'#1b273a',20);text(val==null?'—':val,x+ww*.28,y+hh*.72,hh*.62,accent);}
  else if(w.type==='clock')text(time,x+8,y+hh*.74,Math.min(hh*.68,ww/(time.length*.63)),accent);
  else if(w.type==='date'){const s=['SUN','MON','TUE','WED','THU','FRI','SAT'][now.getDay()]+' / '+(now.getMonth()+1)+'.'+now.getDate();text(s,x+8,y+hh*.73,Math.min(36,hh*.7),'#acb9ca');}
  else if(w.type==='badge'){text('X4 M',x+ww*.10,y+hh*.53,Math.min(ww*.25,hh*.6),accent);text('C O M P E T I T I O N',x+ww*.10,y+hh*.88,Math.min(ww*.047,hh*.21),'#d1d9e5');}
  else if(w.type==='flag')flag(x,y,ww,hh);
  else if(w.type==='accent'){['#53bdeb','#3457aa','#e5475b'].forEach((c,i)=>rect(x+i*ww/3,y,ww/3-6,hh,c,3));}
  else if(w.type==='signature')text(d.signature||M.TITLES[d.title],x+5,y+hh*.75,Math.min(hh*.65,ww/((d.signature||M.TITLES[d.title]).length*.62)),accent);
  else if(w.type==='connection')text(data.connected?'VEHICLE DATA / LIVE':'VEHICLE DATA / UNAVAILABLE',x,y+hh*.75,Math.min(hh*.7,ww/18),'#acb9ca');
  else {const label=w.type==='oil'?'OIL':'COOLANT';text(label,x+6,y+hh*.29,Math.min(23,hh*.3),'#acb9ca');text(val==null?'— °'+(d.temperatureUnit||'C'):Math.round(d.temperatureUnit==='F'?val*1.8+32:val)+' °'+(d.temperatureUnit||'C'),x+6,y+hh*.85,Math.min(48,hh*.56),accent);}
  if(o.selected===w.type)r.strokeRoundRect(b.x+x*sx,b.y+y*sy,ww*sx,hh*sy,8*scale,2,'#56bdff');
 }
 if(o.grid){for(let i=1;i<10;i++){r.line(b.x+b.w*i/10,b.y,b.x+b.w*i/10,b.y+b.h,.5,'#253347');r.line(b.x,b.y+b.h*i/10,b.x+b.w,b.y+b.h*i/10,.5,'#253347');}}
}
const I=require('./studio_intro.js');
function intro(r,d,b,progress){return I.intro(r,d,b,progress*I.duration(d));}
function sequence(r,d,b,data,elapsed){
 if(r.clip)r.clip(b.x,b.y,b.w,b.h);
 const a=I.timeline(d,elapsed);
 if(!a.done&&a.reveal===0)I.intro(r,d,b,elapsed);
 else {draw(r,d,b,data);if(!a.done)r.fillRect(b.x,b.y,b.w,b.h,[0,0,0,Math.round((1-a.reveal)*255)]);}
 if(r.noclip)r.noclip();
}
module.exports={draw,intro,sequence};
