// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
const fonts=require('./kit_fonts.js');
const C={bg:'#080c14',text:'#f3f4fa',muted:'#b3bdd4',dim:'#7b89a5',blue:'#a1b8ff',active:'#c5d4ff',amber:'#ffb474',line:'#3e4d68'};
function text(r,s,x,y,size,col,max,center){
 s=String(s==null?'':s);const f=fonts.get('label',size),measure=v=>fonts.measure(f,v)*size/f.size;
 while(max&&measure(s)>max&&s.length)s=s.slice(0,-2)+'…';
 r.text(s,center?x-measure(s)/2:x,y,size,col||C.text,{font:'label'});
}
function slant(r,x,y,w,h,color,cut){cut=cut===undefined?44:cut;r.quad([[x+cut,y],[x+w,y],[x+w-cut,y+h],[x,y+h]],color);}
function background(r){
 r.clear(C.bg);r.gradientRect(0,0,1600,580,[[0,'#1b263c'],[.48,'#111c2d'],[1,'#080d16']]);
 slant(r,1110,64,440,445,'#24344b',190);slant(r,1280,64,180,445,'#2c3958',190);slant(r,1430,64,90,445,'#382b41',190);
 for(let i=0;i<5;i++)r.line(250+i*280,64,0+i*280,505,1,'#344056');
 r.fillRect(0,0,1600,64,'#101724');r.fillRect(0,516,1600,64,'#080d15');r.line(20,516,1580,516,1,'#45536b');
}
function icon(r,name,x,y,col,size){
 const z=(size||24)/24,c=col||C.text,line=(a,b,d,e)=>r.line(x+a*z,y+b*z,x+d*z,y+e*z,2*z,c);
 if(name==='home'){r.polyline([[x-13*z,y],[x,y-11*z],[x+13*z,y],[x+9*z,y],[x+9*z,y+11*z],[x-9*z,y+11*z],[x-9*z,y]],2*z,c);}
 else if(name==='back'){line(7,-11,-5,0);line(-5,0,7,11);}
 else if(name==='next'){line(-7,-11,5,0);line(5,0,-7,11);}
 else if(name==='apps'||name==='widgets'){[-9,5].forEach(a=>[-9,5].forEach(b=>r.strokeRoundRect(x+a*z,y+b*z,7*z,7*z,0,1.5*z,c)));}
 else if(name==='car'){r.strokeRoundRect(x-18*z,y-3*z,36*z,13*z,3*z,2*z,c);r.polyline([[x-13*z,y-3*z],[x-8*z,y-11*z],[x+9*z,y-11*z],[x+15*z,y-3*z]],2*z,c);r.circle(x-11*z,y+11*z,3*z,c);r.circle(x+11*z,y+11*z,3*z,c);}
 else if(name==='fan'){for(let i=0;i<4;i++){const a=i*Math.PI/2;r.arc(x+Math.cos(a)*7*z,y+Math.sin(a)*7*z,0,6*z,0,360,c);}r.circle(x,y,3*z,'#101724');}
 else if(name==='gauge'){r.arc(x,y+3*z,12*z,14*z,160,380,c);line(0,3,8,-7);r.circle(x,y+3*z,2*z,c);}
 else if(name==='hud'){r.strokeRoundRect(x-17*z,y-10*z,34*z,21*z,5*z,2*z,c);line(-10,4,9,-4);}
 else if(name==='power'){r.arc(x,y,10*z,12*z,35,325,c);line(0,-15,0,0);}
 else if(name==='sun'){r.circle(x,y,6*z,c);for(let i=0;i<8;i++){const a=i*Math.PI/4;line(Math.cos(a)*10,Math.sin(a)*10,Math.cos(a)*14,Math.sin(a)*14);}}
 else if(name==='save'){r.strokeRoundRect(x-12*z,y-12*z,24*z,24*z,2*z,2*z,c);line(-6,-12,-6,-2);line(-6,-2,7,-2);line(7,-2,7,-12);}
 else if(name==='play'){r.polyline([[x-8*z,y-12*z],[x+12*z,y],[x-8*z,y+12*z],[x-8*z,y-12*z]],2*z,c);}
 else if(name==='phone'){r.strokeRoundRect(x-8*z,y-14*z,16*z,28*z,3*z,2*z,c);line(-3,9,3,9);}
 else if(name==='tire'){r.strokeRoundRect(x-8*z,y-14*z,16*z,28*z,7*z,2*z,c);for(let i=-9;i<12;i+=6)line(-4,i,4,i+3);}
 else if(name==='fuel'){r.strokeRoundRect(x-10*z,y-12*z,16*z,25*z,1*z,2*z,c);r.strokeRoundRect(x-7*z,y-9*z,10*z,8*z,0,1*z,c);line(6,-5,12,0);line(12,0,12,11);}
 else if(name==='seat'){line(-7,-14,-7,5);line(-7,5,10,5);line(10,5,13,12);line(-12,12,9,12);}
 else {r.arc(x,y,11*z,13*z,0,360,c);text(r,'i',x,y+7*z,20*z,c,20*z,true);}
}
function button(r,b,focused){
 const col=b.enabled===false?C.dim:C.text;
 if(b.chrome==='rail'){
  if(b.selected||focused)slant(r,b.x,b.y,b.w,b.h,b.selected?'#4d6092':'#2e3f5e',14);
  icon(r,b.icon,b.x+b.w/2,b.y+26,b.selected?C.active:col,25);text(r,b.label,b.x+b.w/2,b.y+b.h-13,18,col,b.w-12,true);
 }else if(b.chrome==='dock'){
  if(b.selected||focused)slant(r,b.x,b.y,b.w,b.h,'#293c61',18);
  icon(r,b.icon,b.x+29,b.y+b.h/2,col,24);text(r,b.label,b.x+53,b.y+b.h/2+7,20,col,b.w-65);
 }else{
  if(b.selected||focused||b.primary)slant(r,b.x,b.y,b.w,b.h,b.primary?'#3b527d':b.selected?'#465c91':'#344765',14);
  else r.fillRect(b.x,b.y,b.w,b.h,'#1d2b41');
  r.line(b.x,b.y+b.h,b.x+b.w,b.y+b.h,1,b.enabled===false?'#27374d':C.line);
  text(r,b.label,b.x+16,b.y+b.h/2+8,b.w<150?17:b.w<210?18:b.id==='select'?18:b.id==='live-toggle'?20:22,col,b.w-32);
 }
 if(focused&&b.enabled!==false)r.line(b.x+14,b.y+b.h-2,b.x+b.w-14,b.y+b.h-2,3,C.active);
}
const DOCK=[['overview','Home','home'],['vehicle','Vehicle','car'],['climate','Climate','fan'],['apps','All apps','apps']];
function dock(items,page){DOCK.forEach((a,i)=>items.push({id:'nav:'+a[0],label:a[1],icon:a[2],chrome:'dock',x:410+i*196,y:522,w:184,h:50,enabled:true,selected:page===a[0]}));}
function car(r,x,y,w){const image=require('./cockpit_car.js')();r.image(image,x,y,w,w/2);}
module.exports={C,text,slant,background,icon,button,dock,car};
