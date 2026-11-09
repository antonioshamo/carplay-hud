// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const M=require('./studio_model.js');
function draw(r,d,b,data,options){
 // Keep the native center available while its active-state feed is unverified.
 // Side coverage must be fully opaque to hide the underlying OEM dial numbers.
 if(d.template==='bmw-factory'&&!(options&&options.factoryPass)){
  if(d.background!=='transparent'){
   // Opaque black is essential: alpha fades expose the factory numerals and
   // readouts beneath the recreated gauges (confirmed by the owner's photo).
   for(const z of M.FACTORY_REGIONS){const x=Math.round(b.x+z[0]*b.w),y=Math.round(b.y+z[1]*b.h);r.fillRect(x,y,Math.round(b.x+(z[0]+z[2])*b.w)-x,Math.round(b.y+(z[1]+z[3])*b.h)-y,'#000000');}
  }
  for(const z of M.FACTORY_REGIONS){
   const widgets=d.widgets.filter(w=>w.x<z[0]+z[2]&&w.x+w.w>z[0]&&w.y<z[1]+z[3]&&w.y+w.h>z[1]);
   r.clip(b.x+z[0]*b.w,b.y+z[1]*b.h,z[2]*b.w,z[3]*b.h);
   draw(r,Object.assign({},d,{widgets,background:'transparent'}),b,data,Object.assign({},options,{factoryPass:true,factoryClip:z}));
   r.noclip();
  }
  return;
 }
 const o=options||{},t=M.THEMES[d.theme],sx=b.w/1920,sy=b.h/720,scale=Math.min(sx,sy);
 const rect=(x,y,w,h,c,rad)=>r.roundRect(b.x+x*sx,b.y+y*sy,w*sx,h*sy,(rad||0)*scale,c);
 // Anchor readouts to their widget center. Measure the actual glyph advances
 // so narrow widgets, long names and changing digit counts remain centered.
 const text=(s,cx,y,size,c,width,font)=>{
  const value=String(s),opts={font:font||'bold',align:'center'};
  let pixels=size*scale;
  if(width&&r.textWidth){const measured=r.textWidth(value,pixels,opts);if(measured>width*sx)pixels*=width*sx/measured;}
  return r.text(value,b.x+cx*sx,b.y+y*sy,pixels,c||'#f3f5ff',opts);
 };
 const line=(x,y,xx,yy,n,c)=>r.line(b.x+x*sx,b.y+y*sy,b.x+xx*sx,b.y+yy*sy,n*scale,c);
 const visible=(x,y,w,h)=>!o.factoryClip||x+w>o.factoryClip[0]*1920&&x<(o.factoryClip[0]+o.factoryClip[2])*1920&&y+h>o.factoryClip[1]*720&&y<(o.factoryClip[1]+o.factoryClip[3])*720;
 if(d.gauge==='ultra'&&d.background==='gradient')r.gradientRect(b.x,b.y,b.w,b.h,[[0,'#062c3a'],[.7,'#07151b'],[1,'#000000']]);
 else if(d.background==='gradient')r.gradientRect(b.x,b.y,b.w,b.h,[[0,t[3]],[.7,'#060a11'],[1,'#020408']]);
 else if(d.background==='black')r.fillRect(b.x,b.y,b.w,b.h,'#030507');
 if(o.grid){for(let i=1;i<10;i++){r.line(b.x+b.w*i/10,b.y,b.x+b.w*i/10,b.y+b.h,.5,'#253347');r.line(b.x,b.y+b.h*i/10,b.x+b.w,b.y+b.h*i/10,.5,'#253347');}}
 function flag(x,y,w,h){const cell=Math.min(w/8,h/4);for(let row=0;row<4;row++)for(let col=0;col<8;col++)if((row+col)%2===0)rect(x+col*cell,y+row*cell,cell*.9,cell*.9,'#f2f6ff');}
 const now=data.now||new Date(),time=d.clock24?String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0'):(now.getHours()%12||12)+':'+String(now.getMinutes()).padStart(2,'0')+' '+(now.getHours()<12?'AM':'PM');
 const gauge=(w,val,max,label,unit)=>{
  const mode=!w.gauge||w.gauge==='inherit'?d.gauge:w.gauge,accent=w.color&&w.color!=='theme'?w.color:t[1];
  const x=w.x*1920,y=w.y*720,ww=w.w*1920,hh=w.h*720,n=val==null?'—':String(Math.round(val));
  if(mode==='bmw'){
   // The owner's factory close-ups define the rail, scale and label stations.
   // Separate label anchors preserve BMW's long inward spokes and flatter foot.
   const mirror=w.type==='rpm',fraction=val==null?0:M.clamp(val/max,0,1),red='#f51b35';
   const p=(u,v)=>[x+(mirror?1-u:u)*ww,y+v*hh];
   const poly=(pts,width,col)=>r.polyline(pts.map(q=>[b.x+q[0]*sx,b.y+q[1]*sy]),width*scale,col);
   const quad=(pts,col)=>r.quad(pts.map(q=>[b.x+q[0]*sx,b.y+q[1]*sy]),col);
   const sample=cs=>{const pts=[];for(const c of cs)for(let j=0;j<16;j++){const a=j/16,u=1-a;pts.push(p(u*u*u*c[0][0]+3*u*u*a*c[1][0]+3*u*a*a*c[2][0]+a*a*a*c[3][0],u*u*u*c[0][1]+3*u*u*a*c[1][1]+3*u*a*a*c[2][1]+a*a*a*c[3][1]));}const end=cs[cs.length-1][3];pts.push(p(end[0],end[1]));return pts;};
   const rail=sample([
    [[.70,.97],[.55,.97],[.44,.97],[.32,.94]],
    [[.32,.94],[.20,.91],[.105,.74],[.055,.60]],
    [[.055,.60],[.005,.46],[.05,.37],[.15,.28]],
    [[.15,.28],[.25,.19],[.37,.12],[.51,.075]],
    [[.51,.075],[.65,.03],[.80,.02],[.97,.02]]
   ]);
   const face=sample([
    [[.70,.97],[.73,.94],[.83,.89],[.87,.85]],
    [[.87,.85],[.82,.77],[.77,.65],[.73,.57]],
    [[.73,.57],[.68,.47],[.69,.43],[.73,.37]],
    [[.73,.37],[.79,.28],[.83,.22],[.89,.18]],
    [[.89,.18],[.95,.14],[.97,.05],[.97,.02]]
   ]);
   const center=p(.79,.49),toward=(q,depth)=>{const dx=center[0]-q[0],dy=center[1]-q[1],len=Math.hypot(dx,dy)||1;return[q[0]+dx/len*depth,q[1]+dy/len*depth];};
   // Dark, opaque faces: no light gray crescent and no factory-number bleed.
   const outline=rail.concat(face.slice().reverse()),crossings=yy=>{
    const xs=[];for(let i=0;i<outline.length;i++){const a=outline[i],c=outline[(i+1)%outline.length];if((a[1]>yy)!==(c[1]>yy))xs.push(a[0]+(yy-a[1])*(c[0]-a[0])/(c[1]-a[1]));}return xs.sort((a,c)=>a-c);
   };
   const top=Math.ceil(Math.min(...rail.map(q=>q[1]))*sy+b.y),bottom=Math.floor((y+hh*.97)*sy+b.y);
   for(let yy=top;yy<bottom;yy+=3){
    const end=Math.min(bottom,yy+3),a=crossings((yy-b.y+.01)/sy),c=crossings((end-b.y-.01)/sy),shade=Math.round(9+10*(1-(yy-top)/(bottom-top)));
    if(a.length===2&&c.length===2)r.quad([[b.x+a[0]*sx,yy],[b.x+a[1]*sx,yy],[b.x+c[1]*sx,end],[b.x+c[0]*sx,end]],[shade,shade+1,shade+2,255]);
   }
   poly(face,.8,'#292b2e');poly(rail,3,accent);poly(rail.map(q=>toward(q,6)),1,'#85878b');
   const lengths=[0];for(let i=1;i<rail.length;i++)lengths.push(lengths[i-1]+Math.hypot(rail[i][0]-rail[i-1][0],rail[i][1]-rail[i-1][1]));
   const total=lengths[lengths.length-1],at=f=>{const dist=f*total;let i=0;while(i<rail.length-2&&dist>lengths[i+1])i++;const k=(dist-lengths[i])/(lengths[i+1]-lengths[i]);return [rail[i][0]+(rail[i+1][0]-rail[i][0])*k,rail[i][1]+(rail[i+1][1]-rail[i][1])*k];};
   const stations=[.025,.145,.255,.36,.465,.565,.66,.75,.835,.915,.985];
   const labels=[[.60,.87],[.40,.86],[.285,.75],[.205,.60],[.175,.455],[.27,.32],[.39,.225],[.525,.155],[.67,.12],[.815,.105],[.955,.105]];
   const labelAt=f=>{const v=M.clamp(f,0,1)*10,i=Math.min(9,Math.floor(v)),k=v-i;return p(labels[i][0]+(labels[i+1][0]-labels[i][0])*k,labels[i][1]+(labels[i+1][1]-labels[i][1])*k);};
   const dialAt=f=>{const v=M.clamp(f,0,1)*10,i=Math.min(9,Math.floor(v));return at(stations[i]+(stations[i+1]-stations[i])*(v-i));};
   // Beveled lower trough and restrained red mesh, following the original foot.
   const glow=[dialAt(0),dialAt(.15)],inset=(q,depth)=>toward(q,depth*hh/648);
   for(let j=0;j<12;j++)quad([inset(glow[0],j*7),inset(glow[1],j*7),inset(glow[1],(j+1)*7),inset(glow[0],(j+1)*7)],[184,8,22,Math.round(100*Math.pow(1-j/12,2))]);
   for(let j=0;j<8;j++){const a=inset(glow[0],j*9),z=inset(glow[1],j*9);poly([a,z],.5,[244,29,47,Math.round(55*(1-j/8))]);}
   for(let j=1;j<16;j++){const f=j/16,q=[glow[0][0]+(glow[1][0]-glow[0][0])*f,glow[0][1]+(glow[1][1]-glow[0][1])*f];poly([q,inset(q,68)],.6,[223,20,40,36]);}
   const steps=mirror?8:10;
   for(let i=0;i<=steps*2;i++){
    const f=i/(steps*2),q=dialAt(f),major=i%2===0,l=labelAt(f),dx=l[0]-q[0],dy=l[1]-q[1],len=Math.hypot(dx,dy)||1;
    if(major){
     const end=[l[0]-dx/len*23*ww/710,l[1]-dy/len*23*hh/648];
     poly([q,end],2,'#676a70');poly([q,[q[0]+dx/len*10,q[1]+dy/len*10]],3,accent);
     const tick=mirror?i/2:Math.round(max*f);text(tick,l[0],l[1]+15*hh/648,Math.min(41,hh*.064),'#f2f2ef',ww*.16,'instrument');
    }else poly([q,[q[0]+dx/len*9,q[1]+dy/len*9]],1.8,accent);
   }
   // Separate yellow and red high-RPM bands; do not recolor warning semantics.
   if(mirror){poly([dialAt(.83),dialAt(.875)],6,'#ffbf25');poly([dialAt(.89),dialAt(.94)],6,red);poly([dialAt(.95),dialAt(1)],6,red);}
   if(val!=null){const q=dialAt(fraction),l=labelAt(fraction),dx=l[0]-q[0],dy=l[1]-q[1],len=Math.hypot(dx,dy)||1,end=[q[0]+dx/len*Math.min(65,ww*.092),q[1]+dy/len*Math.min(65,hh*.10)];if(visible(Math.min(q[0],end[0])-5,Math.min(q[1],end[1])-5,Math.abs(q[0]-end[0])+10,Math.abs(q[1]-end[1])+10))poly([q,end],7,red);}
   const readout=p(.76,.50),size=Math.min(mirror?91:121,ww/(Math.max(n.length,1)*.95),hh*.19),unitSize=mirror?21:28;
   const measure=(s,size,font)=>r.textWidth?r.textWidth(s,size*scale,{font})/scale:String(s).length*size*.62;
   const numberWidth=measure(n,size,'instrument'),unitWidth=measure(unit,unitSize,'bold'),gap=12;
   const start=readout[0]-(numberWidth+gap+unitWidth)/2;
   if(visible(start,readout[1]-size,numberWidth+gap+unitWidth,size*1.25)){
    text(n,start+numberWidth/2,readout[1],size,w.color&&w.color!=='theme'?w.color:'#f3f5f8',ww*.45,'instrument');
    text(unit,start+numberWidth+gap+unitWidth/2,readout[1],unitSize,'#e1e2e3',ww*.15);
   }
   const ruleStart=p(.35,.535),ruleEnd=p(.965,.535);poly([ruleStart,ruleEnd],1.6,'#aaaeb1');
   const lead=p(.30,.535);poly([lead,p(.34,.535)],4,'#c2c5c9');
  }else if(mode==='id8'||mode==='id8-slim'){
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
   centered(label,.5,.37,Math.min(23,hh*.06),'#96aec8');
   centered(n,.5,.59,Math.min(slim?106:112,ww/(Math.max(n.length,3)*.71),hh*.28),'#f5f8ff');
   centered(unit,.5,.70,Math.min(29,hh*.08),accent);
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
   text(value,cx,cy+34,120,'#ffffff',ww*.8);text(unitText,cx,cy+78,29,'#d1dde1',ww*.8);
   r.arc(b.x+cx*sx,b.y+cy*sy,(rad-4)*scale,rad*scale,145,215,col);
   if(w.type==='rpm')text(data.coolant==null?'— °'+(d.temperatureUnit||'C'):Math.round(d.temperatureUnit==='F'?data.coolant*1.8+32:data.coolant)+' °'+(d.temperatureUnit||'C'),cx,cy+rad-34,28,'#ffffff',ww*.8);
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
   text(label,x+ww/2,y+44,29,'#a9b7ca',ww-44);text(n,x+ww/2,y+hh*.62,Math.min(104,hh*.43),accent,ww-44);text(unit,x+ww/2,y+hh-22,26,'#acb9ca',ww-44);
   if(mode==='bar'){rect(x+22,y+hh-66,ww-44,12,'#283347',6);if(val!=null)rect(x+22,y+hh-66,(ww-44)*M.clamp(val/max,0,1),12,accent,6);}
  }
 };
 const auxiliary=(w,reading,min,max)=>{
  const x=w.x*1920,y=w.y*720,ww=w.w*1920,hh=w.h*720,right=w.type==='oil',color=w.color&&w.color!=='theme'?w.color:t[1];
  const p=(u,v)=>[x+(right?1-u:u)*ww,y+v*hh],rail=[],curves=[[[.36,.02],[.14,.14],[.08,.26],[.16,.47]],[[.16,.47],[.24,.68],[.35,.89],[.58,.94]],[[.58,.94],[.70,.97],[.83,.97],[.96,.96]]];
  for(const c of curves)for(let i=0;i<16;i++){const a=i/16,z=1-a;rail.push(p(z*z*z*c[0][0]+3*z*z*a*c[1][0]+3*z*a*a*c[2][0]+a*a*a*c[3][0],z*z*z*c[0][1]+3*z*z*a*c[1][1]+3*z*a*a*c[2][1]+a*a*a*c[3][1]));}rail.push(p(.96,.96));
  const inner=rail.map(q=>[q[0]+(right?-1:1)*ww*.055,q[1]-hh*.015]);
  const screen=pts=>pts.map(q=>[b.x+q[0]*sx,b.y+q[1]*sy]);
  for(let i=0;i<rail.length-1;i++)r.quad(screen([rail[i],rail[i+1],inner[i+1],inner[i]]),'#53565b');
  r.polyline(screen(rail),2.5*scale,color);r.polyline(screen(inner),.8*scale,'#a1a5ab');
  for(const i of [0,16,32,48]){const q=rail[i];line(q[0],q[1],q[0]+(right?-1:1)*ww*.16,q[1]-hh*.025,1.6,color);}
  // The live percentage remains the user's preferred fuel readout. The tapered
  // surround and needle now match the factory auxiliary gauge instead of a C.
  if(reading.available){const f=M.clamp((Number(reading.value)-min)/(max-min),0,1),q=rail[Math.round((1-f)*38)];line(q[0],q[1],q[0]+(right?-1:1)*ww*.13,q[1]-hh*.025,5,'#f51b35');}
  if(right)r.polyline(screen(rail.slice(36)),4*scale,'#28a0db');
  const center=p(.5,.5);text(reading.label,center[0],y+hh*.28,Math.min(18,ww*.13),'#b7bec8',ww*.78);
  text(reading.value+reading.unit,center[0],y+hh*.49,Math.min(30,ww*.22),reading.available?(reading.alert||(w.type==='fuel'&&data.fuelWarning==='LOW FUEL')?'#ffbc55':'#eff1f3'):'#8192a8',ww*.78,'instrument');
 };
 for(const w of d.widgets){if(!w.on)continue;const x=w.x*1920,y=w.y*720,ww=w.w*1920,hh=w.h*720;
  const val=data[w.type],accent=w.color&&w.color!=='theme'?w.color:t[1];
  if(w.type==='speed')gauge(w,val==null?null:d.units==='mph'?val/1.609344:val,((w.gauge==='bmw'||((!w.gauge||w.gauge==='inherit')&&d.gauge==='bmw'))?(d.units==='mph'?200:320):(d.units==='mph'?160:260)),'SPEED',d.units);
  else if(w.type==='rpm')gauge(w,val,8000,'ENGINE','RPM');
  else if(w.type==='gear'){if(d.borders)rect(x,y,ww,hh,'#1b273a',20);text(val==null?'—':val,x+ww/2,y+hh*.72,hh*.62,accent,ww*.9);}
  else if(w.type==='clock')text(time,x+ww/2,y+hh*.74,d.template==='bmw-factory'?Math.min(40,hh*.80):hh*.68,accent,ww*.94,d.template==='bmw-factory'?'instrument':undefined);
  else if(w.type==='date'){const s=['SUN','MON','TUE','WED','THU','FRI','SAT'][now.getDay()]+' / '+(now.getMonth()+1)+'.'+now.getDate();text(s,x+ww/2,y+hh*.73,Math.min(36,hh*.7),'#acb9ca',ww*.94);}
  else if(w.type==='badge'){text('X4 M',x+ww/2,y+hh*.53,Math.min(ww*.25,hh*.6),accent,ww*.9);text('C O M P E T I T I O N',x+ww/2,y+hh*.88,Math.min(ww*.047,hh*.21),'#d1d9e5',ww*.9);}
  else if(w.type==='flag')flag(x,y,ww,hh);
  else if(w.type==='accent'){['#53bdeb','#3457aa','#e5475b'].forEach((c,i)=>rect(x+i*ww/3,y,ww/3-6,hh,c,3));}
  else if(w.type==='signature')text(d.signature||M.TITLES[d.title],x+ww/2,y+hh*.75,hh*.65,accent,ww*.94);
  else if(w.type==='connection')text(data.connected?'VEHICLE DATA / LIVE':'VEHICLE DATA / UNAVAILABLE',x+ww/2,y+hh*.75,hh*.7,'#acb9ca',ww*.94);
  else if(d.template==='bmw-factory'&&w.type==='fuel'&&hh>ww*.9)auxiliary(w,M.reading('fuel',d,data),0,100);
  else if(d.template==='bmw-factory'&&w.type==='oil'&&hh>ww*.9){const f=d.temperatureUnit==='F',v=val==null?null:Math.round(f?val*1.8+32:val);auxiliary(w,{label:'OIL',value:v==null?'—':String(v),unit:'°'+d.temperatureUnit,available:v!=null},f?120:50,f?300:150);}
  else if(M.METRICS[w.type]){
   const reading=M.reading(w.type,d,data),cx=x+ww/2,col=reading.alert||(w.type==='fuel'&&data.fuelWarning==='LOW FUEL')?'#ffbc55':accent;
   text(reading.label,cx,y+hh*.25,Math.min(23,hh*.24),'#acb9ca',ww*.94);
   text(reading.value+(reading.unit?(reading.unit==='%'?'':' ')+reading.unit:''),cx,y+hh*.79,Math.min(d.template==='bmw-factory'?34:46,hh*.48),reading.available?col:'#8192a8',ww*.94,d.template==='bmw-factory'?'instrument':undefined);
   if(!reading.available)text('UNAVAILABLE',cx,y+hh*.99,Math.min(15,hh*.18),'#8192a8',ww*.94);
  }
  else {const label=w.type==='oil'?'OIL':'COOLANT';text(label,x+ww/2,y+hh*.29,Math.min(23,hh*.3),'#acb9ca',ww*.94);text(val==null?'— °'+(d.temperatureUnit||'C'):Math.round(d.temperatureUnit==='F'?val*1.8+32:val)+' °'+(d.temperatureUnit||'C'),x+ww/2,y+hh*.85,Math.min(d.template==='bmw-factory'?34:48,hh*.56),accent,ww*.94,d.template==='bmw-factory'?'instrument':undefined);}
  if(o.selected===w.type)r.strokeRoundRect(b.x+x*sx,b.y+y*sy,ww*sx,hh*sy,8*scale,2,'#56bdff');
 }
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
