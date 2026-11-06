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
  if(mode==='id8'||mode==='id8-slim'){
   // Open hexagonal rails: each gauge remains an independently movable widget.
   // Geometry is static before the live rail/readout, so the frame cache can reuse it.
   const slim=mode==='id8-slim',mirror=w.type==='rpm',fraction=val==null?0:M.clamp(val/max,0,1);
   const point=(u,v)=>[x+(mirror?1-u:u)*ww,y+v*hh];
   const poly=(pts,width,color)=>r.polyline(pts.map(p=>[b.x+p[0]*sx,b.y+p[1]*sy]),width*scale,color);
   const quad=(pts,color)=>r.quad(pts.map(p=>[b.x+p[0]*sx,b.y+p[1]*sy]),color);
   const centered=(str,u,v,size,color)=>{const p=point(u,v);r.text(String(str),b.x+p[0]*sx,b.y+p[1]*sy,size*scale,color,{font:'bold',align:'center'});};
   const rail=[point(.48,.93),point(.28,.93),point(.08,.50),point(.28,.07),point(.48,.07)];
   const edge=[point(.51,.93),point(.33,.90),point(.15,.50),point(.33,.10),point(.51,.07)];
   if(!slim){for(let i=0;i<4;i++)quad([rail[i],rail[i+1],edge[i+1],edge[i]],'#182c43');}
   poly(rail,slim?2:3,'#a9bfd4');poly(edge,slim?1:2,'#304d6a');
   const distances=[0];for(let i=1;i<rail.length;i++)distances.push(distances[i-1]+Math.hypot(rail[i][0]-rail[i-1][0],rail[i][1]-rail[i-1][1]));
   const at=f=>{const distance=f*distances[4];let j=0;while(j<3&&distance>distances[j+1])j++;const t=(distance-distances[j])/(distances[j+1]-distances[j]);return [rail[j][0]+(rail[j+1][0]-rail[j][0])*t,rail[j][1]+(rail[j+1][1]-rail[j][1])*t];};
   const steps=slim?4:8,inward=mirror?-1:1;
   for(let i=0;i<=steps;i++){const p=at(i/steps);line(p[0],p[1],p[0]+inward*ww*.026,p[1],2,'#c5d6e8');if(!slim&&i%2===0){const tick=w.type==='rpm'?i:Math.round(max*i/steps);r.text(String(tick),b.x+(p[0]+inward*ww*.066)*sx,b.y+(p[1]+(i===0?30:i===steps?-15:6))*sy,Math.min(23,hh*.055)*scale,'#a8bfd7',{font:'bold',align:'center'});}}
   if(w.type==='rpm')poly([at(.875),at(1)],4,'#ed4961');
   if(val!=null&&fraction>0){const path=[rail[0]];for(let i=1;i<=4;i++)if(distances[i]/distances[4]<fraction)path.push(rail[i]);path.push(at(fraction));poly(path,slim?4:7,accent);const p=at(fraction);line(p[0]-inward*3,p[1],p[0]+inward*ww*.04,p[1],3,'#ffffff');}
   centered(label,.61,.37,Math.min(23,hh*.06),'#96aec8');
   centered(n,.61,.59,Math.min(slim?106:112,ww/(Math.max(n.length,3)*.71),hh*.28),'#f5f8ff');
   centered(unit,.61,.70,Math.min(29,hh*.08),accent);
  }else if(['needle','segments','sweep','vertical','minimal','dots'].includes(mode)){
   const cx=x+ww/2,cy=y+hh/2,rad=Math.min(ww/2-14,hh/2-10),fraction=val==null?0:M.clamp(val/max,0,1);
   const centered=(str,xx,yy,size,col)=>r.text(String(str),b.x+xx*sx,b.y+yy*sy,size*scale,col||accent,{font:'bold',align:'center'});
   const arc=(inner,outer,start,end,col)=>r.arc(b.x+cx*sx,b.y+cy*sy,inner*scale,outer*scale,start,end,col);
   const point=(angle,radius)=>[cx+Math.sin(angle*Math.PI/180)*radius,cy-Math.cos(angle*Math.PI/180)*radius];
   const large=Math.min(80,ww/(Math.max(n.length,3)*.8));
   if(mode==='needle'){
    arc(rad-3,rad,220,500,'#53647a');
    for(let i=0;i<=40;i++){const major=i%5===0,a=220+280*i/40,p=point(a,rad-8),q=point(a,rad-(major?25:16));line(p[0],p[1],q[0],q[1],major?3:1.5,major?'#d9e6f2':'#62768e');if(major){const v=point(a,rad-43);centered(w.type==='rpm'?i/5:Math.round(max*i/40),v[0],v[1]+6,18,'#b2c5da');}}
    if(val!=null){const p=point(220+280*fraction,rad-30),tail=point(40+280*fraction,18);line(tail[0],tail[1],p[0],p[1],4,accent);}rect(cx-7,cy-7,14,14,accent,7);
    centered(n,cx,cy+rad*.52,large*.65);centered(unit,cx,cy+rad*.72,21,'#b2c5da');centered(label,cx,cy-rad*.36,20,'#9baec6');
   }else if(mode==='segments'||mode==='dots'){
    const count=mode==='segments'?32:48;
    for(let i=0;i<count;i++){const a=220+280*i/count,on=val!=null&&i/count<fraction,col=on?(w.type==='rpm'&&i/count>=.875?'#ed4961':accent):'#243448';if(mode==='segments')arc(rad-18,rad,a,a+280/count-2,col);else {const p=point(a,rad-9);rect(p[0]-4,p[1]-4,8,8,col,4);}}
    centered(label,cx,cy-43,23,'#9baec6');centered(n,cx,cy+29,large);centered(unit,cx,cy+64,24,'#c2d1e2');
   }else if(mode==='minimal'){
    arc(rad-2,rad,245,475,'#35465c');if(val!=null)arc(rad-4,rad,245,245+230*fraction,accent);
    centered(n,cx,cy+20,large*1.1);centered(unit,cx,cy+61,23,'#c2d1e2');centered(label,cx,cy-rad*.55,20,'#9baec6');
   }else if(mode==='sweep'){
    const xx=x+20,span=ww-40,yy=y+hh*.29;
    for(let i=0;i<32;i++){const a=i/32,z=(i+.8)/32,col=val!=null&&a<fraction?(w.type==='rpm'&&a>=.875?'#ed4961':accent):'#293b51';line(xx+span*a,yy-Math.sin(a*Math.PI)*hh*.10,xx+span*z,yy-Math.sin(z*Math.PI)*hh*.10,12,col);}
    centered(label,cx,y+hh*.10,23,'#9baec6');centered(n,cx,y+hh*.66,large*1.1);centered(unit,cx,y+hh*.84,25,'#c2d1e2');
    centered('0',xx,y+hh*.40,19,'#90a8c3');centered(w.type==='rpm'?max/1000:max,xx+span,y+hh*.40,19,'#90a8c3');
   }else{
    const bh=hh*.7,step=bh/24,xx=x+ww*.11,yy=y+hh*.16;
    for(let i=0;i<24;i++){const on=val!=null&&i/24<fraction,col=on?(w.type==='rpm'&&i>=21?'#ed4961':accent):'#25374b';rect(xx,yy+bh-(i+1)*step,ww*.12,Math.max(2,step-3),col,2);rect(x+ww*.80,yy+bh-(i+1)*step,ww*.08,Math.max(2,step-3),col,2);}
    centered(label,cx,y+hh*.23,21,'#9baec6');centered(n,cx,y+hh*.58,large*.82);centered(unit,cx,y+hh*.75,23,'#c2d1e2');
   }
  }else if(mode==='ultra'){
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
